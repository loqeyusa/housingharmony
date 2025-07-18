import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertPropertySchema, insertApplicationSchema, insertTransactionSchema, insertPoolFundSchema, insertHousingSupportSchema, insertVendorSchema, insertOtherSubsidySchema, insertCompanySchema, insertUserSchema, insertRoleSchema, insertUserRoleSchema, insertAuditLogSchema, insertClientNoteSchema, PERMISSIONS } from "@shared/schema";
import { propertyAssistant } from "./ai-assistant";
import multer from 'multer';
import path from 'path';
import fs from 'fs';

export async function registerRoutes(app: Express): Promise<Server> {
  // PWA Routes
  app.get('/manifest.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    const manifestPath = path.resolve('client/public/manifest.json');
    if (fs.existsSync(manifestPath)) {
      res.sendFile(path.resolve(manifestPath));
    } else {
      res.status(404).json({ error: 'Manifest not found' });
    }
  });

  app.get('/sw.js', (_req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-cache'); // Service worker should not be cached
    res.setHeader('Service-Worker-Allowed', '/');
    const swPath = path.resolve('client/public/sw.js');
    if (fs.existsSync(swPath)) {
      res.sendFile(path.resolve(swPath));
    } else {
      res.status(404).json({ error: 'Service worker not found' });
    }
  });

  // Serve PWA icons
  app.get('/icons/:filename', (req, res) => {
    const filename = req.params.filename;
    const iconPath = path.resolve(`client/public/icons/${filename}`);
    if (fs.existsSync(iconPath)) {
      res.sendFile(path.resolve(iconPath));
    } else {
      res.status(404).json({ error: 'Icon not found' });
    }
  });

  // Dashboard
  app.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Companies
  app.get("/api/companies", async (_req, res) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  app.get("/api/companies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const company = await storage.getCompany(id);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company" });
    }
  });

  app.post("/api/companies", async (req, res) => {
    try {
      const companyData = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(companyData);
      res.status(201).json(company);
    } catch (error) {
      res.status(400).json({ error: "Invalid company data" });
    }
  });

  app.put("/api/companies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertCompanySchema.partial().parse(req.body);
      const company = await storage.updateCompany(id, updateData);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      res.status(400).json({ error: "Invalid company data" });
    }
  });

  app.delete("/api/companies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCompany(id);
      if (!success) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete company" });
    }
  });

  app.post("/api/companies/:id/approve", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const approvedBy = req.session.user?.id;
      
      if (!approvedBy) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const company = await storage.approveCompany(id, approvedBy);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      res.status(500).json({ error: "Failed to approve company" });
    }
  });

  app.post("/api/companies/:id/suspend", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const company = await storage.suspendCompany(id);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      res.status(500).json({ error: "Failed to suspend company" });
    }
  });

  app.post("/api/companies/:id/deactivate", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const company = await storage.deactivateCompany(id);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      res.status(500).json({ error: "Failed to deactivate company" });
    }
  });

  app.get("/api/system/companies-stats", async (_req, res) => {
    try {
      const companies = await storage.getCompanies();
      const totalUsers = await storage.getTotalUsers();
      res.json({
        totalCompanies: companies.length,
        pendingCompanies: companies.filter(c => c.status === 'pending').length,
        approvedCompanies: companies.filter(c => c.status === 'active').length,
        totalUsers: totalUsers
      });
    } catch (error) {
      console.error("Error fetching companies stats:", error);
      res.status(500).json({ error: "Failed to fetch companies stats" });
    }
  });

  app.get("/api/companies/:id/stats", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const stats = await storage.getCompanyStats(id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company stats" });
    }
  });

  // Admin - Clear all data
  app.post("/api/admin/clear-data", async (req, res) => {
    try {
      // Check if user is authenticated and has admin permissions
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const hasPermission = await storage.hasPermission(req.session.user.id, PERMISSIONS.MANAGE_USERS);
      if (!hasPermission) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      // Clear all data using storage methods
      await storage.clearAllData();
      
      // Log the action
      await storage.createAuditLog({
        userId: req.session.user.id,
        action: "CLEAR_ALL_DATA",
        resource: "database",
        details: { cleared_by: req.session.user.username },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({ success: true, message: "All data cleared successfully" });
    } catch (error) {
      console.error("Error clearing data:", error);
      res.status(500).json({ error: "Failed to clear data" });
    }
  });

  // Clients
  app.get("/api/clients", async (_req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const clientData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      res.status(400).json({ error: "Invalid client data" });
    }
  });

  app.put("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(id, updateData);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(400).json({ error: "Invalid client data" });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteClient(id);
      if (!deleted) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  // Properties
  app.get("/api/properties", async (_req, res) => {
    try {
      const properties = await storage.getProperties();
      res.json(properties);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch properties" });
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const property = await storage.getProperty(id);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch property" });
    }
  });

  app.post("/api/properties", async (req, res) => {
    try {
      const propertyData = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(propertyData);
      res.status(201).json(property);
    } catch (error) {
      res.status(400).json({ error: "Invalid property data" });
    }
  });

  app.put("/api/properties/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertPropertySchema.partial().parse(req.body);
      const property = await storage.updateProperty(id, updateData);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      res.status(400).json({ error: "Invalid property data" });
    }
  });

  app.delete("/api/properties/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProperty(id);
      if (!deleted) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete property" });
    }
  });

  // Applications
  app.get("/api/applications", async (req, res) => {
    try {
      const { clientId } = req.query;
      if (clientId) {
        const applications = await storage.getApplicationsByClient(parseInt(clientId as string));
        res.json(applications);
      } else {
        const applications = await storage.getApplications();
        res.json(applications);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  app.get("/api/applications/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const application = await storage.getApplication(id);
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }
      res.json(application);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch application" });
    }
  });

  app.post("/api/applications", async (req, res) => {
    try {
      const applicationData = insertApplicationSchema.parse(req.body);
      const application = await storage.createApplication(applicationData);
      
      // Create transactions for rent and deposit payments
      await storage.createTransaction({
        applicationId: application.id,
        type: "rent_payment",
        amount: applicationData.rentPaid,
        description: `Rent payment for application ${application.id}`,
      });

      await storage.createTransaction({
        applicationId: application.id,
        type: "deposit_payment",
        amount: applicationData.depositPaid,
        description: `Deposit payment for application ${application.id}`,
      });

      await storage.createTransaction({
        applicationId: application.id,
        type: "application_fee",
        amount: applicationData.applicationFee,
        description: `Application fee for application ${application.id}`,
      });

      res.status(201).json(application);
    } catch (error) {
      res.status(400).json({ error: "Invalid application data" });
    }
  });

  app.put("/api/applications/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertApplicationSchema.partial().parse(req.body);
      const application = await storage.updateApplication(id, updateData);
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // If county reimbursement is added, create transaction and pool fund entry
      if (updateData.countyReimbursement && updateData.countyReimbursement !== application.countyReimbursement) {
        const transaction = await storage.createTransaction({
          applicationId: id,
          type: "county_reimbursement",
          amount: updateData.countyReimbursement,
          description: `County reimbursement for application ${id}`,
        });

        // Calculate surplus for pool fund
        const totalPaid = parseFloat(application.rentPaid.toString()) + parseFloat(application.depositPaid.toString());
        const reimbursement = parseFloat(updateData.countyReimbursement.toString());
        const surplus = reimbursement - totalPaid;

        if (surplus > 0) {
          // Get client information to determine county
          const client = await storage.getClient(application.clientId);
          const county = client?.site || 'Unknown';
          
          await storage.createPoolFundEntry({
            transactionId: transaction.id,
            amount: surplus.toString(),
            type: "deposit",
            description: `Surplus from application ${id}`,
            clientId: null,
            county: county,
          });
        }
      }

      res.json(application);
    } catch (error) {
      res.status(400).json({ error: "Invalid application data" });
    }
  });

  app.delete("/api/applications/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteApplication(id);
      if (!deleted) {
        return res.status(404).json({ error: "Application not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete application" });
    }
  });

  // Transactions
  app.get("/api/transactions", async (req, res) => {
    try {
      const { clientId } = req.query;
      if (clientId) {
        const transactions = await storage.getTransactionsByClient(parseInt(clientId as string));
        res.json(transactions);
      } else {
        const transactions = await storage.getTransactions();
        res.json(transactions);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const transactionData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(transactionData);
      res.status(201).json(transaction);
    } catch (error) {
      res.status(400).json({ error: "Invalid transaction data" });
    }
  });

  // Pool Fund
  app.get("/api/pool-fund", async (_req, res) => {
    try {
      const entries = await storage.getPoolFundEntries();
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pool fund entries" });
    }
  });

  app.get("/api/pool-fund/county/:county", async (req, res) => {
    try {
      const county = decodeURIComponent(req.params.county);
      const entries = await storage.getPoolFundEntriesByCounty(county);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch county pool fund entries" });
    }
  });

  app.get("/api/pool-fund/balance", async (_req, res) => {
    try {
      const balance = await storage.getPoolFundBalance();
      res.json({ balance });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pool fund balance" });
    }
  });

  app.get("/api/pool-fund/balance/:county", async (req, res) => {
    try {
      const county = decodeURIComponent(req.params.county);
      const balance = await storage.getPoolFundBalanceByCounty(county);
      res.json({ balance });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch county pool fund balance" });
    }
  });

  app.get("/api/pool-fund/summary/counties", async (_req, res) => {
    try {
      const summary = await storage.getPoolFundSummaryByCounty();
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch county pool fund summary" });
    }
  });

  app.post("/api/pool-fund", async (req, res) => {
    try {
      const poolFundData = insertPoolFundSchema.parse(req.body);
      const entry = await storage.createPoolFundEntry(poolFundData);
      res.status(201).json(entry);
    } catch (error) {
      res.status(400).json({ error: "Invalid pool fund data" });
    }
  });

  // Housing Support routes
  app.get("/api/housing-support", async (_req, res) => {
    try {
      const records = await storage.getHousingSupportRecords();
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch housing support records" });
    }
  });

  app.get("/api/housing-support/client/:clientId", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const records = await storage.getHousingSupportByClient(clientId);
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch client housing support records" });
    }
  });

  app.get("/api/housing-support/month/:month", async (req, res) => {
    try {
      const month = req.params.month;
      const records = await storage.getHousingSupportByMonth(month);
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch monthly housing support records" });
    }
  });

  app.post("/api/housing-support", async (req, res) => {
    try {
      const recordData = insertHousingSupportSchema.parse(req.body);
      const record = await storage.createHousingSupportRecord(recordData);
      res.status(201).json(record);
    } catch (error) {
      res.status(400).json({ error: "Invalid housing support data" });
    }
  });

  app.put("/api/housing-support/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertHousingSupportSchema.partial().parse(req.body);
      const record = await storage.updateHousingSupportRecord(id, updateData);
      if (!record) {
        return res.status(404).json({ error: "Housing support record not found" });
      }
      res.json(record);
    } catch (error) {
      res.status(400).json({ error: "Invalid housing support data" });
    }
  });

  app.get("/api/housing-support/pool-total/running", async (_req, res) => {
    try {
      const total = await storage.getRunningPoolTotal();
      res.json({ total });
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate running pool total" });
    }
  });

  app.get("/api/housing-support/pool-total/month/:month", async (req, res) => {
    try {
      const month = req.params.month;
      const total = await storage.calculateMonthlyPoolTotal(0, month); // Pass 0 as clientId to get all clients for month
      res.json({ total });
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate monthly pool total" });
    }
  });

  // Client Balance routes
  app.get("/api/clients/:id/balance", async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const balance = await storage.getClientBalance(clientId);
      res.json({ balance });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch client balance" });
    }
  });

  app.put("/api/clients/:id/balance", async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const { amount } = req.body;
      await storage.updateClientBalance(clientId, parseFloat(amount));
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to update client balance" });
    }
  });

  app.put("/api/clients/:id/credit-limit", async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const { limit } = req.body;
      await storage.updateClientCreditLimit(clientId, parseFloat(limit));
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to update client credit limit" });
    }
  });

  app.put("/api/clients/credit-limit/global", async (req, res) => {
    try {
      const { limit } = req.body;
      await storage.setGlobalCreditLimit(parseFloat(limit));
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to set global credit limit" });
    }
  });

  // Vendor routes
  app.get("/api/vendors", async (_req, res) => {
    try {
      const vendors = await storage.getVendors();
      res.json(vendors);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendors" });
    }
  });

  app.get("/api/vendors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const vendor = await storage.getVendor(id);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendor" });
    }
  });

  app.get("/api/vendors/type/:type", async (req, res) => {
    try {
      const type = req.params.type;
      const vendors = await storage.getVendorsByType(type);
      res.json(vendors);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendors by type" });
    }
  });

  app.post("/api/vendors", async (req, res) => {
    try {
      const vendorData = insertVendorSchema.parse(req.body);
      const vendor = await storage.createVendor(vendorData);
      res.status(201).json(vendor);
    } catch (error) {
      console.error("Vendor validation error:", error);
      res.status(400).json({ error: "Invalid vendor data", details: error.message });
    }
  });

  app.put("/api/vendors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const vendorData = insertVendorSchema.partial().parse(req.body);
      const vendor = await storage.updateVendor(id, vendorData);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      res.status(400).json({ error: "Invalid vendor data" });
    }
  });

  app.delete("/api/vendors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteVendor(id);
      if (!deleted) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete vendor" });
    }
  });

  // Other Subsidies Routes
  app.get("/api/other-subsidies", async (req, res) => {
    try {
      const subsidies = await storage.getOtherSubsidies();
      res.json(subsidies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch other subsidies" });
    }
  });

  app.get("/api/other-subsidies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const subsidy = await storage.getOtherSubsidy(id);
      if (!subsidy) {
        return res.status(404).json({ error: "Other subsidy not found" });
      }
      res.json(subsidy);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch other subsidy" });
    }
  });

  app.get("/api/other-subsidies/client/:clientName", async (req, res) => {
    try {
      const clientName = req.params.clientName;
      const subsidies = await storage.getOtherSubsidiesByClient(clientName);
      res.json(subsidies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch other subsidies by client" });
    }
  });

  app.get("/api/other-subsidies/vendor/:vendorName", async (req, res) => {
    try {
      const vendorName = req.params.vendorName;
      const subsidies = await storage.getOtherSubsidiesByVendor(vendorName);
      res.json(subsidies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch other subsidies by vendor" });
    }
  });

  app.post("/api/other-subsidies", async (req, res) => {
    try {
      const result = insertOtherSubsidySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid data", details: result.error.errors });
      }
      const subsidy = await storage.createOtherSubsidy(result.data);
      res.json(subsidy);
    } catch (error) {
      res.status(500).json({ error: "Failed to create other subsidy" });
    }
  });

  app.patch("/api/other-subsidies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = insertOtherSubsidySchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid data", details: result.error.errors });
      }
      const subsidy = await storage.updateOtherSubsidy(id, result.data);
      if (!subsidy) {
        return res.status(404).json({ error: "Other subsidy not found" });
      }
      res.json(subsidy);
    } catch (error) {
      res.status(500).json({ error: "Failed to update other subsidy" });
    }
  });

  app.delete("/api/other-subsidies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteOtherSubsidy(id);
      if (!deleted) {
        return res.status(404).json({ error: "Other subsidy not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete other subsidy" });
    }
  });

  // AI Assistant Routes
  const upload = multer({ storage: multer.memoryStorage() });

  // Chat with AI Assistant
  app.post("/api/assistant/chat", async (req, res) => {
    try {
      const { message, context, conversationHistory } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      const response = await propertyAssistant.processQuery({ 
        message, 
        context, 
        conversationHistory 
      });
      res.json(response);
    } catch (error) {
      console.error('Assistant chat error:', error);
      res.status(500).json({ error: "Failed to process your request" });
    }
  });

  // Voice input - speech to text
  app.post("/api/assistant/speech-to-text", upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Audio file is required" });
      }

      const transcription = await propertyAssistant.transcribeAudio(req.file.buffer);
      res.json({ transcription });
    } catch (error) {
      console.error('Speech to text error:', error);
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });

  // Text to speech
  app.post("/api/assistant/text-to-speech", async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text is required" });
      }

      const audioBuffer = await propertyAssistant.textToSpeech(text);
      
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      res.send(audioBuffer);
    } catch (error) {
      console.error('Text to speech error:', error);
      res.status(500).json({ error: "Failed to generate speech" });
    }
  });

  // ========================
  // USER MANAGEMENT & AUTHENTICATION API ROUTES
  // ========================

  // Authentication Routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      const user = await storage.authenticateUser(username, password);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials or account disabled" });
      }

      // Log the login
      await storage.createAuditLog({
        userId: user.id,
        action: "login",
        resource: "auth",
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      // Remove password hash from response
      const { passwordHash, ...userResponse } = user;
      res.json({ user: userResponse });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (userId) {
        await storage.createAuditLog({
          userId,
          action: "logout",
          resource: "auth",
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: "Logout failed" });
    }
  });

  // User Management Routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsers();
      // Remove password hashes from response
      const safeUsers = users.map(({ passwordHash, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Remove password hash from response
      const { passwordHash, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const { createdById } = req.body;
      
      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const user = await storage.createUser(userData, createdById);
      
      // Log the user creation
      await storage.createAuditLog({
        userId: createdById,
        action: "create_user",
        resource: "user",
        resourceId: user.id,
        details: { createdUser: userData.username },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      // Remove password hash from response
      const { passwordHash, ...userResponse } = user;
      res.status(201).json(userResponse);
    } catch (error) {
      console.error('Create user error:', error);
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { modifiedById, ...updateData } = req.body;
      
      const user = await storage.updateUser(id, updateData);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Log the update
      await storage.createAuditLog({
        userId: modifiedById,
        action: "update_user",
        resource: "user",
        resourceId: id,
        details: { updatedFields: Object.keys(updateData) },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      // Remove password hash from response
      const { passwordHash, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      console.error('Update user error:', error);
      res.status(400).json({ error: "Failed to update user" });
    }
  });

  app.put("/api/users/:id/enable", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { enabled, modifiedById } = req.body;
      
      const success = await storage.enableUser(id, enabled);
      if (!success) {
        return res.status(404).json({ error: "User not found" });
      }

      // Log the enable/disable action
      await storage.createAuditLog({
        userId: modifiedById,
        action: enabled ? "enable_user" : "disable_user",
        resource: "user",
        resourceId: id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Enable user error:', error);
      res.status(500).json({ error: "Failed to update user status" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { deletedById } = req.body;
      
      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ error: "User not found" });
      }

      // Log the deletion
      await storage.createAuditLog({
        userId: deletedById,
        action: "delete_user",
        resource: "user",
        resourceId: id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Role Management Routes
  app.get("/api/roles", async (req, res) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (error) {
      console.error('Get roles error:', error);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  app.get("/api/roles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const role = await storage.getRole(id);
      
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }

      res.json(role);
    } catch (error) {
      console.error('Get role error:', error);
      res.status(500).json({ error: "Failed to fetch role" });
    }
  });

  app.post("/api/roles", async (req, res) => {
    try {
      const roleData = insertRoleSchema.parse(req.body);
      
      // Check if role name already exists
      const existingRole = await storage.getRoleByName(roleData.name);
      if (existingRole) {
        return res.status(400).json({ error: "Role name already exists" });
      }

      const role = await storage.createRole(roleData);
      
      // Log the role creation
      await storage.createAuditLog({
        userId: roleData.createdById,
        action: "create_role",
        resource: "role",
        resourceId: role.id,
        details: { roleName: role.name },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.status(201).json(role);
    } catch (error) {
      console.error('Create role error:', error);
      res.status(400).json({ error: "Invalid role data" });
    }
  });

  app.put("/api/roles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { modifiedById, ...updateData } = req.body;
      
      const role = await storage.updateRole(id, updateData);
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }

      // Log the update
      await storage.createAuditLog({
        userId: modifiedById,
        action: "update_role",
        resource: "role",
        resourceId: id,
        details: { updatedFields: Object.keys(updateData) },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json(role);
    } catch (error) {
      console.error('Update role error:', error);
      res.status(400).json({ error: "Failed to update role" });
    }
  });

  app.delete("/api/roles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { deletedById } = req.body;
      
      const success = await storage.deleteRole(id);
      if (!success) {
        return res.status(404).json({ error: "Role not found" });
      }

      // Log the deletion
      await storage.createAuditLog({
        userId: deletedById,
        action: "delete_role",
        resource: "role",
        resourceId: id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Delete role error:', error);
      res.status(500).json({ error: "Failed to delete role" });
    }
  });

  // User Role Assignment Routes
  app.get("/api/users/:id/roles", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const userRoles = await storage.getUserRoles(userId);
      res.json(userRoles);
    } catch (error) {
      console.error('Get user roles error:', error);
      res.status(500).json({ error: "Failed to fetch user roles" });
    }
  });

  app.get("/api/users/:id/permissions", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const permissions = await storage.getUserPermissions(userId);
      res.json(permissions);
    } catch (error) {
      console.error('Get user permissions error:', error);
      res.status(500).json({ error: "Failed to fetch user permissions" });
    }
  });

  app.post("/api/users/:id/roles", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { roleId, assignedById } = req.body;
      
      const userRole = await storage.assignRole(userId, roleId, assignedById);
      
      // Log the role assignment
      await storage.createAuditLog({
        userId: assignedById,
        action: "assign_role",
        resource: "user_role",
        resourceId: userId,
        details: { roleId },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.status(201).json(userRole);
    } catch (error) {
      console.error('Assign role error:', error);
      res.status(400).json({ error: "Failed to assign role" });
    }
  });

  app.delete("/api/users/:userId/roles/:roleId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const roleId = parseInt(req.params.roleId);
      const { removedById } = req.body;
      
      const success = await storage.removeRole(userId, roleId);
      if (!success) {
        return res.status(404).json({ error: "User role assignment not found" });
      }

      // Log the role removal
      await storage.createAuditLog({
        userId: removedById,
        action: "remove_role",
        resource: "user_role",
        resourceId: userId,
        details: { roleId },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Remove role error:', error);
      res.status(500).json({ error: "Failed to remove role" });
    }
  });

  // Permission Checking Routes
  app.get("/api/users/:id/check-permission/:permission", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const permission = req.params.permission;
      
      const hasPermission = await storage.hasPermission(userId, permission as any);
      res.json({ hasPermission });
    } catch (error) {
      console.error('Check permission error:', error);
      res.status(500).json({ error: "Failed to check permission" });
    }
  });

  app.get("/api/users/:id/is-super-admin", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const isSuperAdmin = await storage.isSuperAdmin(userId);
      res.json({ isSuperAdmin });
    } catch (error) {
      console.error('Check super admin error:', error);
      res.status(500).json({ error: "Failed to check super admin status" });
    }
  });

  app.get("/api/users/:id/can-create-users", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const canCreateUsers = await storage.canUserCreateUsers(userId);
      res.json({ canCreateUsers });
    } catch (error) {
      console.error('Check can create users error:', error);
      res.status(500).json({ error: "Failed to check user creation permissions" });
    }
  });

  app.get("/api/users/:userId/can-assign-role/:roleId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const roleId = parseInt(req.params.roleId);
      
      const canAssignRole = await storage.canUserAssignRole(userId, roleId);
      res.json({ canAssignRole });
    } catch (error) {
      console.error('Check can assign role error:', error);
      res.status(500).json({ error: "Failed to check role assignment permissions" });
    }
  });

  // Audit Log Routes
  app.get("/api/audit-logs", async (req, res) => {
    try {
      const { userId, limit } = req.query;
      const userIdNum = userId ? parseInt(userId as string) : undefined;
      const limitNum = limit ? parseInt(limit as string) : 100;
      
      const logs = await storage.getAuditLogs(userIdNum, limitNum);
      res.json(logs);
    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      const user = await storage.authenticateUser(username, password);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (!user.isEnabled) {
        return res.status(403).json({ error: "Account is disabled" });
      }

      // Update last login
      await storage.updateLastLogin(user.id);

      // Store user in session
      req.session.user = user;

      res.json({ user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (userId) {
        // Log audit event
        await storage.createAuditLog({
          userId,
          action: "logout",
          details: "User logged out"
        });
      }

      req.session.destroy((err) => {
        if (err) {
          console.error("Session destruction error:", err);
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/auth/session", (req, res) => {
    if (req.session.user) {
      res.json({ user: req.session.user });
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  // System Setup Routes
  app.get("/api/system/permissions", async (req, res) => {
    try {
      res.json(Object.values(PERMISSIONS));
    } catch (error) {
      console.error('Get permissions error:', error);
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

  app.post("/api/system/initialize", async (req, res) => {
    try {
      const { superAdminData } = req.body;
      
      // Check if any users exist
      const existingUsers = await storage.getUsers();
      if (existingUsers.length > 0) {
        return res.status(400).json({ error: "System already initialized" });
      }

      // Create the super admin user
      const superAdmin = await storage.createUser({
        ...superAdminData,
        isSuperAdmin: true,
        isEnabled: true,
      });

      // Create default roles
      const adminRole = await storage.createRole({
        name: "Administrator",
        description: "Full system access except user management",
        permissions: [
          PERMISSIONS.MANAGE_ROLES,
          PERMISSIONS.VIEW_AUDIT_LOGS,
          PERMISSIONS.VIEW_CLIENTS,
          PERMISSIONS.CREATE_CLIENTS,
          PERMISSIONS.EDIT_CLIENTS,
          PERMISSIONS.DELETE_CLIENTS,
          PERMISSIONS.VIEW_PROPERTIES,
          PERMISSIONS.CREATE_PROPERTIES,
          PERMISSIONS.EDIT_PROPERTIES,
          PERMISSIONS.DELETE_PROPERTIES,
          PERMISSIONS.VIEW_APPLICATIONS,
          PERMISSIONS.CREATE_APPLICATIONS,
          PERMISSIONS.EDIT_APPLICATIONS,
          PERMISSIONS.DELETE_APPLICATIONS,
          PERMISSIONS.APPROVE_APPLICATIONS,
          PERMISSIONS.VIEW_TRANSACTIONS,
          PERMISSIONS.CREATE_TRANSACTIONS,
          PERMISSIONS.EDIT_TRANSACTIONS,
          PERMISSIONS.DELETE_TRANSACTIONS,
          PERMISSIONS.MANAGE_POOL_FUND,
          PERMISSIONS.VIEW_VENDORS,
          PERMISSIONS.CREATE_VENDORS,
          PERMISSIONS.EDIT_VENDORS,
          PERMISSIONS.DELETE_VENDORS,
          PERMISSIONS.VIEW_OTHER_SUBSIDIES,
          PERMISSIONS.CREATE_OTHER_SUBSIDIES,
          PERMISSIONS.EDIT_OTHER_SUBSIDIES,
          PERMISSIONS.DELETE_OTHER_SUBSIDIES,
          PERMISSIONS.VIEW_HOUSING_SUPPORT,
          PERMISSIONS.CREATE_HOUSING_SUPPORT,
          PERMISSIONS.EDIT_HOUSING_SUPPORT,
          PERMISSIONS.DELETE_HOUSING_SUPPORT,
          PERMISSIONS.VIEW_REPORTS,
          PERMISSIONS.EXPORT_DATA,
        ],
        canCreateUsers: true,
        canAssignRoles: [],
        createdById: superAdmin.id,
      });

      const managerRole = await storage.createRole({
        name: "Manager",
        description: "Management access with limited administrative functions",
        permissions: [
          PERMISSIONS.VIEW_CLIENTS,
          PERMISSIONS.CREATE_CLIENTS,
          PERMISSIONS.EDIT_CLIENTS,
          PERMISSIONS.VIEW_PROPERTIES,
          PERMISSIONS.CREATE_PROPERTIES,
          PERMISSIONS.EDIT_PROPERTIES,
          PERMISSIONS.VIEW_APPLICATIONS,
          PERMISSIONS.CREATE_APPLICATIONS,
          PERMISSIONS.EDIT_APPLICATIONS,
          PERMISSIONS.APPROVE_APPLICATIONS,
          PERMISSIONS.VIEW_TRANSACTIONS,
          PERMISSIONS.CREATE_TRANSACTIONS,
          PERMISSIONS.MANAGE_POOL_FUND,
          PERMISSIONS.VIEW_VENDORS,
          PERMISSIONS.CREATE_VENDORS,
          PERMISSIONS.EDIT_VENDORS,
          PERMISSIONS.VIEW_OTHER_SUBSIDIES,
          PERMISSIONS.CREATE_OTHER_SUBSIDIES,
          PERMISSIONS.EDIT_OTHER_SUBSIDIES,
          PERMISSIONS.VIEW_HOUSING_SUPPORT,
          PERMISSIONS.CREATE_HOUSING_SUPPORT,
          PERMISSIONS.EDIT_HOUSING_SUPPORT,
          PERMISSIONS.VIEW_REPORTS,
        ],
        canCreateUsers: true,
        canAssignRoles: [],
        createdById: superAdmin.id,
      });

      const staffRole = await storage.createRole({
        name: "Staff",
        description: "Basic operational access",
        permissions: [
          PERMISSIONS.VIEW_CLIENTS,
          PERMISSIONS.CREATE_CLIENTS,
          PERMISSIONS.EDIT_CLIENTS,
          PERMISSIONS.VIEW_PROPERTIES,
          PERMISSIONS.VIEW_APPLICATIONS,
          PERMISSIONS.CREATE_APPLICATIONS,
          PERMISSIONS.EDIT_APPLICATIONS,
          PERMISSIONS.VIEW_TRANSACTIONS,
          PERMISSIONS.VIEW_VENDORS,
          PERMISSIONS.VIEW_OTHER_SUBSIDIES,
          PERMISSIONS.VIEW_HOUSING_SUPPORT,
          PERMISSIONS.CREATE_HOUSING_SUPPORT,
          PERMISSIONS.EDIT_HOUSING_SUPPORT,
        ],
        canCreateUsers: false,
        canAssignRoles: [],
        createdById: superAdmin.id,
      });

      // Update admin role to allow assigning manager and staff roles
      await storage.updateRole(adminRole.id, {
        canAssignRoles: [managerRole.id, staffRole.id],
      });

      // Update manager role to allow assigning staff role
      await storage.updateRole(managerRole.id, {
        canAssignRoles: [staffRole.id],
      });

      // Log the system initialization
      await storage.createAuditLog({
        userId: superAdmin.id,
        action: "system_initialization",
        resource: "system",
        details: { defaultRolesCreated: [adminRole.id, managerRole.id, staffRole.id] },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      const { passwordHash, ...safeUser } = superAdmin;
      res.status(201).json({
        superAdmin: safeUser,
        defaultRoles: [adminRole, managerRole, staffRole],
      });
    } catch (error) {
      console.error('System initialization error:', error);
      res.status(500).json({ error: "Failed to initialize system" });
    }
  });

  // Client Notes Routes
  app.get("/api/clients/:id/notes", async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const notes = await storage.getClientNotes(clientId);
      res.json(notes);
    } catch (error) {
      console.error('Get client notes error:', error);
      res.status(500).json({ error: "Failed to fetch client notes" });
    }
  });

  app.post("/api/clients/:id/notes", async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const noteData = insertClientNoteSchema.parse({
        ...req.body,
        clientId
      });
      
      const note = await storage.createClientNote(noteData);
      res.status(201).json(note);
    } catch (error) {
      console.error('Create client note error:', error);
      res.status(500).json({ error: "Failed to create client note" });
    }
  });

  app.put("/api/notes/:id", async (req, res) => {
    try {
      const noteId = parseInt(req.params.id);
      const noteData = req.body;
      
      const note = await storage.updateClientNote(noteId, noteData);
      if (!note) {
        return res.status(404).json({ error: "Note not found" });
      }
      
      res.json(note);
    } catch (error) {
      console.error('Update client note error:', error);
      res.status(500).json({ error: "Failed to update client note" });
    }
  });

  app.delete("/api/notes/:id", async (req, res) => {
    try {
      const noteId = parseInt(req.params.id);
      const deleted = await storage.deleteClientNote(noteId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Note not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Delete client note error:', error);
      res.status(500).json({ error: "Failed to delete client note" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
