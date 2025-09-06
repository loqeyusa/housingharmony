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
  recurringBills,
  recurringBillInstances,
  sites,
  buildings,
  clientDocuments,
  documentAccessLog,
  externalIntegrations,
  automationTasks,
  quickbooksSyncLog,
  webAutomationLogs,
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
  type InsertClientNote,
  type RecurringBill,
  type InsertRecurringBill,
  type RecurringBillInstance,
  type InsertRecurringBillInstance,
  type Site,
  type InsertSite,
  type Building,
  type InsertBuilding,
  type ClientDocument,
  type InsertClientDocument,
  type DocumentAccessLog,
  type RentChange,
  type InsertRentChange,
  type ExternalIntegration,
  type InsertExternalIntegration,
  type AutomationTask,
  type InsertAutomationTask,
  type QuickbooksSyncLog,
  type WebAutomationLog,
  rentChanges
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
  getDeletedClients(companyId?: number): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;
  softDeleteClient(id: number): Promise<Client | undefined>;
  restoreClient(id: number): Promise<Client | undefined>;
  permanentDeleteClient(id: number): Promise<boolean>;

  // Properties (company-scoped)
  getProperties(companyId?: number): Promise<Property[]>;
  getProperty(id: number): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: number): Promise<boolean>;
  updatePropertyRent(propertyId: number, newRentAmount: string, changeReason: string, changeDate: string, changedBy: number, notes?: string): Promise<Property | undefined>;

  // Rent Changes
  getRentChangeHistory(propertyId: number): Promise<RentChange[]>;
  createRentChange(rentChange: InsertRentChange): Promise<RentChange>;

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
  getPoolFundBalance(companyId?: number): Promise<number>;
  getPoolFundBalanceByCounty(county: string): Promise<number>;
  getPoolFundSummaryByCounty(companyId?: number): Promise<Array<{
    county: string;
    balance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    entryCount: number;
  }>>;
  getPoolFundTransactionsByCounty(county: string, companyId?: number): Promise<any[]>;
  getPoolFundBalanceSummary(county: string, companyId?: number): Promise<{
    county: string;
    totalDeposits: number;
    totalWithdrawals: number;
    currentBalance: number;
    transactionCount: number;
    lastTransaction?: string;
  }>;

  // Dashboard stats
  getDashboardStats(companyId?: number): Promise<{
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
  getClientPoolFundInfo(clientId: number): Promise<{
    balance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    recentEntries: Array<{
      id: number;
      amount: number;
      type: string;
      description: string;
      created_at: string;
      county: string;
    }>;
  }>;
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
  createBulkUsers(users: any[], createdById: number): Promise<{
    success: User[];
    errors: Array<{
      row: number;
      error: string;
      data: any;
    }>;
  }>;
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

  // External Integrations
  getExternalIntegrations(companyId: number): Promise<ExternalIntegration[]>;
  getExternalIntegration(id: number): Promise<ExternalIntegration | undefined>;
  createExternalIntegration(integration: InsertExternalIntegration): Promise<ExternalIntegration>;
  updateExternalIntegration(id: number, integration: Partial<InsertExternalIntegration>): Promise<ExternalIntegration | undefined>;
  deleteExternalIntegration(id: number): Promise<boolean>;

  // Automation Tasks
  getAutomationTasks(companyId: number, status?: string): Promise<AutomationTask[]>;
  getAutomationTask(id: number): Promise<AutomationTask | undefined>;
  createAutomationTask(task: InsertAutomationTask): Promise<AutomationTask>;
  updateAutomationTask(id: number, task: Partial<InsertAutomationTask>): Promise<AutomationTask | undefined>;

  // QuickBooks Sync Logs
  getQuickbooksSyncLogs(companyId: number, limit?: number): Promise<QuickbooksSyncLog[]>;
  
  // Web Automation Logs
  getWebAutomationLogs(taskId: number): Promise<WebAutomationLog[]>;
  
  // Client Notes operations
  getClientNotes(clientId: number): Promise<ClientNote[]>;
  createClientNote(note: InsertClientNote): Promise<ClientNote>;
  updateClientNote(id: number, note: Partial<InsertClientNote>): Promise<ClientNote | undefined>;
  deleteClientNote(id: number): Promise<boolean>;

  // Recurring Bills
  getRecurringBills(clientId?: number): Promise<RecurringBill[]>;
  getRecurringBill(id: number): Promise<RecurringBill | undefined>;
  createRecurringBill(bill: InsertRecurringBill): Promise<RecurringBill>;
  updateRecurringBill(id: number, bill: Partial<InsertRecurringBill>): Promise<RecurringBill | undefined>;
  deleteRecurringBill(id: number): Promise<boolean>;

  // Recurring Bill Instances
  getRecurringBillInstances(status?: string): Promise<RecurringBillInstance[]>;
  getRecurringBillInstance(id: number): Promise<RecurringBillInstance | undefined>;
  getRecurringBillInstancesByClient(clientId: number): Promise<RecurringBillInstance[]>;
  createRecurringBillInstance(instance: InsertRecurringBillInstance): Promise<RecurringBillInstance>;
  updateRecurringBillInstance(id: number, instance: Partial<InsertRecurringBillInstance>): Promise<RecurringBillInstance | undefined>;
  markRecurringBillInstancePaid(id: number, paymentData: {
    paymentMethod: string;
    checkNumber?: string;
    checkDate?: string;
    paymentDate: string;
    paymentNotes?: string;
    paidBy: number;
  }): Promise<RecurringBillInstance | undefined>;

  // Monthly bill processing
  generateMonthlyBills(year: number, month: number): Promise<RecurringBillInstance[]>;
  processClientAccountBalance(clientId: number, amount: number, description: string): Promise<void>;
  
  // Sites operations
  getSites(companyId?: number): Promise<Site[]>;
  getSite(id: number): Promise<Site | undefined>;
  createSite(site: InsertSite): Promise<Site>;
  updateSite(id: number, site: Partial<InsertSite>): Promise<Site | undefined>;
  deleteSite(id: number): Promise<boolean>;

  // Buildings operations
  getBuildings(companyId?: number): Promise<Building[]>;
  getBuilding(id: number): Promise<Building | undefined>;
  createBuilding(building: InsertBuilding): Promise<Building>;
  updateBuilding(id: number, building: Partial<InsertBuilding>): Promise<Building | undefined>;
  deleteBuilding(id: number): Promise<boolean>;

  // Client Documents (HIPAA compliant)
  getClientDocuments(clientId: number): Promise<ClientDocument[]>;
  getClientDocument(id: number): Promise<ClientDocument | undefined>;
  createClientDocument(document: InsertClientDocument): Promise<ClientDocument>;
  updateClientDocument(id: number, document: Partial<InsertClientDocument>): Promise<ClientDocument | undefined>;
  deleteClientDocument(id: number): Promise<boolean>;
  logDocumentAccess(documentId: number, userId: number, accessType: string, ipAddress?: string, userAgent?: string): Promise<void>;

  // Bulk user upload operations
  createBulkUsers(users: InsertUser[], createdById: number): Promise<{
    success: User[];
    errors: Array<{ row: number; error: string; data: any }>;
  }>;

  // Admin operations
  clearAllData(): Promise<void>;
  getTotalUsers(): Promise<number>;
  getSystemUsers(): Promise<Array<User & { companyName?: string; companyStatus?: string }>>;
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
    let result: Client[];
    
    if (companyId) {
      result = await db
        .select({
          id: clients.id,
          companyId: clients.companyId,
          caseNumber: clients.caseNumber,
          firstName: clients.firstName,
          lastName: clients.lastName,
          email: clients.email,
          phone: clients.phone,
          dateOfBirth: clients.dateOfBirth,
          ssn: clients.ssn,
          currentAddress: clients.currentAddress,
          employmentStatus: clients.employmentStatus,
          monthlyIncome: clients.monthlyIncome,
          county: clients.county,
          propertyId: clients.propertyId,
          buildingId: clients.buildingId,
          countyAmount: clients.countyAmount,
          notes: clients.notes,
          status: clients.status,
          isActive: clients.isActive,
          vendorNumber: clients.vendorNumber,
          site: clients.site,
          cluster: clients.cluster,
          subsidyStatus: clients.subsidyStatus,
          grhStatus: clients.grhStatus,
          maxHousingPayment: clients.maxHousingPayment,
          clientObligationPercent: clients.clientObligationPercent,
          currentBalance: clients.currentBalance,
          creditLimit: clients.creditLimit,
          createdAt: clients.createdAt,
          // Include normalized relationship data
          propertyName: properties.name,
          buildingName: buildings.name,
          buildingAddress: buildings.address,
          landlordName: buildings.landlordName,
        })
        .from(clients)
        .leftJoin(properties, eq(clients.propertyId, properties.id))
        .leftJoin(buildings, eq(clients.buildingId, buildings.id))
        .where(and(
          eq(clients.companyId, companyId),
          ne(clients.status, 'deleted')
        ))
        .orderBy(clients.createdAt);
    } else {
      result = await db
        .select({
          id: clients.id,
          companyId: clients.companyId,
          caseNumber: clients.caseNumber,
          firstName: clients.firstName,
          lastName: clients.lastName,
          email: clients.email,
          phone: clients.phone,
          dateOfBirth: clients.dateOfBirth,
          ssn: clients.ssn,
          currentAddress: clients.currentAddress,
          employmentStatus: clients.employmentStatus,
          monthlyIncome: clients.monthlyIncome,
          county: clients.county,
          propertyId: clients.propertyId,
          buildingId: clients.buildingId,
          countyAmount: clients.countyAmount,
          notes: clients.notes,
          status: clients.status,
          isActive: clients.isActive,
          vendorNumber: clients.vendorNumber,
          site: clients.site,
          cluster: clients.cluster,
          subsidyStatus: clients.subsidyStatus,
          grhStatus: clients.grhStatus,
          maxHousingPayment: clients.maxHousingPayment,
          clientObligationPercent: clients.clientObligationPercent,
          currentBalance: clients.currentBalance,
          creditLimit: clients.creditLimit,
          createdAt: clients.createdAt,
          // Include normalized relationship data
          propertyName: properties.name,
          buildingName: buildings.name,
          buildingAddress: buildings.address,
          landlordName: buildings.landlordName,
        })
        .from(clients)
        .leftJoin(properties, eq(clients.propertyId, properties.id))
        .leftJoin(buildings, eq(clients.buildingId, buildings.id))
        .where(ne(clients.status, 'deleted'))
        .orderBy(clients.createdAt);
    }
    
    return result.reverse();
  }

  async getDeletedClients(companyId?: number): Promise<Client[]> {
    let result: Client[];
    
    if (companyId) {
      result = await db
        .select()
        .from(clients)
        .where(and(
          eq(clients.companyId, companyId),
          eq(clients.status, 'deleted')
        ))
        .orderBy(clients.createdAt);
    } else {
      result = await db
        .select()
        .from(clients)
        .where(eq(clients.status, 'deleted'))
        .orderBy(clients.createdAt);
    }
    
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

  async softDeleteClient(id: number): Promise<Client | undefined> {
    const [client] = await db
      .update(clients)
      .set({ status: 'deleted' })
      .where(eq(clients.id, id))
      .returning();
    return client || undefined;
  }

  async restoreClient(id: number): Promise<Client | undefined> {
    const [client] = await db
      .update(clients)
      .set({ status: 'active' })
      .where(eq(clients.id, id))
      .returning();
    return client || undefined;
  }

  async permanentDeleteClient(id: number): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getProperties(companyId?: number): Promise<Property[]> {
    let result: Property[];
    
    if (companyId) {
      result = await db
        .select({
          id: properties.id,
          companyId: properties.companyId,
          buildingId: properties.buildingId,
          name: properties.name,
          unitNumber: properties.unitNumber,
          floor: properties.floor,
          rentAmount: properties.rentAmount,
          depositAmount: properties.depositAmount,
          bedrooms: properties.bedrooms,
          bathrooms: properties.bathrooms,
          squareFootage: properties.squareFootage,
          unitAmenities: properties.unitAmenities,
          hasBalcony: properties.hasBalcony,
          hasPatio: properties.hasPatio,
          hasWasherDryer: properties.hasWasherDryer,
          petFriendly: properties.petFriendly,
          utilities: properties.utilities,
          status: properties.status,
          currentTenantId: properties.currentTenantId,
          leaseStartDate: properties.leaseStartDate,
          leaseEndDate: properties.leaseEndDate,
          lastInspection: properties.lastInspection,
          notes: properties.notes,
          createdAt: properties.createdAt,
          updatedAt: properties.updatedAt,
        })
        .from(properties)
        .leftJoin(buildings, eq(properties.buildingId, buildings.id))
        .where(eq(properties.companyId, companyId))
        .orderBy(properties.createdAt);
    } else {
      result = await db
        .select({
          id: properties.id,
          companyId: properties.companyId,
          buildingId: properties.buildingId,
          name: properties.name,
          unitNumber: properties.unitNumber,
          floor: properties.floor,
          rentAmount: properties.rentAmount,
          depositAmount: properties.depositAmount,
          bedrooms: properties.bedrooms,
          bathrooms: properties.bathrooms,
          squareFootage: properties.squareFootage,
          unitAmenities: properties.unitAmenities,
          hasBalcony: properties.hasBalcony,
          hasPatio: properties.hasPatio,
          hasWasherDryer: properties.hasWasherDryer,
          petFriendly: properties.petFriendly,
          utilities: properties.utilities,
          status: properties.status,
          currentTenantId: properties.currentTenantId,
          leaseStartDate: properties.leaseStartDate,
          leaseEndDate: properties.leaseEndDate,
          lastInspection: properties.lastInspection,
          notes: properties.notes,
          createdAt: properties.createdAt,
          updatedAt: properties.updatedAt,
        })
        .from(properties)
        .leftJoin(buildings, eq(properties.buildingId, buildings.id))
        .orderBy(properties.createdAt);
    }
    
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

  // Update property rent with change logging
  async updatePropertyRent(propertyId: number, newRentAmount: string, changeReason: string, changeDate: string, changedBy: number, notes?: string): Promise<Property | undefined> {
    // Get current property to log old rent amount
    const currentProperty = await this.getProperty(propertyId);
    if (!currentProperty) {
      return undefined;
    }

    // Start a transaction to update property and log rent change
    const [updatedProperty] = await db
      .update(properties)
      .set({ 
        rentAmount: newRentAmount,
        updatedAt: new Date()
      })
      .where(eq(properties.id, propertyId))
      .returning();

    // Log the rent change
    if (updatedProperty) {
      await db.insert(rentChanges).values({
        propertyId,
        oldRentAmount: currentProperty.rentAmount,
        newRentAmount,
        changeReason,
        changeDate,
        changedBy,
        notes
      });
    }

    return updatedProperty || undefined;
  }

  // Get rent change history for a property
  async getRentChangeHistory(propertyId: number): Promise<RentChange[]> {
    const result = await db
      .select()
      .from(rentChanges)
      .where(eq(rentChanges.propertyId, propertyId))
      .orderBy(desc(rentChanges.createdAt));
    
    return result;
  }

  // Create rent change record
  async createRentChange(insertRentChange: InsertRentChange): Promise<RentChange> {
    const [rentChange] = await db
      .insert(rentChanges)
      .values(insertRentChange)
      .returning();
    
    return rentChange;
  }

  async getApplications(companyId?: number): Promise<Application[]> {
    if (companyId) {
      // First check if there are any clients for this company
      const clientIds = await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.companyId, companyId));
      
      if (clientIds.length === 0) {
        // No clients for this company, return empty array
        return [];
      }
      
      // Get applications for clients that belong to this company
      const result = await db
        .select()
        .from(applications)
        .where(inArray(applications.clientId, clientIds.map(c => c.id)))
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
        .select()
        .from(transactions)
        .innerJoin(applications, eq(transactions.applicationId, applications.id))
        .innerJoin(clients, eq(applications.clientId, clients.id))
        .where(eq(clients.companyId, companyId))
        .orderBy(transactions.createdAt);
      return result.map(r => r.transactions).reverse();
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
      .select()
      .from(transactions)
      .leftJoin(applications, eq(transactions.applicationId, applications.id))
      .where(eq(applications.clientId, clientId))
      .orderBy(transactions.createdAt);
    return result.map(r => r.transactions).reverse();
  }

  async getPoolFundEntries(companyId?: number): Promise<PoolFund[]> {
    if (companyId) {
      // Use raw SQL for company-filtered pool fund entries
      const result = await db.execute(sql`
        SELECT pf.* 
        FROM pool_fund pf
        INNER JOIN clients c ON pf.client_id = c.id
        WHERE c.company_id = ${companyId}
        ORDER BY pf.created_at DESC
      `);
      
      return result.rows.map((row: any) => ({
        id: row.id,
        transactionId: row.transaction_id,
        amount: row.amount,
        type: row.type,
        description: row.description,
        clientId: row.client_id,
        county: row.county,
        siteId: row.site_id,
        month: row.month,
        createdAt: new Date(row.created_at)
      }));
    } else {
      // Global pool fund entries
      const result = await db.select().from(poolFund).orderBy(desc(poolFund.createdAt));
      return result;
    }
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

  async getPoolFundBalance(companyId?: number): Promise<number> {
    // Pool fund entries are filtered by company through county relationship
    if (companyId) {
      // Get counties where this company has clients (normalize site names to match pool fund county names)
      const companyClients = await db.select().from(clients).where(eq(clients.companyId, companyId));
      const companyCounties = new Set(companyClients.map(c => {
        if (c.site) {
          // Normalize "Dakota County" to "Dakota", "Hennepin County" to "Hennepin", etc.
          return c.site.replace(' County', '');
        }
        return null;
      }).filter(Boolean));
      
      if (companyCounties.size === 0) {
        return 0; // No clients, no pool fund balance
      }
      
      // Get pool fund entries for the company's counties
      let entries: any[] = [];
      if (companyCounties.size === 1) {
        const countyValue = Array.from(companyCounties)[0];
        if (countyValue) {
          entries = await db.select().from(poolFund).where(eq(poolFund.county, countyValue));
        }
      } else if (companyCounties.size > 1) {
        entries = await db.select().from(poolFund).where(inArray(poolFund.county, Array.from(companyCounties) as string[]));
      }
      
      return entries.reduce((balance: number, entry: any) => {
        const amount = parseFloat(entry.amount.toString());
        if (entry.type === 'deposit') {
          return balance + amount;
        } else {
          // Both 'withdrawal' and 'allocation' reduce the balance
          return balance - amount;
        }
      }, 0);
    } else {
      // Global pool fund balance
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

  async getPoolFundSummaryByCounty(companyId?: number): Promise<Array<{
    county: string;
    balance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    entryCount: number;
  }>> {
    // For company-specific filtering, only show counties where the company has clients
    let allEntries: any[] = [];
    
    if (companyId) {
      // Get all counties where this company has clients (normalize site names to match pool fund county names)
      const companyClients = await db.select().from(clients).where(eq(clients.companyId, companyId));
      const companyCounties = new Set(companyClients.map(c => {
        if (c.site) {
          // Normalize "Dakota County" to "Dakota", "Hennepin County" to "Hennepin", etc.
          return c.site.replace(' County', '');
        }
        return null;
      }).filter(Boolean));
      
      if (companyCounties.size === 0) {
        return []; // No clients, no pool fund data
      }
      
      // Get pool fund entries for the company's counties
      if (companyCounties.size === 1) {
        const countyValue = Array.from(companyCounties)[0];
        if (countyValue) {
          allEntries = await db.select().from(poolFund).where(eq(poolFund.county, countyValue));
        }
      } else if (companyCounties.size > 1) {
        allEntries = await db.select().from(poolFund).where(inArray(poolFund.county, Array.from(companyCounties) as string[]));
      }
    } else {
      // Global pool fund data
      allEntries = await db.select().from(poolFund);
    }
    
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

  async getPoolFundTransactionsByCounty(county: string, companyId?: number): Promise<any[]> {
    let baseQuery = db.select({
      id: poolFund.id,
      transactionId: poolFund.transactionId,
      amount: poolFund.amount,
      type: poolFund.type,
      description: poolFund.description,
      clientId: poolFund.clientId,
      county: poolFund.county,
      month: poolFund.month,
      createdAt: poolFund.createdAt,
      // Transaction details
      transactionType: transactions.type,
      paymentMethod: transactions.paymentMethod,
      checkNumber: transactions.checkNumber,
      paymentDate: transactions.paymentDate,
      // Client details
      clientName: sql<string>`CONCAT(${clients.firstName}, ' ', ${clients.lastName})`,
      vendorNumber: clients.vendorNumber,
    })
    .from(poolFund)
    .leftJoin(transactions, eq(poolFund.transactionId, transactions.id))
    .leftJoin(clients, eq(poolFund.clientId, clients.id))
    .where(eq(poolFund.county, county));

    // Filter by company if specified
    if (companyId) {
      baseQuery = baseQuery.leftJoin(
        clients as any, 
        and(
          eq(poolFund.clientId, clients.id),
          eq(clients.companyId, companyId)
        )
      );
    }

    const results = await baseQuery.orderBy(desc(poolFund.createdAt));
    return results;
  }

  async getPoolFundBalanceSummary(county: string, companyId?: number): Promise<{
    county: string;
    totalDeposits: number;
    totalWithdrawals: number;
    currentBalance: number;
    transactionCount: number;
    lastTransaction?: string;
  }> {
    let baseQuery = db.select().from(poolFund).where(eq(poolFund.county, county));

    // Filter by company if specified - check if any transactions are linked to company clients
    if (companyId) {
      const companyClientIds = await db.select({ id: clients.id })
        .from(clients)
        .where(eq(clients.companyId, companyId));
      
      const clientIds = companyClientIds.map(c => c.id);
      
      if (clientIds.length > 0) {
        baseQuery = baseQuery.where(
          and(
            eq(poolFund.county, county),
            or(
              eq(poolFund.clientId, null),
              inArray(poolFund.clientId, clientIds)
            )
          )
        );
      }
    }

    const entries = await baseQuery.orderBy(desc(poolFund.createdAt));

    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let currentBalance = 0;

    for (const entry of entries) {
      const amount = parseFloat(entry.amount.toString());
      if (entry.type === 'deposit') {
        totalDeposits += amount;
        currentBalance += amount;
      } else {
        totalWithdrawals += amount;
        currentBalance -= amount;
      }
    }

    return {
      county,
      totalDeposits,
      totalWithdrawals,
      currentBalance,
      transactionCount: entries.length,
      lastTransaction: entries.length > 0 ? entries[0].createdAt.toISOString() : undefined,
    };
  }

  async getCountyPaymentVarianceReport(companyId?: number): Promise<Array<{
    clientId: number;
    clientName: string;
    county: string;
    monthlyIncome: number;
    totalReceived: number;
    variance: number;
    status: 'surplus' | 'deficit' | 'exact';
  }>> {
    // Get all clients for the company
    let clientsData: any[] = [];
    if (companyId) {
      clientsData = await db.select().from(clients).where(eq(clients.companyId, companyId));
    } else {
      clientsData = await db.select().from(clients);
    }

    const varianceReport = [];

    for (const client of clientsData) {
      // Get total deposits for this client
      const poolFundEntries = await db
        .select()
        .from(poolFund)
        .where(eq(poolFund.clientId, client.id));

      const totalReceived = poolFundEntries
        .filter(entry => entry.type === 'deposit')
        .reduce((sum, entry) => sum + parseFloat(entry.amount.toString()), 0);

      const monthlyIncome = parseFloat(client.monthlyIncome?.toString() || '0');
      const variance = totalReceived - monthlyIncome;

      let status: 'surplus' | 'deficit' | 'exact' = 'exact';
      if (variance > 0.01) status = 'surplus';
      else if (variance < -0.01) status = 'deficit';

      // Only include clients with variance or payments
      if (totalReceived > 0 || Math.abs(variance) > 0.01) {
        varianceReport.push({
          clientId: client.id,
          clientName: `${client.firstName} ${client.lastName}`,
          county: client.site || 'Unknown',
          monthlyIncome,
          totalReceived,
          variance,
          status
        });
      }
    }

    return varianceReport.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
  }

  async getDashboardStats(companyId?: number): Promise<{
    totalClients: number;
    activeProperties: number;
    pendingApplications: number;
    poolFundBalance: number;
    poolFundByCounty: { county: string; balance: number; }[];
    totalVendors: number;
    activeOtherSubsidies: number;
    totalOtherSubsidyAmount: number;
  }> {
    try {
      // Filter by company ID for multi-tenant isolation
      const clientsQuery = companyId 
        ? db.select().from(clients).where(eq(clients.companyId, companyId))
        : db.select().from(clients);
      const totalClientsResult = await clientsQuery;
      const totalClients = totalClientsResult.length;
      
      const propertiesQuery = companyId
        ? db.select().from(properties).where(eq(properties.companyId, companyId))
        : db.select().from(properties);
      const allProperties = await propertiesQuery;
      const activeProperties = allProperties.filter(p => 
        p.status === 'available' || p.status === 'occupied'
      ).length;
      
      // For applications, we need to join with clients to filter by company
      let pendingApplications = 0;
      if (companyId) {
        const pendingApplicationsResult = await db
          .select()
          .from(applications)
          .innerJoin(clients, eq(applications.clientId, clients.id))
          .where(and(
            eq(applications.status, 'pending'),
            eq(clients.companyId, companyId)
          ));
        pendingApplications = pendingApplicationsResult.length;
      } else {
        const pendingApplicationsResult = await db.select().from(applications).where(eq(applications.status, 'pending'));
        pendingApplications = pendingApplicationsResult.length;
      }
      
      const poolFundBalance = await this.getPoolFundBalance(companyId);

      // Get comprehensive county statistics including client counts and pool fund balances
      let poolFundByCounty: { 
        county: string; 
        balance: number; 
        totalClients: number;
        activeClients: number;
        inactiveClients: number;
      }[] = [];
      
      if (companyId) {
        // Get pool fund balance by county
        const poolFundResult = await db.execute(sql`
          SELECT county, 
                 SUM(CASE WHEN type = 'deposit' THEN CAST(amount AS DECIMAL) ELSE -CAST(amount AS DECIMAL) END) as balance
          FROM pool_fund 
          WHERE county IS NOT NULL 
          GROUP BY county 
          ORDER BY county
        `);
        
        // Get client counts by county (using site field which contains county info)
        const clientCountsResult = await db.execute(sql`
          SELECT site as county,
                 COUNT(*) as total_clients,
                 SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_clients,
                 SUM(CASE WHEN status != 'active' THEN 1 ELSE 0 END) as inactive_clients
          FROM clients 
          WHERE company_id = ${companyId} AND site IS NOT NULL
          GROUP BY site
          ORDER BY site
        `);
        
        // Combine pool fund and client data by county
        const countyMap = new Map();
        
        // Initialize with pool fund data
        poolFundResult.rows.forEach((row: any) => {
          countyMap.set(row.county, {
            county: row.county,
            balance: parseFloat(row.balance.toString()),
            totalClients: 0,
            activeClients: 0,
            inactiveClients: 0
          });
        });
        
        // Add client counts (site field contains "County Name County" format)
        clientCountsResult.rows.forEach((row: any) => {
          const siteValue = row.county; // This is like "Dakota County", "Hennepin County", etc.
          const countyName = siteValue; // Use the full county name to match pool fund data
          
          if (countyMap.has(countyName)) {
            const existing = countyMap.get(countyName);
            existing.totalClients = parseInt(row.total_clients);
            existing.activeClients = parseInt(row.active_clients);
            existing.inactiveClients = parseInt(row.inactive_clients);
          } else {
            // County has clients but no pool fund entries
            countyMap.set(countyName, {
              county: countyName,
              balance: 0,
              totalClients: parseInt(row.total_clients),
              activeClients: parseInt(row.active_clients),
              inactiveClients: parseInt(row.inactive_clients)
            });
          }
        });
        
        poolFundByCounty = Array.from(countyMap.values()).sort((a, b) => a.county.localeCompare(b.county));
      }

      // Get vendor statistics (vendors are global, not company-specific)
      const allVendors = await db.select().from(vendors);
      const totalVendors = allVendors.length;

    // Get other subsidies statistics - filter by company through client relationship
    let activeOtherSubsidies = 0;
    let totalOtherSubsidyAmount = 0;
    
    if (companyId) {
      // For companies with no clients, return 0 for subsidies
      if (totalClients === 0) {
        activeOtherSubsidies = 0;
        totalOtherSubsidyAmount = 0;
      } else {
        // Get client names for this company
        const companyClientNames = totalClientsResult.map(c => `${c.firstName} ${c.lastName}`);
        
        // Get other subsidies that match client names
        const allOtherSubsidies = await db.select().from(otherSubsidies);
        const companyOtherSubsidies = allOtherSubsidies.filter(s => 
          companyClientNames.includes(s.clientName)
        );
        
        activeOtherSubsidies = companyOtherSubsidies.filter(s => s.status === 'active').length;
        
        // Calculate total subsidy amount (rent we paid)
        totalOtherSubsidyAmount = companyOtherSubsidies
          .filter(s => s.status === 'active' && s.rentWePaid)
          .reduce((total, subsidy) => {
            return total + parseFloat(subsidy.rentWePaid?.toString() || "0");
          }, 0);
      }
    } else {
      const allOtherSubsidies = await db.select().from(otherSubsidies);
      activeOtherSubsidies = allOtherSubsidies.filter(s => s.status === 'active').length;
      
      // Calculate total subsidy amount (rent we paid)
      totalOtherSubsidyAmount = allOtherSubsidies
        .filter(s => s.status === 'active' && s.rentWePaid)
        .reduce((total, subsidy) => {
          return total + parseFloat(subsidy.rentWePaid?.toString() || "0");
        }, 0);
    }

    return {
      totalClients,
      activeProperties,
      pendingApplications,
      poolFundBalance,
      poolFundByCounty,
      totalVendors,
      activeOtherSubsidies,
      totalOtherSubsidyAmount,
    };
    } catch (error) {
      throw error;
    }
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

  async getClientPoolFundInfo(clientId: number): Promise<{
    balance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    recentEntries: Array<{
      id: number;
      amount: number;
      type: string;
      description: string;
      created_at: string;
      county: string;
    }>;
  }> {
    // Get all pool fund entries for this client
    const entries = await db
      .select()
      .from(poolFund)
      .where(eq(poolFund.clientId, clientId))
      .orderBy(desc(poolFund.createdAt));

    // Calculate totals
    const totalDeposits = entries
      .filter(entry => entry.type === 'deposit')
      .reduce((sum, entry) => sum + parseFloat(entry.amount.toString()), 0);

    const totalWithdrawals = entries
      .filter(entry => entry.type === 'withdrawal')
      .reduce((sum, entry) => sum + parseFloat(entry.amount.toString()), 0);

    const balance = totalDeposits - totalWithdrawals;

    // Get recent entries (last 10)
    const recentEntries = entries.slice(0, 10).map(entry => ({
      id: entry.id,
      amount: parseFloat(entry.amount.toString()),
      type: entry.type,
      description: entry.description || '',
      created_at: entry.createdAt.toISOString(),
      county: entry.county || ''
    }));

    return {
      balance,
      totalDeposits,
      totalWithdrawals,
      recentEntries
    };
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

  async createBulkUsers(userList: InsertUser[], createdById: number): Promise<{
    success: User[];
    errors: Array<{ row: number; error: string; data: any }>;
  }> {
    const success: User[] = [];
    const errors: Array<{ row: number; error: string; data: any }> = [];

    for (let i = 0; i < userList.length; i++) {
      const userData = userList[i];
      try {
        // Validate required fields
        if (!userData.username || !userData.email || !userData.firstName || !userData.lastName) {
          errors.push({
            row: i + 2, // +2 because row 1 is header, and array is 0-indexed
            error: "Missing required fields: username, email, firstName, or lastName",
            data: userData
          });
          continue;
        }

        // Check for duplicate username or email
        const [existingUser] = await db
          .select()
          .from(users)
          .where(or(
            eq(users.username, userData.username),
            eq(users.email, userData.email)
          ))
          .limit(1);

        if (existingUser) {
          if (existingUser.username === userData.username) {
            errors.push({
              row: i + 2,
              error: `Username "${userData.username}" is already taken`,
              data: userData
            });
          } else {
            errors.push({
              row: i + 2,
              error: `Email "${userData.email}" is already taken`,
              data: userData
            });
          }
          continue;
        }

        // Hash the password (use default password if not provided)
        const password = (userData as any).password || 'HousingApp2025!';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the user
        const [newUser] = await db
          .insert(users)
          .values({
            ...userData,
            passwordHash: hashedPassword,
            createdById: createdById,
            isEnabled: true,
            isSuperAdmin: false
          })
          .returning();

        success.push(newUser);

        // Create audit log
        await this.createAuditLog({
          userId: createdById,
          action: 'CREATE_USER_BULK',
          resource: 'user',
          resourceId: newUser.id,
          details: { message: `Bulk created user: ${newUser.username} (${newUser.email})` }
        });

      } catch (error: any) {
        errors.push({
          row: i + 2,
          error: error.message || 'Unknown error occurred',
          data: userData
        });
      }
    }

    return { success, errors };
  }

  async getTotalUsers(): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(users);
    return result.count;
  }

  async getSystemUsers(): Promise<Array<User & { companyName?: string; companyStatus?: string }>> {
    const usersWithCompanies = await db
      .select({
        id: users.id,
        companyId: users.companyId,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        isEnabled: users.isEnabled,
        isSuperAdmin: users.isSuperAdmin,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        createdById: users.createdById,
        companyName: companies.name,
        companyStatus: companies.status
      })
      .from(users)
      .leftJoin(companies, eq(users.companyId, companies.id))
      .orderBy(desc(users.createdAt));

    return usersWithCompanies;
  }

  // Recurring Bills Implementation
  async getRecurringBills(clientId?: number): Promise<RecurringBill[]> {
    if (clientId) {
      return await db.select().from(recurringBills)
        .where(eq(recurringBills.clientId, clientId))
        .orderBy(recurringBills.createdAt);
    }
    return await db.select().from(recurringBills).orderBy(recurringBills.createdAt);
  }

  async getRecurringBill(id: number): Promise<RecurringBill | undefined> {
    const [bill] = await db.select().from(recurringBills).where(eq(recurringBills.id, id));
    return bill || undefined;
  }

  async createRecurringBill(bill: InsertRecurringBill): Promise<RecurringBill> {
    const [newBill] = await db.insert(recurringBills).values(bill).returning();
    return newBill;
  }

  async updateRecurringBill(id: number, bill: Partial<InsertRecurringBill>): Promise<RecurringBill | undefined> {
    const [updatedBill] = await db
      .update(recurringBills)
      .set({ ...bill, updatedAt: new Date() })
      .where(eq(recurringBills.id, id))
      .returning();
    return updatedBill || undefined;
  }

  async deleteRecurringBill(id: number): Promise<boolean> {
    const result = await db.delete(recurringBills).where(eq(recurringBills.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Recurring Bill Instances Implementation
  async getRecurringBillInstances(status?: string): Promise<RecurringBillInstance[]> {
    if (status) {
      return await db.select().from(recurringBillInstances)
        .where(eq(recurringBillInstances.status, status))
        .orderBy(recurringBillInstances.dueDate);
    }
    return await db.select().from(recurringBillInstances).orderBy(recurringBillInstances.dueDate);
  }

  async getRecurringBillInstance(id: number): Promise<RecurringBillInstance | undefined> {
    const [instance] = await db.select().from(recurringBillInstances).where(eq(recurringBillInstances.id, id));
    return instance || undefined;
  }

  async getRecurringBillInstancesByClient(clientId: number): Promise<RecurringBillInstance[]> {
    return await db.select().from(recurringBillInstances)
      .where(eq(recurringBillInstances.clientId, clientId))
      .orderBy(recurringBillInstances.dueDate);
  }

  async createRecurringBillInstance(instance: InsertRecurringBillInstance): Promise<RecurringBillInstance> {
    const [newInstance] = await db.insert(recurringBillInstances).values(instance).returning();
    return newInstance;
  }

  async updateRecurringBillInstance(id: number, instance: Partial<InsertRecurringBillInstance>): Promise<RecurringBillInstance | undefined> {
    const [updatedInstance] = await db
      .update(recurringBillInstances)
      .set(instance)
      .where(eq(recurringBillInstances.id, id))
      .returning();
    return updatedInstance || undefined;
  }

  async markRecurringBillInstancePaid(id: number, paymentData: {
    paymentMethod: string;
    checkNumber?: string;
    checkDate?: string;
    paymentDate: string;
    paymentNotes?: string;
    paidBy: number;
  }): Promise<RecurringBillInstance | undefined> {
    const [updatedInstance] = await db
      .update(recurringBillInstances)
      .set({
        status: 'paid',
        paymentMethod: paymentData.paymentMethod,
        checkNumber: paymentData.checkNumber,
        checkDate: paymentData.checkDate,
        paymentDate: paymentData.paymentDate,
        paymentNotes: paymentData.paymentNotes,
        paidBy: paymentData.paidBy,
        paidAt: new Date(),
      })
      .where(eq(recurringBillInstances.id, id))
      .returning();
    return updatedInstance || undefined;
  }

  async generateMonthlyBills(year: number, month: number): Promise<RecurringBillInstance[]> {
    // Get all active recurring bills
    const activeBills = await db.select().from(recurringBills)
      .where(and(
        eq(recurringBills.isActive, true),
        or(
          sql`${recurringBills.endDate} IS NULL`,
          sql`${recurringBills.endDate} >= ${new Date(year, month - 1, 1).toISOString().split('T')[0]}`
        )
      ));

    const newInstances: RecurringBillInstance[] = [];

    for (const bill of activeBills) {
      const dueDate = new Date(year, month - 1, bill.dueDay);
      
      // Check if bill instance already exists for this month
      const [existingInstance] = await db.select().from(recurringBillInstances)
        .where(and(
          eq(recurringBillInstances.recurringBillId, bill.id),
          eq(recurringBillInstances.dueDate, dueDate.toISOString().split('T')[0])
        ));

      if (!existingInstance) {
        const newInstance = await this.createRecurringBillInstance({
          recurringBillId: bill.id,
          clientId: bill.clientId,
          dueDate: dueDate.toISOString().split('T')[0],
          amount: bill.amount,
          status: 'pending'
        });
        newInstances.push(newInstance);

        // Create negative balance transaction for the client
        await this.processClientAccountBalance(
          bill.clientId,
          -parseFloat(bill.amount.toString()),
          `${bill.billType} - ${bill.description || 'Monthly recurring charge'}`
        );
      }
    }

    return newInstances;
  }

  async processClientAccountBalance(clientId: number, amount: number, description: string): Promise<void> {
    // Create a transaction record for the client account balance change
    await this.createTransaction({
      type: 'account_balance_adjustment',
      amount: amount.toString(),
      description: description,
      month: new Date().toISOString().substring(0, 7) // YYYY-MM format
    });

    // TODO: Implement actual client balance tracking if needed
    // This could involve updating a client_balances table or similar
  }

  // Sites Operations
  async getSites(companyId?: number): Promise<Site[]> {
    const query = db.select().from(sites);
    if (companyId) {
      return await query.where(eq(sites.companyId, companyId)).orderBy(sites.createdAt);
    }
    return await query.orderBy(sites.createdAt);
  }

  async getSite(id: number): Promise<Site | undefined> {
    const [site] = await db.select().from(sites).where(eq(sites.id, id));
    return site || undefined;
  }

  async createSite(insertSite: InsertSite): Promise<Site> {
    const [site] = await db
      .insert(sites)
      .values(insertSite)
      .returning();
    return site;
  }

  async updateSite(id: number, updateSite: Partial<InsertSite>): Promise<Site | undefined> {
    const [site] = await db
      .update(sites)
      .set({ ...updateSite, updatedAt: new Date() })
      .where(eq(sites.id, id))
      .returning();
    return site || undefined;
  }

  async deleteSite(id: number): Promise<boolean> {
    const result = await db.delete(sites).where(eq(sites.id, id));
    return result.rowCount > 0;
  }

  // Buildings Operations
  async getBuildings(companyId?: number): Promise<Building[]> {
    const query = db.select().from(buildings);
    if (companyId) {
      return await query.where(eq(buildings.companyId, companyId)).orderBy(buildings.createdAt);
    }
    return await query.orderBy(buildings.createdAt);
  }

  async getBuilding(id: number): Promise<Building | undefined> {
    const [building] = await db.select().from(buildings).where(eq(buildings.id, id));
    return building || undefined;
  }

  async createBuilding(insertBuilding: InsertBuilding): Promise<Building> {
    const [building] = await db
      .insert(buildings)
      .values(insertBuilding)
      .returning();
    return building;
  }

  async updateBuilding(id: number, updateBuilding: Partial<InsertBuilding>): Promise<Building | undefined> {
    const [building] = await db
      .update(buildings)
      .set({ ...updateBuilding, updatedAt: new Date() })
      .where(eq(buildings.id, id))
      .returning();
    return building || undefined;
  }

  async deleteBuilding(id: number): Promise<boolean> {
    const result = await db.delete(buildings).where(eq(buildings.id, id));
    return result.rowCount > 0;
  }

  // Client Documents Operations (HIPAA compliant)
  async getClientDocuments(clientId: number): Promise<ClientDocument[]> {
    return await db.select().from(clientDocuments)
      .where(eq(clientDocuments.clientId, clientId))
      .orderBy(desc(clientDocuments.createdAt));
  }

  async getClientDocument(id: number): Promise<ClientDocument | undefined> {
    const [document] = await db.select().from(clientDocuments).where(eq(clientDocuments.id, id));
    return document || undefined;
  }

  async createClientDocument(insertDocument: InsertClientDocument): Promise<ClientDocument> {
    const [document] = await db
      .insert(clientDocuments)
      .values(insertDocument)
      .returning();
    return document;
  }

  async updateClientDocument(id: number, updateDocument: Partial<InsertClientDocument>): Promise<ClientDocument | undefined> {
    const [document] = await db
      .update(clientDocuments)
      .set({ ...updateDocument, updatedAt: new Date() })
      .where(eq(clientDocuments.id, id))
      .returning();
    return document || undefined;
  }

  async deleteClientDocument(id: number): Promise<boolean> {
    const result = await db.delete(clientDocuments).where(eq(clientDocuments.id, id));
    return result.rowCount > 0;
  }

  async logDocumentAccess(documentId: number, userId: number, accessType: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await db.insert(documentAccessLog).values({
      documentId,
      userId,
      accessType,
      ipAddress,
      userAgent,
    });
  }

  // Building management methods
  async getBuildings(companyId: number): Promise<Building[]> {
    return db.select().from(buildings).where(eq(buildings.companyId, companyId));
  }

  async getBuilding(id: number): Promise<Building | null> {
    const result = await db.select().from(buildings).where(eq(buildings.id, id)).limit(1);
    return result[0] || null;
  }

  async createBuilding(data: InsertBuilding): Promise<Building> {
    const result = await db.insert(buildings).values(data).returning();
    return result[0];
  }

  async updateBuilding(id: number, data: Partial<InsertBuilding>): Promise<Building | null> {
    const result = await db.update(buildings).set(data).where(eq(buildings.id, id)).returning();
    return result[0] || null;
  }

  async deleteBuilding(id: number): Promise<boolean> {
    const result = await db.delete(buildings).where(eq(buildings.id, id));
    return result.rowCount > 0;
  }

  // External Integrations Operations
  async getExternalIntegrations(companyId: number): Promise<ExternalIntegration[]> {
    return await db.select().from(externalIntegrations)
      .where(eq(externalIntegrations.companyId, companyId))
      .orderBy(externalIntegrations.createdAt);
  }

  async getExternalIntegration(id: number): Promise<ExternalIntegration | undefined> {
    const [integration] = await db.select().from(externalIntegrations)
      .where(eq(externalIntegrations.id, id));
    return integration || undefined;
  }

  async createExternalIntegration(insertIntegration: InsertExternalIntegration): Promise<ExternalIntegration> {
    const [integration] = await db
      .insert(externalIntegrations)
      .values(insertIntegration)
      .returning();
    return integration;
  }

  async updateExternalIntegration(id: number, updateIntegration: Partial<InsertExternalIntegration>): Promise<ExternalIntegration | undefined> {
    const [integration] = await db
      .update(externalIntegrations)
      .set({ ...updateIntegration, updatedAt: new Date() })
      .where(eq(externalIntegrations.id, id))
      .returning();
    return integration || undefined;
  }

  async deleteExternalIntegration(id: number): Promise<boolean> {
    const result = await db.delete(externalIntegrations).where(eq(externalIntegrations.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Automation Tasks Operations
  async getAutomationTasks(companyId: number, status?: string): Promise<AutomationTask[]> {
    let query = db.select().from(automationTasks)
      .where(eq(automationTasks.companyId, companyId));
    
    if (status) {
      query = query.where(and(
        eq(automationTasks.companyId, companyId),
        eq(automationTasks.status, status)
      ));
    }

    return await query.orderBy(desc(automationTasks.createdAt));
  }

  async getAutomationTask(id: number): Promise<AutomationTask | undefined> {
    const [task] = await db.select().from(automationTasks)
      .where(eq(automationTasks.id, id));
    return task || undefined;
  }

  async createAutomationTask(insertTask: InsertAutomationTask): Promise<AutomationTask> {
    const [task] = await db
      .insert(automationTasks)
      .values(insertTask)
      .returning();
    return task;
  }

  async updateAutomationTask(id: number, updateTask: Partial<InsertAutomationTask>): Promise<AutomationTask | undefined> {
    const [task] = await db
      .update(automationTasks)
      .set({ ...updateTask, updatedAt: new Date() })
      .where(eq(automationTasks.id, id))
      .returning();
    return task || undefined;
  }

  // QuickBooks Sync Logs Operations
  async getQuickbooksSyncLogs(companyId: number, limit: number = 100): Promise<QuickbooksSyncLog[]> {
    return await db.select().from(quickbooksSyncLog)
      .where(eq(quickbooksSyncLog.companyId, companyId))
      .orderBy(desc(quickbooksSyncLog.syncedAt))
      .limit(limit);
  }

  // Web Automation Logs Operations
  async getWebAutomationLogs(taskId: number): Promise<WebAutomationLog[]> {
    return await db.select().from(webAutomationLogs)
      .where(eq(webAutomationLogs.taskId, taskId))
      .orderBy(webAutomationLogs.stepNumber);
  }
}

export const storage = new DatabaseStorage();
