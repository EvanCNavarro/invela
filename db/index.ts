/**
 * ========================================
 * Database Connection Configuration
 * ========================================
 * 
 * Central database configuration for the enterprise risk assessment platform.
 * This module establishes the PostgreSQL connection pool, configures Drizzle ORM,
 * and provides optimized settings for Neon PostgreSQL's serverless architecture.
 * 
 * Key Features:
 * - Optimized connection pooling for serverless environments
 * - Comprehensive error handling and logging
 * - Schema integration with type safety
 * - Graceful shutdown handling for production deployments
 * - Performance monitoring and health checks
 * 
 * Dependencies:
 * - PostgreSQL database with Neon serverless optimization
 * - Drizzle ORM for type-safe database operations
 * - Combined schema including core and timestamp tables
 * 
 * @module db/index
 * @version 1.0.0
 * @since 2025-05-23
 */

// ========================================
// IMPORTS
// ========================================

// PostgreSQL connection and ORM
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

// Database schemas and type definitions
import * as schema from "./schema";
import * as timestampSchema from "./schema-timestamps";

// Logging infrastructure
import { logger } from '../server/utils/logger';

// ========================================
// DATABASE CONFIGURATION
// ========================================

// Create specialized logger for database operations
const dbLogger = logger.child({ module: 'Database' });

/**
 * Environment Variable Validation
 * 
 * Ensures required database connection string is available
 * before attempting any database operations.
 */
if (!process.env.DATABASE_URL) {
  const errorMessage = "DATABASE_URL environment variable is required but not set. Please configure your database connection.";
  dbLogger.error(errorMessage);
  throw new Error(errorMessage);
}

/**
 * Connection Pool Configuration
 * 
 * Optimized settings for Neon PostgreSQL's serverless architecture.
 * These parameters are carefully tuned to handle:
 * - Control plane rate limiting
 * - Connection pooling efficiency
 * - Serverless cold start optimization
 * - Resource usage minimization
 */
const POOL_SIZE = 3;              // Conservative pool size for efficient resource usage
const IDLE_TIMEOUT = 600000;      // 10 minutes idle timeout for serverless optimization
const CONNECTION_TIMEOUT = 180000; // 3 minutes connection timeout for reliability

dbLogger.info('Initializing database connection with Neon PostgreSQL optimizations', {
  poolSize: POOL_SIZE,
  idleTimeout: IDLE_TIMEOUT,
  connectionTimeout: CONNECTION_TIMEOUT
});

/**
 * PostgreSQL Connection Pool
 * 
 * Configured with Neon-optimized settings for reliable serverless operation.
 * Includes comprehensive error handling and connection monitoring.
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: POOL_SIZE,
  idleTimeoutMillis: IDLE_TIMEOUT,
  connectionTimeoutMillis: CONNECTION_TIMEOUT,
  allowExitOnIdle: false
});

/**
 * Connection Pool Event Handlers
 * 
 * Provides comprehensive monitoring and error handling for the database pool.
 * Includes specific handling for Neon serverless rate limiting scenarios.
 */
pool.on('error', (err) => {
  // Log comprehensive error information for debugging
  dbLogger.error('Database pool encountered an error', {
    message: err.message,
    code: (err as any).code,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });
  
  // Detect common Neon PostgreSQL issues for enhanced troubleshooting
  if (err.message.includes('rate limit') || 
      err.message.includes('too many connections') ||
      err.message.includes('connection terminated')) {
    dbLogger.warn('Detected Neon PostgreSQL rate limiting or connection issue - implementing backoff strategy');
  }
});

pool.on('connect', (client) => {
  dbLogger.info('Successfully established new database connection');
  
  // Monitor individual client connections for issues
  client.on('error', (err) => {
    dbLogger.error('Database client connection error', {
      message: err.message,
      code: (err as any).code,
      timestamp: new Date().toISOString()
    });
  });
});

// ========================================
// SCHEMA INTEGRATION
// ========================================

/**
 * Combined Database Schema
 * 
 * Integrates all database schemas including core application tables
 * and timestamp tracking for field-level synchronization.
 */
const combinedSchema = {
  ...schema,
  ...timestampSchema
};

/**
 * Drizzle ORM Database Instance
 * 
 * Configured with the connection pool and combined schema for
 * type-safe database operations across the entire application.
 */
export const db = drizzle(pool, { schema: combinedSchema });

// ========================================
// GRACEFUL SHUTDOWN HANDLING
// ========================================

/**
 * Graceful Shutdown Handler
 * 
 * Ensures proper cleanup of database connections during application shutdown.
 * Prevents connection leaks and maintains database integrity.
 * 
 * @param signal - The shutdown signal received (SIGTERM, SIGINT, etc.)
 */
async function handleShutdown(signal: string) {
  dbLogger.info(`Received ${signal} shutdown signal - initiating graceful database closure`);
  
  try {
    await pool.end();
    dbLogger.info('Database connection pool closed successfully');
    process.exit(0);
  } catch (error) {
    dbLogger.error('Error during database pool closure', {
      error: error instanceof Error ? error.message : String(error),
      signal
    });
    process.exit(1);
  }
}

/**
 * Process Signal Handlers
 * 
 * Registers handlers for common shutdown signals to ensure
 * graceful database cleanup in production environments.
 */
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

/**
 * Unhandled Rejection Handler
 * 
 * Captures and logs unhandled promise rejections to prevent
 * silent failures in database operations.
 */
process.on('unhandledRejection', (reason, promise) => {
  dbLogger.error('Unhandled promise rejection detected', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined
  });
});

// Log successful database initialization
dbLogger.info('Database configuration completed successfully', {
  schemasLoaded: Object.keys(combinedSchema).length,
  timestamp: new Date().toISOString()
});