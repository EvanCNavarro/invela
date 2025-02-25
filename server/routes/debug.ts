import { Router } from 'express';
import { db, pool } from '../db';
import { sql } from 'drizzle-orm';

const router = Router();

// Test database connectivity
router.get('/db-test', async (req, res) => {
  console.log('[Debug] Testing database connectivity');
  
  try {
    // First test simple connection
    const client = await pool.connect();
    console.log('[Debug] Successfully connected to database');
    
    // Test the connection with a simple query
    const result = await client.query('SELECT NOW() as time');
    console.log('[Debug] Query result:', result.rows[0]);
    
    // Release the client back to the pool
    client.release();
    
    // Try a Drizzle ORM query as well
    const drizzleResult = await db.execute(sql`SELECT NOW() as time`);
    console.log('[Debug] Drizzle query result:', drizzleResult);
    
    return res.json({
      success: true,
      connectionTest: 'Success',
      time: result.rows[0].time,
      drizzleTest: 'Success',
      drizzleTime: drizzleResult[0]?.time
    });
  } catch (error) {
    console.error('[Debug] Database test error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router; 