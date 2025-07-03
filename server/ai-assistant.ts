import OpenAI from "openai";
import { storage } from "./storage";
import type { Client, Property, Application } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AssistantQuery {
  message: string;
  context?: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface AssistantResponse {
  response: string;
  confidence: number;
  suggestions?: string[];
}

export class PropertyAssistant {
  private async getSystemContext(): Promise<string> {
    const [
      clients, 
      properties, 
      applications, 
      vendors, 
      otherSubsidies, 
      transactions, 
      poolFundEntries, 
      housingSupportRecords,
      users
    ] = await Promise.all([
      storage.getClients(),
      storage.getProperties(),
      storage.getApplications(),
      storage.getVendors(),
      storage.getOtherSubsidies(),
      storage.getTransactions(),
      storage.getPoolFundEntries(),
      storage.getHousingSupportRecords(),
      storage.getUsers(),
    ]);

    const stats = await storage.getDashboardStats();
    const poolFundBalance = await storage.getPoolFundBalance();

    return `You are an expert AI assistant for a comprehensive Housing Program Management System. You have complete access to all system data and can provide detailed insights and analysis.

SYSTEM OVERVIEW & STATISTICS:
- Total Clients: ${stats.totalClients} (Active: ${clients.filter(c => c.status === 'active').length})
- Total Properties: ${stats.activeProperties} (Available: ${properties.filter(p => p.status === 'available').length}, Occupied: ${properties.filter(p => p.status === 'occupied').length})
- Pending Applications: ${stats.pendingApplications} (Total: ${applications.length})
- Current Pool Fund Balance: $${poolFundBalance.toFixed(2)}
- Total Vendors: ${stats.totalVendors}
- Active Other Subsidies: ${stats.activeOtherSubsidies} (Total Monthly: $${stats.totalOtherSubsidyAmount.toFixed(2)})
- Total Transactions: ${transactions.length}
- Housing Support Records: ${housingSupportRecords.length}
- System Users: ${users.length}

FINANCIAL SUMMARY:
- Total Revenue: $${transactions.filter(t => t.type === 'county_reimbursement').reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0).toFixed(2)}
- Total Expenses: $${transactions.filter(t => ['rent_payment', 'deposit_payment', 'application_fee'].includes(t.type)).reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0).toFixed(2)}
- Pool Fund Deposits: $${poolFundEntries.filter(e => e.type === 'deposit').reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0).toFixed(2)}
- Pool Fund Withdrawals: $${poolFundEntries.filter(e => e.type === 'withdrawal').reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0).toFixed(2)}

PROPERTIES:
${properties.map(p => `
- ${p.address} (ID: ${p.id})
  Status: ${p.status}
  Bedrooms: ${p.bedrooms}, Bathrooms: ${p.bathrooms}
  Rent: $${p.rentAmount}/month
  Deposit: $${p.depositAmount}
  Landlord: ${p.landlordName} (${p.landlordPhone})
  Square Footage: ${p.squareFootage} sq ft
`).join('')}

CLIENTS:
${clients.map(c => `
- ${c.firstName} ${c.lastName} (ID: ${c.id})
  Status: ${c.status}
  Phone: ${c.phone}
  Email: ${c.email}
  Income: $${c.monthlyIncome}
  Employment: ${c.employmentStatus}
`).join('')}

APPLICATIONS:
${applications.map(a => `
- Application ID: ${a.id}
  Client ID: ${a.clientId}
  Property ID: ${a.propertyId}
  Status: ${a.status}
  Rent Paid: $${a.rentPaid}
  County Reimbursement: $${a.countyReimbursement || 'N/A'}
`).join('')}

VENDORS:
${vendors.map(v => `
- ${v.name} (ID: ${v.id})
  Type: ${v.type}
  Contact: ${v.contactPerson || 'N/A'} (${v.phone || 'N/A'})
  Email: ${v.email || 'N/A'}
  Address: ${v.address || 'N/A'}
  Registration: ${v.registrationNumber || 'N/A'}
  Capacity: ${v.capacity || 'N/A'}
  Daily Rate: $${v.dailyRate || 'N/A'}
`).join('')}

OTHER SUBSIDIES:
${otherSubsidies.map(s => `
- Client: ${s.clientName}
  Vendor: ${s.vendorName}
  Program: ${s.subsidyProgram}
  Status: ${s.subsidyStatus}
  Base Rent: $${s.baseRent || 'N/A'}
  We Pay: $${s.rentWePaid || 'N/A'}
  Subsidy Received: $${s.subsidyReceived || 'N/A'}
  Site: ${s.site || 'N/A'}
  Cluster: ${s.cluster || 'N/A'}
`).join('')}

RECENT TRANSACTIONS:
${transactions.slice(-10).map(t => `
- ID: ${t.id}, Type: ${t.type}
  Amount: $${t.amount}
  Description: ${t.description || 'N/A'}
  Date: ${t.createdAt}
`).join('')}

HOUSING SUPPORT RECORDS:
${housingSupportRecords.slice(-5).map(h => `
- Client ID: ${h.clientId}, Month: ${h.month}
  Rent Amount: $${h.rentAmount}
  Subsidy Received: $${h.subsidyReceived}
  Running Pool Total: $${h.runningPoolTotal}
`).join('')}

POOL FUND ENTRIES:
${poolFundEntries.slice(-5).map(p => `
- Type: ${p.type}, Amount: $${p.amount}
  Client ID: ${p.clientId || 'N/A'}
  Description: ${p.description || 'N/A'}
`).join('')}

SYSTEM USERS:
${users.map(u => `
- ${u.firstName} ${u.lastName} (${u.username})
  Email: ${u.email}
  Role: ${u.isSuperAdmin ? 'Super Admin' : 'Staff'}
  Status: ${u.isEnabled ? 'Active' : 'Inactive'}
  Last Login: ${u.lastLogin || 'Never'}
`).join('')}

EXPERT CAPABILITIES - You can provide comprehensive assistance with:

PROPERTY MANAGEMENT:
- Instant property searches by location, price, bedrooms, status
- Vacancy recommendations based on client needs
- Landlord contact information and property details
- Rental market analysis and comparisons
- Property availability forecasting

CLIENT SERVICES:
- Complete client profiles and history analysis
- Income verification and eligibility assessments
- Application status tracking and next steps
- Client matching with suitable properties
- KYC compliance monitoring

FINANCIAL ANALYSIS:
- Real-time financial reporting and cash flow analysis
- Pool fund optimization and allocation strategies
- Revenue forecasting and expense tracking
- Reimbursement calculations and timing
- Budget variance analysis

VENDOR COORDINATION:
- Service provider recommendations by type and location
- Contract management and compliance tracking
- Capacity planning and resource allocation
- Performance metrics and vendor comparisons

HOUSING SUPPORT OPERATIONS:
- Automated pool fund calculations
- Monthly reporting and compliance tracking
- Client fund allocation optimization
- Running total maintenance and monitoring

SYSTEM ADMINISTRATION:
- User management and role-based permissions
- Audit trail analysis and compliance reporting
- Data integrity monitoring and validation
- Performance metrics and system optimization

ADVANCED FEATURES:
- Predictive analytics for application success rates
- Automated eligibility screening
- Risk assessment and mitigation strategies
- Trend analysis and performance insights
- Compliance monitoring and reporting

CONVERSATION INTELLIGENCE:
- Context-aware responses maintaining conversation history
- Entity recognition (clients, properties, vendors, applications)
- Multi-step task completion and workflow automation
- Proactive suggestions based on current data patterns

IMPORTANT GUIDELINES:
1. Always provide specific, actionable information based on real system data
2. Maintain conversation context - remember previous references to specific entities
3. Offer proactive insights and recommendations based on data patterns
4. Suggest optimal next steps for complex workflows
5. Provide comprehensive analysis when requested, including financial impacts
6. Alert users to important deadlines, compliance issues, or data anomalies
7. Support both quick queries and detailed analytical requests

Always be professional, accurate, and solution-oriented. Leverage the complete system knowledge to provide insights that go beyond simple data retrieval.`;
  }

  async processQuery(query: AssistantQuery): Promise<AssistantResponse> {
    try {
      const systemContext = await this.getSystemContext();

      // Build conversation messages with history
      const messages = [
        {
          role: "system" as const,
          content: systemContext,
        },
        // Add conversation history if provided
        ...(query.conversationHistory || []),
        {
          role: "user" as const,
          content: query.message,
        },
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages,
        temperature: 0.7,
        max_tokens: 1500,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
      });

      const assistantResponse = response.choices[0].message.content || "I'm sorry, I couldn't process your request.";

      // Generate intelligent suggestions based on the query and current system state
      const suggestions = await this.generateSuggestions(query.message);

      // Calculate confidence based on response quality and system data availability
      const confidence = this.calculateConfidence(assistantResponse, query.message);

      return {
        response: assistantResponse,
        confidence,
        suggestions,
      };
    } catch (error) {
      console.error('AI Assistant error:', error);
      return {
        response: "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
        confidence: 0.0,
        suggestions: ["Try asking about specific properties", "Check property availability", "Ask about client applications"],
      };
    }
  }

  private async generateSuggestions(query: string): Promise<string[]> {
    const queryLower = query.toLowerCase();
    const suggestions: string[] = [];

    // Get current system data for context-aware suggestions
    const stats = await storage.getDashboardStats();

    // Property-related queries
    if (queryLower.includes('property') || queryLower.includes('house') || queryLower.includes('apartment') || queryLower.includes('available')) {
      suggestions.push(`Show ${stats.activeProperties} available properties by rent range`);
      suggestions.push("Find properties suitable for specific client needs");
      suggestions.push("Compare landlord contact details and rates");
    }

    // Client-related queries  
    else if (queryLower.includes('client') || queryLower.includes('tenant') || queryLower.includes('resident')) {
      suggestions.push(`Analyze ${stats.totalClients} client profiles and eligibility`);
      suggestions.push("Match clients with suitable properties");
      suggestions.push("Review client application history and success rates");
    }

    // Application-related queries
    else if (queryLower.includes('application') || queryLower.includes('apply') || queryLower.includes('pending')) {
      suggestions.push(`Process ${stats.pendingApplications} pending applications`);
      suggestions.push("Calculate application approval rates and trends");
      suggestions.push("Review county reimbursement status");
    }

    // Financial queries
    else if (queryLower.includes('money') || queryLower.includes('cost') || queryLower.includes('rent') || queryLower.includes('fund') || queryLower.includes('budget')) {
      suggestions.push(`Analyze pool fund balance: $${stats.poolFundBalance.toFixed(0)}`);
      suggestions.push("Calculate monthly revenue and expense projections");
      suggestions.push("Review vendor payments and subsidy allocations");
    }

    // Vendor queries
    else if (queryLower.includes('vendor') || queryLower.includes('provider') || queryLower.includes('service')) {
      suggestions.push(`Review ${stats.totalVendors} vendors by type and capacity`);
      suggestions.push("Compare vendor rates and service areas");
      suggestions.push("Check vendor compliance and contract status");
    }

    // Subsidy queries
    else if (queryLower.includes('subsidy') || queryLower.includes('support') || queryLower.includes('assistance')) {
      suggestions.push(`Track ${stats.activeOtherSubsidies} active subsidies ($${stats.totalOtherSubsidyAmount.toFixed(0)}/month)`);
      suggestions.push("Calculate housing support pool allocations");
      suggestions.push("Review subsidy program effectiveness");
    }

    // Reporting and analytics
    else if (queryLower.includes('report') || queryLower.includes('analytics') || queryLower.includes('trend') || queryLower.includes('performance')) {
      suggestions.push("Generate comprehensive system performance report");
      suggestions.push("Analyze occupancy trends and forecasts");
      suggestions.push("Review financial performance and ROI metrics");
    }

    // User management queries
    else if (queryLower.includes('user') || queryLower.includes('admin') || queryLower.includes('access') || queryLower.includes('permission')) {
      suggestions.push("Review user access levels and activity");
      suggestions.push("Check system audit trails and compliance");
      suggestions.push("Analyze user workflow efficiency");
    }

    // General/default suggestions with current data context
    else {
      suggestions.push(`Quick overview: ${stats.totalClients} clients, ${stats.activeProperties} properties`);
      suggestions.push("What requires immediate attention today?");
      suggestions.push("Analyze current system performance and trends");
    }

    return suggestions.slice(0, 3);
  }

  private calculateConfidence(response: string, query: string): number {
    let confidence = 0.7; // Base confidence

    // Increase confidence for data-rich responses
    if (response.includes('$') || response.includes('client') || response.includes('property')) {
      confidence += 0.1;
    }

    // Increase confidence for specific answers
    if (response.length > 100 && response.includes('ID:')) {
      confidence += 0.1;
    }

    // Increase confidence for responses with numbers/statistics
    if (/\d+/.test(response)) {
      confidence += 0.05;
    }

    // Decrease confidence for generic responses
    if (response.includes("I'm sorry") || response.includes("I don't have")) {
      confidence -= 0.3;
    }

    // Ensure confidence is between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    try {
      // Determine file extension based on buffer content or default to webm
      let fileExtension = "webm";
      let mimeType = "audio/webm";
      
      // Check for common audio file signatures
      const bufferStart = audioBuffer.subarray(0, 12).toString('hex');
      if (bufferStart.startsWith('52494646') && bufferStart.includes('57415645')) {
        fileExtension = "wav";
        mimeType = "audio/wav";
      } else if (bufferStart.startsWith('1a45dfa3')) {
        fileExtension = "webm";
        mimeType = "audio/webm";
      }

      console.log(`Processing audio file: ${fileExtension}, size: ${audioBuffer.length} bytes`);

      const response = await openai.audio.transcriptions.create({
        file: new File([audioBuffer], `audio.${fileExtension}`, { type: mimeType }),
        model: "whisper-1",
        language: "en", // Specify language for better accuracy
        temperature: 0.2, // Lower temperature for more focused transcription
      });

      console.log('Transcription successful:', response.text);
      return response.text;
    } catch (error) {
      console.error('Audio transcription error:', error);
      throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async textToSpeech(text: string): Promise<Buffer> {
    try {
      const response = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: text,
      });

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      console.error('Text-to-speech error:', error);
      throw new Error('Failed to convert text to speech');
    }
  }
}

export const propertyAssistant = new PropertyAssistant();