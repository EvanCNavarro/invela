/**
 * @file auth.ts
 * @description Shared authentication types for client-server communication.
 * These types ensure consistent data structures for authentication operations.
 */

/**
 * Login data interface
 */
export interface LoginData {
  email: string;
  password: string;
}

/**
 * Registration data interface
 */
export interface RegistrationData {
  email: string;
  password: string;
  full_name: string;
  company_id?: number;
  company_name?: string;
  invitation_code?: string;
}

/**
 * Reset password request interface
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Reset password confirmation interface
 */
export interface PasswordResetConfirmation {
  token: string;
  password: string;
}

/**
 * User interface for authenticated users
 */
export interface User {
  id: number;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  company_id: number;
  onboarding_user_completed: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Authentication response with tokens
 */
export interface AuthResponse {
  user: User;
  token?: string;
}

/**
 * Refresh token response
 */
export interface RefreshTokenResponse {
  user: User;
}

/**
 * Invitation data interface
 */
export interface InvitationData {
  email: string;
  invitee_name: string;
  invitee_company: string;
  company_id: number;
  task_id?: number;
}

/**
 * Authorization roles
 */
export enum Role {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest'
} 