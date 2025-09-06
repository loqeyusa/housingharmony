import * as Papa from 'papaparse';
import { eq, and } from 'drizzle-orm';
import { db } from './db';
import { clients, buildings, properties } from '@shared/schema';

export interface CsvClientData {
  'Case Number': string;
  'Client Name': string;
  'Client Number': string;
  'Client Address': string;
  'Properties Management': string;
  'County': string;
  'Cell Number': string;
  'Email': string;
  'Comment': string;
  'Rental Office Address': string;
  'Rent Amount': string;
  'County Amount': string;
  'Notes': string;
}

export interface ParsedClientData {
  caseNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  currentAddress: string;
  propertiesManagement: string;
  county: string;
  rentalOfficeAddress: string;
  rentAmount: string;
  countyAmount: string;
  notes: string;
  comments: string;
}

export interface CsvParseResult {
  success: boolean;
  data?: ParsedClientData[];
  error?: string;
  clientsCreated?: number;
  propertiesCreated?: number;
  buildingsCreated?: number;
}

export function parseCsvData(csvText: string): Promise<CsvParseResult> {
  return new Promise((resolve) => {
    Papa.parse<CsvClientData>(csvText, {
      header: true,
      skipEmptyLines: true,
      transform: (value) => value.trim(),
      complete: (results) => {
        if (results.errors.length > 0) {
          resolve({
            success: false,
            error: `CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`
          });
          return;
        }

        try {
          const parsedData: ParsedClientData[] = results.data.map(row => {
            // Parse client name into first and last name
            const nameParts = row['Client Name']?.split(' ') || ['', ''];
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            return {
              caseNumber: row['Case Number'] || '',
              firstName,
              lastName,
              phone: row['Client Number'] || row['Cell Number'] || '',
              email: row['Email'] || '',
              currentAddress: row['Client Address'] || '',
              propertiesManagement: row['Properties Management'] || '',
              county: row['County'] || '',
              rentalOfficeAddress: row['Rental Office Address'] || '',
              rentAmount: row['Rent Amount'] || '',
              countyAmount: row['County Amount'] || '',
              notes: row['Notes'] || '',
              comments: row['Comment'] || ''
            };
          });

          resolve({
            success: true,
            data: parsedData
          });
        } catch (error) {
          resolve({
            success: false,
            error: `Data transformation error: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      },
      error: (error: any) => {
        resolve({
          success: false,
          error: `CSV parsing failed: ${error.message}`
        });
      }
    });
  });
}

export async function processCsvDataToDB(parsedData: ParsedClientData[], companyId: number): Promise<CsvParseResult> {
  try {
    let clientsCreated = 0;
    let propertiesCreated = 0;
    let buildingsCreated = 0;
    const processedBuildings = new Set<string>();
    const processedProperties = new Set<string>();

    for (const clientData of parsedData) {
      // Skip if essential data is missing
      if (!clientData.firstName || !clientData.lastName) {
        continue;
      }

      // 1. Create or find building based on Properties Management + Rental Office Address
      let buildingId: number | null = null;
      if (clientData.propertiesManagement && clientData.rentalOfficeAddress) {
        const buildingKey = `${clientData.propertiesManagement}|${clientData.rentalOfficeAddress}`;
        
        if (!processedBuildings.has(buildingKey)) {
          // Check if building already exists
          const [existingBuilding] = await db.select().from(buildings)
            .where(and(
              eq(buildings.name, clientData.propertiesManagement),
              eq(buildings.address, clientData.rentalOfficeAddress),
              eq(buildings.companyId, companyId)
            ));

          if (existingBuilding) {
            buildingId = existingBuilding.id;
          } else {
            // Create new building
            const [newBuilding] = await db.insert(buildings).values({
              companyId,
              name: clientData.propertiesManagement,
              address: clientData.rentalOfficeAddress,
              landlordName: clientData.propertiesManagement,
              landlordPhone: '+1-555-0000',
              landlordEmail: clientData.email || 'noemail@example.com',
              totalUnits: 1,
              buildingType: 'apartment',
              propertyManager: clientData.propertiesManagement,
              status: 'active'
            }).returning();
            buildingId = newBuilding.id;
            buildingsCreated++;
          }
          processedBuildings.add(buildingKey);
        } else {
          // Find existing building
          const [existingBuilding] = await db.select().from(buildings)
            .where(and(
              eq(buildings.name, clientData.propertiesManagement),
              eq(buildings.address, clientData.rentalOfficeAddress),
              eq(buildings.companyId, companyId)
            ));
          buildingId = existingBuilding?.id || null;
        }
      }

      // 2. Create or find property based on Properties Management name
      let propertyId: number | null = null;
      if (clientData.propertiesManagement && buildingId) {
        const propertyKey = `${clientData.propertiesManagement}|${buildingId}`;
        
        if (!processedProperties.has(propertyKey)) {
          // Check if property already exists
          const [existingProperty] = await db.select().from(properties)
            .where(and(
              eq(properties.name, clientData.propertiesManagement),
              eq(properties.buildingId, buildingId),
              eq(properties.companyId, companyId)
            ));

          if (existingProperty) {
            propertyId = existingProperty.id;
          } else {
            // Parse rent amount
            const rentAmount = parseFloat(clientData.rentAmount.replace(/[$,]/g, '')) || 1000;
            
            // Create new property
            const [newProperty] = await db.insert(properties).values({
              companyId,
              buildingId,
              name: clientData.propertiesManagement,
              unitNumber: '1',
              rentAmount: rentAmount.toString(),
              depositAmount: rentAmount.toString(),
              bedrooms: rentAmount < 800 ? 1 : rentAmount < 1200 ? 2 : 3,
              bathrooms: rentAmount < 900 ? 1 : 2,
              squareFootage: rentAmount < 800 ? 650 : rentAmount < 1200 ? 850 : 1100,
              status: 'available'
            }).returning();
            propertyId = newProperty.id;
            propertiesCreated++;
          }
          processedProperties.add(propertyKey);
        } else {
          // Find existing property
          const [existingProperty] = await db.select().from(properties)
            .where(and(
              eq(properties.name, clientData.propertiesManagement),
              eq(properties.buildingId, buildingId),
              eq(properties.companyId, companyId)
            ));
          propertyId = existingProperty?.id || null;
        }
      }

      // 3. Create or update client
      const [existingClient] = await db.select().from(clients)
        .where(and(
          eq(clients.firstName, clientData.firstName),
          eq(clients.lastName, clientData.lastName),
          eq(clients.companyId, companyId)
        ));

      const clientValues = {
        companyId,
        caseNumber: clientData.caseNumber || null,
        firstName: clientData.firstName,
        lastName: clientData.lastName,
        email: clientData.email || 'noemail@example.com',
        phone: clientData.phone || '+1-555-0000',
        dateOfBirth: '1990-01-01', // Default value - should be updated manually
        ssn: 'XXX-XX-XXXX', // Default value - should be updated manually
        currentAddress: clientData.currentAddress || '',
        employmentStatus: 'unemployed', // Default value - should be updated manually
        monthlyIncome: '0',
        county: clientData.county || '',
        propertyId,
        buildingId,
        countyAmount: clientData.countyAmount ? parseFloat(clientData.countyAmount.replace(/[$,]/g, '')).toString() : null,
        notes: [clientData.notes, clientData.comments].filter(Boolean).join('; ') || null,
        status: 'active'
      };

      if (existingClient) {
        // Update existing client
        await db.update(clients)
          .set({
            ...clientValues,
            caseNumber: clientData.caseNumber || existingClient.caseNumber,
            email: clientData.email || existingClient.email,
            phone: clientData.phone || existingClient.phone
          })
          .where(eq(clients.id, existingClient.id));
      } else {
        // Create new client
        await db.insert(clients).values([clientValues]);
        clientsCreated++;
      }
    }

    return {
      success: true,
      clientsCreated,
      propertiesCreated,
      buildingsCreated
    };

  } catch (error) {
    console.error('Database processing error:', error);
    return {
      success: false,
      error: `Database processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}