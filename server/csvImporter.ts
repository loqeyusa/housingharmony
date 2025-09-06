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
  // Split by tab character (the data appears to be tab-separated)
  const fields = line.split('\t').map(field => field.trim());
  
  if (fields.length < 13) {
    console.log('Skipping invalid line (not enough fields):', line.substring(0, 100));
    return null;
  }

  // Skip header row
  if (fields[0] === 'Case Number' || fields[1] === 'Client Name') {
    return null;
  }

  // Skip empty client names
  if (!fields[1] || fields[1].trim() === '') {
    return null;
  }

  return {
    caseNumber: fields[0] || undefined,
    clientName: fields[1],
    clientNumber: fields[2] || undefined,
    clientAddress: fields[3],
    propertiesManagement: fields[4],
    county: fields[5],
    cellNumber: fields[6] || undefined,
    email: fields[7] || undefined,
    comment: fields[8] || undefined,
    rentalOfficeAddress: fields[9] || undefined,
    rentAmount: fields[10] || undefined,
    countyAmount: fields[11] || undefined,
    notes: fields[12] || undefined,
  };
}

export async function importCSVFile(filePath: string, companyId: number = 1): Promise<{
  processed: number;
  created: number;
  updated: number;
  skipped: number;
}> {
  const fs = require('fs');
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