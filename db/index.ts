/**
 * Database Connection Manager - Core database initialization and connection pooling
 * 
 * Establishes and manages PostgreSQL database connections using Drizzle ORM with
 * optimized settings for Neon PostgreSQL's serverless architecture. Includes
 * comprehensive error handling, connection monitoring, graceful shutdown procedures,
 * and combined schema management for all application data models.
 */

// ========================================
// IMPORTS
// ========================================

// External library imports (alphabetical)
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// Internal absolute path imports (alphabetical)
import { logger } from '../server/utils/logger';

// Relative imports (alphabetical)
import * as schema from "./schema";
import * as timestampSchema from "./schema-timestamps";

// ========================================
// CONSTANTS
// ========================================

/**
 * Database connection pool configuration optimized for Neon PostgreSQL
 * Small pool size reduces connection overhead while maintaining performance
 */
const DATABASE_CONNECTION_CONFIG = {
  POOL_SIZE: 3,                    // Small but sufficient for serverless architecture
  IDLE_TIMEOUT_MS: 600000,         // 10 minutes idle timeout for connection cleanup
  CONNECTION_TIMEOUT_MS: 180000,   // 3 minutes connection timeout for reliability
  ALLOW_EXIT_ON_IDLE: false        // Prevent premature pool termination
} as const;

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Combined database schema type including all application tables
 * Merges main schema with timestamp tracking schema
 */
type CombinedDatabaseSchema = typeof schema & typeof timestampSchema;

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Validate that required database environment variables are present
 * 
 * @throws {Error} When DATABASE_URL environment variable is not set
 */
function validateDatabaseEnvironment(): void {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?"
    );
  }
}

/**
 * Handle graceful database connection shutdown
 * 
 * @param signal - The system signal that triggered shutdown
 * @returns Promise that resolves when shutdown completes
 * 
 * @throws {Error} When database pool closure fails
 */
async function handleDatabaseShutdown(signal: string): Promise<void> {
  databaseLogger.info(`Received ${signal}. Closing database pool...`);
  try {
    await pool.end();
    databaseLogger.info('Database pool closed successfully');
    process.exit(0);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    databaseLogger.error(`Error closing database pool: ${errorMessage}`);
    process.exit(1);
  }
}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

// Validate environment before proceeding
validateDatabaseEnvironment();

/**
 * Dedicated logger instance for database operations
 * Provides structured logging with database-specific context
 */
const databaseLogger = logger.child({ module: 'Database' });

databaseLogger.info('Initializing database connection with optimized settings for Neon PostgreSQL');

/**
 * PostgreSQL connection pool configured for Neon serverless architecture
 * 
 * Optimized settings handle Neon's unique behavior including control plane
 * rate limiting and connection pooling requirements for production stability.
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: DATABASE_CONNECTION_CONFIG.POOL_SIZE,
  idleTimeoutMillis: DATABASE_CONNECTION_CONFIG.IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: DATABASE_CONNECTION_CONFIG.CONNECTION_TIMEOUT_MS,
  allowExitOnIdle: DATABASE_CONNECTION_CONFIG.ALLOW_EXIT_ON_IDLE
});

/**
 * Set up comprehensive connection pool error monitoring
 * Handles rate limiting and connection issues specific to Neon PostgreSQL
 */
pool.on('error', (errorEvent) => {
  // Log error with structured information for debugging
  databaseLogger.error('Database pool error detected:', {
    message: errorEvent.message,
    code: (errorEvent as any).code,
    stack: errorEvent.stack
  });
  
  // Detect and handle Neon-specific rate limiting scenarios
  if (errorEvent.message.includes('rate limit') || 
      errorEvent.message.includes('too many connections') ||
      errorEvent.message.includes('connection terminated')) {
    databaseLogger.warn('Detected rate limiting or connection issue with Neon PostgreSQL');
  }
});

/**
 * Monitor successful database connections for debugging and metrics
 * Adds per-client error handling for comprehensive error tracking
 */
pool.on('connect', (connectedClient) => {
  databaseLogger.info('New database connection established');
  
  // Add individual client error monitoring
  connectedClient.on('error', (clientError) => {
    databaseLogger.error('Client-specific error detected:', {
      message: clientError.message,
      code: (clientError as any).code
    });
  });
});

/**
 * Combined database schema including all application tables
 * Merges main schema with timestamp tracking for comprehensive data access
 */
const combinedDatabaseSchema: CombinedDatabaseSchema = {
  ...schema,
  ...timestampSchema
};

/**
 * Drizzle ORM instance configured with connection pool and combined schema
 * Provides type-safe database operations across all application tables
 */
export const db = drizzle(pool, { schema: combinedDatabaseSchema });

// ========================================
// PROCESS LIFECYCLE MANAGEMENT
// ========================================

// Register graceful shutdown handlers for production reliability
process.on('SIGTERM', () => handleDatabaseShutdown('SIGTERM'));
process.on('SIGINT', () => handleDatabaseShutdown('SIGINT'));

/**
 * Handle unhandled promise rejections to prevent silent failures
 * Logs rejections for debugging while maintaining application stability
 */
process.on('unhandledRejection', (rejectionReason, rejectedPromise) => {
  databaseLogger.error('Unhandled Promise Rejection detected:', {
    reason: rejectionReason,
    promise: rejectedPromise
  });
});

databaseLogger.info('Database connection manager initialization complete');

// ========================================
// EXPORTS
// ========================================

export { 
  db as default,
  combinedDatabaseSchema as schema
};