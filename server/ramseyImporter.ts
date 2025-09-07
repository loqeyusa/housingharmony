import { db } from "./db";
import { clients, properties, buildings, companies } from "@shared/schema";
import { eq, and, or } from "drizzle-orm";

export interface RamseyClientData {
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
  if (!amount || amount.trim() === "") return "0.00";
  
  // Remove $ signs, commas, and extra spaces
  const cleaned = amount.replace(/[$,\s]/g, "").trim();
  
  // Handle empty, "case inactive", or other non-numeric values
  if (isNaN(parseFloat(cleaned)) || cleaned === "") {
    return "0.00";
  }
  
  return parseFloat(cleaned).toFixed(2);
}

export async function findOrCreateRamseyProperty(
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
    // Create new building for Ramsey County
    const [newBuilding] = await db
      .insert(buildings)
      .values({
        companyId,
        name: cleanPropertyName,
        address: cleanAddress,
        landlordName: cleanPropertyName,
        landlordPhone: "(651) 000-0000", // Default Ramsey County phone
        landlordEmail: "info@ramseycounty.gov", // Default Ramsey County email
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

export async function upsertRamseyClient(clientData: RamseyClientData, companyId: number = 1): Promise<void> {
  const { firstName, lastName } = parseClientName(clientData.clientName);
  
  // Clean and validate data
  const rentAmount = cleanCurrency(clientData.rentAmount);
  const countyAmount = cleanCurrency(clientData.countyAmount);
  
  // Skip clients with invalid data
  if (!firstName || !lastName) {
    console.log(`Skipping client with invalid name: ${clientData.clientName}`);
    return;
  }

  // Find or create property
  const propertyId = await findOrCreateRamseyProperty(
    clientData.properties,
    clientData.rentalOfficeAddress,
    companyId
  );

  const clientPayload = {
    companyId,
    caseNumber: null, // No case numbers in this dataset
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@ramseycounty.gov`,
    phone: "(651) 000-0000", // Default phone since not provided
    dateOfBirth: "1990-01-01", // Default date since not in CSV
    ssn: "000-00-0000", // Default SSN since not in CSV
    currentAddress: clientData.rentalOfficeAddress || "Address not provided", // Use rental office as default
    employmentStatus: "unknown",
    monthlyIncome: "0.00",
    county: "Ramsey", // All clients are Ramsey County
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
    // Check if client already exists by name (no case numbers available)
    const [existingClient] = await db
      .select()
      .from(clients)
      .where(and(
        eq(clients.firstName, firstName.trim()),
        eq(clients.lastName, lastName.trim()),
        eq(clients.county, "Ramsey")
      ))
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
      
      console.log(`Updated Ramsey client: ${firstName} ${lastName} (ID: ${existingClient.id})`);
    } else {
      // Insert new client
      const [newClient] = await db
        .insert(clients)
        .values(clientPayload)
        .returning();
      
      console.log(`Created new Ramsey client: ${firstName} ${lastName} (ID: ${newClient.id})`);
    }
  } catch (error) {
    console.error(`Error processing Ramsey client ${firstName} ${lastName}:`, error);
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

export function parseRamseyCSVLine(line: string): RamseyClientData | null {
  // Skip header row
  if (line.includes('Client') && line.includes('Properties') && line.includes('Rental Office')) {
    return null;
  }

  // Skip empty lines
  const trimmedLine = line.trim();
  if (!trimmedLine) return null;

  // Split by tab character
  const fields = line.split('\t').map(field => field.trim());
  
  // Need at least client name and properties
  if (fields.length < 2 || !fields[0] || !fields[1]) {
    return null;
  }

  // Skip lines with no actual client name
  if (fields[0] === '' || fields[1] === '') {
    return null;
  }

  return {
    clientName: fields[0],
    properties: fields[1],
    rentalOfficeAddress: fields[2] || "",
    rentAmount: fields[3] || undefined,
    countyAmount: fields[4] || undefined,
    notes: fields[5] || undefined,
  };
}

export async function importRamseyCSVFile(filePath: string, companyId: number = 1): Promise<{
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

  console.log(`Starting Ramsey County CSV import of ${lines.length} lines...`);

  for (const line of lines) {
    if (line.trim() === '') continue;
    
    const clientData = parseRamseyCSVLine(line);
    if (!clientData) {
      skipped++;
      continue;
    }

    try {
      await upsertRamseyClient(clientData, companyId);
      processed++;
    } catch (error) {
      console.error(`Error processing Ramsey line: ${line.substring(0, 100)}`, error);
      skipped++;
    }
  }

  console.log(`Ramsey County import completed: ${processed} processed, ${created} created, ${updated} updated, ${skipped} skipped`);
  
  return { processed, created, updated, skipped };
}