/**
 * Account Setup Service
 * 
 * This service handles the invitation-based registration process, allowing users to
 * create accounts from invitation codes and be automatically authenticated afterward.
 */

import { db } from '@db';
import { users, invitations } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, QueryResult } from 'pg';

// Connect to postgres directly
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

interface AccountSetupData {
  email: string;
  password: string;
  fullName: string;
  firstName: string;
  lastName: string;
  invitationCode: string;
}

export async function setupAccount(data: AccountSetupData): Promise<{ success: boolean; message: string; userId?: number; companyId?: number }> {
  // Validate inputs
  if (!data.email || !data.password || !data.fullName || !data.invitationCode) {
    return { success: false, message: "Missing required fields" };
  }

  console.log("[Account Setup] Request received for email:", data.email, "code:", data.invitationCode);

  // Get a client from the pool
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // 1. Verify invitation code
    const invitationQuery = await client.query(
      `SELECT * FROM invitations WHERE code = $1 AND email = $2 AND used_at IS NULL`,
      [data.invitationCode, data.email]
    );
    
    if (invitationQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, message: "Invalid invitation code or email" };
    }
    
    const invitation = invitationQuery.rows[0];
    const companyId = invitation.company_id;
    
    // 2. Check if user already exists
    const existingUserQuery = await client.query(
      `SELECT id FROM users WHERE email = $1`,
      [data.email]
    );
    
    if (existingUserQuery.rows.length > 0) {
      await client.query('ROLLBACK');
      return { success: false, message: "User with this email already exists" };
    }
    
    // 3. Create user
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    const insertUserQuery = await client.query(
      `INSERT INTO users (
        email, password, full_name, first_name, last_name, 
        company_id, role, created_at, onboarding_user_completed
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), false) 
      RETURNING id`,
      [
        data.email, 
        hashedPassword, 
        data.fullName,
        data.firstName || data.fullName.split(' ')[0], 
        data.lastName || data.fullName.split(' ').slice(1).join(' '), 
        companyId,
        invitation.role || 'User'
      ]
    );
    
    if (insertUserQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, message: "Failed to create user account" };
    }
    
    const userId = insertUserQuery.rows[0].id;
    
    // 4. Mark invitation as used
    await client.query(
      `UPDATE invitations SET used_at = NOW() WHERE code = $1 AND email = $2`,
      [data.invitationCode, data.email]
    );
    
    // 5. Create onboarding task for the user if needed
    await client.query(
      `INSERT INTO tasks (
        title, description, status, progress, type, company_id, 
        user_id, user_email, created_at, updated_at, due_date
      )
      VALUES (
        'Complete Onboarding', 'Complete your user onboarding process', 
        'in_progress', 0, 'onboarding', $1, $2, $3, NOW(), NOW(), 
        NOW() + INTERVAL '7 days'
      )`,
      [companyId, userId, data.email]
    );
    
    // Commit transaction
    await client.query('COMMIT');
    
    return { 
      success: true, 
      message: "Account created successfully", 
      userId,
      companyId
    };
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    
    console.error("[Account Setup] Error:", error);
    return { 
      success: false, 
      message: `Account setup failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  } finally {
    // Release client back to pool
    client.release();
  }
}