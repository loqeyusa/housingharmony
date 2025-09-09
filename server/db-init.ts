import { db } from "./db";
import { companies, users, counties, clients } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// Database initialization for production deployment
export async function initializeDatabase(): Promise<void> {
  try {
    console.log("Checking if database needs initialization...");
    
    // Check if system is already initialized (has users)
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      console.log("Database already initialized, skipping setup");
      return;
    }

    console.log("Database is empty, initializing with default data...");

    // Create default company
    const defaultCompany = {
      name: "Housing Management System",
      displayName: "Housing Management System",
      email: "admin@housing.system",
      phone: "555-0100",
      address: "123 Admin Street, City, ST 12345",
      contactPersonName: "System Administrator",
      contactPersonEmail: "admin@housing.system",
      contactPersonPhone: "555-0100",
      status: "active",
      subscriptionPlan: "enterprise",
      maxClients: 1000,
      maxUsers: 50,
    };

    const [company] = await db.insert(companies).values(defaultCompany).returning();
    console.log(`Created default company: ${company.name} (ID: ${company.id})`);

    // Create default counties
    const defaultCounties = [
      { name: "Ramsey County", state: "Minnesota" },
      { name: "Hennepin County", state: "Minnesota" },
      { name: "Dakota County", state: "Minnesota" },
      { name: "Steele County", state: "Minnesota" }
    ];

    const createdCounties = await db.insert(counties).values(defaultCounties).returning();
    console.log(`Created ${createdCounties.length} counties:`);
    createdCounties.forEach(county => {
      console.log(`  - ${county.name} (ID: ${county.id})`);
    });

    // Create default admin user
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const defaultAdmin = {
      companyId: company.id,
      username: "jamal",
      email: "jamal@admin.com",
      firstName: "Jamal",
      lastName: "Admin",
      password: hashedPassword,
      isEnabled: true,
      isSuperAdmin: true,
      createdById: null,
    };

    const [admin] = await db.insert(users).values([defaultAdmin]).returning();
    console.log(`Created default admin user: ${admin.username} (ID: ${admin.id})`);

    // Import client data if export file exists
    await importClientDataIfExists(company.id);

    console.log("✅ Database initialization completed successfully!");
    console.log(`🔐 Admin Login: username="jamal", password="${adminPassword}"`);
    
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
}

// Import client data from export file if it exists
async function importClientDataIfExists(companyId: number): Promise<void> {
  const exportPath = path.join(process.cwd(), 'exports', 'housing-data-export.json');
  
  if (!fs.existsSync(exportPath)) {
    console.log("📋 No client data export file found, skipping client import");
    console.log("💡 To import your development data:");
    console.log("   1. Run 'tsx server/data-export.ts' in development");
    console.log("   2. Copy the exports/housing-data-export.json file to production");
    console.log("   3. Redeploy to automatically import the data");
    return;
  }

  try {
    console.log("🔄 Importing client data from export file...");
    
    const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
    console.log(`📊 Found export with ${exportData.totalClients} clients from ${exportData.exportDate}`);

    if (exportData.clients && exportData.clients.length > 0) {
      // Prepare clients with correct company ID
      const clientsToImport = exportData.clients.map((client: any) => ({
        ...client,
        companyId, // Set to the current company ID
        monthlyIncome: client.monthlyIncome ? client.monthlyIncome.toString() : "0.00",
        countyAmount: client.countyAmount ? client.countyAmount.toString() : "0.00",
        maxHousingPayment: client.maxHousingPayment ? client.maxHousingPayment.toString() : "1220.00",
        clientObligationPercent: client.clientObligationPercent ? client.clientObligationPercent.toString() : "30.00",
        currentBalance: client.currentBalance ? client.currentBalance.toString() : "0.00",
        creditLimit: client.creditLimit ? client.creditLimit.toString() : "-100.00",
      }));

      // Insert clients in batches
      const batchSize = 50;
      let imported = 0;
      
      for (let i = 0; i < clientsToImport.length; i += batchSize) {
        const batch = clientsToImport.slice(i, i + batchSize);
        await db.insert(clients).values(batch);
        imported += batch.length;
        console.log(`📥 Imported ${imported}/${clientsToImport.length} clients...`);
      }

      console.log(`✅ Successfully imported ${imported} clients!`);
      
      // Show summary by county
      const countiesSummary = exportData.clients.reduce((acc: any, client: any) => {
        acc[client.county] = (acc[client.county] || 0) + 1;
        return acc;
      }, {});
      
      console.log("📈 Clients imported by county:");
      Object.entries(countiesSummary).forEach(([county, count]) => {
        console.log(`   - ${county}: ${count} clients`);
      });
    }

    // Clean up the export file after successful import
    fs.unlinkSync(exportPath);
    console.log("🗑️  Export file cleaned up after successful import");

  } catch (error) {
    console.error("❌ Failed to import client data:", error);
    console.log("⚠️  Continuing with initialization without client data import");
  }
}

// Check and run initialization if needed
export async function ensureDatabaseInitialized(): Promise<void> {
  try {
    await initializeDatabase();
  } catch (error) {
    console.error("Failed to initialize database:", error);
    // Don't throw in production - let the app continue to run
    // The user can manually create an admin account if needed
  }
}