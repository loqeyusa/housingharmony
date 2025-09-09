import { db } from "./db";
import { 
  clients, 
  counties, 
  users, 
  companies, 
  properties, 
  applications, 
  transactions, 
  poolFund, 
  auditLogs 
} from "@shared/schema";
import fs from "fs";
import path from "path";

// Export all client data to JSON files for production deployment
export async function exportDevelopmentData(): Promise<void> {
  try {
    console.log("🔄 Exporting development data...");

    // Export all clients
    const allClients = await db.select().from(clients);
    console.log(`👥 Found ${allClients.length} clients to export`);

    // Export all counties
    const allCounties = await db.select().from(counties);
    console.log(`🏛️ Found ${allCounties.length} counties to export`);

    // Export all companies
    const allCompanies = await db.select().from(companies);
    console.log(`🏢 Found ${allCompanies.length} companies to export`);

    // Export all users
    const allUsers = await db.select().from(users);
    console.log(`👤 Found ${allUsers.length} users to export`);

    // Export all properties
    const allProperties = await db.select().from(properties);
    console.log(`🏠 Found ${allProperties.length} properties to export`);

    // Export all applications
    const allApplications = await db.select().from(applications);
    console.log(`📋 Found ${allApplications.length} applications to export`);

    // Export all transactions
    const allTransactions = await db.select().from(transactions);
    console.log(`💰 Found ${allTransactions.length} transactions to export`);

    // Export all pool fund entries
    const allPoolFund = await db.select().from(poolFund);
    console.log(`🏦 Found ${allPoolFund.length} pool fund entries to export`);

    // Create comprehensive export data structure
    const exportData = {
      exportDate: new Date().toISOString(),
      exportedFrom: "development",
      totalClients: allClients.length,
      totalCounties: allCounties.length,
      totalTransactions: allTransactions.length,
      totalPoolFund: allPoolFund.length,
      
      counties: allCounties,
      
      companies: allCompanies.map(company => ({
        ...company,
        id: undefined // Will be reassigned in production
      })),
      
      users: allUsers.map(user => ({
        ...user,
        id: undefined, // Will be reassigned in production
        passwordHash: undefined, // Security: don't export passwords
        companyId: null // Will be set to production company ID
      })),
      
      clients: allClients.map(client => ({
        ...client,
        id: undefined, // Will be reassigned in production
        companyId: null // Will be set to production company ID
      })),
      
      properties: allProperties.map(property => ({
        ...property,
        id: undefined, // Will be reassigned in production
        companyId: null // Will be set to production company ID
      })),
      
      applications: allApplications.map(application => ({
        ...application,
        id: undefined, // Will be reassigned in production
        companyId: null // Will be set to production company ID
      })),
      
      transactions: allTransactions.map(transaction => ({
        ...transaction,
        id: undefined, // Will be reassigned in production
        companyId: null // Will be set to production company ID
      })),
      
      poolFund: allPoolFund.map(fund => ({
        ...fund,
        id: undefined, // Will be reassigned in production
        companyId: null // Will be set to production company ID
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
    console.log(`📋 COMPREHENSIVE EXPORT SUMMARY:`);
    console.log(`   - ${exportData.counties.length} counties`);
    console.log(`   - ${exportData.companies.length} companies`);
    console.log(`   - ${exportData.users.length} users`);
    console.log(`   - ${exportData.clients.length} clients`);
    console.log(`   - ${exportData.properties.length} properties`);
    console.log(`   - ${exportData.applications.length} applications`);
    console.log(`   - ${exportData.transactions.length} transactions`);
    console.log(`   - ${exportData.poolFund.length} pool fund entries`);
    console.log(`   - Export date: ${exportData.exportDate}`);
    console.log("");
    console.log("🚀 READY FOR DEPLOYMENT:");
    console.log("   1. This file will be auto-imported when deployed");
    console.log("   2. All your development data will be in production");
    console.log("   3. Login with username: jamal, password: admin123");

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