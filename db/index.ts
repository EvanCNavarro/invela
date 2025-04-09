import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "./schema";

neonConfig.webSocketConstructor = ws;

const MAX_CONNECTION_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const POOL_SIZE = 5; // Reduced from 10 to minimize excessive connections
const IDLE_TIMEOUT = 30000; // Increased from 10000 to reduce connection churn
const MAX_USES = 5000; // Reduced from 7500 for better connection lifecycle

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
  connectionTimeoutMillis: 30000,
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

// Reduced noise in connection monitoring
pool.on('connect', (client) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] New client connected to the pool`);
  retryCount = 0;
});

// Only log pool events in development
if (process.env.NODE_ENV === 'development') {
  pool.on('acquire', () => {
    console.debug('Client acquired from pool');
  });

  pool.on('remove', () => {
    console.debug('Client removed from pool');
  });
}

// Create the drizzle db instance with the configured pool
export const db = drizzle({ client: pool, schema });

// Import migrations
import { runMigrations } from './migrations';

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

// Migrations have already been applied successfully to the database,
// so we're disabling automatic migrations on startup to prevent issues.
console.log('Database migrations are disabled on startup - use the CLI tool to run migrations if needed.');

// If you need to run migrations manually, use:
// npx tsx run-migrations.ts