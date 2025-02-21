export type RegisterData = {
  email: string;
  password: string;
  fullName: string;
  firstName: string;
  lastName: string;
  invitationCode: string;
};

export type LoginData = {
  email: string;
  password: string;
};

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