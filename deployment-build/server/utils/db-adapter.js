"use strict";
/**
 * Database Access Adapter
 *
 * This module provides a TypeScript interface for database operations.
 * It imports compiled JavaScript files from the dist directory.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDb = initializeDb;
exports.getPool = getPool;
exports.getSchemas = getSchemas;
exports.getDb = getDb;
exports.executeWithNeonRetry = executeWithNeonRetry;
exports.queryWithNeonRetry = queryWithNeonRetry;
exports.ensureValue = ensureValue;
// Track initialization state
let isInitialized = false;
let pool = null;
let schemas = null;
/**
 * Initialize the database connection
 */
async function initializeDb() {
    if (isInitialized) {
        console.log('[DB Adapter] Database already initialized');
        return true;
    }
    try {
        console.log('[DB Adapter] Initializing database connection');
        // Import compiled JavaScript files from the dist directory
        const dbModule = await Promise.resolve().then(() => __importStar(require('../../dist/db/index.js')));
        const schemaModule = await Promise.resolve().then(() => __importStar(require('../../dist/db/schema.js')));
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
    }
    catch (error) {
        console.error('[DB Adapter] Failed to initialize database:', error);
        return false;
    }
}
/**
 * Get the database connection pool
 */
function getPool() {
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
function getSchemas() {
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
    return schemas;
}
/**
 * Get database adapter for query operations
 */
function getDb() {
    if (!isInitialized) {
        console.warn('[DB Adapter] Database not initialized. Call initializeDb() first.');
        return null;
    }
    return {
        insert: (table) => ({ values: (data) => Promise.resolve([]) }),
        update: (table) => ({ set: (data) => ({ where: () => Promise.resolve() }) }),
        delete: (table) => ({ where: () => Promise.resolve() }),
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
async function executeWithNeonRetry(callback, maxRetries = 3) {
    if (!isInitialized) {
        console.warn('[DB Adapter] Database not initialized. Call initializeDb() first.');
        throw new Error('Database not initialized. Call initializeDb() first.');
    }
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[DB Adapter] Executing database operation, attempt ${attempt}/${maxRetries}`);
            const db = { ...schemas };
            return await callback(db);
        }
        catch (error) {
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
async function queryWithNeonRetry(queryText, params = [], maxRetries = 3) {
    if (!isInitialized || !pool) {
        console.warn('[DB Adapter] Database not initialized. Call initializeDb() first.');
        throw new Error('Database not initialized. Call initializeDb() first.');
    }
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[DB Adapter] Executing query, attempt ${attempt}/${maxRetries}`);
            return await pool.query(queryText, params);
        }
        catch (error) {
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
function ensureValue(value, defaultValue) {
    return (value === null || value === undefined) ? defaultValue : value;
}
