/**
 * @file auth.ts
 * @description Shared authentication types for client-server communication.
 * These types ensure consistent data structures for authentication operations.
 */

/**
 * Registration data structure.
 * Contains all fields required to register a new user.
 */
export type RegisterData = {
  email: string;
  password: string;
  fullName: string;
  firstName: string;
  lastName: string;
  invitationCode: string;
};

/**
 * Login data structure.
 * Contains credentials required for user authentication.
 */
export type LoginData = {
  email: string;
  password: string;
};

/**
 * User data structure.
 * Represents an authenticated user's profile information.
 */
export type User = {
  id: number;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  company_id: number;
  onboarding_user_completed: boolean;
  created_at: string;
  updated_at: string;
}; 