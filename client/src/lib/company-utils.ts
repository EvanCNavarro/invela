/**
 * ========================================
 * Company Utilities - Business Logic Support
 * ========================================
 * 
 * Utility functions for company data processing and standardization in the
 * enterprise risk assessment platform. Handles cross-API compatibility,
 * data normalization, and business logic abstraction.
 * 
 * @module lib/company-utils
 * @version 1.0.0
 * @since 2025-05-23
 */

/**
 * Helper function to get the accreditation status from a company object
 * regardless of which property naming convention is used
 * 
 * @param company The company data object
 * @returns The accreditation status string or undefined if not found
 */
export function getCompanyAccreditationStatus(company: any): string | undefined {
  // Guard against null/undefined company object
  if (!company || typeof company !== 'object') {
    return undefined;
  }
  
  // First check for camelCase version (standardized)
  if (company.accreditationStatus) {
    return company.accreditationStatus;
  }
  
  // Then check for snake_case version (legacy API format)
  // Using bracket notation to avoid TypeScript errors with dynamic properties
  if (company['accreditation_status']) {
    return company['accreditation_status'];
  }
  
  // Return undefined if neither property exists
  return undefined;
}

/**
 * STANDARDIZED ACCREDITATION STATUSES
 * These are the canonical status values used throughout the application:
 * - APPROVED: Company has been approved for data access
 * - IN_PROCESS: Company is being processed for approval
 * - UNDER_REVIEW: Company is under review for approval
 * - REVOKED: Company's approval has been revoked
 * 
 * Any other status values should be normalized to one of these.
 */
export type AccreditationStatus = 'APPROVED' | 'IN_PROCESS' | 'UNDER_REVIEW' | 'REVOKED' | 'NOT_AVAILABLE';

/**
 * Helper function to normalize various status formats to our standard status values
 * 
 * This ensures consistent status display across the application regardless of 
 * the original format or naming convention used in the data.
 */
export function normalizeAccreditationStatus(status: string | undefined | null): AccreditationStatus {
  if (!status) return 'NOT_AVAILABLE';
  
  // Handle string "null" or "undefined" as actual null
  if (status.toLowerCase() === 'null' || status.toLowerCase() === 'undefined') {
    return 'NOT_AVAILABLE';
  }
  
  // Normalize the status to uppercase without spaces/underscores for comparison
  const normalized = status.toUpperCase().replace(/[_\s-]/g, '');
  
  // Map to our standardized values
  if (['APPROVED', 'CONNECTED', 'VALID', 'PROVISIONALLYAPPROVED'].includes(normalized)) {
    return 'APPROVED';
  }
  
  if (['INPROCESS', 'PENDING', 'REQUIRESAPPROVAL', 'PROCESSING'].includes(normalized)) {
    return 'IN_PROCESS';
  }
  
  if (['UNDERREVIEW', 'INREVIEW', 'REVIEW'].includes(normalized)) {
    return 'UNDER_REVIEW';
  }
  
  if (['REVOKED', 'DECLINED', 'REJECTED', 'EXPIRED', 'SUSPENDED'].includes(normalized)) {
    return 'REVOKED';
  }
  
  // Default fallback for unrecognized values
  return 'NOT_AVAILABLE';
}

/**
 * Helper function to determine the display category based on accreditation status
 * 
 * Maps the detailed status values to one of three categories for UI purposes:
 * - VALID: Approved companies
 * - PENDING: Companies that are under review or in process
 * - INVALID: Companies with revoked access or no status
 */
export function getAccreditationStatusCategory(status: string | undefined): 'VALID' | 'PENDING' | 'INVALID' | undefined {
  if (!status) return 'INVALID';
  
  const normalizedStatus = normalizeAccreditationStatus(status);
  
  switch (normalizedStatus) {
    case 'APPROVED':
      return 'VALID';
    case 'IN_PROCESS':
    case 'UNDER_REVIEW':
      return 'PENDING';
    case 'REVOKED':
    case 'NOT_AVAILABLE':
      return 'INVALID';
    default:
      return 'INVALID';
  }
}

/**
 * Helper function to get a user-friendly label for the accreditation status
 * 
 * Converts the standardized status to a properly formatted display label
 */
export function getAccreditationStatusLabel(status: string | undefined): string {
  if (!status) return 'Not Available';
  
  const normalizedStatus = normalizeAccreditationStatus(status);
  
  switch (normalizedStatus) {
    case 'APPROVED':
      return 'Approved';
    case 'IN_PROCESS':
      return 'In Process';
    case 'UNDER_REVIEW':
      return 'Under Review';
    case 'REVOKED':
      return 'Revoked';
    case 'NOT_AVAILABLE':
      return 'Not Available';
    default:
      return 'Not Available';
  }
}

/**
 * Returns badge style information for the given accreditation status
 * 
 * @param status The accreditation status string
 * @returns Style information for the badge
 */
export function getStatusBadgeStyle(status: string | undefined): { 
  label: string; 
  variant?: "default" | "secondary" | "destructive" | "outline"; 
  className: string;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
} {
  if (!status) {
    return { 
      label: 'Not Available',
      variant: 'outline',
      className: 'text-rose-500 border-rose-200',
      bgColor: 'bg-white',
      textColor: 'text-rose-500',
      borderColor: 'border-rose-200',
      gradientFrom: 'from-rose-500',
      gradientTo: 'to-rose-200'
    };
  }
  
  const normalizedStatus = normalizeAccreditationStatus(status);
  const label = getAccreditationStatusLabel(status);
  
  switch (normalizedStatus) {
    case 'APPROVED':
      return { 
        label,
        className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-200',
        gradientFrom: 'from-green-600',
        gradientTo: 'to-green-300'
      };
    case 'IN_PROCESS':
      return { 
        label,
        className: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200',
        bgColor: 'bg-amber-100',
        textColor: 'text-amber-800',
        borderColor: 'border-amber-200',
        gradientFrom: 'from-amber-500',
        gradientTo: 'to-amber-300'
      };
    case 'UNDER_REVIEW':
      return { 
        label,
        className: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-800',
        borderColor: 'border-purple-200',
        gradientFrom: 'from-purple-500',
        gradientTo: 'to-purple-300'
      };
    case 'REVOKED':
      return { 
        label,
        className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        borderColor: 'border-red-200',
        gradientFrom: 'from-red-600',
        gradientTo: 'to-red-300'
      };
    case 'NOT_AVAILABLE':
      return { 
        label,
        className: 'bg-white text-rose-500 border-rose-200',
        bgColor: 'bg-white',
        textColor: 'text-rose-500',
        borderColor: 'border-rose-200',
        gradientFrom: 'from-rose-500',
        gradientTo: 'to-rose-200'
      };
    default:
      return { 
        label,
        variant: 'outline',
        className: 'text-gray-500 border-gray-300',
        bgColor: 'bg-white',
        textColor: 'text-gray-500',
        borderColor: 'border-gray-300',
        gradientFrom: 'from-gray-400',
        gradientTo: 'to-gray-200'
      };
  }
}