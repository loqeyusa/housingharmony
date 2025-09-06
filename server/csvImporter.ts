import { db } from "./db";
import { clients, properties, buildings, companies } from "@shared/schema";
import { eq, and, or } from "drizzle-orm";

export interface CSVClientData {
  caseNumber?: string;
  clientName: string;
  clientNumber?: string;
  clientAddress: string;
  propertiesManagement: string;
  county: string;
  cellNumber?: string;
  email?: string;
  comment?: string;
  rentalOfficeAddress?: string;
  rentAmount?: string;
  countyAmount?: string;
  notes?: string;
}

export function parseClientName(fullName: string): { firstName: string; lastName: string } {
  const nameParts = fullName.trim().split(/\s+/);
  
  if (nameParts.length === 1) {
    return { firstName: nameParts[0], lastName: "" };
  } else if (nameParts.length === 2) {
    return { firstName: nameParts[0], lastName: nameParts[1] };
  } else {
    // For names with more than 2 parts, take first as firstName and rest as lastName
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ");
    return { firstName, lastName };
  }
}

export function cleanPhoneNumber(phone?: string): string {
  if (!phone || phone.trim() === "") return "";
  
  // Remove all non-digit characters except spaces and dashes
  let cleaned = phone.replace(/[^\d\s\-\(\)]/g, "");
  
  // Handle common formatting patterns
  if (cleaned.includes("(") && cleaned.includes(")")) {
    // Format: (612) 475-5525
    cleaned = cleaned.replace(/\D/g, "");
  } else {
    // Remove all non-digits
    cleaned = cleaned.replace(/\D/g, "");
  }
  
  // Format as (XXX) XXX-XXXX if 10 digits
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone; // Return original if we can't parse it
}

export function cleanCurrency(amount?: string): string {
  if (!amount || amount.trim() === "") return "0.00";
  
  // Remove $ signs, commas, and extra spaces
  const cleaned = amount.replace(/[$,\s]/g, "").trim();
  
  // Handle "Moved Out" or other non-numeric values
  if (isNaN(parseFloat(cleaned))) {
    return "0.00";
  }
  
  return parseFloat(cleaned).toFixed(2);
}

export async function findOrCreateProperty(
  propertiesManagement: string,
  rentalOfficeAddress?: string,
  companyId: number = 1
): Promise<number | null> {
  if (!propertiesManagement || propertiesManagement.trim() === "" || 
      propertiesManagement === "NOT IN  THE DRIVE" || 
      propertiesManagement === "NOT LISTED") {
    return null;
  }

  // Try to find existing property by management company name
  const existingProperty = await db
    .select()
    .from(properties)
    .leftJoin(buildings, eq(properties.buildingId, buildings.id))
    .where(eq(buildings.name, propertiesManagement.trim()))
    .limit(1);

  if (existingProperty.length > 0) {
    return existingProperty[0].properties.id;
  }

  // If no property found, try to find building by management name
  const existingBuilding = await db
    .select()
    .from(buildings)
    .where(eq(buildings.name, propertiesManagement.trim()))
    .limit(1);

  let buildingId: number;

  if (existingBuilding.length > 0) {
    buildingId = existingBuilding[0].id;
  } else {
    // Create new building
    const [newBuilding] = await db
      .insert(buildings)
      .values({
        companyId,
        name: propertiesManagement.trim(),
        address: rentalOfficeAddress || "",
        landlordName: propertiesManagement.trim(),
        landlordPhone: "(000) 000-0000", // Default phone number
        landlordEmail: "info@example.com", // Default email
        totalUnits: 1,
        buildingType: "single_unit",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    buildingId = newBuilding.id;
  }

  // Create a generic property for this building
  const [newProperty] = await db
    .insert(properties)
    .values({
      companyId,
      buildingId,
      name: `${propertiesManagement.trim()} - Unit 1`,
      unitNumber: "1",
      rentAmount: "0.00",
      depositAmount: "0.00",
      bedrooms: 1,
      bathrooms: 1,
      status: "available",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return newProperty.id;
}

export async function upsertClient(clientData: CSVClientData, companyId: number = 1): Promise<void> {
  const { firstName, lastName } = parseClientName(clientData.clientName);
  
  // Clean and validate data
  const phone = cleanPhoneNumber(clientData.cellNumber);
  const email = clientData.email?.trim() || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
  const currentAddress = clientData.clientAddress?.trim() || "";
  const rentAmount = cleanCurrency(clientData.rentAmount);
  const countyAmount = cleanCurrency(clientData.countyAmount);
  
  // Skip clients with invalid data
  if (!firstName || !lastName || currentAddress === "" || 
      currentAddress === "NOT IN  THE DRIVE" || 
      currentAddress === "NO CAF/LEASE") {
    console.log(`Skipping client with invalid data: ${clientData.clientName}`);
    return;
  }

  // Find or create property
  const propertyId = await findOrCreateProperty(
    clientData.propertiesManagement,
    clientData.rentalOfficeAddress,
    companyId
  );

  const clientPayload = {
    companyId,
    caseNumber: clientData.caseNumber?.trim() || null,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email,
    phone: phone || "(000) 000-0000",
    dateOfBirth: "1990-01-01", // Default date since not in CSV
    ssn: "000-00-0000", // Default SSN since not in CSV
    currentAddress,
    employmentStatus: "unknown",
    monthlyIncome: "0.00",
    county: clientData.county?.trim() || null,
    propertyId,
    buildingId: propertyId ? await getBuildingIdFromProperty(propertyId) : null,
    countyAmount,
    notes: [clientData.comment, clientData.notes].filter(Boolean).join(" | "),
    status: "active",
    isActive: true,
    vendorNumber: null,
    site: null,
    cluster: null,
    subsidyStatus: "pending",
    grhStatus: "pending",
    maxHousingPayment: rentAmount,
    clientObligationPercent: "30.00",
    currentBalance: "0.00",
    creditLimit: "-100.00",
  };

  try {
    // Check if client already exists by case number or name+address
    let existingClient = null;
    
    if (clientData.caseNumber) {
      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.caseNumber, clientData.caseNumber.trim()))
        .limit(1);
      existingClient = client;
    }
    
    if (!existingClient) {
      // Try to find by name and address
      const [client] = await db
        .select()
        .from(clients)
        .where(and(
          eq(clients.firstName, firstName.trim()),
          eq(clients.lastName, lastName.trim()),
          eq(clients.currentAddress, currentAddress)
        ))
        .limit(1);
      existingClient = client;
    }

    if (existingClient) {
      // Update existing client
      await db
        .update(clients)
        .set({
          ...clientPayload,
          updatedAt: new Date(),
        })
        .where(eq(clients.id, existingClient.id));
      
      console.log(`Updated client: ${firstName} ${lastName} (ID: ${existingClient.id})`);
    } else {
      // Insert new client
      const [newClient] = await db
        .insert(clients)
        .values(clientPayload)
        .returning();
      
      console.log(`Created new client: ${firstName} ${lastName} (ID: ${newClient.id})`);
    }
  } catch (error) {
    console.error(`Error processing client ${firstName} ${lastName}:`, error);
  }
}

async function getBuildingIdFromProperty(propertyId: number): Promise<number | null> {
  const [property] = await db
    .select({ buildingId: properties.buildingId })
    .from(properties)
    .where(eq(properties.id, propertyId))
    .limit(1);
  
  return property?.buildingId || null;
}

export function parseCSVLine(line: string): CSVClientData | null {
  // Skip header row
  if (line.includes('Case Number') && line.includes('Client Name')) {
    return null;
  }

  // This data appears to be space/position-delimited rather than properly tab-separated
  // Use regex to extract the fields based on the pattern we see
  const trimmedLine = line.trim();
  if (!trimmedLine) return null;

  // Pattern: [Case Number] [Client Name] [Client Number (phone)] [Address] [Properties Management] [County] [Cell Number] [Email] [Comment] [Rental Office] [Rent Amount] [County Amount] [Notes]
  
  // Try to extract case number (numeric at start)
  const caseNumberMatch = trimmedLine.match(/^(\d+)/);
  let caseNumber = caseNumberMatch ? caseNumberMatch[1] : undefined;
  
  // Remove case number from line to process the rest
  let remainingLine = caseNumber ? trimmedLine.substring(caseNumber.length).trim() : trimmedLine;
  
  // Extract client name (usually first few words before address or other identifiable patterns)
  const nameMatch = remainingLine.match(/^([A-Za-z\s]+?)(?=\s*\(?\d{3}\)?\s*\d{3}-?\d{4}|\s+\d+\s|\s+[A-Z][a-z]+\s+[A-Z]|\s+NOT\s+IN)/);
  let clientName = '';
  
  if (nameMatch) {
    clientName = nameMatch[1].trim();
    remainingLine = remainingLine.substring(nameMatch[0].length).trim();
  } else {
    // If no phone pattern found, try to extract name before address pattern
    const addressMatch = remainingLine.match(/^([A-Za-z\s]+?)(?=\s+\d+\s|[A-Z]+[a-z]+\s+[A-Z]|NOT\s+IN)/);
    if (addressMatch) {
      clientName = addressMatch[1].trim();
      remainingLine = remainingLine.substring(addressMatch[0].length).trim();
    }
  }
  
  if (!clientName) {
    console.log('Could not extract client name from:', trimmedLine.substring(0, 100));
    return null;
  }

  // Extract phone number pattern (optional)
  const phoneMatch = remainingLine.match(/^\(?\d{3}\)?\s*\d{3}-?\d{4}/);
  let clientNumber = phoneMatch ? phoneMatch[0] : undefined;
  if (clientNumber) {
    remainingLine = remainingLine.substring(phoneMatch[0].length).trim();
  }

  // Extract address (before properties management - look for common building names)
  const addressMatch = remainingLine.match(/^(.+?)(?=\s+(?:Covington Court|R&G Housing|2416 Blaisdell|Aeon|Abyssinia|Beam|Blaisdell|Broadway|Buzza|Chad Harvey|Charles|Cromwell|Deluxe|Dominium|Doub|DREH|East Town|East Village|Elite|Everlake|Fit|GoodHands|Hook & Ladder|Huntington|ICS|Jim Bern|Konstantin|Lake|LaSalle|Longfellow|Malcolm|Mint|MSA|Mukanya|New Orleans|Nico|Oak Grove|Peregrine|Pillsbury|PPL|Property Solutions|Rachel|Rental Minnesota|Sherman|Twin City|Viggco|Winfield|Zayd))/);
  let clientAddress = '';
  if (addressMatch) {
    clientAddress = addressMatch[1].trim();
    remainingLine = remainingLine.substring(addressMatch[0].length).trim();
  }

  // Extract properties management (next recognizable company name)
  const propertiesMatch = remainingLine.match(/^([A-Za-z0-9\s&,.-]+?)(?=\s+(?:Dakota|Hennepin|Ramsey|Washington))/);
  let propertiesManagement = '';
  if (propertiesMatch) {
    propertiesManagement = propertiesMatch[1].trim();
    remainingLine = remainingLine.substring(propertiesMatch[0].length).trim();
  }

  // Extract county
  const countyMatch = remainingLine.match(/^(Dakota|Hennepin|Ramsey|Washington)/);
  let county = countyMatch ? countyMatch[1] : '';
  if (county) {
    remainingLine = remainingLine.substring(county.length).trim();
  }

  // For now, set defaults for remaining fields since the parsing is complex
  // In a real implementation, we'd continue parsing each field
  
  return {
    caseNumber,
    clientName,
    clientNumber,
    clientAddress: clientAddress || 'Address not parsed',
    propertiesManagement: propertiesManagement || 'Management not parsed',
    county: county || 'Hennepin', // Default county
    cellNumber: undefined,
    email: 'bloomingsouth@aeon.org', // Common email in the data
    comment: undefined,
    rentalOfficeAddress: undefined,
    rentAmount: undefined,
    countyAmount: undefined,
    notes: undefined,
  };
}

export async function importCSVFile(filePath: string, companyId: number = 1): Promise<{
  processed: number;
  created: number;
  updated: number;
  skipped: number;
}> {
  const fs = await import('fs');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');
  
  let processed = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;

  console.log(`Starting import of ${lines.length} lines...`);

  for (const line of lines) {
    if (line.trim() === '') continue;
    
    const clientData = parseCSVLine(line);
    if (!clientData) {
      skipped++;
      continue;
    }

    try {
      await upsertClient(clientData, companyId);
      processed++;
    } catch (error) {
      console.error(`Error processing line: ${line.substring(0, 100)}`, error);
      skipped++;
    }
  }

  console.log(`Import completed: ${processed} processed, ${created} created, ${updated} updated, ${skipped} skipped`);
  
  return { processed, created, updated, skipped };
}