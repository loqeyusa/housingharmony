import { 
  clients, 
  properties, 
  applications, 
  transactions, 
  poolFund,
  housingSupport,
  vendors,
  otherSubsidies,
  companies,
  users,
  roles,
  userRoles,
  auditLogs,
  clientNotes,
  type Client, 
  type InsertClient,
  type Property,
  type InsertProperty,
  type Application,
  type InsertApplication,
  type Transaction,
  type InsertTransaction,
  type PoolFund,
  type InsertPoolFund,
  type HousingSupport,
  type InsertHousingSupport,
  type Vendor,
  type InsertVendor,
  type OtherSubsidy,
  type InsertOtherSubsidy,
  type Company,
  type InsertCompany,
  type User,
  type InsertUser,
  type UpdateUser,
  type Role,
  type InsertRole,
  type UserRole,
  type InsertUserRole,
  type AuditLog,
  type InsertAuditLog,
  type Permission,
  type ClientNote,
  type InsertClientNote
} from "@shared/schema";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { eq, sql, desc, and, or, ilike, sum, count, asc, inArray, ne } from "drizzle-orm";

export interface IStorage {
  // Companies
  getCompanies(): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  createCompanyWithSuperAdmin(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company | undefined>;
  deleteCompany(id: number): Promise<boolean>;
  approveCompany(id: number, approvedBy: number): Promise<Company | undefined>;
  suspendCompany(id: number): Promise<Company | undefined>;
  deactivateCompany(id: number): Promise<Company | undefined>;
  getCompanyStats(companyId: number): Promise<{
    totalClients: number;
    activeProperties: number;
    totalUsers: number;
    monthlyRevenue: number;
  }>;

  // Clients (company-scoped)
  getClients(companyId?: number): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;

  // Properties (company-scoped)
  getProperties(companyId?: number): Promise<Property[]>;
  getProperty(id: number): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: number): Promise<boolean>;

  // Applications
  getApplications(companyId?: number): Promise<Application[]>;
  getApplication(id: number): Promise<Application | undefined>;
  getApplicationsByClient(clientId: number): Promise<Application[]>;
  createApplication(application: InsertApplication): Promise<Application>;
  updateApplication(id: number, application: Partial<InsertApplication>): Promise<Application | undefined>;
  deleteApplication(id: number): Promise<boolean>;

  // Transactions
  getTransactions(companyId?: number): Promise<Transaction[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactionsByClient(clientId: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;

  // Pool Fund
  getPoolFundEntries(): Promise<PoolFund[]>;
  getPoolFundEntriesByCounty(county: string): Promise<PoolFund[]>;
  createPoolFundEntry(entry: InsertPoolFund): Promise<PoolFund>;
  getPoolFundBalance(): Promise<number>;
  getPoolFundBalanceByCounty(county: string): Promise<number>;
  getPoolFundSummaryByCounty(): Promise<Array<{
    county: string;
    balance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    entryCount: number;
  }>>;

  // Dashboard stats
  getDashboardStats(): Promise<{
    totalClients: number;
    activeProperties: number;
    pendingApplications: number;
    poolFundBalance: number;
    totalVendors: number;
    activeOtherSubsidies: number;
    totalOtherSubsidyAmount: number;
  }>;

  // Client balance operations
  getClientBalance(clientId: number): Promise<number>;
  updateClientBalance(clientId: number, amount: number): Promise<void>;
  updateClientCreditLimit(clientId: number, limit: number): Promise<void>;
  setGlobalCreditLimit(limit: number): Promise<void>;

  // Housing Support operations
  getHousingSupportRecords(): Promise<HousingSupport[]>;
  getHousingSupportByClient(clientId: number): Promise<HousingSupport[]>;
  getHousingSupportByMonth(month: string): Promise<HousingSupport[]>;
  createHousingSupportRecord(record: InsertHousingSupport): Promise<HousingSupport>;
  updateHousingSupportRecord(id: number, record: Partial<InsertHousingSupport>): Promise<HousingSupport | undefined>;
  calculateMonthlyPoolTotal(clientId: number, month: string): Promise<number>;
  getRunningPoolTotal(): Promise<number>;

  // Vendor operations
  getVendors(): Promise<Vendor[]>;
  getVendor(id: number): Promise<Vendor | undefined>;
  getVendorsByType(type: string): Promise<Vendor[]>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: number, vendor: Partial<InsertVendor>): Promise<Vendor | undefined>;
  deleteVendor(id: number): Promise<boolean>;

  // Other Subsidies operations
  getOtherSubsidies(): Promise<OtherSubsidy[]>;
  getOtherSubsidy(id: number): Promise<OtherSubsidy | undefined>;
  getOtherSubsidiesByClient(clientName: string): Promise<OtherSubsidy[]>;
  getOtherSubsidiesByVendor(vendorName: string): Promise<OtherSubsidy[]>;
  createOtherSubsidy(subsidy: InsertOtherSubsidy): Promise<OtherSubsidy>;
  updateOtherSubsidy(id: number, subsidy: Partial<InsertOtherSubsidy>): Promise<OtherSubsidy | undefined>;
  deleteOtherSubsidy(id: number): Promise<boolean>;

  // User Management operations
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser, createdById?: number): Promise<User>;
  updateUser(id: number, user: UpdateUser): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  enableUser(id: number, enabled: boolean): Promise<boolean>;
  authenticateUser(username: string, password: string): Promise<User | null>;
  updateLastLogin(id: number): Promise<void>;
  
  // Role Management operations
  getRoles(): Promise<Role[]>;
  getRole(id: number): Promise<Role | undefined>;
  getRoleByName(name: string): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: number, role: Partial<InsertRole>): Promise<Role | undefined>;
  deleteRole(id: number): Promise<boolean>;
  
  // User Role Assignment operations
  getUserRoles(userId: number): Promise<UserRole[]>;
  getUserPermissions(userId: number): Promise<Permission[]>;
  assignRole(userId: number, roleId: number, assignedById: number): Promise<UserRole>;
  removeRole(userId: number, roleId: number): Promise<boolean>;
  
  // Audit Log operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(userId?: number, limit?: number): Promise<AuditLog[]>;
  
  // Permission checking
  hasPermission(userId: number, permission: Permission): Promise<boolean>;
  isSuperAdmin(userId: number): Promise<boolean>;
  canUserCreateUsers(userId: number): Promise<boolean>;
  canUserAssignRole(userId: number, roleId: number): Promise<boolean>;
  
  // Client Notes operations
  getClientNotes(clientId: number): Promise<ClientNote[]>;
  createClientNote(note: InsertClientNote): Promise<ClientNote>;
  updateClientNote(id: number, note: Partial<InsertClientNote>): Promise<ClientNote | undefined>;
  deleteClientNote(id: number): Promise<boolean>;
  
  // Admin operations
  clearAllData(): Promise<void>;
  getTotalUsers(): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // Company Management
  async getCompanies(): Promise<Company[]> {
    const result = await db.select().from(companies).orderBy(companies.createdAt);
    return result.reverse();
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company || undefined;
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [company] = await db
      .insert(companies)
      .values(insertCompany)
      .returning();
    return company;
  }

  async createCompanyWithSuperAdmin(insertCompany: InsertCompany): Promise<Company> {
    return await db.transaction(async (tx) => {
      // Extract super admin data from company data
      const {
        superAdminUsername,
        superAdminEmail,
        superAdminFirstName,
        superAdminLastName,
        superAdminPassword,
        superAdminConfirmPassword,
        ...companyData
      } = insertCompany as any;

      // Check if username or email already exists
      const [existingUser] = await tx
        .select()
        .from(users)
        .where(or(
          eq(users.username, superAdminUsername),
          eq(users.email, superAdminEmail)
        ))
        .limit(1);

      if (existingUser) {
        if (existingUser.username === superAdminUsername) {
          throw new Error(`Username "${superAdminUsername}" is already taken`);
        }
        if (existingUser.email === superAdminEmail) {
          throw new Error(`Email "${superAdminEmail}" is already taken`);
        }
      }

      // Check if company email already exists
      const [existingCompany] = await tx
        .select()
        .from(companies)
        .where(eq(companies.email, companyData.email))
        .limit(1);

      if (existingCompany) {
        throw new Error(`Company email "${companyData.email}" is already registered`);
      }

      // Create the company first
      const [company] = await tx
        .insert(companies)
        .values(companyData)
        .returning();

      // Hash the password
      const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

      // Create the super admin user
      const [superAdmin] = await tx
        .insert(users)
        .values({
          companyId: company.id,
          username: superAdminUsername,
          email: superAdminEmail,
          firstName: superAdminFirstName,
          lastName: superAdminLastName,
          passwordHash: hashedPassword,
          isEnabled: true,
          isSuperAdmin: false // Company admin, not system super admin
        })
        .returning();

      // Get the Administrator role for the company
      const [adminRole] = await tx
        .select()
        .from(roles)
        .where(eq(roles.name, 'Administrator'))
        .limit(1);

      // Assign the Administrator role to the super admin
      if (adminRole) {
        await tx
          .insert(userRoles)
          .values({
            userId: superAdmin.id,
            roleId: adminRole.id,
            assignedById: superAdmin.id // Self-assigned during company creation
          });
      }

      return company;
    });
  }

  async updateCompany(id: number, updateData: Partial<InsertCompany>): Promise<Company | undefined> {
    const [company] = await db
      .update(companies)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning();
    return company || undefined;
  }

  async deleteCompany(id: number): Promise<boolean> {
    const result = await db.delete(companies).where(eq(companies.id, id));
    return (result.rowCount || 0) > 0;
  }

  async approveCompany(id: number, approvedBy: number): Promise<Company | undefined> {
    const [company] = await db
      .update(companies)
      .set({ 
        status: 'active',
        approvedAt: new Date(),
        approvedBy: approvedBy,
        updatedAt: new Date()
      })
      .where(eq(companies.id, id))
      .returning();
    return company || undefined;
  }

  async suspendCompany(id: number): Promise<Company | undefined> {
    const [company] = await db
      .update(companies)
      .set({ 
        status: 'suspended',
        updatedAt: new Date()
      })
      .where(eq(companies.id, id))
      .returning();
    return company || undefined;
  }

  async deactivateCompany(id: number): Promise<Company | undefined> {
    const [company] = await db
      .update(companies)
      .set({ 
        status: 'rejected',
        updatedAt: new Date()
      })
      .where(eq(companies.id, id))
      .returning();
    return company || undefined;
  }

  async getCompanyStats(companyId: number): Promise<{
    totalClients: number;
    activeProperties: number;
    totalUsers: number;
    monthlyRevenue: number;
  }> {
    const [clientStats] = await db
      .select({ count: count() })
      .from(clients)
      .where(eq(clients.companyId, companyId));

    const [propertyStats] = await db
      .select({ count: count() })
      .from(properties)
      .where(and(
        eq(properties.companyId, companyId),
        eq(properties.status, 'available')
      ));

    const [userStats] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.companyId, companyId));

    return {
      totalClients: clientStats.count,
      activeProperties: propertyStats.count,
      totalUsers: userStats.count,
      monthlyRevenue: 0 // TODO: Calculate from transactions
    };
  }

  async getClients(companyId?: number): Promise<Client[]> {
    const query = db.select().from(clients);
    
    if (companyId) {
      query.where(eq(clients.companyId, companyId));
    }
    
    const result = await query.orderBy(clients.createdAt);
    return result.reverse();
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db
      .insert(clients)
      .values(insertClient)
      .returning();
    return client;
  }

  async updateClient(id: number, updateData: Partial<InsertClient>): Promise<Client | undefined> {
    const [client] = await db
      .update(clients)
      .set(updateData)
      .where(eq(clients.id, id))
      .returning();
    return client || undefined;
  }

  async deleteClient(id: number): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getProperties(companyId?: number): Promise<Property[]> {
    const query = db.select().from(properties);
    
    if (companyId) {
      query.where(eq(properties.companyId, companyId));
    }
    
    const result = await query.orderBy(properties.createdAt);
    return result.reverse();
  }

  async getProperty(id: number): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property || undefined;
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const [property] = await db
      .insert(properties)
      .values(insertProperty)
      .returning();
    return property;
  }

  async updateProperty(id: number, updateData: Partial<InsertProperty>): Promise<Property | undefined> {
    const [property] = await db
      .update(properties)
      .set(updateData)
      .where(eq(properties.id, id))
      .returning();
    return property || undefined;
  }

  async deleteProperty(id: number): Promise<boolean> {
    const result = await db.delete(properties).where(eq(properties.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getApplications(companyId?: number): Promise<Application[]> {
    if (companyId) {
      // Join with clients table to filter by company
      const result = await db
        .select({
          id: applications.id,
          clientId: applications.clientId,
          propertyId: applications.propertyId,
          status: applications.status,
          submittedAt: applications.submittedAt,
          approvedAt: applications.approvedAt,
          notes: applications.notes,
          rentAmount: applications.rentAmount,
          depositAmount: applications.depositAmount,
          applicationFee: applications.applicationFee,
          countyReimbursement: applications.countyReimbursement,
          createdAt: applications.createdAt,
          updatedAt: applications.updatedAt,
        })
        .from(applications)
        .innerJoin(clients, eq(applications.clientId, clients.id))
        .where(eq(clients.companyId, companyId))
        .orderBy(applications.submittedAt);
      return result.reverse();
    } else {
      const result = await db.select().from(applications).orderBy(applications.submittedAt);
      return result.reverse();
    }
  }

  async getApplication(id: number): Promise<Application | undefined> {
    const [application] = await db.select().from(applications).where(eq(applications.id, id));
    return application || undefined;
  }

  async createApplication(insertApplication: InsertApplication): Promise<Application> {
    const [application] = await db
      .insert(applications)
      .values(insertApplication)
      .returning();
    return application;
  }

  async updateApplication(id: number, updateData: Partial<InsertApplication>): Promise<Application | undefined> {
    const updateValues: any = { ...updateData };
    if (updateData.status === 'approved') {
      updateValues.approvedAt = new Date();
    }
    
    const [application] = await db
      .update(applications)
      .set(updateValues)
      .where(eq(applications.id, id))
      .returning();
    return application || undefined;
  }

  async deleteApplication(id: number): Promise<boolean> {
    const result = await db.delete(applications).where(eq(applications.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getApplicationsByClient(clientId: number): Promise<Application[]> {
    const result = await db
      .select()
      .from(applications)
      .where(eq(applications.clientId, clientId))
      .orderBy(applications.submittedAt);
    return result.reverse();
  }

  async getTransactions(companyId?: number): Promise<Transaction[]> {
    if (companyId) {
      // Join with applications and clients to filter by company
      const result = await db
        .select({
          id: transactions.id,
          applicationId: transactions.applicationId,
          type: transactions.type,
          amount: transactions.amount,
          description: transactions.description,
          createdAt: transactions.createdAt,
        })
        .from(transactions)
        .innerJoin(applications, eq(transactions.applicationId, applications.id))
        .innerJoin(clients, eq(applications.clientId, clients.id))
        .where(eq(clients.companyId, companyId))
        .orderBy(transactions.createdAt);
      return result.reverse();
    } else {
      const result = await db.select().from(transactions).orderBy(transactions.createdAt);
      return result.reverse();
    }
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction || undefined;
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(insertTransaction)
      .returning();
    return transaction;
  }

  async getTransactionsByClient(clientId: number): Promise<Transaction[]> {
    // Get transactions through applications belonging to this client
    const result = await db
      .select({
        id: transactions.id,
        applicationId: transactions.applicationId,
        type: transactions.type,
        amount: transactions.amount,
        description: transactions.description,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .leftJoin(applications, eq(transactions.applicationId, applications.id))
      .where(eq(applications.clientId, clientId))
      .orderBy(transactions.createdAt);
    return result.reverse();
  }

  async getPoolFundEntries(): Promise<PoolFund[]> {
    const result = await db.select().from(poolFund).orderBy(poolFund.createdAt);
    return result.reverse();
  }

  async getPoolFundEntriesByCounty(county: string): Promise<PoolFund[]> {
    const result = await db.select().from(poolFund)
      .where(eq(poolFund.county, county))
      .orderBy(poolFund.createdAt);
    return result.reverse();
  }

  async createPoolFundEntry(insertPoolFund: InsertPoolFund): Promise<PoolFund> {
    const [entry] = await db
      .insert(poolFund)
      .values(insertPoolFund)
      .returning();
    return entry;
  }

  async getPoolFundBalance(): Promise<number> {
    const entries = await db.select().from(poolFund);
    return entries.reduce((balance, entry) => {
      const amount = parseFloat(entry.amount.toString());
      if (entry.type === 'deposit') {
        return balance + amount;
      } else {
        // Both 'withdrawal' and 'allocation' reduce the balance
        return balance - amount;
      }
    }, 0);
  }

  async getPoolFundBalanceByCounty(county: string): Promise<number> {
    const entries = await db.select().from(poolFund).where(eq(poolFund.county, county));
    return entries.reduce((balance, entry) => {
      const amount = parseFloat(entry.amount.toString());
      if (entry.type === 'deposit') {
        return balance + amount;
      } else {
        // Both 'withdrawal' and 'allocation' reduce the balance
        return balance - amount;
      }
    }, 0);
  }

  async getPoolFundSummaryByCounty(): Promise<Array<{
    county: string;
    balance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    entryCount: number;
  }>> {
    const allEntries = await db.select().from(poolFund);
    
    const summaryMap = new Map<string, {
      county: string;
      balance: number;
      totalDeposits: number;
      totalWithdrawals: number;
      entryCount: number;
    }>();

    for (const entry of allEntries) {
      const county = entry.county;
      const amount = parseFloat(entry.amount.toString());
      
      if (!summaryMap.has(county)) {
        summaryMap.set(county, {
          county,
          balance: 0,
          totalDeposits: 0,
          totalWithdrawals: 0,
          entryCount: 0,
        });
      }

      const summary = summaryMap.get(county)!;
      summary.entryCount++;
      
      if (entry.type === 'deposit') {
        summary.balance += amount;
        summary.totalDeposits += amount;
      } else {
        // Both 'withdrawal' and 'allocation' reduce the balance
        summary.balance -= amount;
        summary.totalWithdrawals += amount;
      }
    }

    return Array.from(summaryMap.values()).sort((a, b) => b.balance - a.balance);
  }

  async getDashboardStats(): Promise<{
    totalClients: number;
    activeProperties: number;
    pendingApplications: number;
    poolFundBalance: number;
    totalVendors: number;
    activeOtherSubsidies: number;
    totalOtherSubsidyAmount: number;
  }> {
    const [clientsCount] = await db.select().from(clients);
    const totalClients = await db.select().from(clients);
    
    const allProperties = await db.select().from(properties);
    const activeProperties = allProperties.filter(p => 
      p.status === 'available' || p.status === 'occupied'
    ).length;
    
    const pendingApplicationsResult = await db.select().from(applications).where(eq(applications.status, 'pending'));
    const pendingApplications = pendingApplicationsResult.length;
    
    const poolFundBalance = await this.getPoolFundBalance();

    // Get vendor statistics
    const allVendors = await db.select().from(vendors);
    const totalVendors = allVendors.length;

    // Get other subsidies statistics
    const allOtherSubsidies = await db.select().from(otherSubsidies);
    const activeOtherSubsidies = allOtherSubsidies.filter(s => s.status === 'active').length;
    
    // Calculate total subsidy amount (rent we paid)
    const totalOtherSubsidyAmount = allOtherSubsidies
      .filter(s => s.status === 'active' && s.rentWePaid)
      .reduce((total, subsidy) => {
        return total + parseFloat(subsidy.rentWePaid?.toString() || "0");
      }, 0);

    return {
      totalClients: totalClients.length,
      activeProperties,
      pendingApplications,
      poolFundBalance,
      totalVendors,
      activeOtherSubsidies,
      totalOtherSubsidyAmount,
    };
  }

  // Housing Support operations
  async getHousingSupportRecords(): Promise<HousingSupport[]> {
    return await db.select().from(housingSupport);
  }

  async getHousingSupportByClient(clientId: number): Promise<HousingSupport[]> {
    return await db.select().from(housingSupport).where(eq(housingSupport.clientId, clientId));
  }

  async getHousingSupportByMonth(month: string): Promise<HousingSupport[]> {
    return await db.select().from(housingSupport).where(eq(housingSupport.month, month));
  }

  async createHousingSupportRecord(insertRecord: InsertHousingSupport): Promise<HousingSupport> {
    // Calculate pool contribution: (subsidyReceived + clientObligation - rentAmount - adminFee - electricityFee - rentLateFee)
    const monthPoolTotal = 
      parseFloat(insertRecord.subsidyReceived.toString()) + 
      parseFloat(insertRecord.clientObligation.toString()) - 
      parseFloat(insertRecord.rentAmount.toString()) - 
      parseFloat(insertRecord.adminFee.toString()) - 
      parseFloat(insertRecord.electricityFee?.toString() || "0") - 
      parseFloat(insertRecord.rentLateFee?.toString() || "0");

    // Get current running total and add this month's contribution
    const currentRunningTotal = await this.getRunningPoolTotal();
    const newRunningTotal = currentRunningTotal + monthPoolTotal;

    const recordWithCalculations = {
      ...insertRecord,
      monthPoolTotal: monthPoolTotal.toString(),
      runningPoolTotal: newRunningTotal.toString(),
    };

    const [record] = await db
      .insert(housingSupport)
      .values(recordWithCalculations)
      .returning();
    return record;
  }

  async updateHousingSupportRecord(id: number, updateData: Partial<InsertHousingSupport>): Promise<HousingSupport | undefined> {
    // If financial fields are being updated, recalculate the pool totals
    if (updateData.subsidyReceived || updateData.clientObligation || updateData.rentAmount || 
        updateData.adminFee || updateData.electricityFee || updateData.rentLateFee) {
      
      const [existingRecord] = await db.select().from(housingSupport).where(eq(housingSupport.id, id));
      if (!existingRecord) return undefined;

      // Use existing values for fields not being updated
      const subsidyReceived = updateData.subsidyReceived || existingRecord.subsidyReceived;
      const clientObligation = updateData.clientObligation || existingRecord.clientObligation;
      const rentAmount = updateData.rentAmount || existingRecord.rentAmount;
      const adminFee = updateData.adminFee || existingRecord.adminFee;
      const electricityFee = updateData.electricityFee || existingRecord.electricityFee || "0";
      const rentLateFee = updateData.rentLateFee || existingRecord.rentLateFee || "0";

      const monthPoolTotal = 
        parseFloat(subsidyReceived.toString()) + 
        parseFloat(clientObligation.toString()) - 
        parseFloat(rentAmount.toString()) - 
        parseFloat(adminFee.toString()) - 
        parseFloat(electricityFee.toString()) - 
        parseFloat(rentLateFee.toString());

      updateData.monthPoolTotal = monthPoolTotal.toString();
      
      // Note: In a production system, you'd want to recalculate all running totals
      // after this record's month for accuracy. For now, we'll keep it simple.
    }

    const [updatedRecord] = await db
      .update(housingSupport)
      .set(updateData)
      .where(eq(housingSupport.id, id))
      .returning();
    return updatedRecord || undefined;
  }

  async calculateMonthlyPoolTotal(clientId: number, month: string): Promise<number> {
    const records = await db.select()
      .from(housingSupport)
      .where(eq(housingSupport.month, month));
    
    return records.reduce((total, record) => {
      return total + parseFloat(record.monthPoolTotal.toString());
    }, 0);
  }

  async getRunningPoolTotal(): Promise<number> {
    const allRecords = await db.select().from(housingSupport);
    
    if (allRecords.length === 0) return 0;
    
    // Sort by month and calculate running total
    const sortedRecords = allRecords.sort((a, b) => a.month.localeCompare(b.month));
    
    return sortedRecords.reduce((total, record) => {
      return total + parseFloat(record.monthPoolTotal.toString());
    }, 0);
  }

  async getClientBalance(clientId: number): Promise<number> {
    const [client] = await db.select({ balance: clients.currentBalance })
      .from(clients)
      .where(eq(clients.id, clientId));
    return parseFloat(client?.balance?.toString() || "0");
  }

  async updateClientBalance(clientId: number, amount: number): Promise<void> {
    await db.update(clients)
      .set({ currentBalance: amount.toString() })
      .where(eq(clients.id, clientId));
  }

  async updateClientCreditLimit(clientId: number, limit: number): Promise<void> {
    await db.update(clients)
      .set({ creditLimit: limit.toString() })
      .where(eq(clients.id, clientId));
  }

  async setGlobalCreditLimit(limit: number): Promise<void> {
    await db.update(clients)
      .set({ creditLimit: limit.toString() });
  }

  // Vendor operations
  async getVendors(): Promise<Vendor[]> {
    return await db.select().from(vendors).orderBy(vendors.name);
  }

  async getVendor(id: number): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor || undefined;
  }

  async getVendorsByType(type: string): Promise<Vendor[]> {
    return await db.select().from(vendors).where(eq(vendors.type, type)).orderBy(vendors.name);
  }

  async createVendor(insertVendor: InsertVendor): Promise<Vendor> {
    const [vendor] = await db.insert(vendors).values(insertVendor).returning();
    return vendor;
  }

  async updateVendor(id: number, updateData: Partial<InsertVendor>): Promise<Vendor | undefined> {
    const [vendor] = await db
      .update(vendors)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(vendors.id, id))
      .returning();
    return vendor || undefined;
  }

  async deleteVendor(id: number): Promise<boolean> {
    const result = await db.delete(vendors).where(eq(vendors.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Other Subsidies methods
  async getOtherSubsidies(): Promise<OtherSubsidy[]> {
    return await db.select().from(otherSubsidies).orderBy(otherSubsidies.clientName);
  }

  async getOtherSubsidy(id: number): Promise<OtherSubsidy | undefined> {
    const [subsidy] = await db.select().from(otherSubsidies).where(eq(otherSubsidies.id, id));
    return subsidy || undefined;
  }

  async getOtherSubsidiesByClient(clientName: string): Promise<OtherSubsidy[]> {
    return await db.select().from(otherSubsidies).where(eq(otherSubsidies.clientName, clientName));
  }

  async getOtherSubsidiesByVendor(vendorName: string): Promise<OtherSubsidy[]> {
    return await db.select().from(otherSubsidies).where(eq(otherSubsidies.vendorName, vendorName));
  }

  async createOtherSubsidy(insertSubsidy: InsertOtherSubsidy): Promise<OtherSubsidy> {
    const [subsidy] = await db.insert(otherSubsidies).values(insertSubsidy).returning();
    return subsidy;
  }

  async updateOtherSubsidy(id: number, updateData: Partial<InsertOtherSubsidy>): Promise<OtherSubsidy | undefined> {
    const [subsidy] = await db
      .update(otherSubsidies)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(otherSubsidies.id, id))
      .returning();
    return subsidy || undefined;
  }

  async deleteOtherSubsidy(id: number): Promise<boolean> {
    const result = await db.delete(otherSubsidies).where(eq(otherSubsidies.id, id));
    return (result.rowCount || 0) > 0;
  }

  // User Management implementations
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser, createdById?: number): Promise<User> {
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(insertUser.password, saltRounds);
    
    const userData = {
      username: insertUser.username,
      email: insertUser.email,
      passwordHash,
      firstName: insertUser.firstName,
      lastName: insertUser.lastName,
      isEnabled: insertUser.isEnabled || false,
      isSuperAdmin: insertUser.isSuperAdmin || false,
      createdById,
    };

    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: number, updateData: UpdateUser): Promise<User | undefined> {
    const updateFields: any = { ...updateData, updatedAt: new Date() };
    
    // Hash password if it's being updated
    if (updateData.passwordHash) {
      const saltRounds = 12;
      updateFields.passwordHash = await bcrypt.hash(updateData.passwordHash, saltRounds);
    }

    const [user] = await db
      .update(users)
      .set(updateFields)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount || 0) > 0;
  }

  async enableUser(id: number, enabled: boolean): Promise<boolean> {
    const [user] = await db
      .update(users)
      .set({ isEnabled: enabled, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user !== undefined;
  }

  async authenticateUser(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user || !user.isEnabled) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    await this.updateLastLogin(user.id);
    return user;
  }

  async updateLastLogin(id: number): Promise<void> {
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id));
  }

  // Role Management implementations
  async getRoles(): Promise<Role[]> {
    return await db.select().from(roles).orderBy(roles.name);
  }

  async getRole(id: number): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role || undefined;
  }

  async getRoleByName(name: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.name, name));
    return role || undefined;
  }

  async createRole(insertRole: InsertRole): Promise<Role> {
    const [role] = await db.insert(roles).values(insertRole).returning();
    return role;
  }

  async updateRole(id: number, updateData: Partial<InsertRole>): Promise<Role | undefined> {
    const [role] = await db
      .update(roles)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(roles.id, id))
      .returning();
    return role || undefined;
  }

  async deleteRole(id: number): Promise<boolean> {
    const result = await db.delete(roles).where(eq(roles.id, id));
    return (result.rowCount || 0) > 0;
  }

  // User Role Assignment implementations
  async getUserRoles(userId: number): Promise<UserRole[]> {
    return await db.select().from(userRoles).where(eq(userRoles.userId, userId));
  }

  async getUserPermissions(userId: number): Promise<Permission[]> {
    const user = await this.getUser(userId);
    if (!user) return [];

    // Super admins have all permissions
    if (user.isSuperAdmin) {
      return Object.values({
        SUPER_ADMIN: 'super_admin',
        MANAGE_USERS: 'manage_users',
        MANAGE_ROLES: 'manage_roles',
        VIEW_AUDIT_LOGS: 'view_audit_logs',
        VIEW_CLIENTS: 'view_clients',
        CREATE_CLIENTS: 'create_clients',
        EDIT_CLIENTS: 'edit_clients',
        DELETE_CLIENTS: 'delete_clients',
        VIEW_PROPERTIES: 'view_properties',
        CREATE_PROPERTIES: 'create_properties',
        EDIT_PROPERTIES: 'edit_properties',
        DELETE_PROPERTIES: 'delete_properties',
        VIEW_APPLICATIONS: 'view_applications',
        CREATE_APPLICATIONS: 'create_applications',
        EDIT_APPLICATIONS: 'edit_applications',
        DELETE_APPLICATIONS: 'delete_applications',
        APPROVE_APPLICATIONS: 'approve_applications',
        VIEW_TRANSACTIONS: 'view_transactions',
        CREATE_TRANSACTIONS: 'create_transactions',
        EDIT_TRANSACTIONS: 'edit_transactions',
        DELETE_TRANSACTIONS: 'delete_transactions',
        MANAGE_POOL_FUND: 'manage_pool_fund',
        VIEW_VENDORS: 'view_vendors',
        CREATE_VENDORS: 'create_vendors',
        EDIT_VENDORS: 'edit_vendors',
        DELETE_VENDORS: 'delete_vendors',
        VIEW_OTHER_SUBSIDIES: 'view_other_subsidies',
        CREATE_OTHER_SUBSIDIES: 'create_other_subsidies',
        EDIT_OTHER_SUBSIDIES: 'edit_other_subsidies',
        DELETE_OTHER_SUBSIDIES: 'delete_other_subsidies',
        VIEW_HOUSING_SUPPORT: 'view_housing_support',
        CREATE_HOUSING_SUPPORT: 'create_housing_support',
        EDIT_HOUSING_SUPPORT: 'edit_housing_support',
        DELETE_HOUSING_SUPPORT: 'delete_housing_support',
        VIEW_REPORTS: 'view_reports',
        EXPORT_DATA: 'export_data',
      } as const) as Permission[];
    }

    // Get user's roles and extract permissions
    const userRoleRecords = await this.getUserRoles(userId);
    const permissions = new Set<Permission>();

    for (const userRole of userRoleRecords) {
      const role = await this.getRole(userRole.roleId);
      if (role && role.isActive) {
        const rolePermissions = role.permissions as Permission[];
        rolePermissions.forEach(permission => permissions.add(permission));
      }
    }

    return Array.from(permissions);
  }

  async assignRole(userId: number, roleId: number, assignedById: number): Promise<UserRole> {
    const [userRole] = await db.insert(userRoles).values({
      userId,
      roleId,
      assignedById,
    }).returning();
    return userRole;
  }

  async removeRole(userId: number, roleId: number): Promise<boolean> {
    const result = await db.delete(userRoles)
      .where(sql`${userRoles.userId} = ${userId} AND ${userRoles.roleId} = ${roleId}`);
    return (result.rowCount || 0) > 0;
  }

  // Audit Log implementations
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(insertLog).returning();
    return log;
  }

  async getAuditLogs(userId?: number, limit: number = 100): Promise<AuditLog[]> {
    if (userId) {
      return await db.select().from(auditLogs)
        .where(eq(auditLogs.userId, userId))
        .orderBy(sql`${auditLogs.timestamp} DESC`)
        .limit(limit);
    }
    
    return await db.select().from(auditLogs)
      .orderBy(sql`${auditLogs.timestamp} DESC`)
      .limit(limit);
  }

  // Permission checking implementations
  async hasPermission(userId: number, permission: Permission): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permission);
  }

  async isSuperAdmin(userId: number): Promise<boolean> {
    const user = await this.getUser(userId);
    return user?.isSuperAdmin || false;
  }

  async canUserCreateUsers(userId: number): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    
    if (user.isSuperAdmin) return true;

    const userRoleRecords = await this.getUserRoles(userId);
    for (const userRole of userRoleRecords) {
      const role = await this.getRole(userRole.roleId);
      if (role && role.isActive && role.canCreateUsers) {
        return true;
      }
    }
    return false;
  }

  async canUserAssignRole(userId: number, roleId: number): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    
    if (user.isSuperAdmin) return true;

    const userRoleRecords = await this.getUserRoles(userId);
    for (const userRole of userRoleRecords) {
      const role = await this.getRole(userRole.roleId);
      if (role && role.isActive) {
        const assignableRoles = role.canAssignRoles as number[];
        if (assignableRoles.includes(roleId)) {
          return true;
        }
      }
    }
    return false;
  }

  // Client Notes operations
  async getClientNotes(clientId: number): Promise<ClientNote[]> {
    const notes = await db
      .select({
        id: clientNotes.id,
        clientId: clientNotes.clientId,
        userId: clientNotes.userId,
        content: clientNotes.content,
        noteDate: clientNotes.noteDate,
        createdAt: clientNotes.createdAt,
        updatedAt: clientNotes.updatedAt,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('userName')
      })
      .from(clientNotes)
      .leftJoin(users, eq(clientNotes.userId, users.id))
      .where(eq(clientNotes.clientId, clientId))
      .orderBy(desc(clientNotes.noteDate), desc(clientNotes.createdAt));
    
    return notes.map(note => ({
      id: note.id,
      clientId: note.clientId,
      userId: note.userId,
      content: note.content,
      noteDate: note.noteDate,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      userName: note.userName || 'Unknown User'
    })) as ClientNote[];
  }

  async createClientNote(insertNote: InsertClientNote): Promise<ClientNote> {
    const [note] = await db
      .insert(clientNotes)
      .values(insertNote)
      .returning();
    return note;
  }

  async updateClientNote(id: number, updateData: Partial<InsertClientNote>): Promise<ClientNote | undefined> {
    const [note] = await db
      .update(clientNotes)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(clientNotes.id, id))
      .returning();
    return note || undefined;
  }

  async deleteClientNote(id: number): Promise<boolean> {
    const result = await db.delete(clientNotes).where(eq(clientNotes.id, id));
    return (result.rowCount || 0) > 0;
  }

  async clearAllData(): Promise<void> {
    // Clear all data from all tables (in proper order to handle foreign key constraints)
    await db.delete(auditLogs);
    await db.delete(userRoles);
    await db.delete(clientNotes);
    await db.delete(housingSupport);
    await db.delete(otherSubsidies);
    await db.delete(poolFund);
    await db.delete(transactions);
    await db.delete(applications);
    await db.delete(properties);
    await db.delete(clients);
    await db.delete(vendors);
    
    // Keep only essential admin users and roles
    await db.delete(users).where(and(
      ne(users.username, 'admin'),
      ne(users.username, 'maya')
    ));
    
    await db.delete(roles).where(and(
      ne(roles.name, 'Administrator'),
      ne(roles.name, 'Manager'),
      ne(roles.name, 'Staff')
    ));
  }

  async getTotalUsers(): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(users);
    return result.count;
  }
}

export const storage = new DatabaseStorage();
