import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "./schema";
import * as timestampSchema from "./schema-timestamps";
import { logger } from '../server/utils/logger';

// Create a dedicated logger for database operations
const dbLogger = logger.child({ module: 'Database' });

// Check for DATABASE_URL environment variable
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Connection settings optimized for Neon PostgreSQL's serverless architecture
// These settings are designed to handle the unique behavior of Neon
// including control plane rate limiting and connection pooling
const POOL_SIZE = 3; // Small but sufficient pool size to reduce connection overhead
const IDLE_TIMEOUT = 600000; // 10 minutes idle timeout
const CONNECTION_TIMEOUT = 180000; // 3 minutes connection timeout

dbLogger.info('Initializing database connection with optimized settings for Neon PostgreSQL');

// Configure the pool with optimized settings for Neon
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: POOL_SIZE,
  idleTimeoutMillis: IDLE_TIMEOUT,
  connectionTimeoutMillis: CONNECTION_TIMEOUT,
  allowExitOnIdle: false
});

// Add connection events with proper error handling
pool.on('error', (err) => {
  // Log the error but don't try to reconnect immediately
  // This prevents cascading failures with Neon's rate limits
  dbLogger.error('Database pool error:', {
    message: err.message,
    code: (err as any).code,
    stack: err.stack
  });
  
  // Check if this is a rate limit error
  if (err.message.includes('rate limit') || 
      err.message.includes('too many connections') ||
      err.message.includes('connection terminated')) {
    dbLogger.warn('Detected rate limiting or connection issue with Neon PostgreSQL');
  }
});

// Add connect event for monitoring
pool.on('connect', (client) => {
  dbLogger.info('New database connection established');
  
  // Add per-client error handler
  client.on('error', (err) => {
    dbLogger.error('Client-specific error:', {
      message: err.message,
      code: (err as any).code
    });
  });
});

// Combine schema objects to include all tables
const combinedSchema = {
  ...schema,
  ...timestampSchema
};

// Create the drizzle ORM instance with our pool
export const db = drizzle(pool, { schema: combinedSchema });

// Graceful shutdown handler
async function handleShutdown(signal: string) {
  console.log(`Received ${signal}. Closing database pool...`);
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

// Database migrations disabled - schema already established
console.log('Database migrations disabled - schema already applied');