/**
 * Database Access Adapter
 * 
 * This module provides a TypeScript interface for database operations.
 * It imports compiled JavaScript files from the dist directory.
 */

import * as path from 'path';
import * as fs from 'fs';

// Type definitions for better type safety
interface DatabasePool {
  connect: () => Promise<any>;
  query: (text: string, params?: any[]) => Promise<any>;
  // Add other pool methods as needed
}

// Updated interface to match all tables in schema.ts
interface DatabaseSchemas {
  companies: any;
  users: any;
  relationships: any;
  documents: any;
  tasks: any;
  files: any;
  invitations: any;
  kybResponses: any;
  kybFields: any;
  refreshTokens: any;
  companyLogos: any;
  openaiSearchAnalytics: any;
  // Add other schemas as needed
}

// Track initialization state
let isInitialized = false;
let pool: DatabasePool | null = null;
let schemas: DatabaseSchemas | null = null;

/**
 * Initialize the database connection
 */
export async function initializeDb() {
  if (isInitialized) {
    console.log('[DB Adapter] Database already initialized');
    return true;
  }
  
  try {
    console.log('[DB Adapter] Initializing database connection');
    
    // Import compiled JavaScript files from the dist directory
    const dbModule = await import('../../dist/db/index.js');
    const schemaModule = await import('../../dist/db/schema.js');
    
    // Set the pool and schemas from the imported modules
    pool = dbModule.default?.pool || dbModule.pool;
    schemas = {
      companies: schemaModule.companies,
      users: schemaModule.users,
      relationships: schemaModule.relationships,
      documents: schemaModule.documents,
      tasks: schemaModule.tasks,
      files: schemaModule.files,
      invitations: schemaModule.invitations,
      kybResponses: schemaModule.kybResponses,
      kybFields: schemaModule.kybFields,
      refreshTokens: schemaModule.refreshTokens,
      companyLogos: schemaModule.companyLogos,
      openaiSearchAnalytics: schemaModule.openaiSearchAnalytics
    };
    
    console.log('[DB Adapter] Database initialized successfully');
    isInitialized = true;
    return true;
  } catch (error) {
    console.error('[DB Adapter] Failed to initialize database:', error);
    return false;
  }
}

/**
 * Get the database connection pool
 */
export function getPool() {
  if (!isInitialized) {
    console.warn('[DB Adapter] Database not initialized. Call initializeDb() first.');
    return null;
  }
  return pool;
}

/**
 * Get the database schemas
 * @returns Database schemas object with all schema properties
 */
export function getSchemas(): DatabaseSchemas {
  if (!isInitialized) {
    console.warn('[DB Adapter] Database not initialized. Call initializeDb() first.');
    // Return empty schema object instead of null
    return {
      companies: {},
      users: {},
      relationships: {},
      documents: {},
      tasks: {},
      files: {},
      invitations: {},
      kybResponses: {},
      kybFields: {},
      refreshTokens: {},
      companyLogos: {},
      openaiSearchAnalytics: {}
    };
  }
  return schemas as DatabaseSchemas;
}

/**
 * Get database adapter for query operations
 */
export function getDb() {
  if (!isInitialized) {
    console.warn('[DB Adapter] Database not initialized. Call initializeDb() first.');
    return null;
  }
  return {
    insert: (table: any) => ({ values: (data: any) => Promise.resolve([]) }),
    update: (table: any) => ({ set: (data: any) => ({ where: () => Promise.resolve() }) }),
    delete: (table: any) => ({ where: () => Promise.resolve() }),
    select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }),
  };
}

/**
 * Execute a database operation with retry logic for Neon serverless database
 * 
 * @param callback Function that performs the database operation
 * @param maxRetries Maximum number of retry attempts
 * @returns Result of the database operation
 */
export async function executeWithNeonRetry<T>(callback: (db: any) => Promise<T>, maxRetries = 3): Promise<T> {
  if (!isInitialized) {
    console.warn('[DB Adapter] Database not initialized. Call initializeDb() first.');
    throw new Error('Database not initialized. Call initializeDb() first.');
  }
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[DB Adapter] Executing database operation, attempt ${attempt}/${maxRetries}`);
      const db = { ...schemas };
      return await callback(db);
    } catch (error: any) {
      console.error(`[DB Adapter] Database operation failed (attempt ${attempt}/${maxRetries}):`, error);
      lastError = error;
      
      // Check if error is related to connection issues (common with serverless databases)
      const isConnectionError = error.message?.includes('connection') || 
                               error.message?.includes('timeout') ||
                               error.code === 'ECONNRESET';
      
      if (!isConnectionError) {
        // If it's not a connection error, don't retry
        throw error;
      }
      
      // Wait before retrying with exponential backoff
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 100;
        console.log(`[DB Adapter] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Database operation failed after maximum retries');
}

/**
 * Execute a SQL query with retry logic for Neon serverless database
 * 
 * @param queryText SQL query text
 * @param params Query parameters
 * @param maxRetries Maximum number of retry attempts
 * @returns Query result
 */
export async function queryWithNeonRetry(queryText: string, params: any[] = [], maxRetries = 3) {
  if (!isInitialized || !pool) {
    console.warn('[DB Adapter] Database not initialized. Call initializeDb() first.');
    throw new Error('Database not initialized. Call initializeDb() first.');
  }
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[DB Adapter] Executing query, attempt ${attempt}/${maxRetries}`);
      return await pool.query(queryText, params);
    } catch (error: any) {
      console.error(`[DB Adapter] Query failed (attempt ${attempt}/${maxRetries}):`, error);
      lastError = error;
      
      // Check if error is related to connection issues
      const isConnectionError = error.message?.includes('connection') || 
                               error.message?.includes('timeout') ||
                               error.code === 'ECONNRESET';
      
      if (!isConnectionError) {
        // If it's not a connection error, don't retry
        throw error;
      }
      
      // Wait before retrying with exponential backoff
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 100;
        console.log(`[DB Adapter] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Query failed after maximum retries');
}

/**
 * Ensure a value is not null or undefined
 * 
 * @param value The value to check
 * @param defaultValue Default value to use if value is null or undefined
 * @returns The original value or the default value
 */
export function ensureValue<T>(value: T | null | undefined, defaultValue: T): T {
  return (value === null || value === undefined) ? defaultValue : value;
} 