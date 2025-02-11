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
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  companyId: number;
  onboardingUserCompleted: boolean;
};
