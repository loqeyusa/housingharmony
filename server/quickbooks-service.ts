import axios from 'axios';
import { db } from './db';
import { 
  externalIntegrations, 
  quickbooksSyncLog, 
  clients, 
  transactions,
  type ExternalIntegration,
  type InsertQuickbooksSyncLog
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';

// QuickBooks OAuth and API configuration
const QB_BASE_URL = 'https://sandbox-quickbooks.api.intuit.com'; // Use production URL for live
const QB_DISCOVERY_DOCUMENT_URL = 'https://appcenter.intuit.com/api/v1/OpenID_sandbox'; // Discovery document

export interface QuickBooksConfig {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  realmId: string; // Company ID in QuickBooks
  baseUrl: string;
}

export interface QuickBooksCustomer {
  Name: string;
  CompanyName?: string;
  PrimaryEmailAddr?: {
    Address: string;
  };
  PrimaryPhone?: {
    FreeFormNumber: string;
  };
  BillAddr?: {
    Line1: string;
    City: string;
    CountrySubDivisionCode: string;
    PostalCode: string;
  };
  Notes?: string;
}

export interface QuickBooksInvoice {
  Line: Array<{
    Amount: number;
    DetailType: 'SalesItemLineDetail';
    SalesItemLineDetail: {
      ItemRef: {
        value: string;
        name: string;
      };
    };
  }>;
  CustomerRef: {
    value: string;
  };
  DueDate?: string;
  TxnDate: string;
}

export interface QuickBooksPayment {
  TotalAmt: number;
  CustomerRef: {
    value: string;
  };
  Line: Array<{
    Amount: number;
    LinkedTxn: Array<{
      TxnId: string;
      TxnType: 'Invoice';
    }>;
  }>;
  TxnDate: string;
}

export class QuickBooksService {
  private config: QuickBooksConfig;
  private integrationId: number;

  constructor(integration: ExternalIntegration) {
    this.integrationId = integration.id;
    this.config = {
      clientId: integration.apiCredentials?.clientId || '',
      clientSecret: integration.apiCredentials?.clientSecret || '',
      accessToken: integration.apiCredentials?.accessToken || '',
      refreshToken: integration.apiCredentials?.refreshToken || '',
      realmId: integration.apiCredentials?.realmId || '',
      baseUrl: integration.settings?.baseUrl || QB_BASE_URL,
    };
  }

  // Get OAuth authorization URL
  static getAuthorizationUrl(clientId: string, redirectUri: string, state: string): string {
    const scope = 'com.intuit.quickbooks.accounting';
    const baseUrl = 'https://appcenter.intuit.com/connect/oauth2';
    
    const params = new URLSearchParams({
      'client_id': clientId,
      'scope': scope,
      'redirect_uri': redirectUri,
      'response_type': 'code',
      'access_type': 'offline',
      'state': state
    });

    return `${baseUrl}?${params.toString()}`;
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<{
    access_token: string;
    refresh_token: string;
    realmId: string;
  }> {
    try {
      const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
      
      const response = await axios.post(tokenUrl, {
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`
        }
      });

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        realmId: response.data.realmId
      };
    } catch (error: any) {
      console.error('QuickBooks token exchange failed:', error.response?.data || error.message);
      throw new Error(`Failed to exchange code for tokens: ${error.message}`);
    }
  }

  // Refresh access token
  async refreshAccessToken(): Promise<string> {
    try {
      const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
      
      const response = await axios.post(tokenUrl, {
        grant_type: 'refresh_token',
        refresh_token: this.config.refreshToken,
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`
        }
      });

      this.config.accessToken = response.data.access_token;
      if (response.data.refresh_token) {
        this.config.refreshToken = response.data.refresh_token;
      }

      // Update the integration record with new tokens
      await db.update(externalIntegrations)
        .set({
          apiCredentials: {
            ...this.config,
            accessToken: this.config.accessToken,
            refreshToken: this.config.refreshToken
          },
          lastSyncAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(externalIntegrations.id, this.integrationId));

      return this.config.accessToken;
    } catch (error: any) {
      console.error('Token refresh failed:', error.response?.data || error.message);
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }

  // Make authenticated API request to QuickBooks
  private async makeRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' = 'GET', data?: any) {
    try {
      const url = `${this.config.baseUrl}/v3/company/${this.config.realmId}/${endpoint}`;
      
      const response = await axios({
        method,
        url,
        data,
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Token expired, try to refresh
        await this.refreshAccessToken();
        
        // Retry the request
        const url = `${this.config.baseUrl}/v3/company/${this.config.realmId}/${endpoint}`;
        const response = await axios({
          method,
          url,
          data,
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        return response.data;
      }
      
      throw error;
    }
  }

  // Sync client to QuickBooks as Customer
  async syncClientToQuickBooks(clientId: number): Promise<string> {
    try {
      // Get client data
      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, clientId));

      if (!client) {
        throw new Error('Client not found');
      }

      // Check if customer already exists in QuickBooks
      const existingSync = await db
        .select()
        .from(quickbooksSyncLog)
        .where(
          and(
            eq(quickbooksSyncLog.recordType, 'client'),
            eq(quickbooksSyncLog.recordId, clientId),
            eq(quickbooksSyncLog.status, 'success')
          )
        )
        .orderBy(quickbooksSyncLog.syncedAt)
        .limit(1);

      let quickbooksId: string;

      if (existingSync.length > 0 && existingSync[0].quickbooksId) {
        // Update existing customer
        const customerData: QuickBooksCustomer = {
          Id: existingSync[0].quickbooksId,
          Name: `${client.firstName} ${client.lastName}`,
          PrimaryEmailAddr: {
            Address: client.email
          },
          PrimaryPhone: {
            FreeFormNumber: client.phone
          },
          BillAddr: {
            Line1: client.currentAddress,
            City: '',
            CountrySubDivisionCode: 'MN',
            PostalCode: ''
          },
          Notes: `Housing Client - Vendor: ${client.vendorNumber || 'N/A'}`
        };

        const response = await this.makeRequest('customers', 'POST', {
          Customer: customerData
        });

        quickbooksId = response.QueryResponse?.Customer?.[0]?.Id || existingSync[0].quickbooksId;
      } else {
        // Create new customer
        const customerData: QuickBooksCustomer = {
          Name: `${client.firstName} ${client.lastName}`,
          PrimaryEmailAddr: {
            Address: client.email
          },
          PrimaryPhone: {
            FreeFormNumber: client.phone
          },
          BillAddr: {
            Line1: client.currentAddress,
            City: '',
            CountrySubDivisionCode: 'MN',
            PostalCode: ''
          },
          Notes: `Housing Client - Vendor: ${client.vendorNumber || 'N/A'}`
        };

        const response = await this.makeRequest('customers', 'POST', {
          Customer: customerData
        });

        quickbooksId = response.QueryResponse?.Customer?.[0]?.Id;
      }

      // Log the sync
      await this.logSync({
        syncType: 'customers',
        recordType: 'client',
        recordId: clientId,
        quickbooksId,
        action: existingSync.length > 0 ? 'update' : 'create',
        status: 'success',
        syncData: { clientId, quickbooksId },
        response: { quickbooksId }
      });

      return quickbooksId;
    } catch (error: any) {
      // Log the error
      await this.logSync({
        syncType: 'customers',
        recordType: 'client',
        recordId: clientId,
        action: 'create',
        status: 'failed',
        errorMessage: error.message,
        syncData: { clientId }
      });

      throw error;
    }
  }

  // Sync transaction to QuickBooks
  async syncTransactionToQuickBooks(transactionId: number): Promise<string> {
    try {
      // Get transaction and client data
      const [transaction] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, transactionId));

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Get or create QuickBooks customer for the client
      const quickbooksCustomerId = await this.syncClientToQuickBooks(transaction.clientId);

      // Create invoice or payment based on transaction type
      let quickbooksId: string;
      let syncType: string;

      if (transaction.type === 'payment' && transaction.amount > 0) {
        // Create payment record
        const paymentData: QuickBooksPayment = {
          TotalAmt: Number(transaction.amount),
          CustomerRef: {
            value: quickbooksCustomerId
          },
          Line: [{
            Amount: Number(transaction.amount),
            LinkedTxn: [] // Would link to invoice if available
          }],
          TxnDate: transaction.transactionDate || new Date().toISOString().split('T')[0]
        };

        const response = await this.makeRequest('payments', 'POST', {
          Payment: paymentData
        });

        quickbooksId = response.QueryResponse?.Payment?.[0]?.Id;
        syncType = 'payments';
      } else {
        // Create invoice for expenses/charges
        const invoiceData: QuickBooksInvoice = {
          Line: [{
            Amount: Math.abs(Number(transaction.amount)),
            DetailType: 'SalesItemLineDetail',
            SalesItemLineDetail: {
              ItemRef: {
                value: '1', // Default service item - should be configurable
                name: 'Housing Services'
              }
            }
          }],
          CustomerRef: {
            value: quickbooksCustomerId
          },
          TxnDate: transaction.transactionDate || new Date().toISOString().split('T')[0]
        };

        const response = await this.makeRequest('invoices', 'POST', {
          Invoice: invoiceData
        });

        quickbooksId = response.QueryResponse?.Invoice?.[0]?.Id;
        syncType = 'invoices';
      }

      // Log the sync
      await this.logSync({
        syncType,
        recordType: 'transaction',
        recordId: transactionId,
        quickbooksId,
        action: 'create',
        status: 'success',
        syncData: { transactionId, quickbooksId, quickbooksCustomerId },
        response: { quickbooksId }
      });

      return quickbooksId;
    } catch (error: any) {
      // Log the error
      await this.logSync({
        syncType: 'invoices',
        recordType: 'transaction',
        recordId: transactionId,
        action: 'create',
        status: 'failed',
        errorMessage: error.message,
        syncData: { transactionId }
      });

      throw error;
    }
  }

  // Get QuickBooks company info
  async getCompanyInfo() {
    try {
      const response = await this.makeRequest('companyinfo/1');
      return response.QueryResponse?.CompanyInfo?.[0];
    } catch (error) {
      console.error('Failed to get company info:', error);
      throw error;
    }
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.getCompanyInfo();
      return true;
    } catch (error) {
      console.error('QuickBooks connection test failed:', error);
      return false;
    }
  }

  // Log sync operation
  private async logSync(logData: Omit<InsertQuickbooksSyncLog, 'companyId' | 'integrationId'>) {
    try {
      const integration = await db
        .select()
        .from(externalIntegrations)
        .where(eq(externalIntegrations.id, this.integrationId))
        .limit(1);

      if (integration.length === 0) {
        throw new Error('Integration not found');
      }

      await db.insert(quickbooksSyncLog).values({
        ...logData,
        companyId: integration[0].companyId,
        integrationId: this.integrationId
      });
    } catch (error) {
      console.error('Failed to log sync:', error);
    }
  }
}

export default QuickBooksService;