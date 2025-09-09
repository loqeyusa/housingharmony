import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ExtractedPaymentData {
  clientName: string;
  caseNumber?: string;
  paymentAmount: number;
  paymentDate?: string;
  county?: string;
  address?: string;
  documentType: 'check' | 'payment_advice' | 'electronic_payment' | 'other';
  checkNumber?: string;
  paymentMethod?: string;
  confidence: number;
}

export interface PaymentDocumentAnalysis {
  success: boolean;
  extractedData: ExtractedPaymentData[];
  documentType: string;
  analysisConfidence: number;
  rawAnalysis: string;
  error?: string;
}

export async function analyzePaymentDocument(base64Image: string): Promise<PaymentDocumentAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using GPT-4o for vision capabilities with payment documents
      messages: [
        {
          role: "system",
          content: `You are a payment document analyzer for a housing management system. Analyze payment documents from Minnesota counties (Ramsey, Hennepin, Dakota, Steele) and extract structured payment information.

IMPORTANT: Return ONLY valid JSON in this exact format:
{
  "success": true,
  "extractedData": [
    {
      "clientName": "LAWRENCE BELL",
      "caseNumber": "01463294",
      "paymentAmount": 1242.00,
      "paymentDate": "2025-01-09",
      "county": "Hennepin County",
      "address": "2546 E 23RD ST APT 124, MINNEAPOLIS, MN 55406",
      "documentType": "check",
      "checkNumber": "123456789",
      "paymentMethod": "check",
      "confidence": 0.95
    }
  ],
  "documentType": "county_payment_advice",
  "analysisConfidence": 0.95,
  "rawAnalysis": "State of Minnesota Department of Human Services payment document for housing assistance"
}

Instructions:
1. Extract ALL clients found on the document (there may be multiple)
2. For each client, extract: name, case number, payment amount, address
3. Determine county from address or document header (Minneapolis=Hennepin, St. Paul=Ramsey, etc.)
4. Payment amounts should be numbers (no currency symbols)
5. Dates should be in YYYY-MM-DD format
6. Set confidence scores (0.0-1.0) based on text clarity
7. Document types: "check", "payment_advice", "electronic_payment", "other"
8. Payment methods: "check", "ach", "wire_transfer", "electronic", "cash", "other"

Look for patterns like:
- State of Minnesota letterhead
- Department of Human Services
- County names in addresses or headers
- Case numbers (usually 8 digits)
- Payment amounts with $ symbols
- Client names in ALL CAPS
- Addresses with MN zip codes
- Check numbers on payment documents

CRITICAL: Response must be valid JSON only, no other text.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this payment document and extract all client payment information. Return only the JSON response as specified."
            },
            {
              type: "image_url",
              image_url: {
                url: base64Image
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2000,
    });

    const analysisText = response.choices[0].message.content;
    if (!analysisText) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const analysis: PaymentDocumentAnalysis = JSON.parse(analysisText);
    
    // Validate the response structure
    if (!analysis.success || !Array.isArray(analysis.extractedData)) {
      throw new Error('Invalid analysis response structure');
    }

    return analysis;

  } catch (error) {
    console.error('Error analyzing payment document:', error);
    return {
      success: false,
      extractedData: [],
      documentType: 'unknown',
      analysisConfidence: 0,
      rawAnalysis: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function findMatchingClients(extractedData: ExtractedPaymentData[], companyId: number, storage: any) {
  const matchResults = [];

  for (const data of extractedData) {
    try {
      // Try to find client by case number first (most reliable)
      let client = null;
      
      if (data.caseNumber) {
        const clients = await storage.getClientsByCaseNumber(data.caseNumber, companyId);
        if (clients && clients.length > 0) {
          client = clients[0];
        }
      }

      // If no match by case number, try by name
      if (!client) {
        const [firstName, ...lastNameParts] = data.clientName.split(' ');
        const lastName = lastNameParts.join(' ');
        
        if (firstName && lastName) {
          const clients = await storage.getClientsByName(firstName, lastName, companyId);
          if (clients && clients.length > 0) {
            client = clients[0];
          }
        }
      }

      matchResults.push({
        extractedData: data,
        matchedClient: client,
        matchType: client ? (data.caseNumber ? 'case_number' : 'name') : 'no_match',
        confidence: client ? (data.caseNumber ? 0.95 : 0.75) : 0
      });

    } catch (error) {
      console.error('Error finding matching client:', error);
      matchResults.push({
        extractedData: data,
        matchedClient: null,
        matchType: 'error',
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return matchResults;
}

export function determineCountyFromAddress(address: string): string {
  if (!address) return 'Unknown';
  
  const addressLower = address.toLowerCase();
  
  // Common city to county mappings for Minnesota
  const cityToCounty = {
    'minneapolis': 'Hennepin County',
    'st. paul': 'Ramsey County',
    'saint paul': 'Ramsey County',
    'bloomington': 'Hennepin County',
    'plymouth': 'Hennepin County',
    'brooklyn park': 'Hennepin County',
    'woodbury': 'Washington County',
    'lakeville': 'Dakota County',
    'burnsville': 'Dakota County',
    'apple valley': 'Dakota County',
    'eagan': 'Dakota County',
    'owatonna': 'Steele County',
    'faribault': 'Rice County'
  };

  for (const [city, county] of Object.entries(cityToCounty)) {
    if (addressLower.includes(city)) {
      return county;
    }
  }

  // Check zip code ranges for common counties
  const zipCodeMatch = address.match(/\b55\d{3}\b/);
  if (zipCodeMatch) {
    const zipCode = parseInt(zipCodeMatch[0]);
    
    // Common Minnesota zip code ranges
    if (zipCode >= 55401 && zipCode <= 55488) return 'Hennepin County';
    if (zipCode >= 55101 && zipCode <= 55199) return 'Ramsey County';
    if (zipCode >= 55068 && zipCode <= 55077) return 'Dakota County';
    if (zipCode >= 55060 && zipCode <= 55080) return 'Steele County';
  }

  return 'Unknown County';
}

export async function analyzeImage(imageData: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this image in detail. Describe what you see, identify any text, objects, people, or important elements. Provide a comprehensive analysis including colors, composition, context, and any notable features or details."
            },
            {
              type: "image_url",
              image_url: {
                url: imageData
              }
            }
          ],
        },
      ],
      max_completion_tokens: 1000,
    });

    const analysis = response.choices[0].message.content;
    
    return {
      analysis: analysis || "I can see the image but couldn't generate a detailed analysis.",
      confidence: 0.9,
      details: {
        model: "gpt-4o",
        tokens_used: response.usage?.total_tokens || 0
      },
      success: true
    };
  } catch (error) {
    console.error('OpenAI image analysis error:', error);
    throw new Error(error instanceof Error ? error.message : 'Image analysis failed');
  }
}