import { db } from "@db";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";

export async function updateTestUserPassword() {
  try {
    // Hash the password 'password' with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password', salt);
    
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

// Execute the migration
updateTestUserPassword().catch(console.error);
