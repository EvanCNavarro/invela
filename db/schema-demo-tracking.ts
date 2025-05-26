/**
 * ========================================
 * Demo Tracking Schema Enhancement
 * ========================================
 * 
 * Enhanced demo tracking system for comprehensive identification and management
 * of demo-created entities across the platform. Enables bulk cleanup and 
 * session-based grouping of demo data.
 * 
 * Key Features:
 * - Session-based grouping for related demo entities
 * - Timestamp tracking for age-based cleanup
 * - Clear separation between demo and production data
 * - Bulk operation support for demo data management
 * 
 * @module db/schema-demo-tracking
 * @version 1.0.0
 * @since 2025-05-26
 */

import { pgTable, text, timestamp, boolean, bigint } from "drizzle-orm/pg-core";

// ========================================
// DEMO SESSION TRACKING
// ========================================

/**
 * Demo sessions table - tracks individual demo creation sessions
 * Each demo flow creates a unique session that groups related entities
 */
export const demoSessions = pgTable("demo_sessions", {
  // Unique session identifier (UUID format)
  session_id: text("session_id").primaryKey(),
  
  // Demo flow metadata
  persona_type: text("persona_type").notNull(), // 'new-data-recipient', 'accredited-data-recipient', etc.
  user_agent: text("user_agent"), // Browser/device info for analytics
  ip_address: text("ip_address"), // Source IP for geo tracking
  
  // Session lifecycle tracking
  created_at: timestamp("created_at").defaultNow().notNull(),
  completed_at: timestamp("completed_at"), // When demo flow finished successfully
  expires_at: timestamp("expires_at").notNull(), // Auto-cleanup timestamp
  
  // Session status
  status: text("status").notNull().default('active'), // 'active', 'completed', 'abandoned', 'expired'
  
  // Metrics and analytics
  entities_created: text("entities_created").array().default([]), // ['company_id:123', 'user_id:456']
  flow_duration_ms: bigint("flow_duration_ms", { mode: 'number' }), // Time to complete demo
  
  // Cleanup metadata
  cleanup_scheduled: boolean("cleanup_scheduled").default(false),
  cleanup_attempted_at: timestamp("cleanup_attempted_at"),
  cleanup_completed_at: timestamp("cleanup_completed_at"),
});

// ========================================
// ENHANCED COMPANIES TABLE FIELDS
// ========================================

/**
 * Additional demo tracking fields for companies table
 * These fields enhance the existing is_demo boolean with detailed tracking
 */
export const companiesDemoFields = {
  // Enhanced demo identification
  is_demo: boolean("is_demo").default(false), // Keep existing field
  demo_session_id: text("demo_session_id"), // Links to demo_sessions.session_id
  demo_created_at: timestamp("demo_created_at"), // When created via demo flow
  demo_persona_type: text("demo_persona_type"), // What persona type created this
  
  // Demo lifecycle management
  demo_expires_at: timestamp("demo_expires_at"), // Auto-cleanup timestamp
  demo_cleanup_eligible: boolean("demo_cleanup_eligible").default(true), // Can be auto-deleted
};

// ========================================
// ENHANCED USERS TABLE FIELDS  
// ========================================

/**
 * Additional demo tracking fields for users table
 * Provides comprehensive demo user identification and management
 */
export const usersDemoFields = {
  // Enhanced demo identification
  is_demo_user: boolean("is_demo_user").default(false), // New explicit demo flag
  demo_session_id: text("demo_session_id"), // Links to demo_sessions.session_id
  demo_created_at: timestamp("demo_created_at"), // When created via demo flow
  demo_persona_type: text("demo_persona_type"), // What persona type created this
  
  // Demo user lifecycle
  demo_expires_at: timestamp("demo_expires_at"), // Auto-cleanup timestamp
  demo_cleanup_eligible: boolean("demo_cleanup_eligible").default(true), // Can be auto-deleted
  demo_last_login: timestamp("demo_last_login"), // Track demo user activity
};

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Demo session status enumeration
 */
export const DemoSessionStatus = {
  ACTIVE: 'active',
  COMPLETED: 'completed', 
  ABANDONED: 'abandoned',
  EXPIRED: 'expired',
  CLEANUP_PENDING: 'cleanup_pending',
  CLEANUP_COMPLETED: 'cleanup_completed'
} as const;

export type DemoSessionStatus = typeof DemoSessionStatus[keyof typeof DemoSessionStatus];

/**
 * Demo persona types matching frontend definitions
 */
export const DemoPersonaType = {
  NEW_DATA_RECIPIENT: 'new-data-recipient',
  ACCREDITED_DATA_RECIPIENT: 'accredited-data-recipient', 
  DATA_PROVIDER: 'data-provider',
  INVELA_ADMIN: 'invela-admin'
} as const;

export type DemoPersonaType = typeof DemoPersonaType[keyof typeof DemoPersonaType];

/**
 * Demo session creation payload
 */
export interface CreateDemoSessionPayload {
  personaType: DemoPersonaType;
  userAgent?: string;
  ipAddress?: string;
  expirationHours?: number; // Default 72 hours
}

/**
 * Demo entity identification
 */
export interface DemoEntityReference {
  type: 'company' | 'user' | 'task' | 'file';
  id: number | string;
  sessionId: string;
  createdAt: Date;
}

// ========================================
// UTILITY CONSTANTS
// ========================================

/**
 * Default demo data retention periods
 */
export const DEMO_RETENTION_CONFIG = {
  DEFAULT_EXPIRATION_HOURS: 72, // 3 days
  EXTENDED_EXPIRATION_HOURS: 168, // 7 days for important demos
  CLEANUP_BATCH_SIZE: 50, // Process cleanup in batches
  CLEANUP_INTERVAL_HOURS: 24, // Run cleanup daily
} as const;

/**
 * Demo tracking metadata templates
 */
export const DEMO_METADATA_TEMPLATES = {
  SESSION_START: {
    event: 'demo_session_started',
    timestamp: () => new Date().toISOString(),
  },
  SESSION_COMPLETE: {
    event: 'demo_session_completed',
    timestamp: () => new Date().toISOString(),
  },
  ENTITY_CREATED: {
    event: 'demo_entity_created',
    timestamp: () => new Date().toISOString(),
  },
} as const;

export default {
  demoSessions,
  companiesDemoFields,
  usersDemoFields,
  DemoSessionStatus,
  DemoPersonaType,
  DEMO_RETENTION_CONFIG,
  DEMO_METADATA_TEMPLATES,
};