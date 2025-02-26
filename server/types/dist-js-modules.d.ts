/**
 * Type declarations for compiled JavaScript modules in the dist directory
 */

declare module '../../dist/db/index.js' {
  import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
  import * as schema from '../../dist/db/schema.js';
  
  export const db: PostgresJsDatabase<typeof schema>;
  export const pool: any;
  export default { db, pool };
}

declare module '../../dist/db/schema.js' {
  // Table exports
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
  
  // Enum values
  export const TaskStatus: {
    NOT_STARTED: 'not_started';
    IN_PROGRESS: 'in_progress';
    READY_FOR_SUBMISSION: 'ready_for_submission';
    SUBMITTED: 'submitted';
    APPROVED: 'approved';
    COMPLETED: 'completed';
    EMAIL_SENT: 'email_sent';
  };
  
  // Type exports
  export type TaskStatusType = 
    | 'not_started' 
    | 'in_progress' 
    | 'ready_for_submission' 
    | 'submitted' 
    | 'approved' 
    | 'completed' 
    | 'email_sent';
} 