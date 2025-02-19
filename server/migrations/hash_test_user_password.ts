import { db } from "@db";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function hashTestUserPassword() {
  try {
    // Hash the password 'password123' with bcrypt
    const hashedPassword = await hashPassword('password123');

    // Update John Doe's password
    await db.execute(sql`
      UPDATE users 
      SET password = ${hashedPassword}
      WHERE email = 'john.doe@testcompany.com';
    `);

    console.log('Successfully updated test user password');
  } catch (error) {
    console.error('Error updating test user password:', error);
    throw error;
  }
}