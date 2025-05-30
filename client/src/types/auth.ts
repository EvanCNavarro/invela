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

export type LoginData = {
  email: string;
  password: string;
};

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