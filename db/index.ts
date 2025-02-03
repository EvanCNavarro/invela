import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "./schema";

neonConfig.webSocketConstructor = ws;

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
  retryInterval: 100, // Time between connection retries
  maxRetries: 3 // Maximum number of connection retries
});

// Add event listeners for connection issues
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', (client) => {
  console.log('New client connected to the pool');
});

// Create the drizzle db instance with the configured pool
export const db = drizzle({ client: pool, schema });

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Closing pool...');
  await pool.end();
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT. Closing pool...');
  await pool.end();
});