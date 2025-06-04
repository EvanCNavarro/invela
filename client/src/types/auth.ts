/**
 * ========================================
 * Authentication Type Definitions
 * ========================================
 * 
 * Core TypeScript type definitions for authentication and user management
 * in the enterprise risk assessment platform. Includes registration,
 * login, and company association types.
 * 
 * @module types/auth
 * @version 1.0.0
 * @since 2025-05-23
 */

/**
 * User registration data structure
 */
export type RegisterData = {
  email: string;
  password: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  companyId?: number;
  invitationCode?: string;
};

/**
 * User login data structure
 */
export type LoginData = {
  email: string;
  password: string;
};

/**
 * Company data structure for authentication context
 */
export type Company = {
  id: number;
  name: string;
  description?: string | null;
  riskScore?: number;
  isDemo?: boolean | null;
  available_tabs?: string[];
};

export type User = {
  id: number;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  company_id: number;
  company?: Company;
  onboarding_user_completed: boolean;
  created_at: string;
  updated_at: string;
  // Additional fields for authentication status information
  loginStatus?: 'success' | 'failed';
  message?: string;
};