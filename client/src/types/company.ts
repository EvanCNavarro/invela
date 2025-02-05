import { z } from "zod";

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
  type: z.string(),
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
  // ... other fields
});

export type Company = z.infer<typeof companySchema>;