import { pgTable, text, serial, integer, decimal, timestamp, boolean, date, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Companies - Housing organizations that manage their own clients and funds
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  website: text("website"),
  contactPersonName: text("contact_person_name").notNull(),
  contactPersonEmail: text("contact_person_email").notNull(),
  contactPersonPhone: text("contact_person_phone").notNull(),
  registrationNumber: text("registration_number"), // Business registration number
  taxId: text("tax_id"), // Tax identification number
  licenseNumber: text("license_number"), // Housing license number
  licenseExpirationDate: date("license_expiration_date"),
  status: text("status").notNull().default("pending"), // pending, active, suspended, disabled
  subscriptionPlan: text("subscription_plan").notNull().default("basic"), // basic, premium, enterprise
  maxClients: integer("max_clients").default(100), // Client limit based on plan
  maxUsers: integer("max_users").default(5), // User limit based on plan
  settings: json("settings"), // Company-specific settings
  notes: text("notes"),
  approvedAt: timestamp("approved_at"),
  approvedBy: integer("approved_by"), // User ID who approved
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  // Core client identification fields
  caseNumber: text("case_number"), // Case Number - can be blank initially
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  ssn: text("ssn").notNull(),
  currentAddress: text("current_address").notNull(),
  employmentStatus: text("employment_status").notNull(),
  monthlyIncome: decimal("monthly_income", { precision: 10, scale: 2 }).notNull(),
  // Normalized foreign key relationships
  county: text("county"), // County where client is served (e.g., Ramsey County, Dakota)
  propertyId: integer("property_id"), // FK to properties table
  buildingId: integer("building_id"), // FK to buildings table for easier queries
  countyAmount: decimal("county_amount", { precision: 10, scale: 2 }), // County Amount - can be blank initially
  notes: text("notes"), // Notes - can be blank initially
  status: text("status").notNull().default("active"), // active, inactive, pending, deleted
  isActive: boolean("is_active").default(true), // Active/Inactive toggle
  // Housing Support specific fields
  vendorNumber: text("vendor_number"),
  site: text("site"),
  cluster: text("cluster"),
  subsidyStatus: text("subsidy_status").default("pending"), // pending, receiving, stopped
  grhStatus: text("grh_status").default("pending"), // pending, approved, denied
  maxHousingPayment: decimal("max_housing_payment", { precision: 10, scale: 2 }).default("1220.00"),
  clientObligationPercent: decimal("client_obligation_percent", { precision: 5, scale: 2 }).default("30.00"),
  currentBalance: decimal("current_balance", { precision: 10, scale: 2 }).default("0.00"),
  creditLimit: decimal("credit_limit", { precision: 10, scale: 2 }).default("-100.00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Client Notes - timestamped notes for each client
export const clientNotes = pgTable("client_notes", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  userId: integer("user_id").notNull(), // User who created the note
  content: text("content").notNull(),
  noteDate: date("note_date").notNull(), // Date the note refers to (can be different from created date)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Counties - Reference table for counties served
export const counties = pgTable("counties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  state: text("state").notNull().default("Minnesota"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Sites - Housing sites/campuses with categorization
export const sites = pgTable("sites", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  category: text("category").notNull(), // HSWI, LTH, Group_Housing, Other
  description: text("description"),
  managerId: integer("manager_id"), // User who manages this site
  poolFundSeparate: boolean("pool_fund_separate").default(false), // Whether this site has separate pool funds
  status: text("status").notNull().default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Buildings - Apartment buildings with shared landlord information
export const buildings = pgTable("buildings", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  siteId: integer("site_id"), // Link to site
  name: text("name"), // Building name (e.g. "Sunset Apartments")
  address: text("address").notNull(),
  landlordName: text("landlord_name").notNull(),
  landlordPhone: text("landlord_phone").notNull(),
  landlordEmail: text("landlord_email").notNull(),
  totalUnits: integer("total_units").default(1), // Total number of units in building
  buildingType: text("building_type").default("single_unit"), // single_unit, apartment, townhouse, duplex
  propertyManager: text("property_manager"), // On-site manager if different from landlord
  propertyManagerPhone: text("property_manager_phone"),
  amenities: text("amenities").array().default([]), // Building amenities
  parkingSpaces: integer("parking_spaces"),
  notes: text("notes"),
  status: text("status").notNull().default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Properties/Units - Individual units within buildings
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  buildingId: integer("building_id").notNull(), // Reference to building
  name: text("name").notNull(), // Property name/identifier (from Properties Management column)
  unitNumber: text("unit_number"), // Unit number (e.g. "101", "2A", "Apt 5")
  floor: integer("floor"), // Floor number
  rentAmount: decimal("rent_amount", { precision: 10, scale: 2 }).notNull(),
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }).notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: integer("bathrooms").notNull(),
  squareFootage: integer("square_footage"),
  unitAmenities: text("unit_amenities").array().default([]), // Unit-specific amenities
  hasBalcony: boolean("has_balcony").default(false),
  hasPatio: boolean("has_patio").default(false),
  hasWasherDryer: boolean("has_washer_dryer").default(false),
  petFriendly: boolean("pet_friendly").default(false),
  utilities: text("utilities").array().default([]), // What utilities are included
  status: text("status").notNull().default("available"), // available, occupied, maintenance, inactive
  currentTenantId: integer("current_tenant_id"), // Link to client if occupied
  leaseStartDate: date("lease_start_date"),
  leaseEndDate: date("lease_end_date"),
  lastInspection: date("last_inspection"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Rent Changes - Log all rent amount changes with history
export const rentChanges = pgTable("rent_changes", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  oldRentAmount: decimal("old_rent_amount", { precision: 10, scale: 2 }).notNull(),
  newRentAmount: decimal("new_rent_amount", { precision: 10, scale: 2 }).notNull(),
  changeReason: text("change_reason"), // reason for rent change
  changeDate: date("change_date").notNull(), // effective date of rent change
  changedBy: integer("changed_by").notNull(), // user ID who made the change
  notes: text("notes"), // additional notes about the change
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  propertyId: integer("property_id").notNull(),
  rentPaid: decimal("rent_paid", { precision: 10, scale: 2 }).notNull(),
  depositPaid: decimal("deposit_paid", { precision: 10, scale: 2 }).notNull(),
  applicationFee: decimal("application_fee", { precision: 10, scale: 2 }).notNull(),
  countyReimbursement: decimal("county_reimbursement", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  approvedAt: timestamp("approved_at"),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id"),
  clientId: integer("client_id"), // Direct link to client for easier querying
  type: text("type").notNull(), // rent, utility_electric, utility_gas, utility_water, utility_internet, utility_phone, admin_fee, late_fee, county_reimbursement, pool_fund_deposit, pool_fund_withdrawal, misc
  subType: text("sub_type"), // For utilities: electric, gas, water, sewer, trash, internet, phone, cable
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  paymentMethod: text("payment_method"), // check, ach, melio, cash, money_order, wire_transfer, credit_card
  checkNumber: text("check_number"), // For check payments
  confirmationNumber: text("confirmation_number"), // For electronic payments
  paymentDate: date("payment_date"), // When payment was made
  month: text("month"), // YYYY-MM format for transaction month
  notes: text("notes"), // Additional payment notes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const poolFund = pgTable("pool_fund", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(), // deposit, withdrawal
  description: text("description").notNull(),
  clientId: integer("client_id"), // for withdrawals
  county: text("county").notNull(), // county/site designation
  siteId: integer("site_id"), // Link to site for categorization
  month: text("month"), // YYYY-MM format for transaction month
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Recurring Bills Configuration - manages automatic monthly charges
export const recurringBills = pgTable("recurring_bills", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  propertyId: integer("property_id"), // Optional link to property
  billType: text("bill_type").notNull(), // 'rent', 'utilities', 'insurance', etc.
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  dueDay: integer("due_day").notNull().default(1), // Day of month (1-31)
  isActive: boolean("is_active").notNull().default(true),
  startDate: date("start_date").notNull(), // When recurring bill starts
  endDate: date("end_date"), // Optional end date
  description: text("description"),
  landlordName: text("landlord_name"), // For rent payments
  landlordPhone: text("landlord_phone"),
  landlordEmail: text("landlord_email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Recurring Bill Instances - actual monthly bills generated from recurring bills
export const recurringBillInstances = pgTable("recurring_bill_instances", {
  id: serial("id").primaryKey(),
  recurringBillId: integer("recurring_bill_id").notNull(),
  clientId: integer("client_id").notNull(),
  dueDate: date("due_date").notNull(), // Specific due date for this instance
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, paid, overdue, cancelled
  paymentMethod: text("payment_method"), // check, transfer, cash, etc.
  checkNumber: text("check_number"),
  checkDate: date("check_date"),
  paymentDate: date("payment_date"),
  paymentNotes: text("payment_notes"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  paidAt: timestamp("paid_at"),
  paidBy: integer("paid_by"), // User ID who marked as paid
});

// Housing Support Monthly Tracking - automates the spreadsheet calculations
export const housingSupport = pgTable("housing_support", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  propertyId: integer("property_id"),
  month: text("month").notNull(), // YYYY-MM format
  rentAmount: decimal("rent_amount", { precision: 10, scale: 2 }).notNull(),
  subsidyAward: decimal("subsidy_award", { precision: 10, scale: 2 }).notNull(),
  subsidyReceived: decimal("subsidy_received", { precision: 10, scale: 2 }).notNull(),
  clientObligation: decimal("client_obligation", { precision: 10, scale: 2 }).notNull(),
  clientPaid: decimal("client_paid", { precision: 10, scale: 2 }).default("0.00"),
  electricityFee: decimal("electricity_fee", { precision: 10, scale: 2 }).default("0.00"),
  adminFee: decimal("admin_fee", { precision: 10, scale: 2 }).notNull(),
  rentLateFee: decimal("rent_late_fee", { precision: 10, scale: 2 }).default("0.00"),
  monthPoolTotal: decimal("month_pool_total", { precision: 10, scale: 2 }).notNull(), // calculated field
  runningPoolTotal: decimal("running_pool_total", { precision: 10, scale: 2 }).notNull(), // calculated field
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Vendors - Organizations that provide housing support services
export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // county_hopwa, group_homes, other_subsidies, lth_pool, healthcare, residential_care
  registrationNumber: text("registration_number"), // License or registration number
  grhType: text("grh_type"), // Group Residential Housing type classification
  contactPerson: text("contact_person"),
  keyPerson: text("key_person"), // Primary key contact for contracts
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  website: text("website"),
  services: text("services").array(),
  serviceArea: text("service_area"), // Geographic coverage area
  capacity: integer("capacity"), // Number of beds/units available
  dailyRate: decimal("daily_rate", { precision: 10, scale: 2 }), // Daily reimbursement rate
  contractStartDate: date("contract_start_date"), // Contract/agreement start date
  contractEndDate: date("contract_end_date"), // Contract/agreement end date
  licenseStatus: text("license_status").default("active"), // active, expired, pending, suspended
  licenseExpirationDate: date("license_expiration_date"), // License expiration
  status: text("status").notNull().default("active"), // active, inactive
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const otherSubsidies = pgTable("other_subsidies", {
  id: serial("id").primaryKey(),
  clientName: text("client_name").notNull(),
  serviceStatus: text("service_status").notNull().default("active"), // active, discharged
  vendorNumber: text("vendor_number"), // Vendor ID reference
  vendorName: text("vendor_name").notNull(),
  rentLateFee: decimal("rent_late_fee", { precision: 10, scale: 2 }),
  site: text("site"), // Property/site location
  cluster: text("cluster"), // Service cluster designation
  subsidyStatus: text("subsidy_status"), // Subsidy approval status
  grhStatusDate: date("grh_status_date"), // GRH status effective date
  subsidyProgram: text("subsidy_program"), // MHR, Other, MSA, etc.
  baseRent: decimal("base_rent", { precision: 10, scale: 2 }),
  rentWePaid: decimal("rent_we_paid", { precision: 10, scale: 2 }), // Amount organization paid
  rentPaidMonthly: decimal("rent_paid_monthly", { precision: 10, scale: 2 }), // Monthly payment amount
  subsidyReceived: decimal("subsidy_received", { precision: 10, scale: 2 }), // Subsidy amount received
  clientObligation: decimal("client_obligation", { precision: 10, scale: 2 }), // Client's obligation amount
  lastLease: decimal("last_lease", { precision: 10, scale: 2 }), // Last lease amount
  status: text("status").notNull().default("active"), // active, inactive, discharged
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
});

export const insertRentChangeSchema = createInsertSchema(rentChanges).omit({
  id: true,
  createdAt: true,
});

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  submittedAt: true,
  approvedAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertPoolFundSchema = createInsertSchema(poolFund).omit({
  id: true,
  createdAt: true,
});

export const insertHousingSupportSchema = createInsertSchema(housingSupport).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOtherSubsidySchema = createInsertSchema(otherSubsidies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
  approvedBy: true,
}).extend({
  // Super admin user fields
  superAdminUsername: z.string().min(3, "Username must be at least 3 characters"),
  superAdminEmail: z.string().email("Invalid email address"),
  superAdminFirstName: z.string().min(1, "First name is required"),
  superAdminLastName: z.string().min(1, "Last name is required"),
  superAdminPassword: z.string().min(8, "Password must be at least 8 characters"),
  superAdminConfirmPassword: z.string(),
}).refine((data) => data.superAdminPassword === data.superAdminConfirmPassword, {
  message: "Passwords don't match",
  path: ["superAdminConfirmPassword"],
});

export const insertClientNoteSchema = createInsertSchema(clientNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecurringBillSchema = createInsertSchema(recurringBills).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecurringBillInstanceSchema = createInsertSchema(recurringBillInstances).omit({
  id: true,
  generatedAt: true,
  paidAt: true,
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;

export type RentChange = typeof rentChanges.$inferSelect;
export type InsertRentChange = z.infer<typeof insertRentChangeSchema>;

export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type PoolFund = typeof poolFund.$inferSelect;
export type InsertPoolFund = z.infer<typeof insertPoolFundSchema>;

export type HousingSupport = typeof housingSupport.$inferSelect;
export type InsertHousingSupport = z.infer<typeof insertHousingSupportSchema>;

export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;

export type OtherSubsidy = typeof otherSubsidies.$inferSelect;
export type InsertOtherSubsidy = z.infer<typeof insertOtherSubsidySchema>;

export type ClientNote = typeof clientNotes.$inferSelect;
export type InsertClientNote = z.infer<typeof insertClientNoteSchema>;

export type RecurringBill = typeof recurringBills.$inferSelect;
export type InsertRecurringBill = z.infer<typeof insertRecurringBillSchema>;

export type RecurringBillInstance = typeof recurringBillInstances.$inferSelect;
export type InsertRecurringBillInstance = z.infer<typeof insertRecurringBillInstanceSchema>;

// User Management Schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"), // null for super admin users
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  isEnabled: boolean("is_enabled").default(false).notNull(),
  isSuperAdmin: boolean("is_super_admin").default(false).notNull(),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdById: integer("created_by_id"), // References the user who created this user
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: json("permissions").notNull(), // Array of permission strings
  canCreateUsers: boolean("can_create_users").default(false).notNull(),
  canAssignRoles: json("can_assign_roles").default([]).notNull(), // Array of role IDs they can assign
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdById: integer("created_by_id").notNull(),
});

export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  roleId: integer("role_id").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  assignedById: integer("assigned_by_id").notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: text("action").notNull(), // login, logout, create_user, assign_role, etc.
  resource: text("resource"), // user, role, client, property, etc.
  resourceId: integer("resource_id"),
  details: json("details"), // Additional context about the action
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Define proper database relations
export const clientsRelations = relations(clients, ({ one }) => ({
  company: one(companies, {
    fields: [clients.companyId],
    references: [companies.id],
  }),
  property: one(properties, {
    fields: [clients.propertyId],
    references: [properties.id],
  }),
  building: one(buildings, {
    fields: [clients.buildingId],
    references: [buildings.id],
  }),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  company: one(companies, {
    fields: [properties.companyId],
    references: [companies.id],
  }),
  building: one(buildings, {
    fields: [properties.buildingId],
    references: [buildings.id],
  }),
  clients: many(clients),
  currentTenant: one(clients, {
    fields: [properties.currentTenantId],
    references: [clients.id],
  }),
}));

export const buildingsRelations = relations(buildings, ({ one, many }) => ({
  company: one(companies, {
    fields: [buildings.companyId],
    references: [companies.id],
  }),
  site: one(sites, {
    fields: [buildings.siteId],
    references: [sites.id],
  }),
  properties: many(properties),
  clients: many(clients),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  clients: many(clients),
  properties: many(properties),
  buildings: many(buildings),
  sites: many(sites),
}));

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [users.createdById],
    references: [users.id],
    relationName: "creator",
  }),
  createdUsers: many(users, { relationName: "creator" }),
  userRoles: many(userRoles),
  createdRoles: many(roles),
  auditLogs: many(auditLogs),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [roles.createdById],
    references: [users.id],
  }),
  userRoles: many(userRoles),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
  assignedBy: one(users, {
    fields: [userRoles.assignedById],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Insert schemas for user management
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  passwordHash: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  id: true,
  assignedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

// Types for user management
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;

export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Permission constants
export const PERMISSIONS = {
  // System permissions
  SUPER_ADMIN: 'super_admin',
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  
  // Client permissions
  VIEW_CLIENTS: 'view_clients',
  CREATE_CLIENTS: 'create_clients',
  EDIT_CLIENTS: 'edit_clients',
  DELETE_CLIENTS: 'delete_clients',
  
  // Property permissions
  VIEW_PROPERTIES: 'view_properties',
  CREATE_PROPERTIES: 'create_properties',
  EDIT_PROPERTIES: 'edit_properties',
  DELETE_PROPERTIES: 'delete_properties',
  
  // Application permissions
  VIEW_APPLICATIONS: 'view_applications',
  CREATE_APPLICATIONS: 'create_applications',
  EDIT_APPLICATIONS: 'edit_applications',
  DELETE_APPLICATIONS: 'delete_applications',
  APPROVE_APPLICATIONS: 'approve_applications',
  
  // Financial permissions
  VIEW_TRANSACTIONS: 'view_transactions',
  CREATE_TRANSACTIONS: 'create_transactions',
  EDIT_TRANSACTIONS: 'edit_transactions',
  DELETE_TRANSACTIONS: 'delete_transactions',
  MANAGE_POOL_FUND: 'manage_pool_fund',
  
  // Vendor permissions
  VIEW_VENDORS: 'view_vendors',
  CREATE_VENDORS: 'create_vendors',
  EDIT_VENDORS: 'edit_vendors',
  DELETE_VENDORS: 'delete_vendors',
  
  // Other subsidies permissions
  VIEW_OTHER_SUBSIDIES: 'view_other_subsidies',
  CREATE_OTHER_SUBSIDIES: 'create_other_subsidies',
  EDIT_OTHER_SUBSIDIES: 'edit_other_subsidies',
  DELETE_OTHER_SUBSIDIES: 'delete_other_subsidies',
  
  // Housing support permissions
  VIEW_HOUSING_SUPPORT: 'view_housing_support',
  CREATE_HOUSING_SUPPORT: 'create_housing_support',
  EDIT_HOUSING_SUPPORT: 'edit_housing_support',
  DELETE_HOUSING_SUPPORT: 'delete_housing_support',
  
  // Report permissions
  VIEW_REPORTS: 'view_reports',
  EXPORT_DATA: 'export_data',
  
  // Recurring bills permissions
  VIEW_RECURRING_BILLS: 'view_recurring_bills',
  CREATE_RECURRING_BILLS: 'create_recurring_bills',
  EDIT_RECURRING_BILLS: 'edit_recurring_bills',
  DELETE_RECURRING_BILLS: 'delete_recurring_bills',
  MANAGE_BILL_PAYMENTS: 'manage_bill_payments',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Client Documents - HIPAA compliant document management
export const clientDocuments = pgTable("client_documents", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  documentType: text("document_type").notNull(), // vendor_number, habitability_inspection, interim_assistance_agreement, psn, shelter_verification, ssi_interim_assistance_agreement, state_id, medical_id, lease, rental_agreement, referral_form
  documentName: text("document_name").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  uploadedBy: integer("uploaded_by").notNull(),
  expirationDate: date("expiration_date"),
  isRequired: boolean("is_required").default(false),
  isVerified: boolean("is_verified").default(false),
  verifiedBy: integer("verified_by"),
  verifiedAt: timestamp("verified_at"),
  notes: text("notes"),
  hipaaAccess: json("hipaa_access"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Document Access Log - HIPAA compliance tracking
export const documentAccessLog = pgTable("document_access_log", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  userId: integer("user_id").notNull(),
  accessType: text("access_type").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  accessedAt: timestamp("accessed_at").defaultNow().notNull(),
});

export const insertBuildingSchema = createInsertSchema(buildings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSiteSchema = createInsertSchema(sites).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientDocumentSchema = createInsertSchema(clientDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Building = typeof buildings.$inferSelect;
export type Site = typeof sites.$inferSelect;
export type ClientDocument = typeof clientDocuments.$inferSelect;
export type DocumentAccessLog = typeof documentAccessLog.$inferSelect;
export type InsertBuilding = z.infer<typeof insertBuildingSchema>;
export type InsertSite = z.infer<typeof insertSiteSchema>;
export type InsertClientDocument = z.infer<typeof insertClientDocumentSchema>;

// External System Integrations - Store API credentials and connection details
export const externalIntegrations = pgTable("external_integrations", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  systemName: text("system_name").notNull(), // quickbooks, excel_energy, xcel_energy, centerpoint_energy, etc.
  systemType: text("system_type").notNull(), // api, web_automation
  displayName: text("display_name").notNull(),
  isActive: boolean("is_active").default(true),
  
  // API Credentials (encrypted)
  apiCredentials: json("api_credentials"), // Store encrypted API keys, tokens, etc.
  
  // Web Automation Credentials (encrypted)
  loginUrl: text("login_url"),
  username: text("username"), // Encrypted
  password: text("password"), // Encrypted
  
  // Configuration
  settings: json("settings"), // System-specific settings
  lastSyncAt: timestamp("last_sync_at"),
  syncStatus: text("sync_status").default("pending"), // pending, active, error, disabled
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Automation Tasks - Track automated operations like payments and data entry
export const automationTasks = pgTable("automation_tasks", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  integrationId: integer("integration_id").notNull(), // Reference to external_integrations
  clientId: integer("client_id"), // Optional: link to specific client
  
  taskType: text("task_type").notNull(), // payment, data_entry, balance_check, etc.
  systemName: text("system_name").notNull(), // quickbooks, excel_energy, etc.
  
  // Task Details
  taskData: json("task_data").notNull(), // Store task-specific data (meter number, amount, etc.)
  
  // Execution Status
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, failed, retrying
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  executionTime: integer("execution_time"), // milliseconds
  
  // Results
  success: boolean("success"),
  result: json("result"), // Success/failure details, confirmation numbers, etc.
  errorMessage: text("error_message"),
  
  // Retry Logic
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  nextRetryAt: timestamp("next_retry_at"),
  
  // Screenshots and Evidence
  screenshotPath: text("screenshot_path"), // For web automation proof
  
  // Auditing
  triggeredBy: integer("triggered_by").notNull(), // User ID who initiated the task
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// QuickBooks Sync Log - Track data synchronization with QuickBooks
export const quickbooksSyncLog = pgTable("quickbooks_sync_log", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  integrationId: integer("integration_id").notNull(),
  
  syncType: text("sync_type").notNull(), // customers, invoices, payments, expenses
  recordType: text("record_type").notNull(), // client, transaction, vendor
  recordId: integer("record_id"), // Local record ID
  quickbooksId: text("quickbooks_id"), // QuickBooks record ID
  
  action: text("action").notNull(), // create, update, delete, sync
  status: text("status").notNull(), // success, failed, skipped
  
  // Sync Data
  syncData: json("sync_data"), // Data that was synced
  response: json("response"), // QuickBooks API response
  errorMessage: text("error_message"),
  
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Web Automation Logs - Detailed logs for web automation tasks
export const webAutomationLogs = pgTable("web_automation_logs", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(), // Reference to automation_tasks
  
  stepNumber: integer("step_number").notNull(),
  stepName: text("step_name").notNull(), // login, navigate, fill_form, submit, etc.
  stepType: text("step_type").notNull(), // navigation, form_input, click, wait, screenshot
  
  // Step Details
  selector: text("selector"), // CSS selector used
  inputValue: text("input_value"), // Data entered
  expectedText: text("expected_text"), // Text expected on page
  actualText: text("actual_text"), // Text found on page
  
  // Results
  success: boolean("success").notNull(),
  duration: integer("duration"), // milliseconds
  errorMessage: text("error_message"),
  screenshotPath: text("screenshot_path"),
  
  // Browser State
  currentUrl: text("current_url"),
  pageTitle: text("page_title"),
  
  executedAt: timestamp("executed_at").defaultNow().notNull(),
});

// Schemas for new tables
export const insertExternalIntegrationSchema = createInsertSchema(externalIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAutomationTaskSchema = createInsertSchema(automationTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuickbooksSyncLogSchema = createInsertSchema(quickbooksSyncLog).omit({
  id: true,
  createdAt: true,
});

export const insertWebAutomationLogSchema = createInsertSchema(webAutomationLogs).omit({
  id: true,
});

// Types
export type ExternalIntegration = typeof externalIntegrations.$inferSelect;
export type AutomationTask = typeof automationTasks.$inferSelect;
export type QuickbooksSyncLog = typeof quickbooksSyncLog.$inferSelect;
export type WebAutomationLog = typeof webAutomationLogs.$inferSelect;
export type InsertExternalIntegration = z.infer<typeof insertExternalIntegrationSchema>;
export type InsertAutomationTask = z.infer<typeof insertAutomationTaskSchema>;
export type InsertQuickbooksSyncLog = z.infer<typeof insertQuickbooksSyncLogSchema>;
export type InsertWebAutomationLog = z.infer<typeof insertWebAutomationLogSchema>;

