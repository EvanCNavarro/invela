import { z } from "zod";

export const CompanyCategory = {
  INVELA: 'Invela',
  BANK: 'Bank',
  FINTECH: 'FinTech'
} as const;

export type CompanyCategory = typeof CompanyCategory[keyof typeof CompanyCategory];

export const AccreditationStatus = {
  AWAITING_INVITATION: 'AWAITING_INVITATION',
  PENDING: 'PENDING',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  PROVISIONALLY_APPROVED: 'PROVISIONALLY_APPROVED',
  SUSPENDED: 'SUSPENDED',
  REVOKED: 'REVOKED',
  EXPIRED: 'EXPIRED'
} as const;

export type AccreditationStatus = typeof AccreditationStatus[keyof typeof AccreditationStatus];

export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  fullName: z.string(),
  firstName: z.string(),
  lastName: z.string().nullable(),
  companyId: z.number(),
  onboardingCompleted: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const companySchema = z.object({
  id: z.number(),
  name: z.string(),
  category: z.enum(['Invela', 'Bank', 'FinTech']),
  description: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  legalStructure: z.string().nullable(),
  hqAddress: z.string().nullable(),
  productsServices: z.string().nullable(),
  incorporationYear: z.number().nullable(),
  numEmployees: z.number().nullable(),
  investors: z.string().nullable(),
  fundingStage: z.string().nullable(),
  keyClientsPartners: z.string().nullable(),
  foundersAndLeadership: z.string().nullable(),
  certificationsCompliance: z.string().nullable(),
  riskScore: z.number().optional(),
  accreditationStatus: z.enum([
    'AWAITING_INVITATION',
    'PENDING',
    'IN_REVIEW',
    'APPROVED',
    'PROVISIONALLY_APPROVED',
    'SUSPENDED',
    'REVOKED',
    'EXPIRED'
  ]).default('AWAITING_INVITATION'),
  documents: z.array(z.object({
    name: z.string(),
    status: z.string()
  })).optional(),
});

export type User = z.infer<typeof userSchema>;
export type Company = z.infer<typeof companySchema>;