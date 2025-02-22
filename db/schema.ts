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
  pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const TaskStatus = {
  EMAIL_SENT: 'email_sent',
  COMPLETED: 'completed',
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  READY_FOR_SUBMISSION: 'ready_for_submission',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
} as const;

export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  task_type: text("task_type").notNull(), 
  task_scope: text("task_scope").notNull(), 
  status: text("status").$type<TaskStatus>().notNull().default(TaskStatus.EMAIL_SENT),
  priority: text("priority").notNull().default('medium'),
  progress: real("progress").notNull().default(0),
  assigned_to: integer("assigned_to").references(() => users.id), 
  created_by: integer("created_by").references(() => users.id), 
  company_id: integer("company_id").references(() => companies.id), 
  user_email: text("user_email"), 
  due_date: timestamp("due_date"), 
  completion_date: timestamp("completion_date"), 
  files_requested: jsonb("files_requested").$type<string[]>().default([]), 
  files_uploaded: jsonb("files_uploaded").$type<string[]>().default([]), 
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  created_at: timestamp("created_at").defaultNow(), 
  updated_at: timestamp("updated_at").defaultNow(), 
});

export const companyLogos = pgTable("company_logos", {
  id: uuid("id").defaultRandom().primaryKey(),
  company_id: integer("company_id").references(() => companies.id).notNull(),
  file_name: text("file_name").notNull(),
  file_path: text("file_path").notNull(),
  file_type: text("file_type").notNull(),
  uploaded_at: timestamp("uploaded_at").defaultNow(),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), 
  logo_id: uuid("logo_id").references(() => companyLogos.id),
  stock_ticker: text("stock_ticker"),
  website_url: text("website_url"),
  legal_structure: text("legal_structure"),
  market_position: text("market_position"),
  hq_address: text("hq_address"),
  products_services: text("products_services"),
  incorporation_year: integer("incorporation_year"),
  founders_and_leadership: text("founders_and_leadership"),
  num_employees: integer("num_employees"),
  revenue: text("revenue"),
  key_clients_partners: text("key_clients_partners"),
  investors: text("investors"),
  funding_stage: text("funding_stage"),
  exit_strategy_history: text("exit_strategy_history"),
  certifications_compliance: text("certifications_compliance"),
  risk_score: integer("risk_score"),
  accreditation_status: text("accreditation_status"),
  onboarding_company_completed: boolean("onboarding_company_completed").notNull().default(true),
  registry_date: timestamp("registry_date").notNull().defaultNow(),
  files_public: jsonb("files_public").$type<string[]>().default([]),
  files_private: jsonb("files_private").$type<string[]>().default([]),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  full_name: text("full_name").notNull(),
  first_name: text("first_name"),  
  last_name: text("last_name"),
  password: text("password").notNull(),
  company_id: integer("company_id").references(() => companies.id).notNull(),
  onboarding_user_completed: boolean("onboarding_user_completed").notNull().default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const relationships = pgTable("relationships", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").references(() => companies.id).notNull(),
  related_company_id: integer("related_company_id").references(() => companies.id).notNull(),
  relationship_type: text("relationship_type").notNull(), 
  status: text("status").notNull(), 
  metadata: jsonb("metadata").default({}),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  size: integer("size").notNull(),
  type: text("type").notNull(),
  path: text("path").notNull(),
  status: text("status").notNull(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  company_id: integer("company_id").references(() => companies.id).notNull(),
  upload_time: timestamp("upload_time").notNull().defaultNow(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  download_count: integer("download_count").default(0),
  version: real("version").notNull().default(1.0),
});

export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  code: text("code").notNull().unique(), 
  status: text("status").notNull().default('pending'), 
  company_id: integer("company_id").references(() => companies.id).notNull(),
  task_id: integer("task_id").references(() => tasks.id),
  invitee_name: text("invitee_name").notNull(),
  invitee_company: text("invitee_company").notNull(),
  expires_at: timestamp("expires_at").notNull(),
  used_at: timestamp("used_at"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const openaiSearchAnalytics = pgTable("openai_search_analytics", {
  id: serial("id").primaryKey(),
  search_type: text("search_type").notNull(), 
  company_id: integer("company_id").references(() => companies.id),
  search_prompt: text("search_prompt").notNull(),
  search_results: jsonb("search_results").$type<Record<string, any>>().notNull(),
  input_tokens: integer("input_tokens").notNull(),
  output_tokens: integer("output_tokens").notNull(),
  estimated_cost: real("estimated_cost").notNull(),
  search_date: timestamp("search_date").notNull().defaultNow(),
  model: text("model").notNull(),
  success: boolean("success").notNull(),
  error_message: text("error_message"),
  duration: integer("duration").notNull(), 
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const KYBFieldType = {
  TEXT: 'text',
  DATE: 'date',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  MULTIPLE_CHOICE: 'multiple_choice'
} as const;

export const KYBFieldStatus = {
  EMPTY: 'empty',
  INCOMPLETE: 'incomplete',
  COMPLETE: 'complete',
  INVALID: 'invalid'
} as const;

export const kybFields = pgTable("kyb_fields", {
  id: serial("id").primaryKey(),
  field_key: text("field_key").notNull(),
  display_name: text("display_name").notNull(),
  field_type: text("field_type").$type<keyof typeof KYBFieldType>().notNull(),
  question: text("question").notNull(), 
  group: text("group").notNull(), 
  required: boolean("required").notNull().default(true),
  order: integer("order").notNull(),
  validation_rules: jsonb("validation_rules"),
  help_text: text("help_text"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const kybResponses = pgTable("kyb_responses", {
  id: serial("id").primaryKey(),
  task_id: integer("task_id").references(() => tasks.id).notNull(),
  field_id: integer("field_id").references(() => kybFields.id).notNull(),
  response_value: text("response_value"),
  status: text("status").$type<keyof typeof KYBFieldStatus>().notNull().default('empty'),
  version: integer("version").notNull().default(1),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.company_id],
    references: [companies.id],
  }),
  files: many(files),
  assignedTasks: many(tasks, { relationName: "assignedTasks" }),
  createdTasks: many(tasks, { relationName: "createdTasks" }),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  tasks: many(tasks),
  networkMembers: many(relationships, { relationName: "networkMembers" }),
  memberOfNetworks: many(relationships, { relationName: "memberOfNetworks" }),
  logos: many(companyLogos)
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  assignedUser: one(users, {
    fields: [tasks.assigned_to],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [tasks.created_by],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [tasks.company_id],
    references: [companies.id],
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  company: one(companies, {
    fields: [invitations.company_id],
    references: [companies.id],
  }),
  task: one(tasks, {
    fields: [invitations.task_id],
    references: [tasks.id],
  }),
}));

export const openaiSearchAnalyticsRelations = relations(openaiSearchAnalytics, ({ one }) => ({
  company: one(companies, {
    fields: [openaiSearchAnalytics.company_id],
    references: [companies.id],
  }),
}));

export const kybFieldsRelations = relations(kybFields, ({ many }) => ({
  responses: many(kybResponses),
}));

export const kybResponsesRelations = relations(kybResponses, ({ one }) => ({
  field: one(kybFields, {
    fields: [kybResponses.field_id],
    references: [kybFields.id],
  }),
  task: one(tasks, {
    fields: [kybResponses.task_id],
    references: [tasks.id],
  }),
}));

export const registrationSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  first_name: z.string().nullable().optional(),  
  last_name: z.string().nullable(),
  password: z.string().min(6),
  company: z.string().min(1),
  invitation_code: z.string().min(1),
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertCompanySchema = createInsertSchema(companies);
export const selectCompanySchema = createSelectSchema(companies);
export const insertTaskSchema = z.object({
  task_type: z.enum(["user_onboarding", "file_request", "company_onboarding_KYB"]),
  task_scope: z.enum(["user", "company"]).optional(),
  title: z.string(),
  description: z.string(),
  user_email: z.string().email().optional(),
  company_id: z.number().optional(),
  due_date: z.date().optional(),
  assigned_to: z.number().nullable().optional(),
  priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
  files_requested: z.array(z.string()).optional(),
  status: z.enum([
    TaskStatus.EMAIL_SENT,
    TaskStatus.COMPLETED,
    TaskStatus.NOT_STARTED,
    TaskStatus.IN_PROGRESS,
    TaskStatus.READY_FOR_SUBMISSION,
    TaskStatus.SUBMITTED,
    TaskStatus.APPROVED,
  ])
    .optional()
    .default(TaskStatus.NOT_STARTED),
}).superRefine((data, ctx) => {
  if (data.task_type === "user_onboarding") {
    if (!data.user_email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email is required for user onboarding tasks",
        path: ["user_email"],
      });
    }
    if (!data.company_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Company is required for user onboarding tasks",
        path: ["company_id"],
      });
    }
  } else if (data.task_type === "file_request") {
    if (!data.task_scope) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Task scope is required for file requests",
        path: ["task_scope"],
      });
    }
    if (data.task_scope === "user" && !data.user_email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email is required for user file requests",
        path: ["user_email"],
      });
    }
    if (data.task_scope === "company" && !data.company_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Company is required for company file requests",
        path: ["company_id"],
      });
    }
  } else if (data.task_type === "company_onboarding_KYB") {
    if (!data.company_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Company is required for KYB tasks",
        path: ["company_id"],
      });
    }
    data.task_scope = "company";
  }
});
export const selectTaskSchema = createSelectSchema(tasks);

export const insertFileSchema = createInsertSchema(files);
export const selectFileSchema = createSelectSchema(files);

export const insertInvitationSchema = createInsertSchema(invitations, {
  code: z.string().length(6).regex(/^[0-9A-F]+$/, "Must be a 6-digit hex code"),
  email: z.string().email(),
  invitee_name: z.string().min(1, "Invitee name is required"),
  invitee_company: z.string().min(1, "Invitee company is required"),
});
export const selectInvitationSchema = createSelectSchema(invitations);

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;
export type SelectCompany = typeof companies.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;
export type SelectTask = typeof tasks.$inferSelect;
export type InsertFile = typeof files.$inferInsert;
export type SelectFile = typeof files.$inferSelect;
export type RegistrationData = z.infer<typeof registrationSchema>;
export type InsertInvitation = typeof invitations.$inferInsert;
export type SelectInvitation = typeof invitations.$inferSelect;

export const insertKybFieldSchema = createInsertSchema(kybFields);
export const selectKybFieldSchema = createSelectSchema(kybFields);
export const insertKybResponseSchema = createInsertSchema(kybResponses);
export const selectKybResponseSchema = createSelectSchema(kybResponses);