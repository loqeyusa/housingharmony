import { pgTable, text, serial, integer, decimal, timestamp, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  ssn: text("ssn").notNull(),
  currentAddress: text("current_address").notNull(),
  employmentStatus: text("employment_status").notNull(),
  monthlyIncome: decimal("monthly_income", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("active"), // active, inactive, pending
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

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  address: text("address").notNull(),
  landlordName: text("landlord_name").notNull(),
  landlordPhone: text("landlord_phone").notNull(),
  landlordEmail: text("landlord_email").notNull(),
  rentAmount: decimal("rent_amount", { precision: 10, scale: 2 }).notNull(),
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }).notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: integer("bathrooms").notNull(),
  squareFootage: integer("square_footage"),
  status: text("status").notNull().default("available"), // available, occupied, maintenance
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
  type: text("type").notNull(), // rent_payment, deposit_payment, application_fee, county_reimbursement, pool_fund_deposit, pool_fund_withdrawal
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const poolFund = pgTable("pool_fund", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(), // deposit, withdrawal
  description: text("description").notNull(),
  clientId: integer("client_id"), // for withdrawals
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
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

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;

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
