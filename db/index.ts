import { neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "./schema";
import * as timestampSchema from "./schema-timestamps";
import { logger } from '../server/utils/logger';
import { neonConnection } from '../server/services/neon-connection-service';

// Set up websocket constructor for Neon Serverless
neonConfig.webSocketConstructor = ws;

// Create a dedicated logger for database operations
const dbLogger = logger.child({ module: 'Database' });

// Check for DATABASE_URL environment variable
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

dbLogger.info('Initializing database connection service with optimized settings');

// Initialize the Neon Connection Service
// This service will be used for all database operations, managing the
// single persistent connection and handling rate limits intelligently
(async () => {
  try {
    await neonConnection.initialize(process.env.DATABASE_URL);
    dbLogger.info('Neon Connection Service initialized successfully');
  } catch (error) {
    dbLogger.error('Failed to initialize Neon Connection Service:', error);
  }
})();

// Create the drizzle db instance with the specialized Neon connection
// Combine schema objects to include timestamp-related tables
const combinedSchema = {
  ...schema,
  ...timestampSchema
};

// Create a lightweight wrapper around our specialized connection manager
// that maintains the existing drizzle API interface while using our 
// improved connection management under the hood
export const db = drizzle(neonConnection as any, { schema: combinedSchema });

// Re-export pool (for compatibility with code that uses it)
// This is a "fake" pool that forwards to our connection service
export const pool = {
  connect: async () => neonConnection.getClient(),
  end: async () => neonConnection.shutdown(),
};

// Migrations removed - database schema already established

// Graceful shutdown handler with improved error handling
async function handleShutdown(signal: string) {
  console.log(`Received ${signal}. Closing pool...`);
  try {
    await pool.end();
    console.log('Database pool closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error closing database pool:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Handle uncaught promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

// Migrations are no longer automatically run on startup.
// The database schema is already set up, so there's no need to run migrations each time.
// 
// If you need to run migrations manually, use:
//   npm run migrations
// 
// Or import and call runMigrations() directly from another script.
console.log('Database migrations disabled - schema already applied');