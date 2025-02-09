import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "./schema";

neonConfig.webSocketConstructor = ws;

const MAX_CONNECTION_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure the pool with proper settings for Neon's serverless environment
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 10000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 30000, // Maximum time to wait for a connection
  maxUses: 7500, // Maximum number of times a client can be reused
});

let retryCount = 0;

// Enhanced error handling for the connection pool
pool.on('error', (err, client) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] Database pool error:`, {
    error: err.message,
    stack: err.stack,
    code: err.code,
    detail: err.detail
  });

  // Attempt to reconnect if it's a connection error
  if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
    if (retryCount < MAX_CONNECTION_RETRIES) {
      retryCount++;
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount - 1);
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${retryCount}/${MAX_CONNECTION_RETRIES})`);

      setTimeout(async () => {
        try {
          await client.connect();
          console.log('Successfully reconnected to database');
          retryCount = 0;
        } catch (reconnectError) {
          console.error('Failed to reconnect:', reconnectError);
        }
      }, delay);
    } else {
      console.error('Maximum connection retry attempts reached');
    }
  }
});

// Connection monitoring
pool.on('connect', (client) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] New client connected to the pool`);
  retryCount = 0; // Reset retry counter on successful connection
});

pool.on('acquire', () => {
  console.debug('Client acquired from pool');
});

pool.on('remove', () => {
  console.debug('Client removed from pool');
});

// Create the drizzle db instance with the configured pool
export const db = drizzle({ client: pool, schema });

// Graceful shutdown handler with improved error handling
async function handleShutdown(signal: string) {
  console.log(`Received ${signal}. Closing pool...`);
  try {
    await pool.end();
    console.log('Database pool closed successfully');
  } catch (error) {
    console.error('Error closing database pool:', error);
    process.exit(1);
  }
  process.exit(0);
}

// Register shutdown handlers
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Handle uncaught promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});