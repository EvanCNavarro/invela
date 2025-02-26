import { Request, Response } from 'express';
import { getDb } from './utils/db-adapter';
import { sql } from 'drizzle-orm';

/**
 * Debug API endpoints for diagnosing authentication issues
 */

/**
 * Get authentication debug information
 * @route GET /api/debug/auth
 */
export async function getAuthDebug(req: Request, res: Response) {
  try {
    // Safely access user properties
    const user = req.user ? {
      // Use optional chaining and type assertions to safely access properties
      id: (req.user as any)?.id,
      email: (req.user as any)?.email,
      isAuthenticated: req.isAuthenticated(),
      // Include other properties that may be useful
      companyId: (req.user as any)?.company_id,
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
  } catch (error) {
    console.error('[DEBUG] Error in auth debug endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get auth debug information',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function testDatabaseConnection(req: Request, res: Response) {
  console.log('[Debug] Testing database connectivity');
  
  try {
    // Get database module that contains pool
    const dbModule = getDb();
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
    const db = getDb();
    const drizzleResult = await db.execute(sql`SELECT NOW() as time`);
    console.log('[Debug] Drizzle query result:', drizzleResult);
    
    // Test how long a user query takes
    console.log('[Debug] Testing user query performance');
    const startTime = Date.now();
    const userQueryResult = await db.execute(sql`SELECT * FROM users LIMIT 1`);
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
  } catch (error: any) {
    console.error('[Debug] Database test error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 