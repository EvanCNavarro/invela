"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthDebug = getAuthDebug;
exports.testDatabaseConnection = testDatabaseConnection;
const db_adapter_1 = require("./utils/db-adapter");
const drizzle_orm_1 = require("drizzle-orm");
/**
 * Debug API endpoints for diagnosing authentication issues
 */
/**
 * Get authentication debug information
 * @route GET /api/debug/auth
 */
async function getAuthDebug(req, res) {
    try {
        // Safely access user properties
        const user = req.user ? {
            // Use optional chaining and type assertions to safely access properties
            id: req.user?.id,
            email: req.user?.email,
            isAuthenticated: req.isAuthenticated(),
            // Include other properties that may be useful
            companyId: req.user?.company_id,
        } : null;
        // Collect session and auth information
        const debugInfo = {
            timestamp: new Date().toISOString(),
            session: {
                exists: !!req.session,
                id: req.session?.id,
                cookie: req.session?.cookie ? {
                    maxAge: req.session.cookie.maxAge,
                    expires: req.session.cookie.expires,
                    secure: req.session.cookie.secure,
                    httpOnly: req.session.cookie.httpOnly,
                } : null,
            },
            user,
            cookies: {
                names: Object.keys(req.cookies || {}),
                hasSid: 'sid' in (req.cookies || {}),
                hasRefreshToken: 'refresh_token' in (req.cookies || {}),
            },
            headers: {
                userAgent: req.headers['user-agent'],
                acceptLanguage: req.headers['accept-language'],
            },
        };
        // Log debug info to server console
        console.log('[DEBUG] Auth Debug Info:', JSON.stringify(debugInfo, null, 2));
        return res.json({
            success: true,
            message: 'Auth debug information',
            data: debugInfo,
        });
    }
    catch (error) {
        console.error('[DEBUG] Error in auth debug endpoint:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get auth debug information',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
async function testDatabaseConnection(req, res) {
    console.log('[Debug] Testing database connectivity');
    try {
        // Get database module that contains pool
        const dbModule = (0, db_adapter_1.getDb)();
        const pool = dbModule.pool;
        // First test simple connection
        const client = await pool.connect();
        console.log('[Debug] Successfully connected to database');
        // Test the connection with a simple query
        const result = await client.query('SELECT NOW() as time');
        console.log('[Debug] Query result:', result.rows[0]);
        // Release the client back to the pool
        client.release();
        // Try a Drizzle ORM query as well
        const db = (0, db_adapter_1.getDb)();
        const drizzleResult = await db.execute((0, drizzle_orm_1.sql) `SELECT NOW() as time`);
        console.log('[Debug] Drizzle query result:', drizzleResult);
        // Test how long a user query takes
        console.log('[Debug] Testing user query performance');
        const startTime = Date.now();
        const userQueryResult = await db.execute((0, drizzle_orm_1.sql) `SELECT * FROM users LIMIT 1`);
        const endTime = Date.now();
        console.log('[Debug] User query time:', endTime - startTime, 'ms');
        console.log('[Debug] User query result:', userQueryResult);
        return res.json({
            success: true,
            connectionTest: 'Success',
            time: result.rows[0].time,
            drizzleTest: 'Success',
            drizzleTime: drizzleResult[0]?.time,
            userQueryTime: endTime - startTime,
            hasUsers: userQueryResult.length > 0
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
}
