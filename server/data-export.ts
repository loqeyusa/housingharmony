import { db } from "./db";
import { clients, counties } from "@shared/schema";
import fs from "fs";
import path from "path";

// Export all client data to JSON files for production deployment
export async function exportDevelopmentData(): Promise<void> {
  try {
    console.log("🔄 Exporting development data...");

    // Export all clients
    const allClients = await db.select().from(clients);
    console.log(`📊 Found ${allClients.length} clients to export`);

    // Export all counties
    const allCounties = await db.select().from(counties);
    console.log(`🏛️  Found ${allCounties.length} counties to export`);

    // Create export data structure
    const exportData = {
      exportDate: new Date().toISOString(),
      totalClients: allClients.length,
      totalCounties: allCounties.length,
      counties: allCounties,
      clients: allClients.map(client => ({
        // Remove ID and companyId from export (will be reassigned in production)
        companyId: null, // Will be set to production company ID
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone,
        dateOfBirth: client.dateOfBirth,
        ssn: client.ssn,
        currentAddress: client.currentAddress,
        employmentStatus: client.employmentStatus,
        monthlyIncome: client.monthlyIncome,
        county: client.county,
        countyAmount: client.countyAmount,
        notes: client.notes,
        status: client.status,
        isActive: client.isActive,
        vendorNumber: client.vendorNumber,
        site: client.site,
        cluster: client.cluster,
        subsidyStatus: client.subsidyStatus,
        grhStatus: client.grhStatus,
        maxHousingPayment: client.maxHousingPayment,
        clientObligationPercent: client.clientObligationPercent,
        currentBalance: client.currentBalance,
        creditLimit: client.creditLimit,
        caseNumber: client.caseNumber,
      }))
    };

    // Write to export file
    const exportDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const exportPath = path.join(exportDir, 'housing-data-export.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));

    console.log(`✅ Data exported successfully to: ${exportPath}`);
    console.log(`📋 Summary:`);
    console.log(`   - ${exportData.totalCounties} counties`);
    console.log(`   - ${exportData.totalClients} clients`);
    console.log(`   - Export date: ${exportData.exportDate}`);

  } catch (error) {
    console.error("❌ Data export failed:", error);
    throw error;
  }
}

// Command line interface
if (import.meta.url === `file://${process.argv[1]}`) {
  exportDevelopmentData()
    .then(() => {
      console.log("🎉 Export completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Export failed:", error);
      process.exit(1);
    });
}