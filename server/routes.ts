import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertPropertySchema, insertApplicationSchema, insertTransactionSchema, insertPoolFundSchema, insertHousingSupportSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard
  app.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
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
  app.get("/api/applications", async (_req, res) => {
    try {
      const applications = await storage.getApplications();
      res.json(applications);
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
          await storage.createPoolFundEntry({
            transactionId: transaction.id,
            amount: surplus.toString(),
            type: "deposit",
            description: `Surplus from application ${id}`,
            clientId: null,
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
  app.get("/api/transactions", async (_req, res) => {
    try {
      const transactions = await storage.getTransactions();
      res.json(transactions);
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

  app.get("/api/pool-fund/balance", async (_req, res) => {
    try {
      const balance = await storage.getPoolFundBalance();
      res.json({ balance });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pool fund balance" });
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

  const httpServer = createServer(app);
  return httpServer;
}
