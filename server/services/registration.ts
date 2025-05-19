/**
 * Registration Service
 * 
 * This service handles new user registration with invitation codes.
 * Unlike the account-setup endpoint which updates existing users,
 * this service creates completely new users based on invitation codes.
 */

import { db } from '@db';
import { users, invitations, companies } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';

// Connect to postgres directly for transaction support
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

interface RegistrationData {
  email: string;
  password: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  invitationCode: string;
}

export async function registerUser(data: RegistrationData): Promise<{ 
  success: boolean; 
  message: string; 
  userId?: number; 
  companyId?: number;
  user?: any;
}> {
  // Validate inputs
  if (!data.email || !data.password || !data.fullName || !data.invitationCode) {
    return { success: false, message: "Missing required fields" };
  }

  console.log("[Registration] Request received for email:", data.email, "code:", data.invitationCode);

  // Get a client from the pool
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // 1. Verify invitation code
    const invitationQuery = await client.query(
      `SELECT * FROM invitations WHERE code = $1 AND email = $2 AND status = 'pending'`,
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
    
    // Prepare first name and last name
    const firstName = data.firstName || data.fullName.split(' ')[0];
    const lastName = data.lastName || data.fullName.split(' ').slice(1).join(' ');
    
    const insertUserQuery = await client.query(
      `INSERT INTO users (
        email, password, full_name, first_name, last_name, 
        company_id, role, created_at, onboarding_user_completed
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), false) 
      RETURNING *`,
      [
        data.email, 
        hashedPassword, 
        data.fullName,
        firstName, 
        lastName, 
        companyId,
        invitation.role || 'User'
      ]
    );
    
    if (insertUserQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, message: "Failed to create user account" };
    }
    
    const user = insertUserQuery.rows[0];
    const userId = user.id;
    
    // 4. Mark invitation as used
    await client.query(
      `UPDATE invitations SET status = 'used', used_at = NOW() WHERE code = $1 AND email = $2`,
      [data.invitationCode, data.email]
    );
    
    // 5. Create onboarding task for the user
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
      message: "Registration successful", 
      userId,
      companyId,
      user
    };
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    
    console.error("[Registration] Error:", error);
    return { 
      success: false, 
      message: `Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  } finally {
    // Release client back to pool
    client.release();
  }
}