/**
 * Helper function to get the accreditation status from a company object
 * regardless of which property naming convention is used
 * 
 * @param company The company data object
 * @returns The accreditation status string or undefined if not found
 */
export function getCompanyAccreditationStatus(company: any): string | undefined {
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
 * Helper function to determine the display category based on accreditation status
 * 
 * Maps the detailed status values to one of three categories for UI purposes:
 * - VALID: Approved companies
 * - PENDING: Companies that are under review or in process
 * - INVALID: Companies with revoked access
 * 
 * Also handles legacy status values for backward compatibility
 */
export function getAccreditationStatusCategory(status: string | undefined): 'VALID' | 'PENDING' | 'INVALID' | undefined {
  if (!status) return undefined;
  
  // Normalize the status to lowercase for case-insensitive comparison
  const normalizedStatus = status.toLowerCase();
  
  // Valid status values
  if (normalizedStatus === 'approved') {
    return 'VALID';
  }
  
  // Pending status values
  if (normalizedStatus === 'under review' || 
      normalizedStatus === 'in process' || 
      normalizedStatus === 'pending') {
    return 'PENDING';
  }
  
  // Invalid status values
  if (normalizedStatus === 'revoked') {
    return 'INVALID';
  }
  
  // Legacy status mapping
  if (normalizedStatus === 'connected') {
    return 'VALID';
  }
  
  if (normalizedStatus === 'not connected' || 
      normalizedStatus === 'requires approval') {
    return 'PENDING';
  }
  
  // Default for unrecognized status values
  return 'PENDING';
}

/**
 * Helper function to get a user-friendly label for the accreditation status
 * 
 * Converts the raw accreditation status to a formatted display label,
 * handling both new status values and legacy status values
 */
export function getAccreditationStatusLabel(status: string | undefined): string {
  if (!status) return 'Unknown';
  
  // Normalize the status to lowercase for case-insensitive comparison
  const normalizedStatus = status.toLowerCase();
  
  // Map legacy status values to new formatted labels
  if (normalizedStatus === 'connected') {
    return 'Approved';
  }
  
  if (normalizedStatus === 'not connected') {
    return 'Under Review';
  }
  
  if (normalizedStatus === 'requires approval') {
    return 'In Process';
  }
  
  // For new status values, just capitalize the first letter of each word
  return status
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
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
} {
  if (!status) {
    return { 
      label: 'Unknown',
      variant: 'outline',
      className: 'text-gray-500 border-gray-300'
    };
  }
  
  const category = getAccreditationStatusCategory(status);
  const label = getAccreditationStatusLabel(status);
  
  switch (category) {
    case 'VALID':
      return { 
        label,
        className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
      };
    case 'PENDING':
      if (status.toLowerCase() === 'under review') {
        return { 
          label,
          className: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200'
        };
      }
      return { 
        label,
        className: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200'
      };
    case 'INVALID':
      return { 
        label,
        className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'
      };
    default:
      return { 
        label,
        variant: 'outline',
        className: 'text-gray-500 border-gray-300'
      };
  }
}