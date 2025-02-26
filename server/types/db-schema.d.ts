/**
 * Comprehensive type declarations for database schema
 * This addresses the imports from "../db" and related path issues
 */

declare module '../db' {
  import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
  
  export const db: PostgresJsDatabase<any>;
  export const pool: any;
  
  export const companies: any;
  export const users: any;
  export const relationships: any;
  export const documents: any;
  export const tasks: any;
  export const kybFields: any;
  export const kybResponses: any;
  export const kybFieldGroups: any;
  export const files: any;
  export const refreshTokens: any;
  export const userRoles: any;
  export const companyTypes: any;
  export const apiKeys: any;
  export const openaiSearchAnalytics: any;
  
  export const TaskStatus: {
    NOT_STARTED: 'not_started';
    IN_PROGRESS: 'in_progress';
    READY_FOR_SUBMISSION: 'ready_for_submission';
    SUBMITTED: 'submitted';
    APPROVED: 'approved';
    COMPLETED: 'completed';
    EMAIL_SENT: 'email_sent';
  };
  
  export type TaskStatusType = 
    | 'not_started' 
    | 'in_progress' 
    | 'ready_for_submission' 
    | 'submitted' 
    | 'approved' 
    | 'completed' 
    | 'email_sent';
    
  // Helper function to get all schemas
  export function getSchemas(): {
    companies: any;
    users: any;
    relationships: any;
    documents: any;
    tasks: any;
    kybFields: any;
    kybResponses: any;
    kybFieldGroups: any;
    files: any;
    refreshTokens: any;
    userRoles: any;
    companyTypes: any;
    apiKeys: any;
    openaiSearchAnalytics: any;
    TaskStatus: {
      NOT_STARTED: 'not_started';
      IN_PROGRESS: 'in_progress';
      READY_FOR_SUBMISSION: 'ready_for_submission';
      SUBMITTED: 'submitted';
      APPROVED: 'approved';
      COMPLETED: 'completed';
      EMAIL_SENT: 'email_sent';
    };
  };
}

// Add declarations for database-related model interfaces
interface KybField {
  id: number;
  field_key: string;
  field_type: string;
  order: number;
}

interface Company {
  id: number;
  name: string;
  available_tabs?: string[];
  metadata?: {
    statusFlow?: string[];
    [key: string]: any;
  };
}

interface Task {
  id: number;
  title: string;
  status: string;
  progress: number;
  company_id: number;
  created_by: number;
  metadata?: {
    statusFlow?: string[];
    [key: string]: any;
  };
} 