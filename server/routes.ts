import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertPropertySchema, insertApplicationSchema, insertTransactionSchema, insertPoolFundSchema, insertHousingSupportSchema, insertVendorSchema, insertOtherSubsidySchema } from "@shared/schema";
import { propertyAssistant } from "./ai-assistant";
import multer from 'multer';

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

  const httpServer = createServer(app);
  return httpServer;
}
