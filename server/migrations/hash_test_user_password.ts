import { db } from "@db";
import { sql } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function hashTestUserPassword() {
  try {
    // Hash the password 'password123' with proper crypto functions
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
