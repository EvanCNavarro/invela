import { 
  pgTable, 
  text, 
  serial, 
  timestamp, 
  integer,
  boolean,
  jsonb,
  uuid
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  password: text("password").notNull(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  location: text("location"),
  website: text("website"),
  employeeCount: integer("employee_count"),
  revenue: text("revenue"),
  riskScore: integer("risk_score"),
  accreditationStatus: text("accreditation_status"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull(),
  assignedTo: integer("assigned_to").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id),
  companyId: integer("company_id").references(() => companies.id),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const relationships = pgTable("relationships", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  relatedCompanyId: integer("related_company_id").references(() => companies.id),
  relationshipType: text("relationship_type").notNull(),
  status: text("status").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  size: integer("size").notNull(),
  type: text("type").notNull(),
  path: text("path").notNull(),
  status: text("status").notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  uploadTime: timestamp("upload_time").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  currentVersionId: integer("current_version_id"),
  isEncrypted: boolean("is_encrypted").notNull().default(false),
  encryptionKey: text("encryption_key"),
  isCompressed: boolean("is_compressed").notNull().default(false),
  compressionType: text("compression_type"),
  accessLevel: text("access_level").notNull().default('private'),
  retentionPeriod: integer("retention_period"),
  lastAccessedAt: timestamp("last_accessed_at"),
  checksum: text("checksum"),
  mimeType: text("mime_type"),
});

export const fileVersions = pgTable("file_versions", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").references(() => files.id).notNull(),
  versionNumber: integer("version_number").notNull(),
  path: text("path").notNull(),
  size: integer("size").notNull(),
  checksum: text("checksum").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  changeDescription: text("change_description"),
  isEncrypted: boolean("is_encrypted").notNull().default(false),
  encryptionKey: text("encryption_key"),
  isCompressed: boolean("is_compressed").notNull().default(false),
});

export const filePermissions = pgTable("file_permissions", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").references(() => files.id).notNull(),
  userId: integer("user_id").references(() => users.id),
  companyId: integer("company_id").references(() => companies.id),
  permissionType: text("permission_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  grantedBy: integer("granted_by").references(() => users.id).notNull(),
  expiresAt: timestamp("expires_at"),
});

export const fileAuditLogs = pgTable("file_audit_logs", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").references(() => files.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"),
  status: text("status").notNull(),
  errorDetails: text("error_details"),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  files: many(files),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  tasks: many(tasks),
  relationships: many(relationships),
}));

export const filesRelations = relations(files, ({ one, many }) => ({
  currentVersion: one(fileVersions, {
    fields: [files.currentVersionId],
    references: [fileVersions.id],
  }),
  versions: many(fileVersions),
  permissions: many(filePermissions),
  auditLogs: many(fileAuditLogs),
}));

export const registrationSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().nullable(),
  password: z.string().min(6),
  company: z.string().min(1),
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertCompanySchema = createInsertSchema(companies);
export const selectCompanySchema = createSelectSchema(companies);
export const insertTaskSchema = createInsertSchema(tasks);
export const selectTaskSchema = createSelectSchema(tasks);
export const insertFileSchema = createInsertSchema(files);
export const selectFileSchema = createSelectSchema(files);
export const insertFileVersionSchema = createInsertSchema(fileVersions);
export const selectFileVersionSchema = createSelectSchema(fileVersions);
export const insertFilePermissionSchema = createInsertSchema(filePermissions);
export const selectFilePermissionSchema = createSelectSchema(filePermissions);
export const insertFileAuditLogSchema = createInsertSchema(fileAuditLogs);
export const selectFileAuditLogSchema = createSelectSchema(fileAuditLogs);

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;
export type SelectCompany = typeof companies.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;
export type SelectTask = typeof tasks.$inferSelect;
export type InsertFile = typeof files.$inferInsert;
export type SelectFile = typeof files.$inferSelect;
export type RegistrationData = z.infer<typeof registrationSchema>;
export type InsertFileVersion = typeof fileVersions.$inferInsert;
export type SelectFileVersion = typeof fileVersions.$inferSelect;
export type InsertFilePermission = typeof filePermissions.$inferInsert;
export type SelectFilePermission = typeof filePermissions.$inferSelect;
export type InsertFileAuditLog = typeof fileAuditLogs.$inferInsert;
export type SelectFileAuditLog = typeof fileAuditLogs.$inferSelect;