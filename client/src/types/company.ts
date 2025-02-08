import { z } from "zod";

export const CompanyType = {
  SYSTEM_CREATOR: 'SYSTEM_CREATOR',
  WHITE_LABEL: 'WHITE_LABEL',
  THIRD_PARTY: 'THIRD_PARTY'
} as const;

export type CompanyType = typeof CompanyType[keyof typeof CompanyType];

export const CompanyCategory = {
  INVELA: 'INVELA',
  BANK: 'BANK',
  FINTECH: 'FINTECH'
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
  type: z.enum(['SYSTEM_CREATOR', 'WHITE_LABEL', 'THIRD_PARTY']),
  category: z.enum(['INVELA', 'BANK', 'FINTECH']),
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