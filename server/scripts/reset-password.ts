#!/usr/bin/env tsx

/**
 * Password Reset Admin Script
 * 
 * This script allows administrators to manually reset user passwords
 * without requiring email verification. Useful for:
 * - Emergency password resets
 * - Users locked out of their accounts
 * - Initial password setup for new users
 * 
 * Usage:
 *   npm run reset-password <email> <new-password>
 *   npx tsx server/scripts/reset-password.ts <email> <new-password>
 * 
 * Example:
 *   npm run reset-password user@example.com newPassword123
 */

import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const resetLogger = {
  info: (message: string, meta?: any) => {
    console.log(`[PasswordReset] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[PasswordReset:WARN] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  },
  error: (message: string, meta?: any) => {
    console.error(`[PasswordReset:ERROR] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  }
};

/**
 * Hash a password using bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  try {
    resetLogger.info('Hashing password');
    const hashedPassword = await bcrypt.hash(password, 10);
    resetLogger.info('Password hashed successfully');
    return hashedPassword;
  } catch (error) {
    resetLogger.error('Error hashing password', { error });
    throw error;
  }
}

/**
 * Find user by email (case-insensitive)
 */
async function getUserByEmail(email: string) {
  const normalizedEmail = email.toLowerCase();
  return db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
}

/**
 * Main password reset function
 */
async function resetUserPassword(email: string, newPassword: string): Promise<void> {
  try {
    resetLogger.info('Starting password reset process', { email: email.toLowerCase() });

    // Validate inputs
    if (!email || !newPassword) {
      throw new Error('Both email and new password are required');
    }

    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Find user
    const [user] = await getUserByEmail(email);
    if (!user) {
      throw new Error(`No user found with email: ${email}`);
    }

    resetLogger.info('User found', { 
      userId: user.id, 
      email: user.email,
      fullName: user.full_name,
      companyId: user.company_id
    });

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password in database
    const result = await db
      .update(users)
      .set({ 
        password: hashedPassword,
        updated_at: new Date()
      })
      .where(eq(users.id, user.id))
      .returning({ id: users.id, email: users.email });

    if (result.length === 0) {
      throw new Error('Failed to update password in database');
    }

    resetLogger.info('Password reset completed successfully', {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString()
    });

    console.log('\n✅ SUCCESS: Password has been reset successfully!');
    console.log(`   User: ${user.full_name} (${user.email})`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Company ID: ${user.company_id}`);
    console.log(`   Updated: ${new Date().toISOString()}\n`);

  } catch (error) {
    resetLogger.error('Password reset failed', { error });
    console.error('\n❌ ERROR: Password reset failed!');
    console.error(`   Reason: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    process.exit(1);
  }
}

/**
 * Script entry point
 */
async function main() {
  console.log('🔒 Password Reset Admin Script');
  console.log('================================\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.error('❌ Invalid usage!');
    console.error('\nUsage:');
    console.error('  npm run reset-password <email> <new-password>');
    console.error('  npx tsx server/scripts/reset-password.ts <email> <new-password>');
    console.error('\nExample:');
    console.error('  npm run reset-password user@example.com newPassword123\n');
    process.exit(1);
  }

  const [email, newPassword] = args;

  // Confirm the action
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 New Password: ${'*'.repeat(newPassword.length)} (${newPassword.length} characters)`);
  console.log('\n⚠️  This action will immediately change the user\'s password.');
  console.log('   The user will need to use the new password to log in.\n');

  // Perform the reset
  await resetUserPassword(email, newPassword);
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Script execution failed:', error);
    process.exit(1);
  });
}

export { resetUserPassword, hashPassword, getUserByEmail };