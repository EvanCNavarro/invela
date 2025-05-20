"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const index_js_1 = require("../db/index.js");
const neon_utils_js_1 = require("../db/neon-utils.js");
// Enable detailed logging
(0, neon_utils_js_1.setLogLevel)('debug');
async function testDatabaseConnection() {
    console.log('🔍 Testing database connection...');
    try {
        // Check database health
        console.log('1️⃣ Checking database health...');
        const healthResult = await (0, index_js_1.checkDatabaseHealth)();
        console.log(`   Health status: ${healthResult.isHealthy ? '✅ OK' : '❌ Failed'}`);
        console.log(`   Message: ${healthResult.message}`);
        if (!healthResult.isHealthy) {
            throw new Error('Database health check failed');
        }
        // Run a simple query
        console.log('\n2️⃣ Running a simple query...');
        const client = await index_js_1.pool.connect();
        try {
            const result = await client.query('SELECT current_timestamp as time, current_user as user');
            console.log('   Query succeeded ✅');
            console.log(`   Server time: ${result.rows[0].time}`);
            console.log(`   Database user: ${result.rows[0].user}`);
        }
        finally {
            client.release();
        }
        // Try the login query (simulated)
        console.log('\n3️⃣ Testing login query pattern...');
        const testEmail = 'test@example.com'; // This doesn't need to exist
        const client2 = await index_js_1.pool.connect();
        try {
            const normalizedEmail = testEmail.toLowerCase();
            console.log(`   Looking up user: ${normalizedEmail}`);
            const query = `SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(email) = $1) as user_exists`;
            const result = await client2.query(query, [normalizedEmail]);
            const userExists = result.rows[0].user_exists;
            console.log(`   Query executed successfully ✅`);
            console.log(`   User exists check: ${userExists ? 'Yes' : 'No'}`);
        }
        finally {
            client2.release();
        }
        console.log('\n✅ Database connection test successful! The application should be able to connect to the database.');
    }
    catch (error) {
        console.error('\n❌ Database connection test failed:');
        if (error instanceof Error) {
            console.error(`   Error: ${error.message}`);
            console.error(`   Stack: ${error.stack}`);
        }
        else {
            console.error(`   Unknown error: ${error}`);
        }
    }
    finally {
        // Close the pool
        console.log('\nClosing database connection pool...');
        await index_js_1.pool.end();
        console.log('Test complete.');
    }
}
// Run the test
testDatabaseConnection().catch(console.error);
