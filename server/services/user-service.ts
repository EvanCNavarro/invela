/**
 * User Service
 * 
 * This service provides functions for working with user data.
 */

import { db } from '@db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';

interface User {
  id: number;
  email: string;
  full_name: string;
  [key: string]: any;
}

/**
 * Get user by ID
 * 
 * @param userId The ID of the user to retrieve
 * @returns The user or null if not found
 */
export async function getUser(userId: number): Promise<User | null> {
  try {
    const result = await db.select().from(users).where(eq(users.id, userId));
    
    if (!result || result.length === 0) {
      return null;
    }
    
    return result[0] as User;
  } catch (error) {
    console.error(`Error retrieving user with ID ${userId}:`, error);
    return null;
  }
}