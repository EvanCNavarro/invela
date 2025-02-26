/**
 * Compiled JavaScript Module Declarations
 * 
 * This file provides type declarations for imports of compiled JavaScript files
 * from the dist directory to avoid TypeScript errors.
 */

declare module '../../dist/db/index.js' {
  export const pool: any;
  export const db: any;
  export default { pool, db };
}

declare module '../../dist/db/schema.js' {
  export const companies: any;
  export const users: any;
  export const relationships: any;
  export const documents: any;
  export const tasks: any;
  export const files: any;
  export const invitations: any;
  export const kybResponses: any;
  export const kybFields: any;
  export const refreshTokens: any;
  export const companyLogos: any;
  export const openaiSearchAnalytics: any;
  export const TaskStatus: {
    EMAIL_SENT: 'email_sent';
    COMPLETED: 'completed';
    NOT_STARTED: 'not_started';
    IN_PROGRESS: 'in_progress';
    READY_FOR_SUBMISSION: 'ready_for_submission';
    SUBMITTED: 'submitted';
    APPROVED: 'approved';
  };
  
  export type TaskStatus = 'email_sent' | 'completed' | 'not_started' | 'in_progress' | 
                          'ready_for_submission' | 'submitted' | 'approved';
} 