import { db } from "@db";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

async function hashPassword(password: string) {
  try {
    console.log('[Migration] Starting to hash password');
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    console.log('[Migration] Password hashed successfully:', {
      hashLength: hashedPassword.length,
      startsWithBcrypt: hashedPassword.startsWith('$2b$'),
      rounds: SALT_ROUNDS
    });
    return hashedPassword;
  } catch (error) {
    console.error('[Migration] Error hashing password:', error);
    throw error;
  }
}

export async function hashTestUserPassword() {
  try {
    console.log('[Migration] Starting test user password update');

    // Hash the password 'password123' with bcrypt
    const hashedPassword = await hashPassword('password123');

    console.log('[Migration] Updating test user password in database');

    // Update John Doe's password
    await db.execute(sql`
      UPDATE users 
      SET password = ${hashedPassword}
      WHERE email = 'john.doe@testcompany.com';
    `);

    console.log('[Migration] Successfully updated test user password');
  } catch (error) {
    console.error('[Migration] Error updating test user password:', error);
    throw error;
  }
}