/**
 * Type declarations for database module imports
 * This file provides type declarations for imports from the @db module
 */

declare module '@db' {
  import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
  import * as schema from '../../dist/db/schema.js';
  
  export const db: PostgresJsDatabase<typeof schema>;
  export const pool: any;
  export const getSchemas: () => typeof schema & {
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