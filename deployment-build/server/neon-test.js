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
// Load environment variables from parent directory
const envPath = path.resolve(__dirname, '../.env');
console.log(`Loading environment from: ${envPath}`);
dotenv.config({ path: envPath });
// Database connection parameters - with explicit credentials
// This approach is more reliable for Neon
const dbConfig = {
    host: process.env.PGHOST || 'ep-wild-water-a4ulbqlb.us-east-1.aws.neon.tech',
    port: parseInt(process.env.PGPORT || '5432'),
    database: process.env.PGDATABASE || 'neondb',
    user: process.env.PGUSER || 'neondb_owner',
    password: process.env.PGPASSWORD || 'npg_m6KOAgxELBh7',
    ssl: {
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 60000 // 60 seconds - Neon can take time to wake up
};
console.log('Neon Database Test - Specialized for serverless PostgreSQL');
console.log('---------------------------------------------------');
console.log(`Host: ${dbConfig.host}`);
console.log(`Database: ${dbConfig.database}`);
console.log(`User: ${dbConfig.user}`);
console.log(`SSL: Enabled with rejectUnauthorized: false`);
console.log('---------------------------------------------------');
// Function to wait with exponential backoff
async function wait(attempt) {
    // Start with 5 seconds, then 10, 20, 40, etc.
    const delayMs = 5000 * Math.pow(2, attempt);
    const delaySeconds = delayMs / 1000;
    console.log(`Waiting ${delaySeconds} seconds before attempt ${attempt + 1}...`);
    return new Promise(resolve => setTimeout(resolve, delayMs));
}
// Single attempt to connect and execute a simple query
async function connectAndTest() {
    // Avoid connection pools with Neon - use single clients
    const client = new pg_1.Client(dbConfig);
    try {
        console.log('\nOpening connection to Neon database...');
        console.log('This may take up to 60 seconds if the database is in sleep mode...');
        // Connect to the database
        await client.connect();
        console.log('✅ Connection established successfully!');
        // Try a simple query
        console.log('Running test query...');
        const result = await client.query('SELECT NOW() as server_time, version() as version');
        console.log('✅ Query successful!');
        console.log(`Server time: ${result.rows[0].server_time}`);
        console.log(`PostgreSQL version: ${result.rows[0].version.split(',')[0]}`);
        // Always close connection with Neon
        await client.end();
        console.log('Connection closed cleanly');
        return true;
    }
    catch (error) {
        console.error('❌ Connection failed:');
        console.error(`Error message: ${error.message}`);
        if (error.code) {
            console.error(`Error code: ${error.code}`);
        }
        // Always try to close the connection even after error
        try {
            await client.end();
        }
        catch (closeError) {
            // Ignore close errors
        }
        return false;
    }
}
// Try connecting with increasing backoff
async function testNeonConnection(maxAttempts = 5) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        console.log(`\n🔄 Attempt ${attempt + 1} of ${maxAttempts}`);
        // Wait with increasing backoff before attempts after the first one
        if (attempt > 0) {
            await wait(attempt - 1);
        }
        const success = await connectAndTest();
        if (success) {
            console.log(`\n✅ Connection successful on attempt ${attempt + 1}!`);
            return true;
        }
        console.log(`❌ Attempt ${attempt + 1} failed.`);
        // Special handling for first attempt
        if (attempt === 0) {
            console.log('\n🔍 First attempt failed. This is normal for serverless databases.');
            console.log('The database may need time to wake up. Waiting before retry...');
        }
    }
    console.error('\n⛔ All connection attempts failed.');
    console.error('Common issues with Neon serverless PostgreSQL:');
    console.error(' 1. Database is in sleep mode and needs more time to wake up');
    console.error(' 2. Concurrent connection limits have been reached');
    console.error(' 3. Database credentials are incorrect');
    console.error(' 4. Database region may have availability issues');
    console.error('\nTroubleshooting steps:');
    console.error(' 1. Check your Neon dashboard to verify the database is active');
    console.error(' 2. Verify your database credentials are correct');
    console.error(' 3. Try the Neon web SQL editor to see if it works there');
    console.error(' 4. Ensure your project has not exceeded connection limits');
    console.error(' 5. Check if you have IP restrictions enabled in your Neon project');
    return false;
}
// Main test function
async function runTest() {
    console.log('Starting specialized Neon database connection test...');
    try {
        const result = await testNeonConnection();
        if (result) {
            console.log('\n✅ TEST PASSED: Successfully connected to Neon database!');
            process.exit(0);
        }
        else {
            console.log('\n❌ TEST FAILED: Could not connect to Neon database.');
            process.exit(1);
        }
    }
    catch (error) {
        console.error('Fatal error in test:', error);
        process.exit(1);
    }
}
// Run the test
runTest();
