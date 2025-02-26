"use strict";
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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.pool = void 0;
exports.executeWithNeonRetry = executeWithNeonRetry;
exports.queryWithNeonRetry = queryWithNeonRetry;
exports.checkDatabaseHealth = checkDatabaseHealth;
require("dotenv/config");
const serverless_1 = require("@neondatabase/serverless");
const neon_serverless_1 = require("drizzle-orm/neon-serverless");
const ws_1 = __importDefault(require("ws"));
const schema = __importStar(require("./schema"));
const neon_utils_1 = require("./neon-utils");
// Configure WebSockets for Neon
serverless_1.neonConfig.webSocketConstructor = ws_1.default;
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}
// Create an optimized Neon pool with pre-configured settings
exports.pool = (0, neon_utils_1.createNeonPool)(process.env.DATABASE_URL);
// Create the drizzle db instance with the configured pool
exports.db = (0, neon_serverless_1.drizzle)({ client: exports.pool, schema });
/**
 * Execute a query using retry logic specifically optimized for Neon
 * This is recommended for important operations that should be resilient to Neon's cold starts
 */
async function executeWithNeonRetry(queryFn) {
    return (0, neon_utils_1.executeWithRetry)(exports.pool, queryFn);
}
/**
 * Simple query execution with built-in retry logic
 * Useful for straightforward queries that need resilience against cold starts
 */
async function queryWithNeonRetry(queryText, params = []) {
    return (0, neon_utils_1.queryWithRetry)(exports.pool, queryText, params);
}
/**
 * Helper to check connection health
 * Useful to proactively detect and handle connection issues
 */
async function checkDatabaseHealth() {
    try {
        await queryWithNeonRetry('SELECT 1 as health_check');
        return { isHealthy: true, message: 'Database connection is healthy' };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            isHealthy: false,
            message: `Database connection check failed: ${errorMessage}`
        };
    }
}
// Graceful shutdown handler with improved error handling
async function handleShutdown(signal) {
    console.log(`Received ${signal}. Closing pool...`);
    try {
        await (0, neon_utils_1.shutdownPool)(exports.pool);
        process.exit(0);
    }
    catch (error) {
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
