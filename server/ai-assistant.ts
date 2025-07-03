import OpenAI from "openai";
import { storage } from "./storage";
import type { Client, Property, Application } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AssistantQuery {
  message: string;
  context?: string;
}

export interface AssistantResponse {
  response: string;
  confidence: number;
  suggestions?: string[];
}

export class PropertyAssistant {
  private async getSystemContext(): Promise<string> {
    const [clients, properties, applications] = await Promise.all([
      storage.getClients(),
      storage.getProperties(),
      storage.getApplications(),
    ]);

    const stats = await storage.getDashboardStats();

    return `You are a helpful assistant for a Housing Program Management System. Here's the current system data:

SYSTEM OVERVIEW:
- Total Clients: ${stats.totalClients}
- Active Properties: ${stats.activeProperties}
- Pending Applications: ${stats.pendingApplications}
- Pool Fund Balance: $${stats.poolFundBalance.toFixed(2)}

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

You can answer questions about:
- Property availability, details, and recommendations
- Client information and status
- Application processing and requirements
- Financial information and calculations
- General housing program guidance

Always be helpful, accurate, and professional. If you don't have specific information, suggest how the user can find it or what actions they should take.`;
  }

  async processQuery(query: AssistantQuery): Promise<AssistantResponse> {
    try {
      const systemContext = await this.getSystemContext();

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemContext,
          },
          {
            role: "user",
            content: query.message,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const assistantResponse = response.choices[0].message.content || "I'm sorry, I couldn't process your request.";

      // Generate suggestions based on the query
      const suggestions = await this.generateSuggestions(query.message);

      return {
        response: assistantResponse,
        confidence: 0.9, // In a real system, this would be calculated based on various factors
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

    if (queryLower.includes('property') || queryLower.includes('house') || queryLower.includes('apartment')) {
      suggestions.push("Show me available properties");
      suggestions.push("What properties need maintenance?");
      suggestions.push("Which properties have the lowest rent?");
    }

    if (queryLower.includes('client') || queryLower.includes('tenant')) {
      suggestions.push("List all active clients");
      suggestions.push("Show clients with pending applications");
      suggestions.push("Which clients have the highest income?");
    }

    if (queryLower.includes('application') || queryLower.includes('apply')) {
      suggestions.push("Show pending applications");
      suggestions.push("What's the approval rate?");
      suggestions.push("How long does application processing take?");
    }

    if (queryLower.includes('money') || queryLower.includes('cost') || queryLower.includes('rent')) {
      suggestions.push("What's the average rent amount?");
      suggestions.push("Show pool fund balance");
      suggestions.push("Calculate total monthly expenses");
    }

    // Default suggestions if none match
    if (suggestions.length === 0) {
      suggestions.push("Tell me about available properties");
      suggestions.push("Show me client statistics");
      suggestions.push("What's the current pool fund balance?");
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    try {
      const response = await openai.audio.transcriptions.create({
        file: new File([audioBuffer], "audio.wav", { type: "audio/wav" }),
        model: "whisper-1",
      });

      return response.text;
    } catch (error) {
      console.error('Audio transcription error:', error);
      throw new Error('Failed to transcribe audio');
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