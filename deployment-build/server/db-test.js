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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const dns = __importStar(require("dns"));
const util_1 = require("util");
// Promisify DNS lookup
const lookup = (0, util_1.promisify)(dns.lookup);
// Load environment variables from parent directory
const envPath = path.resolve(__dirname, '../.env');
console.log(`Loading environment from: ${envPath} (exists: ${fs.existsSync(envPath)})`);
dotenv.config({ path: envPath });
// Database connection parameters
const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_m6KOAgxELBh7@ep-wild-water-a4ulbqlb.us-east-1.aws.neon.tech/neondb?sslmode=require';
// Log some diagnostic information
console.log('--- Environment Information ---');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`Working directory: ${process.cwd()}`);
console.log(`Database URL configured: ${connectionString ? 'Yes' : 'No'}${connectionString ? ' (length: ' + connectionString.length + ')' : ''}`);
// Mask password in logs
const maskedUrl = connectionString?.replace(/\/\/([^:]+):([^@]+)@/, '//neondb_owner:*****@');
console.log(`Database URL pattern: ${maskedUrl}`);
// Parse out the host from the connection string
const hostMatch = connectionString.match(/@([^:\/]+)/);
const host = hostMatch ? hostMatch[1] : null;
console.log(`Extracted host: ${host || 'unable to extract'}`);
// Also try individual connection parameters
console.log('--- Individual Connection Parameters ---');
console.log(`PGHOST: ${process.env.PGHOST || 'not set'}`);
console.log(`PGPORT: ${process.env.PGPORT || '5432 (default)'}`);
console.log(`PGDATABASE: ${process.env.PGDATABASE || 'not set'}`);
console.log(`PGUSER: ${process.env.PGUSER || 'not set'}`);
console.log(`PGPASSWORD: ${process.env.PGPASSWORD ? '******** (set)' : 'not set'}`);
console.log('\n=== STARTING NETWORK CONNECTIVITY TEST ===');
const testHost = process.env.PGHOST || (host || 'ep-wild-water-a4ulbqlb.us-east-1.aws.neon.tech');
async function checkDnsResolution() {
    try {
        console.log(`Attempting to resolve DNS for host: ${testHost}`);
        const result = await lookup(testHost);
        console.log(`✅ DNS resolution successful: ${testHost} -> ${result.address}`);
        return true;
    }
    catch (err) {
        console.error(`❌ DNS resolution failed: ${err.message}`);
        return false;
    }
}
// Wait function with progress indication
function wait(ms) {
    const seconds = ms / 1000;
    console.log(`Waiting ${seconds} seconds...`);
    const startTime = Date.now();
    return new Promise(resolve => {
        const interval = setInterval(() => {
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            if (elapsedSeconds % 5 === 0 && elapsedSeconds > 0 && elapsedSeconds < seconds) {
                console.log(`... still waiting (${elapsedSeconds}/${seconds} seconds)`);
            }
        }, 1000);
        setTimeout(() => {
            clearInterval(interval);
            resolve(true);
        }, ms);
    });
}
async function testDatabaseConnection() {
    console.log('\n=== STARTING DATABASE CONNECTION TEST ===');
    console.log('This may take a moment if the database is in sleep mode and needs to wake up...');
    console.log('Note: Neon serverless databases can take 10-30 seconds to wake up from cold start');
    // Test single client - non-pooled connection attempt first
    let attempts = 0;
    const maxAttempts = 3;
    const initialDelay = 10000; // Start with 10 seconds
    console.log('\n--- Testing with single client connection ---');
    while (attempts < maxAttempts) {
        const currentDelay = initialDelay + (attempts * 5000); // Increase by 5 seconds each retry
        attempts++;
        console.log(`\nAttempt ${attempts}/${maxAttempts} to connect with direct client...`);
        const client = new pg_1.Client({
            connectionString,
            ssl: {
                rejectUnauthorized: false
            },
            connectionTimeoutMillis: 30000 // 30 seconds
        });
        try {
            console.log('Opening connection...');
            await client.connect();
            console.log('✅ Client connection successful!');
            console.log('Executing simple query...');
            const result = await client.query('SELECT 1 as test');
            console.log(`Query result: ${JSON.stringify(result.rows[0])}`);
            console.log('Closing connection...');
            await client.end();
            console.log('Connection closed properly.');
            // If we got here, the connection was successful
            return true;
        }
        catch (error) {
            console.error(`❌ Client connection attempt ${attempts} failed.`);
            console.error(`Error details: ${error.message}`);
            if (error.code) {
                console.error(`Error code: ${error.code}`);
            }
            await client.end().catch(() => { }); // Attempt to clean up connection, ignore errors
            if (attempts >= maxAttempts) {
                console.error('Maximum retry attempts reached for single client connection.');
                break; // Don't return false yet, try the pool approach
            }
            console.log(`Waiting ${currentDelay / 1000} seconds before retrying...`);
            await wait(currentDelay);
        }
    }
    // If direct client failed, try with pool and much longer timeout
    console.log('\n--- Testing with connection pool (last resort) ---');
    console.log('Creating a connection pool with extended timeouts...');
    // Create a new pool with very conservative settings
    const pool = new pg_1.Pool({
        connectionString,
        ssl: {
            rejectUnauthorized: false
        },
        connectionTimeoutMillis: 45000, // 45 seconds
        query_timeout: 30000, // 30 seconds
        max: 1, // Limit to single connection
        idleTimeoutMillis: 10000 // Close idle connections after 10 seconds
    });
    try {
        console.log('Attempting to connect via pool...');
        console.log('This may take up to 45 seconds...');
        const client = await pool.connect();
        console.log('✅ Pool connection acquired successfully!');
        console.log('Executing simple test query...');
        const result = await client.query('SELECT NOW() as time, version() as version');
        console.log('Query executed successfully!');
        console.log(`Server time: ${result.rows[0].time}`);
        console.log(`PostgreSQL version: ${result.rows[0].version.split(',')[0]}`);
        client.release();
        console.log('Connection released to pool.');
        await pool.end();
        console.log('Pool shutdown completed.');
        return true;
    }
    catch (error) {
        console.error('❌ Pool connection failed.');
        console.error(`Error details: ${error.message}`);
        if (error.code) {
            console.error(`Error code: ${error.code}`);
        }
        await pool.end().catch(() => { });
        return false;
    }
}
// Execute tests sequentially
async function runAllTests() {
    try {
        // First check DNS resolution
        const dnsWorks = await checkDnsResolution();
        if (!dnsWorks) {
            console.error('\n❌ DNS resolution failed. Network connectivity issues likely.');
            console.error('This may indicate network restrictions or DNS issues in your environment.');
            return false;
        }
        // Then test database after a delay
        await wait(3000); // Small pause between tests
        const dbWorks = await testDatabaseConnection();
        if (!dbWorks) {
            console.error('\n❌ Database connection failed after multiple attempts.');
            console.error('Possible issues:');
            console.error(' 1. Neon database is in sleep mode and needs more time to wake up');
            console.error(' 2. The database credentials may be incorrect');
            console.error(' 3. Network restrictions are preventing the connection');
            console.error(' 4. The database instance may be suspended or has reached connection limits');
            console.error('\nTroubleshooting steps:');
            console.error(' 1. Verify the database is active in the Neon dashboard');
            console.error(' 2. Double-check your connection string and credentials');
            console.error(' 3. Try connecting from a different network or environment');
            console.error(' 4. Check for any IP-based restrictions in your Neon project settings');
            console.error(' 5. Ensure your database isn\'t in read-only mode or suspended');
            return false;
        }
        console.log('\n✅ All tests completed successfully!');
        console.log('Your database connection appears to be working correctly.');
        return true;
    }
    catch (error) {
        console.error('\n❌ Unexpected error during tests:', error.message);
        return false;
    }
}
// Run the tests
console.log('Starting comprehensive database connectivity tests...');
runAllTests()
    .then(success => {
    console.log(`\nTest suite completed: ${success ? 'SUCCESS' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
})
    .catch(err => {
    console.error('Fatal error in test suite:', err);
    process.exit(1);
});
