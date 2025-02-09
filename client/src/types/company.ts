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

export const companySchema = z.object({
  id: z.number(),
  name: z.string(),
  category: z.enum(['Invela', 'Bank', 'FinTech']),
  description: z.string().nullable(),
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
});

export type Company = z.infer<typeof companySchema>;