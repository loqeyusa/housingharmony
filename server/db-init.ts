import { db } from "./db";
import { companies, users, counties } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

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

    console.log("✅ Database initialization completed successfully!");
    console.log(`🔐 Admin Login: username="jamal", password="${adminPassword}"`);
    
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
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