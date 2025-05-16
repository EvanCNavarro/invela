import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "./schema";
import * as timestampSchema from "./schema-timestamps";

neonConfig.webSocketConstructor = ws;

// Emergency connection settings to prevent rate limits on Neon PostgreSQL
// These settings are aggressive but necessary for stability
// Single connection with long timeouts and infrequent recycling
const MAX_CONNECTION_RETRIES = 10; // Maximum retries for connection failures
const INITIAL_RETRY_DELAY = 5000; // 5 seconds initial delay before retry
const POOL_SIZE = 1; // Absolute minimum pool size - single connection only
const IDLE_TIMEOUT = 600000; // 10 minutes idle timeout to prevent recycling
const MAX_USES = 50000; // Very high use count before recycling
const CONNECTION_TIMEOUT = 180000; // 3 minutes connection timeout
const RATE_LIMIT_BACKOFF = 15000; // 15 second backoff for rate limit errors

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

// Enhanced error handling for the connection pool with rate limit handling
pool.on('error', (err, client) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] Database pool error:`, {
    message: err.message,
    stack: err.stack,
  });

  // Special handling for rate limit errors
  if (err.message.includes('rate limit') || err.message.includes('exceeded the rate limit')) {
    console.warn(`[${timestamp}] Rate limit exceeded. Backing off for ${RATE_LIMIT_BACKOFF}ms`);
    // Use a longer backoff for rate limit errors
    setTimeout(async () => {
      try {
        await client.connect();
        console.log('Successfully reconnected after rate limit backoff');
      } catch (error) {
        const reconnectError = error as Error;
        console.error('Failed to reconnect after rate limit backoff:', reconnectError.message);
      }
    }, RATE_LIMIT_BACKOFF);
    return;
  }

  // Attempt to reconnect if it's a connection error
  if (err.message.includes('connection') || err.message.includes('timeout')) {
    if (retryCount < MAX_CONNECTION_RETRIES) {
      retryCount++;
      // Use exponential backoff with jitter to avoid thundering herd issues
      const basedelay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount - 1);
      const jitter = Math.floor(Math.random() * 1000); // Add up to 1s of jitter
      const delay = basedelay + jitter;
      
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