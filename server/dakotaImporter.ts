import { db } from "./db";
import { clients, properties, buildings, companies } from "@shared/schema";
import { eq, and, or } from "drizzle-orm";

export interface DakotaClientData {
  caseNumber?: string;
  clientName: string;
  properties: string;
  rentalOfficeAddress: string;
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

export function cleanCurrency(amount?: string): string {
  if (!amount || amount.trim() === "" || amount.toLowerCase() === "working") return "0.00";
  
  // Remove $ signs, commas, and extra spaces
  const cleaned = amount.replace(/[$,\s]/g, "").trim();
  
  // Handle empty, "case inactive", or other non-numeric values
  if (isNaN(parseFloat(cleaned)) || cleaned === "") {
    return "0.00";
  }
  
  return parseFloat(cleaned).toFixed(2);
}

export async function findOrCreateDakotaProperty(
  propertiesManagement: string,
  rentalOfficeAddress: string,
  companyId: number = 1
): Promise<number | null> {
  if (!propertiesManagement || propertiesManagement.trim() === "") {
    return null;
  }

  const cleanPropertyName = propertiesManagement.trim();
  const cleanAddress = rentalOfficeAddress?.trim() || "";

  // Try to find existing property by management company name
  const existingProperty = await db
    .select()
    .from(properties)
    .leftJoin(buildings, eq(properties.buildingId, buildings.id))
    .where(eq(buildings.name, cleanPropertyName))
    .limit(1);

  if (existingProperty.length > 0) {
    return existingProperty[0].properties.id;
  }

  // If no property found, try to find building by management name
  const existingBuilding = await db
    .select()
    .from(buildings)
    .where(eq(buildings.name, cleanPropertyName))
    .limit(1);

  let buildingId: number;

  if (existingBuilding.length > 0) {
    buildingId = existingBuilding[0].id;
  } else {
    // Create new building for Dakota County
    const [newBuilding] = await db
      .insert(buildings)
      .values({
        companyId,
        name: cleanPropertyName,
        address: cleanAddress,
        landlordName: cleanPropertyName,
        landlordPhone: "(651) 554-0000", // Default Dakota County phone
        landlordEmail: "info@co.dakota.mn.us", // Default Dakota County email
        totalUnits: 1,
        buildingType: "apartment",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    buildingId = newBuilding.id;
  }

  // Create a property for this building
  const [newProperty] = await db
    .insert(properties)
    .values({
      companyId,
      buildingId,
      name: `${cleanPropertyName} - Unit 1`,
      unitNumber: "1",
      rentAmount: "0.00",
      depositAmount: "0.00",
      bedrooms: 1,
      bathrooms: 1,
      status: "occupied",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return newProperty.id;
}

export async function upsertDakotaClient(clientData: DakotaClientData, companyId: number = 1): Promise<void> {
  const { firstName, lastName } = parseClientName(clientData.clientName);
  
  // Clean and validate data
  const rentAmount = cleanCurrency(clientData.rentAmount);
  const countyAmount = cleanCurrency(clientData.countyAmount);
  
  // Skip clients with invalid data
  if (!firstName || !lastName) {
    console.log(`Skipping Dakota client with invalid name: ${clientData.clientName}`);
    return;
  }

  // Find or create property
  const propertyId = await findOrCreateDakotaProperty(
    clientData.properties,
    clientData.rentalOfficeAddress,
    companyId
  );

  const clientPayload = {
    companyId,
    caseNumber: clientData.caseNumber?.trim() || null, // Use case number if provided
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@co.dakota.mn.us`,
    phone: "(651) 554-0000", // Default phone since not provided
    dateOfBirth: "1990-01-01", // Default date since not in CSV
    ssn: "000-00-0000", // Default SSN since not in CSV
    currentAddress: clientData.rentalOfficeAddress || "Address not provided", // Use rental office as default
    employmentStatus: "unknown",
    monthlyIncome: "0.00",
    county: "Dakota", // All clients are Dakota County
    propertyId,
    buildingId: propertyId ? await getBuildingIdFromProperty(propertyId) : null,
    countyAmount,
    notes: clientData.notes?.trim() || null,
    status: clientData.notes?.toLowerCase().includes("case inactive") ? "inactive" : "active",
    isActive: !clientData.notes?.toLowerCase().includes("case inactive"),
    vendorNumber: null,
    site: null,
    cluster: null,
    subsidyStatus: "receiving",
    grhStatus: "approved",
    maxHousingPayment: rentAmount,
    clientObligationPercent: "30.00",
    currentBalance: "0.00",
    creditLimit: "-100.00",
  };

  try {
    // Check if client already exists by name or case number
    const whereConditions = [
      and(
        eq(clients.firstName, firstName.trim()),
        eq(clients.lastName, lastName.trim()),
        eq(clients.county, "Dakota")
      )
    ];

    // If case number is provided, also check by case number
    if (clientData.caseNumber?.trim()) {
      whereConditions.push(
        and(
          eq(clients.caseNumber, clientData.caseNumber.trim()),
          eq(clients.county, "Dakota")
        )
      );
    }

    const [existingClient] = await db
      .select()
      .from(clients)
      .where(or(...whereConditions))
      .limit(1);

    if (existingClient) {
      // Update existing client
      await db
        .update(clients)
        .set({
          ...clientPayload,
          updatedAt: new Date(),
        })
        .where(eq(clients.id, existingClient.id));
      
      console.log(`Updated Dakota client: ${firstName} ${lastName} (ID: ${existingClient.id})`);
    } else {
      // Insert new client
      const [newClient] = await db
        .insert(clients)
        .values(clientPayload)
        .returning();
      
      console.log(`Created new Dakota client: ${firstName} ${lastName} (ID: ${newClient.id})`);
    }
  } catch (error) {
    console.error(`Error processing Dakota client ${firstName} ${lastName}:`, error);
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

export function parseDakotaCSVLine(line: string): DakotaClientData | null {
  // Skip header row
  if (line.includes('Case Number') && line.includes('Client') && line.includes('Properties Management')) {
    return null;
  }

  // Skip empty lines
  const trimmedLine = line.trim();
  if (!trimmedLine) return null;

  // Split by tab character
  const fields = line.split('\t').map(field => field.trim());
  
  // Need at least case number, client name and properties (fields 0, 1, 2)
  if (fields.length < 3 || !fields[1] || !fields[2]) {
    return null;
  }

  // Skip lines with no actual client name
  if (fields[1] === '' || fields[2] === '') {
    return null;
  }

  return {
    caseNumber: fields[0] || undefined,
    clientName: fields[1],
    properties: fields[2],
    rentalOfficeAddress: fields[3] || "",
    rentAmount: fields[4] || undefined,
    countyAmount: fields[5] || undefined,
    notes: fields[6] || undefined,
  };
}

export async function importDakotaCSVFile(filePath: string, companyId: number = 1): Promise<{
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

  console.log(`Starting Dakota County CSV import of ${lines.length} lines...`);

  for (const line of lines) {
    if (line.trim() === '') continue;
    
    const clientData = parseDakotaCSVLine(line);
    if (!clientData) {
      skipped++;
      continue;
    }

    try {
      await upsertDakotaClient(clientData, companyId);
      processed++;
    } catch (error) {
      console.error(`Error processing Dakota line: ${line.substring(0, 100)}`, error);
      skipped++;
    }
  }

  console.log(`Dakota County import completed: ${processed} processed, ${created} created, ${updated} updated, ${skipped} skipped`);
  
  return { processed, created, updated, skipped };
}