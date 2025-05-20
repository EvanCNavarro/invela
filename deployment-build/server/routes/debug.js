"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
const router = (0, express_1.Router)();
// Test database connectivity
router.get('/db-test', async (req, res) => {
    console.log('[Debug] Testing database connectivity');
    try {
        // First test simple connection
        const client = await db_1.pool.connect();
        console.log('[Debug] Successfully connected to database');
        // Test the connection with a simple query
        const result = await client.query('SELECT NOW() as time');
        console.log('[Debug] Query result:', result.rows[0]);
        // Release the client back to the pool
        client.release();
        // Try a Drizzle ORM query as well
        const drizzleResult = await db_1.db.execute((0, drizzle_orm_1.sql) `SELECT NOW() as time`);
        console.log('[Debug] Drizzle query result:', drizzleResult);
        return res.json({
            success: true,
            connectionTest: 'Success',
            time: result.rows[0].time,
            drizzleTest: 'Success',
            drizzleTime: drizzleResult[0]?.time
        });
    }
    catch (error) {
        console.error('[Debug] Database test error:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
exports.default = router;
