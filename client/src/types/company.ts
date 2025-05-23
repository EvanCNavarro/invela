/**
 * ========================================
 * Company Management Type Definitions
 * ========================================
 * 
 * Core TypeScript type definitions for company management and categorization
 * in the enterprise risk assessment platform. Includes company categories,
 * accreditation statuses, and validation schemas.
 * 
 * @module types/company
 * @version 1.0.0
 * @since 2025-05-23
 */

import { z } from "zod";

/**
 * Company category enumeration for classification
 */
export const CompanyCategory = {
  INVELA: 'Invela',
  BANK: 'Bank',
  FINTECH: 'FinTech'
} as const;

export type CompanyCategory = typeof CompanyCategory[keyof typeof CompanyCategory];

/**
 * Accreditation status values for companies
 * 
 * Primary status values (current standard):
 * APPROVED - Companies with full accreditation
 * UNDER_REVIEW - Companies currently being evaluated (replacing IN_REVIEW)
 * IN_PROCESS - Companies with submissions in progress (replacing PENDING)
 * REVOKED - Companies whose accreditation has been taken away
 * 
 * Legacy status values (supported for backward compatibility):
 * PROVISIONALLY_APPROVED - Old approval status
 * IN_REVIEW - Old review status
 * PENDING - Old in-process status
 * SUSPENDED - Company with temporarily revoked access
 * EXPIRED - Company with lapsed accreditation
 */
export const AccreditationStatus = {
  // Primary status values
  APPROVED: 'APPROVED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  IN_PROCESS: 'IN_PROCESS',
  REVOKED: 'REVOKED',
  
  // Legacy status values (for backward compatibility)
  PROVISIONALLY_APPROVED: 'PROVISIONALLY_APPROVED',
  IN_REVIEW: 'IN_REVIEW',
  PENDING: 'PENDING',
  SUSPENDED: 'SUSPENDED',
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

export const documentSchema = z.object({
  name: z.string(),
  status: z.string(),
  documentId: z.string().optional(),
  uploadedAt: z.string().datetime().optional(),
  verifiedAt: z.string().datetime().optional(),
  type: z.string().optional(),
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
  risk_score: z.number().optional(), // Database column name
  riskScore: z.number().optional(), // Frontend property name
  chosen_score: z.number().nullable().optional(), // Database column name
  chosenScore: z.number().nullable().optional(), // Frontend property name
  accreditationStatus: z.enum([
    // Primary status values 
    'APPROVED',
    'UNDER_REVIEW',
    'IN_PROCESS',
    'REVOKED',
    // Legacy status values for backward compatibility
    'PROVISIONALLY_APPROVED',
    'IN_REVIEW',
    'PENDING',
    'SUSPENDED',
    'EXPIRED',
    'AWAITING_INVITATION'
  ]).default('IN_PROCESS'),
  available_tabs: z.array(z.string()).default(['task-center']),
  documents: z.array(documentSchema).optional(),
  logoId: z.string().optional(),
});

export type User = z.infer<typeof userSchema>;
export type Company = z.infer<typeof companySchema>;
export type Document = z.infer<typeof documentSchema>;