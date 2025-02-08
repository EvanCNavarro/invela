import { 
  pgTable, 
  text, 
  serial, 
  timestamp, 
  integer,
  boolean,
  jsonb,
  real,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const companyLogos = pgTable("company_logos", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileType: text("file_type").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'SYSTEM_CREATOR', 'WHITE_LABEL', or 'THIRD_PARTY'
  category: text("category").notNull(), // 'INVELA', 'BANK', or 'FINTECH'
  logoId: uuid("logo_id").references(() => companyLogos.id),
  stockTicker: text("stock_ticker"),
  websiteUrl: text("website_url"),
  legalStructure: text("legal_structure"),
  marketPosition: text("market_position"),
  hqAddress: text("hq_address"),
  productsServices: text("products_services"),
  incorporationYear: integer("incorporation_year"),
  foundersAndLeadership: text("founders_and_leadership"),
  numEmployees: integer("num_employees"),
  revenue: text("revenue"),
  keyClientsPartners: text("key_clients_partners"),
  investors: text("investors"),
  fundingStage: text("funding_stage"),
  exitStrategyHistory: text("exit_strategy_history"),
  certificationsCompliance: text("certifications_compliance"),
  riskScore: integer("risk_score"),
  accreditationStatus: text("accreditation_status"),
  registryDate: timestamp("registry_date").notNull().defaultNow(),
  filesPublic: jsonb("files_public").$type<string[]>().default([]),
  filesPrivate: jsonb("files_private").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  taskType: text("task_type").notNull(), // 'user_onboarding' or 'file_request'
  taskScope: text("task_scope").notNull(), // 'user' or 'company'
  status: text("status").notNull().default('pending'),
  priority: text("priority").notNull().default('medium'),
  progress: real("progress").notNull().default(0),
  assignedTo: integer("assigned_to").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id),
  companyId: integer("company_id").references(() => companies.id),
  userEmail: text("user_email"),
  dueDate: timestamp("due_date"),
  completionDate: timestamp("completion_date"),
  filesRequested: jsonb("files_requested").$type<string[]>().default([]),
  filesUploaded: jsonb("files_uploaded").$type<string[]>().default([]),
  metadata: jsonb("metadata").default({}),
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
  downloadCount: integer("download_count").default(0),
  version: real("version").notNull().default(1.0),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  files: many(files),
  assignedTasks: many(tasks, { relationName: "assignedTasks" }),
  createdTasks: many(tasks, { relationName: "createdTasks" }),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  tasks: many(tasks),
  relationships: many(relationships),
  logos: many(companyLogos)
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  assignedUser: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [tasks.createdBy],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [tasks.companyId],
    references: [companies.id],
  }),
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
export const insertTaskSchema = z.object({
  taskType: z.enum(["user_onboarding", "file_request"]),
  taskScope: z.enum(["user", "company"]).optional(),
  title: z.string(),
  description: z.string(),
  userEmail: z.string().email().optional(),
  companyId: z.number().optional(),
  dueDate: z.date().optional(),
  assignedTo: z.number().nullable().optional(),
  priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
  filesRequested: z.array(z.string()).optional(),
}).superRefine((data, ctx) => {
  if (data.taskType === "user_onboarding") {
    if (!data.userEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email is required for user onboarding tasks",
        path: ["userEmail"],
      });
    }
    if (!data.companyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Company is required for user onboarding tasks",
        path: ["companyId"],
      });
    }
  } else if (data.taskType === "file_request") {
    if (!data.taskScope) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Task scope is required for file requests",
        path: ["taskScope"],
      });
    }
    if (data.taskScope === "user" && !data.userEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email is required for user file requests",
        path: ["userEmail"],
      });
    }
    if (data.taskScope === "company" && !data.companyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Company is required for company file requests",
        path: ["companyId"],
      });
    }
  }
});
export const selectTaskSchema = createSelectSchema(tasks);

export const insertFileSchema = createInsertSchema(files);
export const selectFileSchema = createSelectSchema(files);

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;
export type SelectCompany = typeof companies.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;
export type SelectTask = typeof tasks.$inferSelect;
export type InsertFile = typeof files.$inferInsert;
export type SelectFile = typeof files.$inferSelect;
export type RegistrationData = z.infer<typeof registrationSchema>;