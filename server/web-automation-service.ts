import puppeteer, { Browser, Page } from 'puppeteer';
import { db } from './db';
import { 
  externalIntegrations,
  automationTasks,
  webAutomationLogs,
  type ExternalIntegration,
  type AutomationTask,
  type InsertAutomationTask,
  type InsertWebAutomationLog
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

export interface UtilityPaymentTask {
  taskType: 'utility_payment';
  systemName: string; // excel_energy, xcel_energy, centerpoint_energy
  meterNumber: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  amount: number;
  clientId?: number;
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export interface DataEntryTask {
  taskType: 'data_entry';
  systemName: string;
  formData: Record<string, any>;
  clientId?: number;
}

export interface BalanceCheckTask {
  taskType: 'balance_check';
  systemName: string;
  accountNumber: string;
  clientId?: number;
}

export type WebAutomationTaskData = UtilityPaymentTask | DataEntryTask | BalanceCheckTask;

export class WebAutomationService {
  private browser: Browser | null = null;
  private integration: ExternalIntegration;
  private screenshotDir = 'screenshots';

  constructor(integration: ExternalIntegration) {
    this.integration = integration;
  }

  // Initialize browser
  async initBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    this.browser = await puppeteer.launch({
      headless: true, // Set to false for debugging
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080'
      ],
    });

    return this.browser;
  }

  // Close browser
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Create screenshot directory if not exists
  private async ensureScreenshotDir(): Promise<void> {
    try {
      await fs.access(this.screenshotDir);
    } catch {
      await fs.mkdir(this.screenshotDir, { recursive: true });
    }
  }

  // Take screenshot
  private async takeScreenshot(page: Page, stepName: string, taskId: number): Promise<string> {
    await this.ensureScreenshotDir();
    const timestamp = Date.now();
    const filename = `task_${taskId}_${stepName}_${timestamp}.png`;
    const filepath = path.join(this.screenshotDir, filename);
    
    await page.screenshot({
      path: filepath,
      fullPage: true
    });

    return filepath;
  }

  // Log automation step
  private async logStep(
    taskId: number,
    stepNumber: number,
    stepData: Partial<InsertWebAutomationLog>
  ): Promise<void> {
    try {
      await db.insert(webAutomationLogs).values({
        taskId,
        stepNumber,
        ...stepData,
      } as InsertWebAutomationLog);
    } catch (error) {
      console.error('Failed to log automation step:', error);
    }
  }

  // Execute automation task
  async executeTask(taskId: number): Promise<void> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      // Get task details
      const [task] = await db
        .select()
        .from(automationTasks)
        .where(eq(automationTasks.id, taskId));

      if (!task) {
        throw new Error('Task not found');
      }

      // Update task status to in_progress
      await db
        .update(automationTasks)
        .set({
          status: 'in_progress',
          startedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(automationTasks.id, taskId));

      // Set viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      const taskData = task.taskData as WebAutomationTaskData;
      let result: any = {};

      // Execute based on task type
      switch (taskData.taskType) {
        case 'utility_payment':
          result = await this.executeUtilityPayment(page, taskId, taskData as UtilityPaymentTask);
          break;
        case 'data_entry':
          result = await this.executeDataEntry(page, taskId, taskData as DataEntryTask);
          break;
        case 'balance_check':
          result = await this.executeBalanceCheck(page, taskId, taskData as BalanceCheckTask);
          break;
        default:
          throw new Error(`Unknown task type: ${(taskData as any).taskType}`);
      }

      // Update task with success
      await db
        .update(automationTasks)
        .set({
          status: 'completed',
          success: true,
          result,
          completedAt: new Date(),
          executionTime: Date.now() - (task.startedAt?.getTime() || Date.now()),
          updatedAt: new Date()
        })
        .where(eq(automationTasks.id, taskId));

    } catch (error: any) {
      console.error('Task execution failed:', error);

      // Take error screenshot
      try {
        await this.takeScreenshot(page, 'error', taskId);
      } catch (screenshotError) {
        console.error('Failed to take error screenshot:', screenshotError);
      }

      // Update task with failure
      await db
        .update(automationTasks)
        .set({
          status: 'failed',
          success: false,
          errorMessage: error.message,
          completedAt: new Date(),
          executionTime: Date.now() - Date.now(), // Will be calculated properly
          updatedAt: new Date()
        })
        .where(eq(automationTasks.id, taskId));

      // Check if we should retry
      const [updatedTask] = await db
        .select()
        .from(automationTasks)
        .where(eq(automationTasks.id, taskId));

      if (updatedTask && updatedTask.retryCount < updatedTask.maxRetries) {
        await db
          .update(automationTasks)
          .set({
            status: 'pending',
            retryCount: updatedTask.retryCount + 1,
            nextRetryAt: new Date(Date.now() + (Math.pow(2, updatedTask.retryCount) * 60000)), // Exponential backoff
            updatedAt: new Date()
          })
          .where(eq(automationTasks.id, taskId));
      }

      throw error;
    } finally {
      await page.close();
    }
  }

  // Execute utility payment (Excel Energy example)
  private async executeUtilityPayment(
    page: Page, 
    taskId: number, 
    taskData: UtilityPaymentTask
  ): Promise<any> {
    let stepNumber = 1;
    const startTime = Date.now();

    try {
      // Step 1: Navigate to login page
      await this.logStep(taskId, stepNumber++, {
        stepName: 'navigate_to_login',
        stepType: 'navigation',
        currentUrl: this.integration.loginUrl || '',
        success: false
      });

      if (!this.integration.loginUrl) {
        throw new Error('Login URL not configured');
      }

      await page.goto(this.integration.loginUrl, { waitUntil: 'networkidle2' });
      await this.takeScreenshot(page, 'login_page', taskId);

      await this.logStep(taskId, stepNumber-1, {
        stepName: 'navigate_to_login',
        stepType: 'navigation',
        currentUrl: page.url(),
        pageTitle: await page.title(),
        success: true,
        duration: Date.now() - startTime
      });

      // Step 2: Login
      await this.logStep(taskId, stepNumber++, {
        stepName: 'login',
        stepType: 'form_input',
        success: false
      });

      // Wait for username field and enter credentials
      await page.waitForSelector('input[type="text"], input[type="email"]', { timeout: 10000 });
      await page.type('input[type="text"], input[type="email"]', this.integration.username || '');
      
      await page.waitForSelector('input[type="password"]', { timeout: 5000 });
      await page.type('input[type="password"]', this.integration.password || '');
      
      // Click login button
      await page.click('button[type="submit"], input[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      await this.takeScreenshot(page, 'after_login', taskId);

      // Step 3: Navigate to payment section
      await this.logStep(taskId, stepNumber++, {
        stepName: 'navigate_to_payment',
        stepType: 'navigation',
        success: false
      });

      // Look for payment-related links
      const paymentSelectors = [
        'a[href*="payment"]',
        'a[href*="pay"]',
        'a:contains("Pay Bill")',
        'a:contains("Make Payment")',
        'button:contains("Pay")'
      ];

      let paymentFound = false;
      for (const selector of paymentSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          await page.click(selector);
          paymentFound = true;
          break;
        } catch (error) {
          continue;
        }
      }

      if (!paymentFound) {
        throw new Error('Payment section not found');
      }

      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      await this.takeScreenshot(page, 'payment_page', taskId);

      // Step 4: Enter meter number
      await this.logStep(taskId, stepNumber++, {
        stepName: 'enter_meter_number',
        stepType: 'form_input',
        inputValue: taskData.meterNumber,
        success: false
      });

      const meterSelectors = [
        'input[name*="meter"]',
        'input[id*="meter"]',
        'input[placeholder*="meter"]',
        'input[name*="account"]',
        'input[id*="account"]'
      ];

      let meterFieldFound = false;
      for (const selector of meterSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          await page.type(selector, taskData.meterNumber);
          meterFieldFound = true;
          break;
        } catch (error) {
          continue;
        }
      }

      if (!meterFieldFound) {
        throw new Error('Meter number field not found');
      }

      // Step 5: Enter payment amount
      await this.logStep(taskId, stepNumber++, {
        stepName: 'enter_amount',
        stepType: 'form_input',
        inputValue: taskData.amount.toString(),
        success: false
      });

      const amountSelectors = [
        'input[name*="amount"]',
        'input[id*="amount"]',
        'input[type="number"]'
      ];

      let amountFieldFound = false;
      for (const selector of amountSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          await page.clear(selector);
          await page.type(selector, taskData.amount.toString());
          amountFieldFound = true;
          break;
        } catch (error) {
          continue;
        }
      }

      if (!amountFieldFound) {
        throw new Error('Amount field not found');
      }

      // Step 6: Enter card information
      await this.logStep(taskId, stepNumber++, {
        stepName: 'enter_card_info',
        stepType: 'form_input',
        success: false
      });

      // Card number
      await page.waitForSelector('input[name*="card"], input[id*="card"]', { timeout: 5000 });
      await page.type('input[name*="card"], input[id*="card"]', taskData.cardNumber);

      // Expiry date
      const expirySelectors = [
        'input[name*="expiry"]',
        'input[name*="exp"]',
        'input[id*="expiry"]',
        'input[placeholder*="MM/YY"]'
      ];

      for (const selector of expirySelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
          await page.type(selector, taskData.expiryDate);
          break;
        } catch (error) {
          continue;
        }
      }

      // CVV
      const cvvSelectors = [
        'input[name*="cvv"]',
        'input[name*="cvc"]',
        'input[id*="cvv"]',
        'input[placeholder*="CVV"]'
      ];

      for (const selector of cvvSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
          await page.type(selector, taskData.cvv);
          break;
        } catch (error) {
          continue;
        }
      }

      await this.takeScreenshot(page, 'payment_form_filled', taskId);

      // Step 7: Submit payment
      await this.logStep(taskId, stepNumber++, {
        stepName: 'submit_payment',
        stepType: 'click',
        success: false
      });

      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:contains("Pay")',
        'button:contains("Submit")',
        'button:contains("Process")'
      ];

      let submitFound = false;
      for (const selector of submitSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          await page.click(selector);
          submitFound = true;
          break;
        } catch (error) {
          continue;
        }
      }

      if (!submitFound) {
        throw new Error('Submit button not found');
      }

      // Wait for response
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      await this.takeScreenshot(page, 'payment_result', taskId);

      // Step 8: Check for success/failure
      const pageContent = await page.content();
      const successKeywords = ['success', 'confirmed', 'completed', 'thank you', 'receipt'];
      const errorKeywords = ['error', 'failed', 'declined', 'invalid', 'insufficient'];

      let paymentSuccess = false;
      let confirmationNumber = '';

      // Look for success indicators
      for (const keyword of successKeywords) {
        if (pageContent.toLowerCase().includes(keyword)) {
          paymentSuccess = true;
          break;
        }
      }

      // Look for error indicators
      for (const keyword of errorKeywords) {
        if (pageContent.toLowerCase().includes(keyword)) {
          paymentSuccess = false;
          break;
        }
      }

      // Try to extract confirmation number
      const confirmationRegex = /confirmation.*?(\w{8,})|reference.*?(\w{8,})|transaction.*?(\w{8,})/i;
      const match = pageContent.match(confirmationRegex);
      if (match) {
        confirmationNumber = match[1] || match[2] || match[3] || '';
      }

      return {
        success: paymentSuccess,
        confirmationNumber,
        amount: taskData.amount,
        meterNumber: taskData.meterNumber,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      await this.takeScreenshot(page, 'error_utility_payment', taskId);
      throw error;
    }
  }

  // Execute data entry task
  private async executeDataEntry(page: Page, taskId: number, taskData: DataEntryTask): Promise<any> {
    // Implementation for generic data entry tasks
    // This would be customized based on the specific system
    throw new Error('Data entry task not implemented yet');
  }

  // Execute balance check task
  private async executeBalanceCheck(page: Page, taskId: number, taskData: BalanceCheckTask): Promise<any> {
    // Implementation for balance checking
    throw new Error('Balance check task not implemented yet');
  }

  // Create new automation task
  static async createTask(taskData: InsertAutomationTask): Promise<number> {
    const [task] = await db
      .insert(automationTasks)
      .values(taskData)
      .returning();

    return task.id;
  }

  // Get pending tasks
  static async getPendingTasks(integrationId?: number): Promise<AutomationTask[]> {
    const query = db
      .select()
      .from(automationTasks)
      .where(
        and(
          eq(automationTasks.status, 'pending'),
          integrationId ? eq(automationTasks.integrationId, integrationId) : undefined
        )
      )
      .orderBy(automationTasks.createdAt);

    return await query;
  }

  // Process pending tasks
  static async processPendingTasks(): Promise<void> {
    const pendingTasks = await this.getPendingTasks();

    for (const task of pendingTasks) {
      try {
        // Get integration details
        const [integration] = await db
          .select()
          .from(externalIntegrations)
          .where(
            and(
              eq(externalIntegrations.id, task.integrationId),
              eq(externalIntegrations.isActive, true)
            )
          );

        if (!integration) {
          console.error(`Integration ${task.integrationId} not found or inactive`);
          continue;
        }

        const automationService = new WebAutomationService(integration);
        await automationService.executeTask(task.id);
        await automationService.closeBrowser();

      } catch (error) {
        console.error(`Failed to process task ${task.id}:`, error);
      }
    }
  }
}

export default WebAutomationService;