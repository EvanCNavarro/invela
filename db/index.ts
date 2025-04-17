import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "./schema";
import * as timestampSchema from "./schema-timestamps";

neonConfig.webSocketConstructor = ws;

// Connection pooling optimization to reduce the number of connections
const MAX_CONNECTION_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const POOL_SIZE = 3; // Further reduced pool size to minimize connection messages
const IDLE_TIMEOUT = 60000; // Extended to 60 seconds to significantly reduce connection churn
const MAX_USES = 7500; // Increased to reduce connection reuse frequency
const CONNECTION_TIMEOUT = 60000; // Increased connection timeout to avoid quick timeouts

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure the pool with optimized settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: POOL_SIZE,
  idleTimeoutMillis: IDLE_TIMEOUT,
  connectionTimeoutMillis: CONNECTION_TIMEOUT,
  maxUses: MAX_USES,
});

let retryCount = 0;

// Enhanced error handling for the connection pool
pool.on('error', (err, client) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] Database pool error:`, {
    message: err.message,
    stack: err.stack,
  });

  // Attempt to reconnect if it's a connection error
  if (err.message.includes('connection') || err.message.includes('timeout')) {
    if (retryCount < MAX_CONNECTION_RETRIES) {
      retryCount++;
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount - 1);
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${retryCount}/${MAX_CONNECTION_RETRIES})`);

      setTimeout(async () => {
        try {
          await client.connect();
          console.log('Successfully reconnected to database');
          retryCount = 0;
        } catch (error) {
          const reconnectError = error as Error;
          console.error('Failed to reconnect:', reconnectError.message);
        }
      }, delay);
    } else {
      console.error('Maximum connection retry attempts reached');
    }
  }
});

// Further reduced connection logging - only log first few connections and errors
let connectCount = 0;
const MAX_CONNECT_LOGS = 3; // Only log the first 3 connections

pool.on('connect', (client) => {
  if (connectCount < MAX_CONNECT_LOGS) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] New client connected to the pool (${connectCount + 1}/${POOL_SIZE})`);
    connectCount++;
  } else if (connectCount === MAX_CONNECT_LOGS) {
    console.log(`Suppressing further connection logs. Pool size: ${POOL_SIZE}`);
    connectCount++;
  }
  retryCount = 0;
});

// Only enable detailed pool logging in development and when explicitly requested
if (process.env.NODE_ENV === 'development' && process.env.DEBUG_POOL === 'true') {
  pool.on('acquire', () => {
    console.debug('Client acquired from pool');
  });

  pool.on('remove', () => {
    console.debug('Client removed from pool');
  });
}

// Create the drizzle db instance with the configured pool
// Combine schema objects to include timestamp-related tables
const combinedSchema = {
  ...schema,
  ...timestampSchema
};

export const db = drizzle({ client: pool, schema: combinedSchema });

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