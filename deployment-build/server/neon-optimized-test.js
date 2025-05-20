"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const db_1 = require("../db");
const neon_utils_1 = require("../db/neon-utils");
const promises_1 = require("timers/promises");
// Enable detailed logging for this test
(0, neon_utils_1.setLogLevel)('debug');
async function testNeonOptimizations() {
    console.log('Starting Neon optimized test...');
    console.log('================================');
    try {
        // First, check database health
        console.log('1. Checking database health...');
        const healthResult = await (0, db_1.checkDatabaseHealth)();
        console.log(`   Health check result: ${healthResult.isHealthy ? 'OK ✅' : 'Failed ❌'}`);
        console.log(`   Message: ${healthResult.message}`);
        console.log();
        if (!healthResult.isHealthy) {
            throw new Error('Database health check failed, aborting test');
        }
        // Simple query with retry logic
        console.log('2. Testing simple query with retry logic...');
        const simpleResult = await (0, db_1.queryWithNeonRetry)('SELECT 1 as value');
        console.log(`   Simple query result: ${JSON.stringify(simpleResult)}`);
        console.log();
        // Test sequential queries with delay
        console.log('3. Testing sequential queries with delay...');
        for (let i = 1; i <= 3; i++) {
            console.log(`   Query ${i} starting...`);
            const result = await (0, db_1.queryWithNeonRetry)('SELECT pg_sleep(0.5), $1 as iteration', [i]);
            console.log(`   Query ${i} completed: ${JSON.stringify(result)}`);
            await (0, promises_1.setTimeout)(500); // Deliberate delay between queries
        }
        console.log();
        // Test a complex operation with transaction
        console.log('4. Testing complex operation with transaction...');
        const txnResult = await (0, db_1.executeWithNeonRetry)(async (client) => {
            // Start transaction
            await client.query('BEGIN');
            try {
                // Create a temporary table
                await client.query(`
          CREATE TEMPORARY TABLE neon_test (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `);
                // Insert some data
                const insertResult = await client.query('INSERT INTO neon_test (name) VALUES ($1), ($2) RETURNING id, name', ['Test 1', 'Test 2']);
                // Query the data
                const selectResult = await client.query('SELECT * FROM neon_test ORDER BY id');
                // Commit the transaction
                await client.query('COMMIT');
                return {
                    inserted: insertResult.rows,
                    selected: selectResult.rows
                };
            }
            catch (error) {
                // Rollback on error
                await client.query('ROLLBACK');
                throw error;
            }
        });
        console.log('   Transaction completed successfully');
        console.log(`   Inserted: ${JSON.stringify(txnResult.inserted)}`);
        console.log(`   Selected: ${JSON.stringify(txnResult.selected)}`);
        console.log();
        // Test error handling and retry logic
        console.log('5. Testing error handling and retry (should fail gracefully)...');
        try {
            // This should fail but be handled by the retry logic
            const failResult = await (0, db_1.queryWithNeonRetry)('SELECT * FROM non_existent_table');
            console.log('   This should not be reached');
        }
        catch (error) {
            console.log(`   ✅ Expected error caught: ${error instanceof Error ? error.message : error}`);
        }
        console.log();
        console.log('All tests completed successfully! 🎉');
    }
    catch (error) {
        console.error('Test failed with error:', error);
    }
    finally {
        // Always close the pool at the end
        await db_1.pool.end();
        console.log('Test complete - Pool closed');
    }
}
// Run the test
testNeonOptimizations().catch(console.error);
