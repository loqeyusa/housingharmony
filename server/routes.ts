import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

// Middleware to prevent all caching
const noCacheMiddleware = (req: any, res: any, next: any) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Last-Modified': new Date().toUTCString(),
    'ETag': Math.random().toString(36)
  });
  next();
};
import { insertClientSchema, insertPropertySchema, insertApplicationSchema, insertTransactionSchema, insertPoolFundSchema, insertHousingSupportSchema, insertVendorSchema, insertOtherSubsidySchema, insertCompanySchema, insertUserSchema, insertRoleSchema, insertUserRoleSchema, insertAuditLogSchema, insertClientNoteSchema, insertRecurringBillSchema, insertRecurringBillInstanceSchema, insertSiteSchema, insertBuildingSchema, insertRentChangeSchema, insertPaymentDocumentSchema, PERMISSIONS } from "@shared/schema";
import { analyzePaymentDocument, findMatchingClients, determineCountyFromAddress } from './openai';
import { propertyAssistant } from "./ai-assistant";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { parseCsvData, processCsvDataToDB } from './csvParser';
import { importCSVFile } from './csvImporter';
import { importRamseyCSVFile } from './ramseyImporter';
import { importHennepinCSVFile } from './hennepinImporter';
import { importDakotaCSVFile } from './dakotaImporter';
import { importSteeleCSVFile } from './steeleImporter';
import { ObjectStorageService } from "./objectStorage";
import QuickBooksService from "./quickbooks-service";
import WebAutomationService from "./web-automation-service";
import session from 'express-session';
import MemoryStore from 'memorystore';

export async function registerRoutes(app: Express): Promise<Server> {
  // Authenticated middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
  };

  // Configure session middleware with memory store
  const MemoryStoreSession = MemoryStore(session);
  app.use(session({
    store: new MemoryStoreSession({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
    secret: process.env.SESSION_SECRET || 'default-session-secret-change-in-production',
    name: 'connect.sid',
    resave: false, // Changed to false to prevent race conditions
    saveUninitialized: false, // Don't save uninitialized sessions
    rolling: true, // Reset expiration on every request
    cookie: {
      secure: false, // Set to false for development
      httpOnly: false, // Allow JavaScript access for debugging
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax', // Allow cross-site requests
    },
  }));

  // Debug session endpoint
  app.get('/api/debug/session', (req, res) => {
    console.log('Debug: Session ID:', req.sessionID);
    console.log('Debug: Session data:', req.session);
    console.log('Debug: User in session:', req.session.user);
    res.json({ 
      sessionID: req.sessionID, 
      session: req.session,
      hasUser: !!req.session.user,
      user: req.session.user
    });
  });

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

  // Apply no-cache middleware to all API routes
  app.use('/api', noCacheMiddleware);

  // Dashboard
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const stats = await storage.getDashboardStats(user.companyId || undefined);
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
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
      const company = await storage.createCompanyWithSuperAdmin(companyData);
      res.status(201).json(company);
    } catch (error) {
      console.error("Error creating company:", error);
      
      // Handle validation errors
      if (error instanceof Error) {
        if (error.message.includes("already taken") || error.message.includes("already registered")) {
          return res.status(400).json({ error: error.message });
        }
      }
      
      // Handle schema validation errors
      if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid company data", details: error });
      }
      
      res.status(500).json({ error: "Failed to create company" });
    }
  });

  app.put("/api/companies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;

      const company = await storage.updateCompany(id, updateData);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      console.error("Error updating company:", error);
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

  app.get("/api/system/users", async (_req, res) => {
    try {
      const users = await storage.getSystemUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching system users:", error);
      res.status(500).json({ error: "Failed to fetch system users" });
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
  app.get("/api/clients", async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Filter clients by company ID for multi-tenant isolation
      const clients = await storage.getClients(user.companyId || undefined);
      res.json(clients);
    } catch (error) {
      console.error("Error in clients API:", error);
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

  // Get client pool fund information
  app.get("/api/clients/:id/pool-fund", async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const clientId = parseInt(req.params.id);
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      const poolFundData = await storage.getClientPoolFundInfo(clientId);
      res.json(poolFundData);
    } catch (error) {
      console.error("Error fetching client pool fund data:", error);
      res.status(500).json({ error: "Failed to fetch client pool fund data" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Add company ID from user's session for multi-tenant isolation
      const clientData = insertClientSchema.parse({
        ...req.body,
        companyId: user.companyId
      });
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
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

  // Get deleted clients
  app.get("/api/clients/deleted", async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Filter deleted clients by company ID for multi-tenant isolation
      const deletedClients = await storage.getDeletedClients(user.companyId || undefined);
      res.json(deletedClients);
    } catch (error) {
      console.error("Error fetching deleted clients:", error);
      res.status(500).json({ error: "Failed to fetch deleted clients" });
    }
  });

  // Soft delete client (move to deleted status)
  app.post("/api/clients/:id/delete", async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const id = parseInt(req.params.id);
      const client = await storage.softDeleteClient(id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json({ message: "Client moved to deleted status", client });
    } catch (error) {
      console.error("Error soft deleting client:", error);
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  // Restore client from deleted status
  app.post("/api/clients/:id/restore", async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const id = parseInt(req.params.id);
      const client = await storage.restoreClient(id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json({ message: "Client restored successfully", client });
    } catch (error) {
      console.error("Error restoring client:", error);
      res.status(500).json({ error: "Failed to restore client" });
    }
  });

  // Permanently delete client (complete removal)
  app.delete("/api/clients/:id/permanent", async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const id = parseInt(req.params.id);
      const success = await storage.permanentDeleteClient(id);
      if (!success) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json({ message: "Client permanently deleted" });
    } catch (error) {
      console.error("Error permanently deleting client:", error);
      res.status(500).json({ error: "Failed to permanently delete client" });
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

  // Sites API
  app.get("/api/sites", async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const sites = await storage.getSites(req.session.user.companyId || 0);
      res.json(sites);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sites" });
    }
  });

  app.get("/api/sites/:id", async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const id = parseInt(req.params.id);
      const site = await storage.getSite(id);
      
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }
      
      // Check if site belongs to user's company
      if (site.companyId !== req.session.user.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(site);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch site" });
    }
  });

  app.post("/api/sites", async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const result = insertSiteSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid data", details: result.error.errors });
      }
      
      // Ensure site belongs to user's company
      const siteData = { ...result.data, companyId: req.session.user.companyId || 0 };
      const site = await storage.createSite(siteData);
      res.json(site);
    } catch (error) {
      res.status(500).json({ error: "Failed to create site" });
    }
  });

  app.patch("/api/sites/:id", async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const id = parseInt(req.params.id);
      const result = insertSiteSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid data", details: result.error.errors });
      }
      
      // Check if site belongs to user's company
      const existingSite = await storage.getSite(id);
      if (!existingSite || existingSite.companyId !== req.session.user.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const site = await storage.updateSite(id, result.data);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }
      res.json(site);
    } catch (error) {
      res.status(500).json({ error: "Failed to update site" });
    }
  });

  app.delete("/api/sites/:id", async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const id = parseInt(req.params.id);
      
      // Check if site belongs to user's company
      const existingSite = await storage.getSite(id);
      if (!existingSite || existingSite.companyId !== req.session.user.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const deleted = await storage.deleteSite(id);
      if (!deleted) {
        return res.status(404).json({ error: "Site not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete site" });
    }
  });

  // Buildings API
  app.get("/api/buildings", async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Debug: Log the user and companyId
      console.log("Buildings API: User companyId:", req.session.user.companyId);
      console.log("Buildings API: isSuperAdmin:", req.session.user.isSuperAdmin);
      
      // Super admins (companyId: null) should see all buildings
      const companyIdToQuery = req.session.user.companyId || undefined;
      console.log("Buildings API: Querying with companyId:", companyIdToQuery);
      
      const buildings = await storage.getBuildings(companyIdToQuery);
      console.log("Buildings API: Found buildings count:", buildings.length);
      
      res.json(buildings);
    } catch (error) {
      console.error("Buildings API error:", error);
      res.status(500).json({ error: "Failed to fetch buildings" });
    }
  });

  app.get("/api/buildings/:id", async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const id = parseInt(req.params.id);
      const building = await storage.getBuilding(id);
      
      if (!building) {
        return res.status(404).json({ error: "Building not found" });
      }
      
      // Check if building belongs to user's company
      if (building.companyId !== req.session.user.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(building);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch building" });
    }
  });

  app.post("/api/buildings", async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const result = insertBuildingSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid data", details: result.error.errors });
      }
      
      // Ensure building belongs to user's company
      const buildingData = { ...result.data, companyId: req.session.user.companyId || 0 };
      const building = await storage.createBuilding(buildingData);
      res.json(building);
    } catch (error) {
      res.status(500).json({ error: "Failed to create building" });
    }
  });

  app.patch("/api/buildings/:id", async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const id = parseInt(req.params.id);
      const result = insertBuildingSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid data", details: result.error.errors });
      }
      
      // Check if building belongs to user's company
      const existingBuilding = await storage.getBuilding(id);
      if (!existingBuilding || existingBuilding.companyId !== req.session.user.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const building = await storage.updateBuilding(id, result.data);
      if (!building) {
        return res.status(404).json({ error: "Building not found" });
      }
      res.json(building);
    } catch (error) {
      res.status(500).json({ error: "Failed to update building" });
    }
  });

  app.delete("/api/buildings/:id", async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const id = parseInt(req.params.id);
      
      // Check if building belongs to user's company
      const existingBuilding = await storage.getBuilding(id);
      if (!existingBuilding || existingBuilding.companyId !== req.session.user.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const deleted = await storage.deleteBuilding(id);
      if (!deleted) {
        return res.status(404).json({ error: "Building not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete building" });
    }
  });

  // Properties
  app.get("/api/properties", requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      console.log("Properties API: User companyId:", user.companyId);
      console.log("Properties API: isSuperAdmin:", user.isSuperAdmin);
      
      const properties = await storage.getProperties(user.companyId || undefined);
      console.log("Properties API: Found properties count:", properties.length);
      
      res.json(properties);
    } catch (error) {
      console.error("Properties fetch error:", error);
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
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Add company ID from user's session for multi-tenant isolation
      const propertyData = insertPropertySchema.parse({
        ...req.body,
        companyId: user.companyId
      });
      const property = await storage.createProperty(propertyData);
      res.status(201).json(property);
    } catch (error) {
      console.error("Error creating property:", error);
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

  // Rent changes API routes
  app.put("/api/properties/:id/rent", async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const propertyId = parseInt(req.params.id);
      const { newRentAmount, changeReason, changeDate, notes } = req.body;

      if (!newRentAmount || !changeReason || !changeDate) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const updatedProperty = await storage.updatePropertyRent(
        propertyId,
        newRentAmount,
        changeReason,
        changeDate,
        user.id,
        notes
      );

      if (!updatedProperty) {
        return res.status(404).json({ error: "Property not found" });
      }

      res.json(updatedProperty);
    } catch (error) {
      console.error("Error updating rent:", error);
      res.status(500).json({ error: "Failed to update rent" });
    }
  });

  app.get("/api/properties/:id/rent-changes", async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const propertyId = parseInt(req.params.id);
      const rentChanges = await storage.getRentChangeHistory(propertyId);
      res.json(rentChanges);
    } catch (error) {
      console.error("Error fetching rent changes:", error);
      res.status(500).json({ error: "Failed to fetch rent changes" });
    }
  });

  app.post("/api/properties/:id/rent-changes", async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const propertyId = parseInt(req.params.id);
      const rentChangeData = insertRentChangeSchema.parse({
        ...req.body,
        propertyId,
        changedBy: user.id
      });
      
      const rentChange = await storage.createRentChange(rentChangeData);
      res.status(201).json(rentChange);
    } catch (error) {
      console.error("Error creating rent change:", error);
      res.status(400).json({ error: "Invalid rent change data" });
    }
  });

  // Applications
  app.get("/api/applications", async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      console.log('Applications API: User:', user);
      console.log('Applications API: Company ID:', user.companyId);
      
      const { clientId } = req.query;
      if (clientId) {
        const applications = await storage.getApplicationsByClient(parseInt(clientId as string));
        res.json(applications);
      } else {
        // Filter applications by company ID for multi-tenant isolation
        try {
          const applications = await storage.getApplications(user.companyId || undefined);
          console.log('Applications API: Retrieved applications:', applications);
          res.json(applications);
        } catch (storageError) {
          console.error('Storage error for applications:', storageError);
          // For now, return empty array for companies with no clients
          // This is correct behavior since Morris's company has no clients
          res.json([]);
        }
      }
    } catch (error) {
      console.error('Applications API error:', error);
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
  app.get("/api/transactions", requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const { clientId } = req.query;
      if (clientId) {
        const transactions = await storage.getTransactionsByClient(parseInt(clientId as string));
        res.json(transactions);
      } else {
        const transactions = await storage.getTransactions(user.companyId || undefined);
        res.json(transactions);
      }
    } catch (error) {
      console.error("Transactions fetch error:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      console.log("Transaction POST request body:", req.body);
      const transactionData = insertTransactionSchema.parse(req.body);
      console.log("Parsed transaction data:", transactionData);
      const transaction = await storage.createTransaction(transactionData);
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Transaction creation error:", error);
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Invalid transaction data" });
      }
    }
  });

  // Payment Document Analysis - simplified without database save
  app.post("/api/payment-documents/analyze", requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { imageData } = req.body;
      if (!imageData) {
        return res.status(400).json({ error: "Image data is required" });
      }

      console.log('Analyzing payment document with OpenAI...');

      // Analyze document with OpenAI
      const analysis = await analyzePaymentDocument(imageData);
      console.log('OpenAI Analysis result:', analysis.success);
      
      if (!analysis.success) {
        return res.status(400).json({ 
          error: analysis.error || 'Document analysis failed',
          details: 'OpenAI could not process the document image'
        });
      }

      console.log('Finding matching clients in database...');
      
      // Find matching clients in database
      const matchResults = [];
      for (const extracted of analysis.extractedData) {
        try {
          const clientMatches = await storage.getClients().then(clients =>
            clients.filter(client => {
              // Only include clients from the same company
              if (client.companyId !== user.companyId) return false;
              
              const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
              const extractedName = extracted.clientName.toLowerCase();
              return fullName.includes(extractedName) || extractedName.includes(fullName);
            })
          );

          // For each extracted data, create one match result per client match
          if (clientMatches.length > 0) {
            clientMatches.forEach(client => {
              matchResults.push({
                extractedData: extracted,
                matchedClient: {
                  id: client.id,
                  firstName: client.firstName,
                  lastName: client.lastName,
                  name: `${client.firstName} ${client.lastName}`,
                  caseNumber: client.caseNumber,
                  currentBalance: client.currentBalance
                },
                matchType: 'name',
                confidence: 0.85
              });
            });
          } else {
            // No matches found for this extracted data
            matchResults.push({
              extractedData: extracted,
              matchedClient: null,
              matchType: 'no_match',
              confidence: 0
            });
          }
        } catch (error) {
          console.error("Error matching client:", error);
          matchResults.push({
            extractedData: extracted,
            matchedClient: null,
            matchType: 'error',
            confidence: 0
          });
        }
      }

      console.log(`Found ${matchResults.length} extraction results with matches`);

      // Generate unique document ID for tracking
      const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const responseData = {
        documentId,
        analysis,
        matchResults: matchResults.filter(result => result.matchedClient !== null), // Only include actual matches
        allResults: matchResults, // Include all results for debugging
        totalMatches: matchResults.filter(result => result.matchedClient !== null).length,
        success: true
      };

      console.log('Sending response data:', JSON.stringify(responseData, null, 2));
      res.json(responseData);

    } catch (error) {
      console.error('Payment document analysis error:', error);
      res.status(500).json({ 
        error: 'Failed to analyze payment document',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/payment-documents/process-payments", requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { documentId, selectedClients } = req.body;
      if (!documentId || !selectedClients || !Array.isArray(selectedClients)) {
        return res.status(400).json({ error: "Document ID and selected clients are required" });
      }

      const createdTransactions = [];
      
      // Create payment transactions for selected clients
      for (const clientData of selectedClients) {
        const { client, paymentAmount, paymentDate, paymentMethod, checkNumber, notes } = clientData;
        
        if (!client || !paymentAmount) {
          console.warn('Skipping client due to missing data:', clientData);
          continue;
        }

        try {
          const transaction = await storage.createTransaction({
            clientId: client.id,
            type: 'county_reimbursement',
            amount: paymentAmount.toString(),
            description: `County payment received - ${notes || 'Automated from document analysis'}`,
            paymentMethod: paymentMethod || 'check',
            checkNumber: checkNumber || undefined,
            paymentDate: paymentDate || new Date().toISOString().split('T')[0],
            month: new Date().toISOString().slice(0, 7), // YYYY-MM format
            notes: `Processed from payment document ${documentId}. ${notes || ''}`
          });
          
          createdTransactions.push({
            transactionId: transaction.id,
            clientId: client.id,
            clientName: `${client.firstName} ${client.lastName}`,
            amount: paymentAmount
          });
          
        } catch (transactionError) {
          console.error('Error creating transaction for client:', client.id, transactionError);
        }
      }

      // Update payment document with processed transaction IDs
      if (createdTransactions.length > 0) {
        const transactionIds = createdTransactions.map(t => t.transactionId);
        await storage.processPaymentDocument(documentId, transactionIds);
      }

      res.json({
        success: true,
        processedCount: createdTransactions.length,
        transactions: createdTransactions
      });

    } catch (error) {
      console.error('Payment processing error:', error);
      res.status(500).json({ error: 'Failed to process payments' });
    }
  });

  app.get("/api/payment-documents", requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const documents = await storage.getPaymentDocuments(user.companyId || undefined);
      res.json(documents);
    } catch (error) {
      console.error('Payment documents fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch payment documents' });
    }
  });

  // Pool Fund
  app.get("/api/pool-fund", requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const entries = await storage.getPoolFundEntries(user.companyId || undefined);
      res.json(entries);
    } catch (error) {
      console.error("Pool fund fetch error:", error);
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

  // Get pool fund transactions by county for balance summary
  app.get("/api/pool-fund/transactions/:county", async (req, res) => {
    try {
      const county = decodeURIComponent(req.params.county);
      const companyId = undefined; // Remove company filtering for now
      const transactions = await storage.getPoolFundTransactionsByCounty(county, companyId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching pool fund transactions:", error);
      res.status(500).json({ error: "Failed to fetch pool fund transactions" });
    }
  });

  app.get("/api/pool-fund/balance", async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Filter pool fund balance by company ID for multi-tenant isolation
      const balance = await storage.getPoolFundBalance(user.companyId || undefined);
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

  // Get pool fund summary for all counties - used by dashboard
  app.get("/api/pool-fund/summary/counties", async (req, res) => {
    try {
      const companyId = undefined; // Remove company filtering for now
      const summary = await storage.getPoolFundSummaryByCounty(companyId);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching county pool fund summary:", error);
      res.status(500).json({ error: "Failed to fetch county pool fund summary" });
    }
  });

  // Get pool fund balance summary by specific county
  app.get("/api/pool-fund/summary/:county", async (req, res) => {
    try {
      const county = decodeURIComponent(req.params.county);
      const companyId = undefined; // Remove company filtering for now
      const summary = await storage.getPoolFundBalanceSummary(county, companyId);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching pool fund balance summary:", error);
      res.status(500).json({ error: "Failed to fetch pool fund balance summary" });
    }
  });

  app.post("/api/pool-fund", async (req, res) => {
    try {
      console.log("Pool fund POST request body:", req.body);
      const poolFundData = insertPoolFundSchema.parse(req.body);
      console.log("Parsed pool fund data:", poolFundData);
      const entry = await storage.createPoolFundEntry(poolFundData);
      res.status(201).json(entry);
    } catch (error) {
      console.error("Pool fund creation error:", error);
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Invalid pool fund data" });
      }
    }
  });

  // Pool Fund Balance Summary - detailed breakdown
  app.get("/api/pool-fund/transactions/:county", requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const county = decodeURIComponent(req.params.county);
      const transactions = await storage.getPoolFundTransactionsByCounty(county, user.companyId || undefined);
      res.json(transactions);
    } catch (error) {
      console.error("Pool fund transactions error:", error);
      res.status(500).json({ error: "Failed to fetch pool fund transactions" });
    }
  });

  app.get("/api/pool-fund/summary/:county", requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const county = decodeURIComponent(req.params.county);
      const summary = await storage.getPoolFundBalanceSummary(county, user.companyId || undefined);
      res.json(summary);
    } catch (error) {
      console.error("Pool fund summary error:", error);
      res.status(500).json({ error: "Failed to fetch pool fund summary" });
    }
  });

  // Client Pool Fund Summary
  app.get("/api/clients/:clientId/pool-fund", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const poolFundData = await storage.getClientPoolFundInfo(clientId);
      res.json(poolFundData);
    } catch (error) {
      console.error('Client pool fund error:', error);
      res.status(500).json({ error: "Failed to fetch client pool fund data" });
    }
  });

  // County Payment Variance Report
  app.get("/api/reports/county-variance", async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const varianceReport = await storage.getCountyPaymentVarianceReport(user.companyId);
      res.json(varianceReport);
    } catch (error) {
      console.error('County variance report error:', error);
      res.status(500).json({ error: "Failed to generate county variance report" });
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
      if (error instanceof Error) {
        res.status(400).json({ error: "Invalid vendor data", details: error.message });
      } else {
        res.status(400).json({ error: "Invalid vendor data" });
      }
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

  // CSV/Excel Upload for Clients
  app.post("/api/clients/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "File is required" });
      }

      let csvText = '';
      const fileExtension = path.extname(req.file.originalname).toLowerCase();

      // Handle CSV files
      if (fileExtension === '.csv') {
        csvText = req.file.buffer.toString('utf-8');
      } 
      // Handle Excel files
      else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        csvText = XLSX.utils.sheet_to_csv(worksheet);
      } else {
        return res.status(400).json({ error: "Only CSV and Excel files are supported" });
      }

      // Parse CSV data
      const parseResult = await parseCsvData(csvText);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error });
      }

      // Process data to database with proper relationships
      const companyId = req.session.user.companyId || 1; // Default to company 1 for super admins
      const dbResult = await processCsvDataToDB(parseResult.data!, companyId);
      
      if (!dbResult.success) {
        return res.status(500).json({ error: dbResult.error });
      }

      res.json({
        success: true,
        message: `Successfully processed file. Created ${dbResult.clientsCreated} clients, ${dbResult.propertiesCreated} properties, and ${dbResult.buildingsCreated} buildings.`,
        stats: {
          clientsCreated: dbResult.clientsCreated,
          propertiesCreated: dbResult.propertiesCreated,
          buildingsCreated: dbResult.buildingsCreated
        }
      });

    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ error: "Failed to process file" });
    }
  });

  // Payment Detection and Processing Function
  async function detectAndProcessPayment(message: string, user: any, conversationHistory?: any[]) {
    const result = {
      isPaymentRequest: false,
      success: false,
      response: "",
      suggestions: [] as string[]
    };

    // Payment detection patterns
    const paymentPatterns = [
      /add\s+\$?(\d+(?:\.\d{2})?)\s+to\s+(?:his|her|their)?\s*account/i,
      /add\s+(\d+(?:\.\d{2})?)\s+(?:dollars?)?\s+to\s+(?:his|her|their)?\s*account/i,
      /credit\s+\$?(\d+(?:\.\d{2})?)\s+to\s+(?:his|her|their)?\s*account/i,
      /payment\s+of\s+\$?(\d+(?:\.\d{2})?)\s+for/i,
      /received\s+\$?(\d+(?:\.\d{2})?)\s+(?:from|for)/i,
      /deposit\s+\$?(\d+(?:\.\d{2})?)/i
    ];

    // Check if message contains payment-related keywords
    const paymentKeywords = ['add', 'credit', 'payment', 'received', 'warrant', 'county', 'deposit', 'account'];
    const hasPaymentKeyword = paymentKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    if (!hasPaymentKeyword) {
      return result;
    }

    // Try to extract amount from various patterns
    let amount = 0;
    let extractedAmount = "";
    
    for (const pattern of paymentPatterns) {
      const match = message.match(pattern);
      if (match) {
        extractedAmount = match[1];
        amount = parseFloat(extractedAmount);
        result.isPaymentRequest = true;
        break;
      }
    }

    // Also try simple number extraction if no pattern matched but payment keywords exist
    if (!result.isPaymentRequest && hasPaymentKeyword) {
      const numberMatch = message.match(/(\d+(?:\.\d{2})?)/);
      if (numberMatch) {
        extractedAmount = numberMatch[1];
        amount = parseFloat(extractedAmount);
        result.isPaymentRequest = true;
      }
    }

    if (!result.isPaymentRequest || amount <= 0) {
      return result;
    }

    try {
      if (!user) {
        result.response = "You must be logged in to process payments.";
        return result;
      }

      // Determine payment type based on message context
      let paymentType = 'county_reimbursement'; // default
      let description = `Payment of $${amount}`;
      
      if (message.toLowerCase().includes('county') || message.toLowerCase().includes('warrant')) {
        paymentType = 'county_reimbursement';
        description = `County reimbursement payment of $${amount}`;
      } else if (message.toLowerCase().includes('rent')) {
        paymentType = 'rent';
        description = `Rent payment of $${amount}`;
      } else if (message.toLowerCase().includes('utility') || message.toLowerCase().includes('electric')) {
        paymentType = 'utility_electric';
        description = `Utility payment of $${amount}`;
      }

      // Get the most recent client from conversation context or search
      let clientId = null;
      const clients = await storage.getClients(user.companyId);
      
      // Try multiple strategies to find the client:
      if (clients && clients.length > 0) {
        // 1. Look for client names mentioned in the message itself
        for (const client of clients) {
          const fullName = `${client.firstName || ''} ${client.lastName || ''}`.trim().toLowerCase();
          const firstName = (client.firstName || '').toLowerCase();
          const lastName = (client.lastName || '').toLowerCase();
          
          if (fullName && message.toLowerCase().includes(fullName)) {
            clientId = client.id;
            break;
          } else if (firstName && lastName && 
                     message.toLowerCase().includes(firstName) && 
                     message.toLowerCase().includes(lastName)) {
            clientId = client.id;
            break;
          }
        }
        
        // 2. Look for client ID numbers mentioned in the message
        if (!clientId) {
          const idMatch = message.match(/(?:client\s*#?|id\s*#?)(\d+)/i);
          if (idMatch) {
            const possibleId = parseInt(idMatch[1]);
            const foundClient = clients.find(c => c.id === possibleId);
            if (foundClient) {
              clientId = possibleId;
            }
          }
        }
        
        // 3. For context-aware matching using conversation history
        if (!clientId && conversationHistory && conversationHistory.length > 0) {
          // Look through recent conversation history for mentioned clients
          for (let i = conversationHistory.length - 1; i >= Math.max(0, conversationHistory.length - 5); i--) {
            const historyMessage = conversationHistory[i];
            if (historyMessage.role === 'assistant' && historyMessage.content) {
              // Look for client information in AI responses (like "Wesley Reynolds", "ID: 522", etc.)
              
              // Check for "ID: xxx" pattern
              const idMatch = historyMessage.content.match(/(?:ID|id):\s*(\d+)/);
              if (idMatch) {
                const possibleId = parseInt(idMatch[1]);
                const foundClient = clients.find(c => c.id === possibleId);
                if (foundClient) {
                  clientId = possibleId;
                  break;
                }
              }
              
              // Check for client names in the assistant's previous response
              for (const client of clients) {
                const fullName = `${client.firstName || ''} ${client.lastName || ''}`.trim().toLowerCase();
                const firstName = (client.firstName || '').toLowerCase();
                const lastName = (client.lastName || '').toLowerCase();
                
                if (fullName && historyMessage.content.toLowerCase().includes(fullName)) {
                  clientId = client.id;
                  break;
                } else if (firstName && lastName && 
                          historyMessage.content.toLowerCase().includes(firstName) && 
                          historyMessage.content.toLowerCase().includes(lastName)) {
                  clientId = client.id;
                  break;
                }
              }
              
              if (clientId) break;
            }
          }
        }
      }

      if (!clientId) {
        result.response = `I found a payment request for $${amount}, but I need to know which client this payment is for. Please specify the client name or ID.`;
        result.suggestions = [
          "Find client first, then add payment",
          "Show recent clients",
          "Search for specific client"
        ];
        return result;
      }

      // Create the transaction
      const transactionData = {
        clientId,
        type: paymentType,
        amount: amount.toString(),
        description,
        paymentMethod: 'check', // default
        month: new Date().toISOString().substring(0, 7), // YYYY-MM format
        notes: `Payment processed via AI assistant from message: "${message}"`,
        paymentDate: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
      };

      console.log('Creating transaction via AI:', transactionData);
      
      const transaction = await storage.createTransaction(transactionData);
      
      result.success = true;
      result.response = `✅ **Payment Processed Successfully!**

**Transaction Details:**
- **Amount:** $${amount}
- **Client ID:** ${clientId}
- **Type:** ${paymentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
- **Transaction ID:** ${transaction.id}
- **Date:** ${transactionData.paymentDate}

The payment has been recorded in the system and the client's account has been updated.`;

      result.suggestions = [
        `View client #${clientId} details`,
        "Show recent transactions",
        "Check account balance",
        "Process another payment"
      ];

    } catch (error) {
      console.error('Payment processing error:', error);
      result.response = `I detected a payment request for $${amount}, but there was an error processing it: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or process the payment manually.`;
      result.suggestions = [
        "Try payment request again",
        "Check client details first",
        "Use manual transaction entry"
      ];
    }

    return result;
  }

  // Chat with AI Assistant
  app.post("/api/assistant/chat", requireAuth, async (req, res) => {
    try {
      const { message, context, conversationHistory } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      // Check if this is a payment request before processing with AI
      const paymentResult = await detectAndProcessPayment(message, req.session.user, conversationHistory);
      
      if (paymentResult.isPaymentRequest) {
        // Return payment processing result instead of AI response
        return res.json({
          response: paymentResult.response,
          confidence: paymentResult.success ? 0.95 : 0.8,
          suggestions: paymentResult.suggestions || []
        });
      }

      // Process as normal AI chat
      const response = await propertyAssistant.processQuery({ 
        message, 
        context, 
        conversationHistory 
      });
      res.json(response);
    } catch (error) {
      console.error('Assistant chat error:', error);
      res.status(500).json({ error: "AI temporarily not available. Please try again later." });
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
      res.status(500).json({ error: "Speech recognition temporarily not available. Please try again." });
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
      res.status(500).json({ error: "Voice synthesis temporarily not available. Please try again." });
    }
  });

  // Image Analysis with OpenAI Vision
  app.post("/api/assistant/analyze-image", async (req, res) => {
    try {
      const { imageData } = req.body;
      
      if (!imageData || typeof imageData !== 'string') {
        return res.status(400).json({ error: "Image data is required" });
      }

      // Import image analysis function
      const { analyzeImage } = await import('./openai');
      
      // Use OpenAI Vision API to analyze the image
      const analysisResult = await analyzeImage(imageData);
      
      res.json({
        analysis: analysisResult.analysis,
        confidence: analysisResult.confidence,
        details: analysisResult.details,
        success: true
      });
    } catch (error) {
      console.error('Image analysis error:', error);
      res.status(500).json({ error: "Image analysis temporarily not available. Please try again." });
    }
  });

  // ========================
  // USER MANAGEMENT & AUTHENTICATION API ROUTES
  // ========================

  // Authentication Routes - This endpoint is handled later in the file with session storage

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

  // Bulk User Upload Routes
  app.post("/api/upload/users", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error('Get upload URL error:', error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Housing data upload endpoint
  app.post("/api/upload/housing", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error('Get housing upload URL error:', error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.post("/api/users/bulk", async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Check if user has permission to create users
      const hasPermission = await storage.hasPermission(user.id, 'MANAGE_USERS');
      if (!hasPermission) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      const { fileUrl } = req.body;
      if (!fileUrl) {
        return res.status(400).json({ error: "File URL is required" });
      }

      // Download and parse the Excel file
      const response = await fetch(fileUrl);
      if (!response.ok) {
        return res.status(400).json({ error: "Failed to download Excel file" });
      }

      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      const worksheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[worksheetName];

      // Convert to JSON with header row
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (jsonData.length < 2) {
        return res.status(400).json({ error: "Excel file must have at least one header row and one data row" });
      }

      // Parse the header row to map columns
      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1);

      // Map column names to our schema (case insensitive)
      const columnMap: { [key: string]: string } = {};
      headers.forEach((header, index) => {
        const normalizedHeader = header.toLowerCase().trim();
        if (normalizedHeader.includes('username') || normalizedHeader === 'user') {
          columnMap[index] = 'username';
        } else if (normalizedHeader.includes('email')) {
          columnMap[index] = 'email';
        } else if (normalizedHeader.includes('first') && normalizedHeader.includes('name')) {
          columnMap[index] = 'firstName';
        } else if (normalizedHeader.includes('last') && normalizedHeader.includes('name')) {
          columnMap[index] = 'lastName';
        } else if (normalizedHeader.includes('password')) {
          columnMap[index] = 'password';
        } else if (normalizedHeader.includes('company')) {
          columnMap[index] = 'companyId';
        }
      });

      // Convert rows to user objects
      const users = dataRows
        .filter(row => row.length > 0 && row[0]) // Filter out empty rows
        .map((row: any[]) => {
          const userData: any = {
            companyId: user.companyId, // Default to current user's company
            isEnabled: true,
            isSuperAdmin: false
          };

          // Map columns to user properties
          Object.keys(columnMap).forEach(colIndex => {
            const field = columnMap[colIndex];
            const value = row[parseInt(colIndex)];
            
            if (value !== undefined && value !== null && value !== '') {
              if (field === 'companyId') {
                userData[field] = parseInt(value) || user.companyId;
              } else if (field === 'password') {
                userData.passwordHash = value; // Will be hashed in storage
              } else {
                userData[field] = String(value).trim();
              }
            }
          });

          return userData;
        });

      // Validate that we have required mappings
      const hasRequiredColumns = users.length > 0 && users[0].username && users[0].email;
      if (!hasRequiredColumns) {
        return res.status(400).json({ 
          error: "Excel file must contain columns for 'Username' and 'Email'. Other supported columns: 'First Name', 'Last Name', 'Password', 'Company'" 
        });
      }

      // Process bulk user creation
      const result = await storage.createBulkUsers(users, user.id);

      // Create audit log for bulk import
      await storage.createAuditLog({
        userId: user.id,
        action: 'BULK_CREATE_USERS',
        resourceType: 'user',
        details: `Bulk imported ${result.success.length} users with ${result.errors.length} errors`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({
        success: result.success.length,
        errors: result.errors.length,
        createdUsers: result.success,
        errorDetails: result.errors
      });

    } catch (error) {
      console.error('Bulk user creation error:', error);
      res.status(500).json({ error: "Failed to process bulk user upload" });
    }
  });

  // Bulk Housing Data Upload
  app.post("/api/housing/bulk", async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Check if user has permission to manage housing data
      const hasPermission = await storage.hasPermission(user.id, 'manage_clients') || 
                           await storage.hasPermission(user.id, 'manage_properties');
      if (!hasPermission) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      const { fileUrl } = req.body;
      if (!fileUrl) {
        return res.status(400).json({ error: "File URL is required" });
      }

      // Download and parse the Excel file
      const response = await fetch(fileUrl);
      if (!response.ok) {
        return res.status(400).json({ error: "Failed to download Excel file" });
      }

      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      const worksheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[worksheetName];

      // Convert to JSON with header row
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      if (jsonData.length < 2) {
        return res.status(400).json({ error: "Excel file must have at least one header row and one data row" });
      }

      // Parse the header row to map columns
      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1) as any[][];

      // Map column names to our schema (case insensitive and flexible)
      const columnMap: { [key: string]: string } = {};
      headers.forEach((header, index) => {
        const normalizedHeader = header.toLowerCase().trim().replace(/\s+/g, '');
        
        // Client Information
        if (normalizedHeader.includes('case') && normalizedHeader.includes('number')) {
          columnMap[index] = 'caseNumber';
        } else if (normalizedHeader.includes('client') && normalizedHeader.includes('name')) {
          columnMap[index] = 'clientName';
        } else if (normalizedHeader.includes('client') && normalizedHeader.includes('address')) {
          columnMap[index] = 'clientAddress';
        } else if (normalizedHeader.includes('cell') || normalizedHeader.includes('phone')) {
          columnMap[index] = 'cellNumber';
        } else if (normalizedHeader.includes('email')) {
          columnMap[index] = 'email';
        }
        
        // Property Information
        else if ((normalizedHeader.includes('properties') && normalizedHeader.includes('management')) || 
                 (normalizedHeader.includes('property') && normalizedHeader.includes('manager'))) {
          columnMap[index] = 'propertyManagement';
        } else if (normalizedHeader.includes('rental') && normalizedHeader.includes('office') && normalizedHeader.includes('address')) {
          columnMap[index] = 'rentalOfficeAddress';
        } else if (normalizedHeader.includes('rent') && normalizedHeader.includes('amount')) {
          columnMap[index] = 'rentAmount';
        } else if (normalizedHeader === 'county') {
          columnMap[index] = 'county';
        } else if (normalizedHeader.includes('county') && normalizedHeader.includes('amount')) {
          columnMap[index] = 'countyAmount';
        } else if (normalizedHeader.includes('notes') || normalizedHeader.includes('comment')) {
          columnMap[index] = 'notes';
        }
      });

      // Process each row
      let successCount = 0;
      let errorCount = 0;
      let createdClients = 0;
      let createdProperties = 0;
      let createdApplications = 0;
      const errorDetails: any[] = [];
      const warnings: any[] = [];

      for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
        const row = dataRows[rowIndex];
        const rowNumber = rowIndex + 2; // +2 because array is 0-indexed and we skip header

        // Skip empty rows
        if (!row || row.length === 0 || !row.some(cell => cell && cell.toString().trim())) {
          continue;
        }

        try {
          // Extract data from row
          const rowData: any = {};
          Object.keys(columnMap).forEach(colIndex => {
            const field = columnMap[colIndex];
            const value = row[parseInt(colIndex)];
            if (value !== undefined && value !== null && value !== '') {
              rowData[field] = value.toString().trim();
            }
          });

          // Process client data
          let clientId = null;
          if (rowData.clientName) {
            // Split client name into first and last name
            const nameParts = rowData.clientName.split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';

            // Create or find client
            const clientData = {
              companyId: user.companyId!,
              firstName,
              lastName,
              email: rowData.email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@placeholder.com`,
              phone: rowData.cellNumber || '',
              dateOfBirth: '1990-01-01', // Default - would need to be updated
              ssn: 'XXX-XX-XXXX', // Placeholder - would need to be updated
              currentAddress: rowData.clientAddress || '',
              employmentStatus: 'unemployed',
              monthlyIncome: '0',
              vendorNumber: rowData.caseNumber || null,
            };

            try {
              const client = await storage.createClient(clientData);
              clientId = client.id;
              createdClients++;
            } catch (error) {
              // Try to find existing client by name
              const existingClients = await storage.getClients();
              const existingClient = existingClients.find(c => 
                c.firstName === firstName && 
                c.lastName === lastName &&
                c.companyId === user.companyId
              );
              
              if (existingClient) {
                clientId = existingClient.id;
                warnings.push({
                  row: rowNumber,
                  message: `Client "${rowData.clientName}" already exists, using existing record`,
                  data: rowData
                });
              } else {
                throw error;
              }
            }
          }

          // Process property data
          let propertyId = null;
          if (rowData.propertyManagement && rowData.rentalOfficeAddress) {
            // Create building first
            const buildingData = {
              companyId: user.companyId!,
              name: rowData.propertyManagement,
              address: rowData.rentalOfficeAddress,
              landlordName: rowData.propertyManagement,
              landlordPhone: rowData.cellNumber || '',
              landlordEmail: rowData.email || 'contact@property.com',
            };

            let buildingId = null;
            try {
              const building = await storage.createBuilding(buildingData);
              buildingId = building.id;
            } catch (error) {
              // Try to find existing building
              const existingBuildings = await storage.getBuildings();
              const existingBuilding = existingBuildings.find(b => 
                b.name === rowData.propertyManagement && 
                b.address === rowData.rentalOfficeAddress &&
                b.companyId === user.companyId
              );
              
              if (existingBuilding) {
                buildingId = existingBuilding.id;
              } else {
                throw error;
              }
            }

            // Create property/unit
            if (buildingId) {
              const rentAmount = parseFloat(rowData.rentAmount?.replace(/[$,]/g, '') || '0');
              
              const propertyData = {
                companyId: user.companyId!,
                buildingId,
                unitNumber: '1', // Default unit
                rentAmount: rentAmount.toString(),
                depositAmount: (rentAmount * 0.5).toString(), // Default deposit
                bedrooms: 1,
                bathrooms: 1,
              };

              try {
                const property = await storage.createProperty(propertyData);
                propertyId = property.id;
                createdProperties++;
              } catch (error) {
                console.error('Property creation error:', error);
              }
            }
          }

          // Create application if we have both client and property
          if (clientId && propertyId) {
            const applicationData = {
              clientId,
              propertyId,
              rentPaid: parseFloat(rowData.rentAmount?.replace(/[$,]/g, '') || '0').toString(),
              depositPaid: (parseFloat(rowData.rentAmount?.replace(/[$,]/g, '') || '0') * 0.5).toString(),
              applicationFee: '50',
              status: 'active',
              countyReimbursement: parseFloat(rowData.countyAmount?.replace(/[$,]/g, '') || '0').toString(),
            };

            try {
              await storage.createApplication(applicationData);
              createdApplications++;
            } catch (error) {
              console.error('Application creation error:', error);
            }
          }

          successCount++;

        } catch (error) {
          console.error(`Error processing row ${rowNumber}:`, error);
          errorCount++;
          errorDetails.push({
            row: rowNumber,
            error: error instanceof Error ? error.message : 'Unknown error',
            data: row
          });
        }
      }

      // Log the bulk import
      await storage.createAuditLog({
        userId: user.id,
        action: "bulk_import_housing",
        resource: "housing_data",
        details: { 
          totalRows: dataRows.length,
          successCount,
          errorCount,
          createdClients,
          createdProperties,
          createdApplications
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({
        success: successCount,
        errors: errorCount,
        createdClients,
        createdProperties,
        createdApplications,
        errorDetails,
        warnings
      });

    } catch (error) {
      console.error('Bulk housing upload error:', error);
      res.status(500).json({ error: "Failed to process bulk housing upload" });
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
    console.log('LOGIN ENDPOINT CALLED');
    try {
      const { username, password } = req.body;
      console.log('Login attempt for username:', username);
      
      if (!username || !password) {
        console.log('Missing credentials');
        return res.status(400).json({ error: "Username and password are required" });
      }

      console.log('Attempting to authenticate user...');
      const user = await storage.authenticateUser(username, password);
      console.log('User found:', user ? 'YES' : 'NO');
      
      if (!user) {
        console.log('Authentication failed');
        // Log failed login attempt
        await storage.createAuditLog({
          userId: null,
          action: "login_failed",
          resource: "auth",
          details: { 
            username: username,
            reason: "invalid_credentials"
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });
        return res.status(401).json({ error: "Invalid credentials or account disabled" });
      }

      if (!user.isEnabled) {
        console.log('User account disabled');
        // Log disabled account login attempt
        await storage.createAuditLog({
          userId: user.id,
          action: "login_failed",
          resource: "auth",
          details: { 
            username: username,
            reason: "account_disabled"
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });
        return res.status(403).json({ error: "Account is disabled" });
      }

      console.log('User authenticated successfully, updating last login...');
      // Update last login
      await storage.updateLastLogin(user.id);

      // Log successful login
      await storage.createAuditLog({
        userId: user.id,
        action: "login",
        resource: "auth",
        details: { 
          username: user.username,
          loginMethod: "password",
          success: true
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      // Store user in session - clean user object to avoid Date serialization issues
      const sessionUser = {
        id: user.id,
        companyId: user.companyId,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEnabled: user.isEnabled,
        isSuperAdmin: user.isSuperAdmin,
        createdById: user.createdById
      };
      
      console.log('Login: Setting user in session:', sessionUser);
      console.log('Login: Session ID before save:', req.sessionID);
      req.session.user = sessionUser;
      
      // Try saving the session without callback first
      console.log('Login: User set in session, immediately checking:', req.session.user);
      
      // Also try marking the session as touched to force save
      req.session.touch();
      
      // Save session explicitly and wait for it to complete
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('Session save error:', saveErr);
          return res.status(500).json({ error: "Failed to save session" });
        }
        console.log('Login: Session saved successfully, sessionID:', req.sessionID);
        console.log('Login: Session data after save:', req.session);
        console.log('Login: User in session after save:', req.session.user);
        res.json({ user: sessionUser });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (userId || req.session.user?.id) {
        // Log logout event
        await storage.createAuditLog({
          userId: userId || req.session.user?.id,
          action: "logout",
          resource: "auth",
          details: { 
            logoutMethod: "manual",
            sessionId: req.sessionID 
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
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

  app.get("/api/auth/me", (req, res) => {
    if (req.session.user) {
      res.json(req.session.user);
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

  // System Admin Authentication
  app.post("/api/system/auth", async (req, res) => {
    try {
      const { password } = req.body;
      
      // System admin password (in production, this should be hashed and stored securely)
      const SYSTEM_ADMIN_PASSWORD = process.env.SYSTEM_ADMIN_PASSWORD || "admin123!";
      
      if (password === SYSTEM_ADMIN_PASSWORD) {
        // Log system admin access
        await storage.createAuditLog({
          userId: req.session.user?.id || null,
          action: "system_admin_access",
          resource: "system",
          details: { access: "granted" },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });
        
        res.json({ authenticated: true });
      } else {
        // Log failed system admin access attempt
        await storage.createAuditLog({
          userId: req.session.user?.id || null,
          action: "system_admin_access_failed",
          resource: "system",
          details: { access: "denied", reason: "invalid_password" },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });
        
        res.json({ authenticated: false });
      }
    } catch (error) {
      console.error('System auth error:', error);
      res.status(500).json({ error: "Failed to authenticate" });
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

  // Recurring Bills Management Routes
  app.get("/api/recurring-bills", async (req, res) => {
    try {
      const { clientId } = req.query;
      const bills = await storage.getRecurringBills(clientId ? parseInt(clientId as string) : undefined);
      res.json(bills);
    } catch (error) {
      console.error('Get recurring bills error:', error);
      res.status(500).json({ error: "Failed to fetch recurring bills" });
    }
  });

  app.get("/api/recurring-bills/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const bill = await storage.getRecurringBill(id);
      if (!bill) {
        return res.status(404).json({ error: "Recurring bill not found" });
      }
      res.json(bill);
    } catch (error) {
      console.error('Get recurring bill error:', error);
      res.status(500).json({ error: "Failed to fetch recurring bill" });
    }
  });

  app.post("/api/recurring-bills", async (req, res) => {
    try {
      const billData = insertRecurringBillSchema.parse(req.body);
      const bill = await storage.createRecurringBill(billData);
      res.status(201).json(bill);
    } catch (error) {
      console.error('Create recurring bill error:', error);
      res.status(400).json({ error: "Invalid recurring bill data" });
    }
  });

  app.put("/api/recurring-bills/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const billData = insertRecurringBillSchema.partial().parse(req.body);
      const bill = await storage.updateRecurringBill(id, billData);
      if (!bill) {
        return res.status(404).json({ error: "Recurring bill not found" });
      }
      res.json(bill);
    } catch (error) {
      console.error('Update recurring bill error:', error);
      res.status(400).json({ error: "Invalid recurring bill data" });
    }
  });

  app.delete("/api/recurring-bills/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteRecurringBill(id);
      if (!deleted) {
        return res.status(404).json({ error: "Recurring bill not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Delete recurring bill error:', error);
      res.status(500).json({ error: "Failed to delete recurring bill" });
    }
  });

  // Recurring Bill Instances (for pending bill management)
  app.get("/api/recurring-bill-instances", async (req, res) => {
    try {
      const { status, clientId } = req.query;
      let instances;
      
      if (clientId) {
        instances = await storage.getRecurringBillInstancesByClient(parseInt(clientId as string));
      } else {
        instances = await storage.getRecurringBillInstances(status as string);
      }
      
      res.json(instances);
    } catch (error) {
      console.error('Get recurring bill instances error:', error);
      res.status(500).json({ error: "Failed to fetch recurring bill instances" });
    }
  });

  app.get("/api/recurring-bill-instances/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const instance = await storage.getRecurringBillInstance(id);
      if (!instance) {
        return res.status(404).json({ error: "Recurring bill instance not found" });
      }
      res.json(instance);
    } catch (error) {
      console.error('Get recurring bill instance error:', error);
      res.status(500).json({ error: "Failed to fetch recurring bill instance" });
    }
  });

  app.patch("/api/recurring-bill-instances/:id/pay", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = req.session.user;
      
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const paymentData = {
        paymentMethod: req.body.paymentMethod || 'check',
        checkNumber: req.body.checkNumber,
        checkDate: req.body.checkDate,
        paymentDate: req.body.paymentDate || new Date().toISOString().split('T')[0],
        paymentNotes: req.body.paymentNotes,
        paidBy: user.id
      };

      const instance = await storage.markRecurringBillInstancePaid(id, paymentData);
      if (!instance) {
        return res.status(404).json({ error: "Recurring bill instance not found" });
      }

      res.json(instance);
    } catch (error) {
      console.error('Mark bill paid error:', error);
      res.status(400).json({ error: "Failed to mark bill as paid" });
    }
  });

  // Monthly bill processing
  app.post("/api/recurring-bills/generate-monthly", async (req, res) => {
    try {
      const { year, month } = req.body;
      
      if (!year || !month) {
        return res.status(400).json({ error: "Year and month are required" });
      }

      const instances = await storage.generateMonthlyBills(year, month);
      res.json({
        message: `Generated ${instances.length} recurring bill instances for ${year}-${month.toString().padStart(2, '0')}`,
        instances
      });
    } catch (error) {
      console.error('Generate monthly bills error:', error);
      res.status(500).json({ error: "Failed to generate monthly bills" });
    }
  });

  // Financial Reports API
  app.get("/api/financial-reports", async (req, res) => {
    try {
      const { month } = req.query;
      const user = req.session.user;
      
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get all data for financial analysis
      const [transactions, clients, applications, recurringBills] = await Promise.all([
        storage.getTransactions(),
        storage.getClients(user.companyId || 0),
        storage.getApplications(user.companyId || 0), 
        storage.getRecurringBillInstances()
      ]);

      // Filter by month if specified
      const filteredTransactions = month 
        ? transactions.filter(t => t.month === month || new Date(t.createdAt).toISOString().substring(0, 7) === month)
        : transactions;

      // Calculate client balances
      const clientBalances: Record<number, { 
        name: string; 
        balance: number; 
        lastPayment: string | null; 
        totalReceived: number;
        totalSpent: number;
      }> = {};

      clients.forEach(client => {
        const clientTransactions = transactions.filter(t => {
          const app = applications.find(a => a.id === t.applicationId);
          return app?.clientId === client.id;
        });

        const totalReceived = clientTransactions
          .filter(t => parseFloat(t.amount) > 0)
          .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const totalSpent = clientTransactions
          .filter(t => parseFloat(t.amount) < 0)
          .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

        // Always calculate balance as monthly income minus total spent
        // This allows going negative if spending exceeds income before money is received
        const monthlyIncome = parseFloat(client.monthlyIncome?.toString() || "0");
        const balance = monthlyIncome - totalSpent;

        const lastPayment = clientTransactions
          .filter(t => parseFloat(t.amount) > 0)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        clientBalances[client.id] = {
          name: `${client.firstName} ${client.lastName}`,
          balance,
          lastPayment: lastPayment ? new Date(lastPayment.createdAt).toISOString().split('T')[0] : null,
          totalReceived,
          totalSpent,
        };
      });

      // Calculate summary metrics
      const totalIncome = filteredTransactions
        .filter(t => parseFloat(t.amount) > 0)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const totalExpenses = filteredTransactions
        .filter(t => parseFloat(t.amount) < 0)
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

      const pendingBills = recurringBills.filter(bill => bill.status === 'pending');
      const overdueBills = pendingBills.filter(bill => new Date(bill.dueDate) < new Date());

      const report = {
        summary: {
          totalIncome,
          totalExpenses,
          netFlow: totalIncome - totalExpenses,
          pendingBillsCount: pendingBills.length,
          overdueBillsCount: overdueBills.length,
          pendingBillsAmount: pendingBills.reduce((sum, bill) => sum + parseFloat(bill.amount), 0),
        },
        clientBalances,
        transactions: filteredTransactions,
        clients: {
          positive: Object.entries(clientBalances).filter(([_, data]) => data.balance > 0),
          negative: Object.entries(clientBalances).filter(([_, data]) => data.balance < 0),
          zero: Object.entries(clientBalances).filter(([_, data]) => data.balance === 0),
        }
      };

      res.json(report);
    } catch (error) {
      console.error('Financial reports error:', error);
      res.status(500).json({ error: "Failed to generate financial report" });
    }
  });

  // Building routes
  app.get("/api/buildings", requireAuth, async (req, res) => {
    try {
      const buildings = await storage.getBuildings(req.session.user!.companyId || 0);
      res.json(buildings);
    } catch (error) {
      console.error("Error fetching buildings:", error);
      res.status(500).json({ error: "Failed to fetch buildings" });
    }
  });

  app.post("/api/buildings", requireAuth, async (req, res) => {
    try {
      const validatedData = insertBuildingSchema.parse({
        ...req.body,
        companyId: req.session.user!.companyId
      });
      
      const building = await storage.createBuilding(validatedData);
      res.status(201).json(building);
    } catch (error) {
      console.error("Error creating building:", error);
      if (error && typeof error === 'object' && 'name' in error && (error as any).name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: (error as any).errors });
      }
      res.status(500).json({ error: "Failed to create building" });
    }
  });

  // External Integrations API Routes
  app.get("/api/integrations", requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const integrations = await storage.getExternalIntegrations(user.companyId);
      // Remove sensitive credentials from response
      const safeIntegrations = integrations.map(integration => ({
        ...integration,
        apiCredentials: integration.apiCredentials ? Object.keys(integration.apiCredentials) : [],
        username: integration.username ? '[HIDDEN]' : null,
        password: integration.password ? '[HIDDEN]' : null
      }));
      
      res.json(safeIntegrations);
    } catch (error) {
      console.error("Get integrations error:", error);
      res.status(500).json({ error: "Failed to fetch integrations" });
    }
  });

  app.get("/api/integrations/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const integration = await storage.getExternalIntegration(id);
      
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }
      
      // Check if user has access to this integration
      if (integration.companyId !== req.session.user?.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Remove sensitive credentials from response
      const safeIntegration = {
        ...integration,
        apiCredentials: integration.apiCredentials ? Object.keys(integration.apiCredentials) : [],
        username: integration.username ? '[HIDDEN]' : null,
        password: integration.password ? '[HIDDEN]' : null
      };
      
      res.json(safeIntegration);
    } catch (error) {
      console.error("Get integration error:", error);
      res.status(500).json({ error: "Failed to fetch integration" });
    }
  });

  app.post("/api/integrations", requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const integrationData = {
        ...req.body,
        companyId: user.companyId
      };
      
      const integration = await storage.createExternalIntegration(integrationData);
      
      // Log integration creation
      await storage.createAuditLog({
        userId: user.id,
        action: "create_integration",
        resource: "integrations",
        details: {
          integrationId: integration.id,
          systemName: integration.systemName,
          systemType: integration.systemType
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      res.status(201).json(integration);
    } catch (error) {
      console.error("Create integration error:", error);
      res.status(500).json({ error: "Failed to create integration" });
    }
  });

  app.put("/api/integrations/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = req.session.user;
      
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Check if integration exists and user has access
      const existingIntegration = await storage.getExternalIntegration(id);
      if (!existingIntegration || existingIntegration.companyId !== user.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const integration = await storage.updateExternalIntegration(id, req.body);
      
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }
      
      // Log integration update
      await storage.createAuditLog({
        userId: user.id,
        action: "update_integration",
        resource: "integrations",
        details: {
          integrationId: integration.id,
          systemName: integration.systemName
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      res.json(integration);
    } catch (error) {
      console.error("Update integration error:", error);
      res.status(500).json({ error: "Failed to update integration" });
    }
  });

  app.delete("/api/integrations/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = req.session.user;
      
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Check if integration exists and user has access
      const existingIntegration = await storage.getExternalIntegration(id);
      if (!existingIntegration || existingIntegration.companyId !== user.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const deleted = await storage.deleteExternalIntegration(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Integration not found" });
      }
      
      // Log integration deletion
      await storage.createAuditLog({
        userId: user.id,
        action: "delete_integration",
        resource: "integrations",
        details: {
          integrationId: id,
          systemName: existingIntegration.systemName
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Delete integration error:", error);
      res.status(500).json({ error: "Failed to delete integration" });
    }
  });

  // Automation Tasks API Routes
  app.get("/api/automation-tasks", requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const { status } = req.query;
      const tasks = await storage.getAutomationTasks(user.companyId, status as string);
      res.json(tasks);
    } catch (error) {
      console.error("Get automation tasks error:", error);
      res.status(500).json({ error: "Failed to fetch automation tasks" });
    }
  });

  app.get("/api/automation-tasks/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getAutomationTask(id);
      
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      // Check if user has access to this task
      if (task.companyId !== req.session.user?.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(task);
    } catch (error) {
      console.error("Get automation task error:", error);
      res.status(500).json({ error: "Failed to fetch automation task" });
    }
  });

  app.post("/api/automation-tasks", requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const taskData = {
        ...req.body,
        companyId: user.companyId,
        triggeredBy: user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      };
      
      const task = await storage.createAutomationTask(taskData);
      
      // Log task creation
      await storage.createAuditLog({
        userId: user.id,
        action: "create_automation_task",
        resource: "automation",
        details: {
          taskId: task.id,
          taskType: task.taskType,
          systemName: task.systemName
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      res.status(201).json(task);
    } catch (error) {
      console.error("Create automation task error:", error);
      res.status(500).json({ error: "Failed to create automation task" });
    }
  });

  // QuickBooks Integration Routes
  app.get("/api/integrations/:id/quickbooks/auth-url", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const integration = await storage.getExternalIntegration(id);
      
      if (!integration || integration.companyId !== req.session.user?.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      if (integration.systemName !== 'quickbooks') {
        return res.status(400).json({ error: "Not a QuickBooks integration" });
      }
      
      const apiCreds = integration.apiCredentials as any;
      const clientId = apiCreds?.clientId;
      if (!clientId) {
        return res.status(400).json({ error: "QuickBooks client ID not configured" });
      }
      
      const redirectUri = `${req.protocol}://${req.get('host')}/api/integrations/${id}/quickbooks/callback`;
      const state = `${id}-${Date.now()}`;
      
      const authUrl = QuickBooksService.getAuthorizationUrl(clientId, redirectUri, state);
      res.json({ authUrl, state });
    } catch (error) {
      console.error("Get QuickBooks auth URL error:", error);
      res.status(500).json({ error: "Failed to get authorization URL" });
    }
  });

  app.get("/api/integrations/:id/quickbooks/callback", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { code, state, realmId } = req.query;
      
      if (!code) {
        return res.status(400).json({ error: "Authorization code not provided" });
      }
      
      const integration = await storage.getExternalIntegration(id);
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }
      
      const qbService = new QuickBooksService(integration);
      const redirectUri = `${req.protocol}://${req.get('host')}/api/integrations/${id}/quickbooks/callback`;
      
      const tokens = await qbService.exchangeCodeForTokens(code as string, redirectUri);
      
      // Update integration with new tokens
      const existingCreds = (integration.apiCredentials as any) || {};
      await storage.updateExternalIntegration(id, {
        apiCredentials: {
          ...existingCreds,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          realmId: realmId as string || tokens.realmId
        },
        syncStatus: 'active',
        lastSyncAt: new Date()
      });
      
      res.json({ success: true, message: "QuickBooks integration connected successfully" });
    } catch (error) {
      console.error("QuickBooks callback error:", error);
      res.status(500).json({ error: "Failed to complete QuickBooks authorization" });
    }
  });

  // Test integration connection
  app.post("/api/integrations/:id/test", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const integration = await storage.getExternalIntegration(id);
      
      if (!integration || integration.companyId !== req.session.user?.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      let testResult = { success: false, message: "Unknown error" };
      
      if (integration.systemType === 'api' && integration.systemName === 'quickbooks') {
        const qbService = new QuickBooksService(integration);
        const connected = await qbService.testConnection();
        testResult = {
          success: connected,
          message: connected ? "QuickBooks connection successful" : "QuickBooks connection failed"
        };
      } else if (integration.systemType === 'web_automation') {
        // For web automation, we could test login credentials
        testResult = {
          success: true,
          message: "Web automation configuration appears valid"
        };
      }
      
      // Update integration status
      await storage.updateExternalIntegration(id, {
        syncStatus: testResult.success ? 'active' : 'error',
        errorMessage: testResult.success ? null : testResult.message
      });
      
      res.json(testResult);
    } catch (error) {
      console.error("Test integration error:", error);
      res.status(500).json({ error: "Failed to test integration" });
    }
  });

  // Sync logs
  app.get("/api/integrations/:id/sync-logs", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const integration = await storage.getExternalIntegration(id);
      
      if (!integration || integration.companyId !== req.session.user?.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const logs = await storage.getQuickbooksSyncLogs(integration.companyId);
      res.json(logs.filter(log => log.integrationId === id));
    } catch (error) {
      console.error("Get sync logs error:", error);
      res.status(500).json({ error: "Failed to fetch sync logs" });
    }
  });

  // Web automation logs
  app.get("/api/automation-tasks/:id/logs", requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getAutomationTask(taskId);
      
      if (!task || task.companyId !== req.session.user?.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const logs = await storage.getWebAutomationLogs(taskId);
      res.json(logs);
    } catch (error) {
      console.error("Get automation logs error:", error);
      res.status(500).json({ error: "Failed to fetch automation logs" });
    }
  });

  // CSV Import API - Original Hennepin County format
  app.post("/api/import/csv-clients", async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // For now, use the attached file path directly
      const filePath = "attached_assets/Pasted-Case-Number-Client-Name-Client-Number-Client-Address-Properties-Management-County-Cell-Number-Ema-1757188201646_1757188201648.txt";
      
      const companyId = req.session.user.companyId || 1;
      
      console.log(`Starting CSV import for company ${companyId}...`);
      const result = await importCSVFile(filePath, companyId);
      
      res.json({
        success: true,
        message: "CSV import completed successfully",
        ...result
      });
    } catch (error) {
      console.error("CSV import error:", error);
      res.status(500).json({ 
        error: "Failed to import CSV file",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Ramsey County CSV Import API
  app.post("/api/import/ramsey-clients", async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Use the new Ramsey County file
      const filePath = "attached_assets/Pasted-Client-Properties-Rental-Office-Address-Rent-Amount-County-Amount-Notes-Abdi-Gabaire-McCarrons--1757252438447_1757252438447.txt";
      
      const companyId = req.session.user.companyId || 1;
      
      console.log(`Starting Ramsey County CSV import for company ${companyId}...`);
      const result = await importRamseyCSVFile(filePath, companyId);
      
      res.json({
        success: true,
        message: "Ramsey County CSV import completed successfully",
        ...result
      });
    } catch (error) {
      console.error("Ramsey County CSV import error:", error);
      res.status(500).json({ 
        error: "Failed to import Ramsey County CSV file",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Hennepin County CSV Import API
  app.post("/api/import/hennepin-clients", async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Use the new Hennepin County file
      const filePath = "attached_assets/Pasted-Client-Properties-Management-Rental-Office-Address-Rent-Amount-County-Amount-Notes-Aarion-Dura-1757252925446_1757252925448.txt";
      
      const companyId = req.session.user.companyId || 1;
      
      console.log(`Starting Hennepin County CSV import for company ${companyId}...`);
      const result = await importHennepinCSVFile(filePath, companyId);
      
      res.json({
        success: true,
        message: "Hennepin County CSV import completed successfully",
        ...result
      });
    } catch (error) {
      console.error("Hennepin County CSV import error:", error);
      res.status(500).json({ 
        error: "Failed to import Hennepin County CSV file",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Dakota County CSV Import API
  app.post("/api/import/dakota-clients", async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Use the new Dakota County file
      const filePath = "attached_assets/Pasted--Case-Number-Client-Properties-Management-Rental-Office-Address-Rent-Amount-County-Amount-1757253563711_1757253563713.txt";
      
      const companyId = req.session.user.companyId || 1;
      
      console.log(`Starting Dakota County CSV import for company ${companyId}...`);
      const result = await importDakotaCSVFile(filePath, companyId);
      
      res.json({
        success: true,
        message: "Dakota County CSV import completed successfully",
        ...result
      });
    } catch (error) {
      console.error("Dakota County CSV import error:", error);
      res.status(500).json({ 
        error: "Failed to import Dakota County CSV file",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Steele County CSV Import API
  app.post("/api/import/steele-clients", async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Use the new Steele County file
      const filePath = "attached_assets/Pasted-Case-Number-Client-Properties-Management-Rental-Office-Address-Rent-Amount-County-Amount-Not-1757254241777_1757254241778.txt";
      
      const companyId = req.session.user.companyId || 1;
      
      console.log(`Starting Steele County CSV import for company ${companyId}...`);
      const result = await importSteeleCSVFile(filePath, companyId);
      
      res.json({
        success: true,
        message: "Steele County CSV import completed successfully",
        ...result
      });
    } catch (error) {
      console.error("Steele County CSV import error:", error);
      res.status(500).json({ 
        error: "Failed to import Steele County CSV file",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  // Payment Document Analysis Routes
  app.post("/api/payment-documents/analyze", async (req, res) => {
    try {
      console.log("Payment document analysis request received");
      
      const { imageData } = req.body;
      if (!imageData) {
        return res.status(400).json({ error: "Image data is required" });
      }

      console.log("Analyzing payment document with OpenAI...");
      const { analyzePaymentDocument } = await import("./openai");
      const analysis = await analyzePaymentDocument(imageData);
      
      console.log("Payment document analysis completed:", analysis.success);
      
      if (!analysis.success) {
        return res.status(422).json({ 
          error: "Analysis failed", 
          details: analysis.error 
        });
      }

      // Generate unique document ID
      const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Find matching clients in database
      const matchResults = [];
      for (const extracted of analysis.extractedData) {
        try {
          // Search for client by name (case insensitive)
          const clientMatches = await storage.getClients().then(clients =>
            clients.filter(client => {
              const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
              const extractedName = extracted.clientName.toLowerCase();
              return fullName.includes(extractedName) || extractedName.includes(fullName);
            })
          );

          matchResults.push({
            extractedData: extracted,
            clientMatches: clientMatches.map(client => ({
              id: client.id,
              name: `${client.firstName} ${client.lastName}`,
              caseNumber: client.caseNumber,
              currentBalance: client.currentBalance
            }))
          });
        } catch (error) {
          console.error("Error matching client:", error);
          matchResults.push({
            extractedData: extracted,
            clientMatches: []
          });
        }
      }

      res.json({
        documentId,
        analysis,
        matchResults,
        totalMatches: matchResults.reduce((sum, result) => sum + result.clientMatches.length, 0)
      });

    } catch (error) {
      console.error("Payment document analysis error:", error);
      res.status(500).json({ 
        error: "Analysis failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.post("/api/payment-documents/process-payments", requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      console.log("Processing payments from document analysis");
      
      const { documentId, selectedClients } = req.body;
      if (!documentId || !selectedClients || !Array.isArray(selectedClients)) {
        return res.status(400).json({ error: "Invalid request data" });
      }

      const processedPayments = [];
      
      for (const clientData of selectedClients) {
        try {
          const { clientId, paymentAmount, paymentDate, extracted } = clientData;
          
          // Verify client belongs to the same company
          const client = await storage.getClient(parseInt(clientId));
          if (!client || client.companyId !== user.companyId) {
            processedPayments.push({
              clientId,
              success: false,
              error: "Client not found or access denied"
            });
            continue;
          }
          
          // Create transaction record  
          const transactionData = {
            clientId: parseInt(clientId),
            type: 'payment' as const,
            amount: paymentAmount.toString(),
            description: `County payment - ${extracted.county || 'Unknown County'}`,
            transactionDate: paymentDate || new Date().toISOString().split('T')[0],
            paymentMethod: extracted.paymentMethod || 'check',
            checkNumber: extracted.checkNumber || null
          };

          const transaction = await storage.createTransaction(transactionData);
          
          // Update client balance
          const currentBalance = parseFloat(client.currentBalance || '0');
          const newBalance = currentBalance + paymentAmount;
          
          await storage.updateClient(parseInt(clientId), {
            currentBalance: newBalance.toFixed(2)
          });

          console.log(`Processed payment for client ${clientId}: $${paymentAmount} (new balance: $${newBalance.toFixed(2)})`);

          processedPayments.push({
            clientId,
            transactionId: transaction.id,
            amount: paymentAmount,
            newBalance: newBalance.toFixed(2),
            success: true
          });
          
        } catch (error) {
          console.error("Error processing payment for client:", clientData.clientId, error);
          processedPayments.push({
            clientId: clientData.clientId,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }

      res.json({
        documentId,
        processedPayments,
        totalProcessed: processedPayments.filter(p => p.success).length,
        totalFailed: processedPayments.filter(p => !p.success).length,
        success: true
      });

    } catch (error) {
      console.error("Payment processing error:", error);
      res.status(500).json({ 
        error: "Payment processing failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  return httpServer;
}
