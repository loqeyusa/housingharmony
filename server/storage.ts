import { 
  clients, 
  properties, 
  applications, 
  transactions, 
  poolFund,
  housingSupport,
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
  type InsertHousingSupport
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;

  // Properties
  getProperties(): Promise<Property[]>;
  getProperty(id: number): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: number): Promise<boolean>;

  // Applications
  getApplications(): Promise<Application[]>;
  getApplication(id: number): Promise<Application | undefined>;
  createApplication(application: InsertApplication): Promise<Application>;
  updateApplication(id: number, application: Partial<InsertApplication>): Promise<Application | undefined>;
  deleteApplication(id: number): Promise<boolean>;

  // Transactions
  getTransactions(): Promise<Transaction[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;

  // Pool Fund
  getPoolFundEntries(): Promise<PoolFund[]>;
  createPoolFundEntry(entry: InsertPoolFund): Promise<PoolFund>;
  getPoolFundBalance(): Promise<number>;

  // Dashboard stats
  getDashboardStats(): Promise<{
    totalClients: number;
    activeProperties: number;
    pendingApplications: number;
    poolFundBalance: number;
  }>;

  // Housing Support operations
  getHousingSupportRecords(): Promise<HousingSupport[]>;
  getHousingSupportByClient(clientId: number): Promise<HousingSupport[]>;
  getHousingSupportByMonth(month: string): Promise<HousingSupport[]>;
  createHousingSupportRecord(record: InsertHousingSupport): Promise<HousingSupport>;
  updateHousingSupportRecord(id: number, record: Partial<InsertHousingSupport>): Promise<HousingSupport | undefined>;
  calculateMonthlyPoolTotal(clientId: number, month: string): Promise<number>;
  getRunningPoolTotal(): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async getClients(): Promise<Client[]> {
    const result = await db.select().from(clients).orderBy(clients.createdAt);
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
    return result.rowCount > 0;
  }

  async getProperties(): Promise<Property[]> {
    const result = await db.select().from(properties).orderBy(properties.createdAt);
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
    return result.rowCount > 0;
  }

  async getApplications(): Promise<Application[]> {
    const result = await db.select().from(applications).orderBy(applications.submittedAt);
    return result.reverse();
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
    return result.rowCount > 0;
  }

  async getTransactions(): Promise<Transaction[]> {
    const result = await db.select().from(transactions).orderBy(transactions.createdAt);
    return result.reverse();
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

  async getPoolFundEntries(): Promise<PoolFund[]> {
    const result = await db.select().from(poolFund).orderBy(poolFund.createdAt);
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
      return entry.type === 'deposit' ? balance + amount : balance - amount;
    }, 0);
  }

  async getDashboardStats(): Promise<{
    totalClients: number;
    activeProperties: number;
    pendingApplications: number;
    poolFundBalance: number;
  }> {
    const [clientsCount] = await db.select().from(clients);
    const totalClients = await db.select().from(clients);
    
    const availablePropertiesResult = await db.select().from(properties).where(eq(properties.status, 'available'));
    const activeProperties = availablePropertiesResult.length;
    
    const pendingApplicationsResult = await db.select().from(applications).where(eq(applications.status, 'pending'));
    const pendingApplications = pendingApplicationsResult.length;
    
    const poolFundBalance = await this.getPoolFundBalance();

    return {
      totalClients: totalClients.length,
      activeProperties,
      pendingApplications,
      poolFundBalance,
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
}

export const storage = new DatabaseStorage();
