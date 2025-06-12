import { 
  clients, 
  properties, 
  applications, 
  transactions, 
  poolFund,
  type Client, 
  type InsertClient,
  type Property,
  type InsertProperty,
  type Application,
  type InsertApplication,
  type Transaction,
  type InsertTransaction,
  type PoolFund,
  type InsertPoolFund
} from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private clients: Map<number, Client>;
  private properties: Map<number, Property>;
  private applications: Map<number, Application>;
  private transactions: Map<number, Transaction>;
  private poolFund: Map<number, PoolFund>;
  private currentClientId: number;
  private currentPropertyId: number;
  private currentApplicationId: number;
  private currentTransactionId: number;
  private currentPoolFundId: number;

  constructor() {
    this.clients = new Map();
    this.properties = new Map();
    this.applications = new Map();
    this.transactions = new Map();
    this.poolFund = new Map();
    this.currentClientId = 1;
    this.currentPropertyId = 1;
    this.currentApplicationId = 1;
    this.currentTransactionId = 1;
    this.currentPoolFundId = 1;
  }

  async getClients(): Promise<Client[]> {
    return Array.from(this.clients.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = this.currentClientId++;
    const client: Client = {
      ...insertClient,
      id,
      createdAt: new Date(),
    };
    this.clients.set(id, client);
    return client;
  }

  async updateClient(id: number, updateData: Partial<InsertClient>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;
    
    const updatedClient = { ...client, ...updateData };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async deleteClient(id: number): Promise<boolean> {
    return this.clients.delete(id);
  }

  async getProperties(): Promise<Property[]> {
    return Array.from(this.properties.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getProperty(id: number): Promise<Property | undefined> {
    return this.properties.get(id);
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const id = this.currentPropertyId++;
    const property: Property = {
      ...insertProperty,
      id,
      createdAt: new Date(),
    };
    this.properties.set(id, property);
    return property;
  }

  async updateProperty(id: number, updateData: Partial<InsertProperty>): Promise<Property | undefined> {
    const property = this.properties.get(id);
    if (!property) return undefined;
    
    const updatedProperty = { ...property, ...updateData };
    this.properties.set(id, updatedProperty);
    return updatedProperty;
  }

  async deleteProperty(id: number): Promise<boolean> {
    return this.properties.delete(id);
  }

  async getApplications(): Promise<Application[]> {
    return Array.from(this.applications.values()).sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  }

  async getApplication(id: number): Promise<Application | undefined> {
    return this.applications.get(id);
  }

  async createApplication(insertApplication: InsertApplication): Promise<Application> {
    const id = this.currentApplicationId++;
    const application: Application = {
      ...insertApplication,
      id,
      submittedAt: new Date(),
      approvedAt: null,
    };
    this.applications.set(id, application);
    return application;
  }

  async updateApplication(id: number, updateData: Partial<InsertApplication>): Promise<Application | undefined> {
    const application = this.applications.get(id);
    if (!application) return undefined;
    
    const updatedApplication = { ...application, ...updateData };
    if (updateData.status === 'approved' && !application.approvedAt) {
      updatedApplication.approvedAt = new Date();
    }
    this.applications.set(id, updatedApplication);
    return updatedApplication;
  }

  async deleteApplication(id: number): Promise<boolean> {
    return this.applications.delete(id);
  }

  async getTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentTransactionId++;
    const transaction: Transaction = {
      ...insertTransaction,
      id,
      createdAt: new Date(),
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async getPoolFundEntries(): Promise<PoolFund[]> {
    return Array.from(this.poolFund.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createPoolFundEntry(insertPoolFund: InsertPoolFund): Promise<PoolFund> {
    const id = this.currentPoolFundId++;
    const entry: PoolFund = {
      ...insertPoolFund,
      id,
      createdAt: new Date(),
    };
    this.poolFund.set(id, entry);
    return entry;
  }

  async getPoolFundBalance(): Promise<number> {
    const entries = Array.from(this.poolFund.values());
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
    const totalClients = this.clients.size;
    const activeProperties = Array.from(this.properties.values()).filter(p => p.status === 'available').length;
    const pendingApplications = Array.from(this.applications.values()).filter(a => a.status === 'pending').length;
    const poolFundBalance = await this.getPoolFundBalance();

    return {
      totalClients,
      activeProperties,
      pendingApplications,
      poolFundBalance,
    };
  }
}

export const storage = new MemStorage();
