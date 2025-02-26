import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "./schema";
import {
  createNeonPool,
  executeWithRetry,
  queryWithRetry,
  shutdownPool,
  NEON_CONFIG
} from './neon-utils';

// Configure WebSockets for Neon
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create an optimized Neon pool with pre-configured settings
export const pool = createNeonPool(process.env.DATABASE_URL);

// Create the drizzle db instance with the configured pool
export const db = drizzle({ client: pool, schema });

/**
 * Execute a query using retry logic specifically optimized for Neon
 * This is recommended for important operations that should be resilient to Neon's cold starts
 */
export async function executeWithNeonRetry<T>(
  queryFn: (client: any) => Promise<T>
): Promise<T> {
  return executeWithRetry(pool, queryFn);
}

/**
 * Simple query execution with built-in retry logic
 * Useful for straightforward queries that need resilience against cold starts
 */
export async function queryWithNeonRetry<T>(
  queryText: string,
  params: any[] = []
): Promise<T> {
  return queryWithRetry(pool, queryText, params);
}

/**
 * Helper to check connection health
 * Useful to proactively detect and handle connection issues
 */
export async function checkDatabaseHealth(): Promise<{ isHealthy: boolean, message: string }> {
  try {
    await queryWithNeonRetry('SELECT 1 as health_check');
    return { isHealthy: true, message: 'Database connection is healthy' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { 
      isHealthy: false, 
      message: `Database connection check failed: ${errorMessage}`
    };
  }
}

// Graceful shutdown handler with improved error handling
async function handleShutdown(signal: string) {
  console.log(`Received ${signal}. Closing pool...`);
  try {
    await shutdownPool(pool);
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