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
  pgEnum,
  varchar,
  bigint
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Import timestamp schema
import { kybFieldTimestamps } from './schema-timestamps';

// Status type for form submissions
export const SubmissionStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  WARNING: 'warning'
} as const;

export type SubmissionStatus = typeof SubmissionStatus[keyof typeof SubmissionStatus];

export const TaskStatus = {
  PENDING: 'pending',
  NOT_STARTED: 'not_started',
  EMAIL_SENT: 'email_sent',
  COMPLETED: 'completed',
  FAILED: 'failed',
  IN_PROGRESS: 'in_progress',
  READY_FOR_SUBMISSION: 'ready_for_submission',
  SUBMITTED: 'submitted',
  APPROVED: 'approved'
} as const;

export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];


export const DocumentCategory = {
  SOC2_AUDIT: 'soc2_audit',
  ISO27001_CERT: 'iso27001_cert',
  PENTEST_REPORT: 'pentest_report',
  BUSINESS_CONTINUITY: 'business_continuity',
  OPEN_BANKING_SURVEY: 'open_banking_survey',
  OTHER: 'other'
} as const;

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  task_type: text("task_type").notNull(), 
  task_scope: text("task_scope").notNull(), 
  status: text("status").$type<TaskStatus>().notNull().default(TaskStatus.PENDING),
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
  revenue_tier: text("revenue_tier"),
  // active_consents column removed as it doesn't exist in the actual database
  // active_consents: integer("active_consents"),
  key_clients_partners: text("key_clients_partners"),
  investors: text("investors"),
  funding_stage: text("funding_stage"),
  exit_strategy_history: text("exit_strategy_history"),
  certifications_compliance: text("certifications_compliance"),
  risk_score: integer("risk_score"),
  chosen_score: integer("chosen_score"),
  risk_clusters: jsonb("risk_clusters").$type<{
    "PII Data": number,
    "Account Data": number,
    "Data Transfers": number,
    "Certifications Risk": number,
    "Security Risk": number,
    "Financial Risk": number
  }>(),
  risk_configuration: jsonb("risk_configuration").$type<{
    dimensions: {
      id: string;
      name: string;
      description: string;
      weight: number;
      value: number;
      color?: string;
    }[];
    thresholds: {
      high: number;
      medium: number;
    };
    score: number;
    riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  }>(),
  risk_priorities: jsonb("risk_priorities").$type<{
    dimensions: {
      id: string;
      name: string;
      description: string;
      weight: number;
      value: number;
      color?: string;
    }[];
    riskAcceptanceLevel: number;
    lastUpdated: string;
  }>(),
  accreditation_status: text("accreditation_status"),
  onboarding_company_completed: boolean("onboarding_company_completed").notNull().default(true),
  registry_date: timestamp("registry_date").notNull().defaultNow(),
  files_public: jsonb("files_public").$type<string[]>().default([]),
  files_private: jsonb("files_private").$type<string[]>().default([]),
  available_tabs: text("available_tabs").array().notNull().default(['task-center']),
  is_demo: boolean("is_demo").default(false),
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
  
  // ========================================
  // DEMO USER TRACKING FIELDS
  // ========================================
  // Added to support comprehensive demo user identification and management
  is_demo_user: boolean("is_demo_user").default(false),
  demo_session_id: text("demo_session_id"),
  demo_created_at: timestamp("demo_created_at"),
  demo_persona_type: text("demo_persona_type"),
  demo_expires_at: timestamp("demo_expires_at"),
  demo_cleanup_eligible: boolean("demo_cleanup_eligible").default(true),
  demo_last_login: timestamp("demo_last_login"),
  
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
  document_category: text("document_category").$type<keyof typeof DocumentCategory>(),
  classification_status: text("classification_status"),
  classification_confidence: real("classification_confidence"),
  created_at: timestamp("created_at"),
  updated_at: timestamp("updated_at"),
  upload_time: timestamp("upload_time"),
  download_count: integer("download_count"),
  version: real("version").notNull().default(1.0),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({})
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
  TEXT: 'TEXT',
  DATE: 'DATE',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  SELECT: 'SELECT',
  MULTI_SELECT: 'MULTI_SELECT',
  TEXTAREA: 'TEXTAREA',
  EMAIL: 'EMAIL'
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
  step_index: integer("step_index").notNull().default(0),
  validation_rules: jsonb("validation_rules"),
  help_text: text("help_text"),
  demo_autofill: text("demo_autofill"), // Add the demo_autofill column
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

export const cardFields = pgTable("card_fields", {
  id: serial("id").primaryKey(),
  field_key: text("field_key").notNull().unique(),
  wizard_section: text("wizard_section").notNull(),
  question_label: text("question_label").notNull(),
  question: text("question").notNull(),
  example_response: text("example_response"),
  ai_search_instructions: text("ai_search_instructions"),
  partial_risk_score_max: integer("partial_risk_score_max").notNull(),
  step_index: integer("step_index").notNull().default(0),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const cardResponses = pgTable("card_responses", {
  id: serial("id").primaryKey(),
  task_id: integer("task_id").references(() => tasks.id).notNull(),
  field_id: integer("field_id").references(() => cardFields.id).notNull(),
  response_value: text("response_value"),
  ai_suspicion_level: real("ai_suspicion_level").notNull().default(0),
  ai_reasoning: text("ai_reasoning"),  
  partial_risk_score: integer("partial_risk_score").notNull().default(0),
  status: text("status").$type<keyof typeof KYBFieldStatus>().notNull().default("empty"),
  version: integer("version").notNull().default(1),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const documentAnswers = pgTable("document_answers", {
  id: serial("id").primaryKey(),
  file_id: integer("file_id").references(() => files.id).notNull(),
  response_id: integer("response_id").references(() => cardResponses.id).notNull(),
  confidence_score: real("confidence_score").notNull().default(0),
  extracted_text: text("extracted_text").notNull(),
  page_number: integer("page_number"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Define the Security survey tables 
export const securityFields = pgTable("security_fields", {
  id: serial("id").primaryKey(),
  section: varchar("section", { length: 255 }).notNull(),
  field_key: varchar("field_key", { length: 255 }).notNull().unique(),
  label: text("label").notNull(),
  description: text("description"),
  field_type: varchar("field_type", { length: 50 }).notNull(),
  is_required: boolean("is_required").notNull().default(false),
  step_index: integer("step_index").notNull().default(0),
  options: jsonb("options"),
  validation_rules: jsonb("validation_rules"),
  metadata: jsonb("metadata"),
  status: varchar("status", { length: 50 }).notNull().default("ACTIVE"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at"),
});

export const securityResponses = pgTable("security_responses", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").references(() => companies.id).notNull(),
  field_id: integer("field_id").references(() => securityFields.id).notNull(),
  response: text("response"),
  metadata: jsonb("metadata"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at"),
});

/**
 * Table for tracking which tab tutorials a user has completed
 * This supports the feature that shows onboarding/tutorial modals
 * the first time a user visits each main tab.
 */
export const userTabTutorials = pgTable("user_tab_tutorials", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  tab_name: varchar("tab_name", { length: 50 }).notNull(),
  completed: boolean("completed").notNull().default(false),
  current_step: integer("current_step").notNull().default(0),
  last_seen_at: timestamp("last_seen_at"),
  completed_at: timestamp("completed_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Add Zod schemas for the user tab tutorials table
export const insertUserTabTutorialSchema = createInsertSchema(userTabTutorials, {
  tab_name: z.string().min(1).max(50),
  completed: z.boolean().default(false),
  current_step: z.number().int().nonnegative().default(0),
});

export const updateUserTabTutorialSchema = z.object({
  completed: z.boolean().optional(),
  current_step: z.number().int().nonnegative().optional(),
  last_seen_at: z.string().datetime().optional(),
});

export const selectUserTabTutorialSchema = createSelectSchema(userTabTutorials);

export type UserTabTutorial = z.infer<typeof selectUserTabTutorialSchema>;
export type NewUserTabTutorial = z.infer<typeof insertUserTabTutorialSchema>;

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.company_id],
    references: [companies.id],
  }),
  files: many(files),
  assignedTasks: many(tasks, { relationName: "assignedTasks" }),
  createdTasks: many(tasks, { relationName: "createdTasks" }),
  completedTabTutorials: many(userTabTutorials),
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

export const cardFieldsRelations = relations(cardFields, ({ many }) => ({
  responses: many(cardResponses)
}));

export const cardResponsesRelations = relations(cardResponses, ({ one }) => ({
  field: one(cardFields, {
    fields: [cardResponses.field_id],
    references: [cardFields.id]
  }),
  task: one(tasks, {
    fields: [cardResponses.task_id],
    references: [tasks.id]
  })
}));

export const securityFieldsRelations = relations(securityFields, ({ many }) => ({
  responses: many(securityResponses)
}));

// Claims Management Enums
export const ClaimStatus = {
  IN_REVIEW: 'in_review',
  PROCESSING: 'processing',
  PENDING_INFO: 'pending_info',
  UNDER_REVIEW: 'under_review',
  ESCALATED: 'escalated',
  APPROVED: 'approved',
  PARTIALLY_APPROVED: 'partially_approved',
  DENIED: 'denied'
} as const;

export type ClaimStatus = typeof ClaimStatus[keyof typeof ClaimStatus];

export const DisputeReasonType = {
  LIABILITY_DISPUTE: 'liability_dispute',
  DATA_OWNERSHIP_DISPUTE: 'data_ownership_dispute',
  BREACH_NOTIFICATION_TIMING: 'breach_notification_timing',
  POLICY_EXCLUSION: 'policy_exclusion',
  CONTRACT_VIOLATION: 'contract_violation'
} as const;

export type DisputeReasonType = typeof DisputeReasonType[keyof typeof DisputeReasonType];

export const ResolutionType = {
  FULL_PAYMENT: 'full_payment',
  PARTIAL_PAYMENT: 'partial_payment',
  POLICY_EXCLUSION: 'policy_exclusion',
  CLAIM_WITHDRAWN: 'claim_withdrawn'
} as const;

export type ResolutionType = typeof ResolutionType[keyof typeof ResolutionType];

// Claims Management Tables
export const claims = pgTable("claims", {
  id: serial("id").primaryKey(),
  claim_id: text("claim_id").notNull().unique(), // Format: CLM-YYYY-XXX
  bank_id: text("bank_id").notNull(),
  bank_name: text("bank_name").notNull(),
  fintech_name: text("fintech_name").notNull(),
  account_number: text("account_number"),
  claim_type: text("claim_type").notNull().default('PII Data Loss'),
  claim_date: timestamp("claim_date").notNull(),
  claim_amount: real("claim_amount").notNull().default(50.00),
  status: text("status").$type<ClaimStatus>().notNull().default(ClaimStatus.IN_REVIEW),
  policy_number: text("policy_number"),
  is_disputed: boolean("is_disputed").notNull().default(false),
  is_resolved: boolean("is_resolved").notNull().default(false),
  company_id: integer("company_id").references(() => companies.id).notNull(),
  created_by: integer("created_by").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});

export const claimBreaches = pgTable("claim_breaches", {
  id: serial("id").primaryKey(),
  claim_id: integer("claim_id").references(() => claims.id).notNull(),
  breach_date: timestamp("breach_date").notNull(),
  breach_discovered_date: timestamp("breach_discovered_date"),
  breach_reported_date: timestamp("breach_reported_date"),
  consent_id: text("consent_id"),
  consent_scope: text("consent_scope"),
  affected_records: integer("affected_records"),
  remediation_status: text("remediation_status"),
  incident_description: text("incident_description"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});

export const claimDisputes = pgTable("claim_disputes", {
  id: serial("id").primaryKey(),
  claim_id: integer("claim_id").references(() => claims.id).notNull(),
  dispute_reason: text("dispute_reason").$type<DisputeReasonType>(),
  dispute_details: text("dispute_details"),
  dispute_date: timestamp("dispute_date").notNull(),
  resolution_decision: text("resolution_decision"),
  bank_liable: boolean("bank_liable"),
  fintech_liable: boolean("fintech_liable"),
  shared_liability: boolean("shared_liability"),
  resolution_notes: text("resolution_notes"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});

export const claimResolutions = pgTable("claim_resolutions", {
  id: serial("id").primaryKey(),
  claim_id: integer("claim_id").references(() => claims.id).notNull(),
  resolution_type: text("resolution_type").$type<ResolutionType>(),
  resolution_date: timestamp("resolution_date").notNull(),
  payment_amount: real("payment_amount"),
  resolution_notes: text("resolution_notes"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});

// Claims Management Relations
export const claimsRelations = relations(claims, ({ one, many }) => ({
  company: one(companies, {
    fields: [claims.company_id],
    references: [companies.id],
  }),
  creator: one(users, {
    fields: [claims.created_by],
    references: [users.id],
  }),
  breach: many(claimBreaches),
  disputes: many(claimDisputes),
  resolutions: many(claimResolutions)
}));

export const claimBreachesRelations = relations(claimBreaches, ({ one }) => ({
  claim: one(claims, {
    fields: [claimBreaches.claim_id],
    references: [claims.id],
  })
}));

export const claimDisputesRelations = relations(claimDisputes, ({ one }) => ({
  claim: one(claims, {
    fields: [claimDisputes.claim_id],
    references: [claims.id],
  })
}));

export const claimResolutionsRelations = relations(claimResolutions, ({ one }) => ({
  claim: one(claims, {
    fields: [claimResolutions.claim_id],
    references: [claims.id],
  })
}));

export const securityResponsesRelations = relations(securityResponses, ({ one }) => ({
  field: one(securityFields, {
    fields: [securityResponses.field_id],
    references: [securityFields.id]
  }),
  company: one(companies, {
    fields: [securityResponses.company_id],
    references: [companies.id]
  })
}));

// Define the S&P KY3P Security Assessment tables
export const ky3pFields = pgTable("ky3p_fields", {
  id: serial("id").primaryKey(),
  order: integer("order").notNull(),
  field_key: text("field_key").notNull(),
  display_name: text("display_name").notNull(), // Renamed from label
  question: text("question").notNull(), // Renamed from description
  help_text: text("help_text"),
  demo_autofill: text("demo_autofill"),
  group: text("group").notNull(), // Renamed from section
  field_type: text("field_type").$type<keyof typeof KYBFieldType>().notNull(),
  required: boolean("required").notNull(), // Renamed from is_required
  answer_expectation: text("answer_expectation"),
  validation_type: text("validation_type"),
  phasing: text("phasing"),
  soc2_overlap: text("soc2_overlap"),
  validation_rules: text("validation_rules"),
  step_index: integer("step_index").default(0),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const ky3pResponses = pgTable("ky3p_responses", {
  id: serial("id").primaryKey(),
  task_id: integer("task_id").references(() => tasks.id).notNull(),
  field_id: integer("field_id").references(() => ky3pFields.id).notNull(),
  field_key: text("field_key"), // Added as part of KY3P unification with KYB and Open Banking
  response_value: text("response_value"),
  status: text("status").$type<keyof typeof KYBFieldStatus>().notNull().default('empty'),
  version: integer("version").notNull().default(1),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Define the 1033 Open Banking Survey tables
export const openBankingFields = pgTable("open_banking_fields", {
  id: serial("id").primaryKey(),
  order: integer("order").notNull(),
  field_key: text("field_key").notNull(),
  display_name: text("display_name").notNull(),
  question: text("question").notNull(),
  help_text: text("help_text"),
  demo_autofill: text("demo_autofill"),
  group: text("group").notNull(),
  field_type: text("field_type").$type<keyof typeof KYBFieldType>().notNull(),
  required: boolean("required").notNull().default(true),
  answer_expectation: text("answer_expectation"),
  validation_type: text("validation_type"),
  validation_rules: text("validation_rules"),
  step_index: integer("step_index").default(0),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const openBankingResponses = pgTable("open_banking_responses", {
  id: serial("id").primaryKey(),
  task_id: integer("task_id").references(() => tasks.id).notNull(),
  field_id: integer("field_id").references(() => openBankingFields.id).notNull(),
  response_value: text("response_value"),
  ai_suspicion_level: real("ai_suspicion_level").notNull().default(0),
  partial_risk_score: integer("partial_risk_score").notNull().default(0),
  reasoning: text("reasoning"),
  status: text("status").$type<keyof typeof KYBFieldStatus>().notNull().default('empty'),
  version: integer("version").notNull().default(1),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const ky3pFieldsRelations = relations(ky3pFields, ({ many }) => ({
  responses: many(ky3pResponses),
}));

export const ky3pResponsesRelations = relations(ky3pResponses, ({ one }) => ({
  field: one(ky3pFields, {
    fields: [ky3pResponses.field_id],
    references: [ky3pFields.id],
  }),
  task: one(tasks, {
    fields: [ky3pResponses.task_id],
    references: [tasks.id],
  }),
}));

export const openBankingFieldsRelations = relations(openBankingFields, ({ many }) => ({
  responses: many(openBankingResponses),
}));

export const openBankingResponsesRelations = relations(openBankingResponses, ({ one }) => ({
  field: one(openBankingFields, {
    fields: [openBankingResponses.field_id],
    references: [openBankingFields.id],
  }),
  task: one(tasks, {
    fields: [openBankingResponses.task_id],
    references: [tasks.id],
  }),
}));

export const filesRelations = relations(files, ({ one, many }) => ({
  user: one(users, {
    fields: [files.user_id],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [files.company_id],
    references: [companies.id],
  }),
  documentAnswers: many(documentAnswers),
}));

export const documentAnswersRelations = relations(documentAnswers, ({ one }) => ({
  file: one(files, {
    fields: [documentAnswers.file_id],
    references: [files.id],
  }),
  response: one(cardResponses, {
    fields: [documentAnswers.response_id],
    references: [cardResponses.id],
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
  task_type: z.enum(["user_onboarding", "file_request", "company_kyb", "security_assessment", "company_card", "compliance_and_risk"]),
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
    TaskStatus.PENDING,
    TaskStatus.NOT_STARTED,
    TaskStatus.EMAIL_SENT,
    TaskStatus.COMPLETED,
    TaskStatus.FAILED,
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
  } else if (data.task_type === "company_kyb" || data.task_type === "security_assessment" || data.task_type === "company_card" || data.task_type === "compliance_and_risk") {
    if (!data.company_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: data.task_type === "company_kyb" 
          ? "Company is required for KYB tasks"
          : data.task_type === "security_assessment"
          ? "Company is required for Security Assessment tasks"
          : data.task_type === "company_card"
          ? "Company is required for CARD tasks"
          : "Company is required for compliance tasks",
        path: ["company_id"],
      });
    }
    if (data.task_type === "company_card") {
      data.priority = "high";
      if (!data.due_date) {
        const twoWeeksFromNow = new Date();
        twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
        data.due_date = twoWeeksFromNow;
      }
    }
    if (data.task_type === "security_assessment") {
      data.priority = "medium";
      if (!data.due_date) {
        const threeWeeksFromNow = new Date();
        threeWeeksFromNow.setDate(threeWeeksFromNow.getDate() + 21);
        data.due_date = threeWeeksFromNow;
      }
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

export const insertCardFieldSchema = createInsertSchema(cardFields);
export const selectCardFieldSchema = createSelectSchema(cardFields);
export const insertCardResponseSchema = createInsertSchema(cardResponses);
export const selectCardResponseSchema = createSelectSchema(cardResponses);

export const insertDocumentAnswerSchema = createInsertSchema(documentAnswers);
export const selectDocumentAnswerSchema = createSelectSchema(documentAnswers);

export const insertSecurityFieldSchema = createInsertSchema(securityFields);
export const selectSecurityFieldSchema = createSelectSchema(securityFields);
export const insertSecurityResponseSchema = createInsertSchema(securityResponses);
export const selectSecurityResponseSchema = createSelectSchema(securityResponses);

// KY3P schemas
export const insertKy3pFieldSchema = createInsertSchema(ky3pFields);
export const selectKy3pFieldSchema = createSelectSchema(ky3pFields);
export const insertKy3pResponseSchema = createInsertSchema(ky3pResponses);
export const selectKy3pResponseSchema = createSelectSchema(ky3pResponses);

// Open Banking schemas
export const insertOpenBankingFieldSchema = createInsertSchema(openBankingFields);
export const selectOpenBankingFieldSchema = createSelectSchema(openBankingFields);
export const insertOpenBankingResponseSchema = createInsertSchema(openBankingResponses);
export const selectOpenBankingResponseSchema = createSelectSchema(openBankingResponses);

// Task template configuration tables
export const taskTemplates = pgTable("task_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  task_type: varchar("task_type", { length: 100 }).notNull().unique(),
  component_type: varchar("component_type", { length: 100 }).notNull().default('form'),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});

export const componentConfigurations = pgTable("component_configurations", {
  id: serial("id").primaryKey(),
  template_id: integer("template_id").references(() => taskTemplates.id).notNull(),
  config_key: varchar("config_key", { length: 100 }).notNull(),
  config_value: jsonb("config_value").$type<any>().notNull(),
  scope: varchar("scope", { length: 50 }).default('global'),
  scope_target: varchar("scope_target", { length: 255 }),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});

// Add relation for task to template mapping
export const taskToTemplateRelations = relations(tasks, ({ one }) => ({
  template: one(taskTemplates, {
    fields: [tasks.task_type],
    references: [taskTemplates.task_type]
  })
}));

// Add schemas for the new tables
export const insertTaskTemplateSchema = createInsertSchema(taskTemplates);
export const selectTaskTemplateSchema = createSelectSchema(taskTemplates);
export const insertComponentConfigSchema = createInsertSchema(componentConfigurations);
export const selectComponentConfigSchema = createSelectSchema(componentConfigurations);

export type InsertDocumentAnswer = typeof documentAnswers.$inferInsert;
export type SelectDocumentAnswer = typeof documentAnswers.$inferSelect;
export type InsertSecurityField = typeof securityFields.$inferInsert;
export type SelectSecurityField = typeof securityFields.$inferSelect;
export type InsertSecurityResponse = typeof securityResponses.$inferInsert;
export type SelectSecurityResponse = typeof securityResponses.$inferSelect;
export type InsertTaskTemplate = typeof taskTemplates.$inferInsert;
export type SelectTaskTemplate = typeof taskTemplates.$inferSelect;
export type InsertComponentConfig = typeof componentConfigurations.$inferInsert;
export type SelectComponentConfig = typeof componentConfigurations.$inferSelect;

// KY3P types
export type InsertKy3pField = typeof ky3pFields.$inferInsert;
export type SelectKy3pField = typeof ky3pFields.$inferSelect;
export type InsertKy3pResponse = typeof ky3pResponses.$inferInsert;
export type SelectKy3pResponse = typeof ky3pResponses.$inferSelect;

// Open Banking types
export type InsertOpenBankingField = typeof openBankingFields.$inferInsert;
export type SelectOpenBankingField = typeof openBankingFields.$inferSelect;
export type InsertOpenBankingResponse = typeof openBankingResponses.$inferInsert;
export type SelectOpenBankingResponse = typeof openBankingResponses.$inferSelect;