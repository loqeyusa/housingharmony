import { db } from "./db";
import { ensureDatabaseInitialized } from "./db-init";
import { users, clients, companies } from "@shared/schema";

async function forceImport() {
  try {
    console.log("🔍 Checking current database state...");
    
    // Check what's currently in the database
    const existingCompanies = await db.select().from(companies);
    const existingUsers = await db.select().from(users);
    const existingClients = await db.select().from(clients);
    
    console.log("📊 Current database contents:");
    console.log(`   - ${existingCompanies.length} companies`);
    console.log(`   - ${existingUsers.length} users`);
    console.log(`   - ${existingClients.length} clients`);
    
    if (existingUsers.length > 0) {
      console.log("\n👤 Existing users:");
      existingUsers.forEach(user => {
        console.log(`   - ${user.username} (${user.email}) - Admin: ${user.isSuperAdmin}`);
      });
    }
    
    // Force import by temporarily clearing users table
    console.log("\n🗑️ Temporarily clearing users to force data import...");
    await db.delete(users);
    
    console.log("🔄 Forcing database re-initialization with your data...");
    await ensureDatabaseInitialized();
    
    console.log("✅ Import process completed!");
    
    // Check final state
    const finalUsers = await db.select().from(users);
    const finalClients = await db.select().from(clients);
    
    console.log("\n📈 Final database contents:");
    console.log(`   - ${finalUsers.length} users`);
    console.log(`   - ${finalClients.length} clients`);
    
    if (finalUsers.length > 0) {
      console.log("\n🔑 Login credentials:");
      finalUsers.forEach(user => {
        console.log(`   Username: ${user.username}`);
        console.log(`   Password: admin123 (default)`);
      });
    }
    
  } catch (error) {
    console.error("❌ Force import failed:", error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  forceImport()
    .then(() => {
      console.log("🎉 Force import completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Force import failed:", error);
      process.exit(1);
    });
}

export { forceImport };