/**
 * ========================================
 * Company Size Generator Utility
 * ========================================
 * 
 * Generates realistic company data based on selected size parameters.
 * Provides consistent revenue and employee ranges for demo account creation.
 * 
 * Key Features:
 * - Size-based revenue and employee generation
 * - Proper formatting for currency and employee counts
 * - Comprehensive logging for debugging
 * - Type-safe implementation with validation
 * 
 * Size Ranges:
 * - Small: $1M-$10M revenue, 10-100 employees
 * - Medium: $10M-$100M revenue, 100-1,000 employees  
 * - Large: $100M-$500M revenue, 1,000-10,000 employees
 * - Extra-Large: $500M-$2B revenue, 10,000-50,000 employees
 * 
 * @module CompanySizeGenerator
 * @version 1.0.0
 * @since 2025-05-25
 */

// ========================================
// IMPORTS
// ========================================

// ========================================
// TYPES & INTERFACES
// ========================================

/**
 * Supported company size categories
 */
export type CompanySize = 'small' | 'medium' | 'large' | 'extra-large';

/**
 * Generated company financial data
 */
export interface CompanySizeData {
  revenue: string;           // Formatted revenue string (e.g., "$1.2B", "$500M")
  num_employees: number;     // Employee count
  revenue_tier: string;      // Normalized tier for database storage
  revenue_amount: number;    // Raw revenue amount for calculations
}

/**
 * Revenue and employee range configuration
 */
interface SizeConfiguration {
  min_revenue: number;       // Minimum revenue in dollars
  max_revenue: number;       // Maximum revenue in dollars
  min_employees: number;     // Minimum employee count
  max_employees: number;     // Maximum employee count
  tier_name: string;         // Database tier name
}

// ========================================
// CONSTANTS
// ========================================

/**
 * Company size configurations with realistic ranges
 * Based on standard business categorization practices
 */
const COMPANY_SIZE_CONFIG: Record<CompanySize, SizeConfiguration> = {
  'small': {
    min_revenue: 1_000_000,      // $1M
    max_revenue: 10_000_000,     // $10M
    min_employees: 10,
    max_employees: 100,
    tier_name: 'small'
  },
  'medium': {
    min_revenue: 10_000_000,     // $10M
    max_revenue: 100_000_000,    // $100M
    min_employees: 100,
    max_employees: 1_000,
    tier_name: 'medium'
  },
  'large': {
    min_revenue: 100_000_000,    // $100M
    max_revenue: 500_000_000,    // $500M
    min_employees: 1_000,
    max_employees: 10_000,
    tier_name: 'large'
  },
  'extra-large': {
    min_revenue: 500_000_000,    // $500M
    max_revenue: 2_000_000_000,  // $2B
    min_employees: 10_000,
    max_employees: 50_000,
    tier_name: 'xlarge'
  }
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Formats revenue amount into human-readable string
 * 
 * @param amount - Revenue amount in dollars
 * @returns Formatted string (e.g., "$1.2B", "$500M", "$45M")
 */
function formatRevenue(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  } else {
    return `$${(amount / 1_000_000).toFixed(0)}M`;
  }
}

/**
 * Generates random number within specified range (inclusive)
 * 
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Random integer between min and max
 */
function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Validates that the provided size is supported
 * 
 * @param size - Company size to validate
 * @returns Boolean indicating if size is valid
 */
function isValidCompanySize(size: string): size is CompanySize {
  return Object.keys(COMPANY_SIZE_CONFIG).includes(size);
}

// ========================================
// MAIN GENERATOR FUNCTION
// ========================================

/**
 * Generates realistic company data based on selected size
 * 
 * This function creates appropriate revenue and employee counts
 * that match the selected company size category.
 * 
 * @param size - Selected company size category
 * @returns Generated company size data with formatted values
 * 
 * @example
 * const data = generateCompanySizeData('extra-large');
 * console.log(data.revenue); // "$1.2B"
 * console.log(data.num_employees); // 25000
 */
export function generateCompanySizeData(size: string): CompanySizeData {
  console.log(`[CompanySizeGenerator] Starting generation for size: "${size}"`);
  
  // Validate input size
  if (!isValidCompanySize(size)) {
    console.warn(`[CompanySizeGenerator] Invalid size "${size}", defaulting to small`);
    size = 'small';
  }
  
  // Get configuration for the specified size
  const config = COMPANY_SIZE_CONFIG[size];
  console.log(`[CompanySizeGenerator] Using config for ${size}:`, {
    revenue_range: `$${config.min_revenue / 1_000_000}M - $${config.max_revenue / 1_000_000}M`,
    employee_range: `${config.min_employees} - ${config.max_employees}`,
    tier: config.tier_name
  });
  
  // Generate random values within the specified ranges
  const revenueAmount = randomInRange(config.min_revenue, config.max_revenue);
  const employeeCount = randomInRange(config.min_employees, config.max_employees);
  
  // Format the generated data
  const formattedRevenue = formatRevenue(revenueAmount);
  
  const result: CompanySizeData = {
    revenue: formattedRevenue,
    num_employees: employeeCount,
    revenue_tier: config.tier_name,
    revenue_amount: revenueAmount
  };
  
  console.log(`[CompanySizeGenerator] ✅ Generated ${size} company:`, {
    revenue: result.revenue,
    employees: result.num_employees,
    tier: result.revenue_tier
  });
  
  return result;
}

/**
 * Gets the list of supported company sizes
 * 
 * @returns Array of supported company size strings
 */
export function getSupportedSizes(): CompanySize[] {
  return Object.keys(COMPANY_SIZE_CONFIG) as CompanySize[];
}

/**
 * Gets the configuration for a specific company size
 * 
 * @param size - Company size to get configuration for
 * @returns Size configuration or null if invalid
 */
export function getSizeConfiguration(size: string): SizeConfiguration | null {
  if (!isValidCompanySize(size)) {
    return null;
  }
  return COMPANY_SIZE_CONFIG[size as CompanySize];
}

// ========================================
// SHARED CONSTANTS FOR UI COMPONENTS
// ========================================

/**
 * Standard employee count ranges for UI display
 * Used by onboarding modals and form components
 */
export const EMPLOYEE_RANGES = {
  small: '10-100 employees',
  medium: '100-1,000 employees', 
  large: '1,000-10,000 employees',
  'extra-large': '10,000-50,000 employees'
} as const;

/**
 * Standard revenue ranges for UI display
 * Used by onboarding modals and form components
 */
export const REVENUE_RANGES = {
  small: '$1M-$10M',
  medium: '$10M-$100M',
  large: '$100M-$500M', 
  'extra-large': '$500M-$2B'
} as const;

/**
 * Employee count mapping for database storage
 * Maps size categories to representative employee counts
 */
export const EMPLOYEE_COUNT_MAP = {
  small: 55,     // middle of 10-100 range
  medium: 550,   // middle of 100-1,000 range
  large: 5500,   // middle of 1,000-10,000 range
  xlarge: 30000  // representative value for 10,000-50,000 range
} as const;

/**
 * Revenue value mapping for database storage
 * Maps size categories to representative revenue amounts
 */
export const REVENUE_VALUE_MAP = {
  small: 5500000,      // $5.5M - middle of $1M-$10M range
  medium: 55000000,    // $55M - middle of $10M-$100M range  
  large: 300000000,    // $300M - middle of $100M-$500M range
  xlarge: 1250000000   // $1.25B - middle of $500M-$2B range
} as const;

// ========================================
// HELPER FUNCTIONS FOR UI COMPONENTS
// ========================================

/**
 * Gets employee range display text for a company size
 * Safe function with fallback for unknown sizes
 * 
 * @param size - Company size ('small', 'medium', 'large', 'extra-large', 'xlarge')
 * @param context - Context for logging (e.g., 'onboarding-modal', 'demo-page')
 * @returns Employee range display text
 */
export function getEmployeeRangeText(size: string, context: string = 'unknown'): string {
  console.log(`[CompanySizeHelper] Getting employee range for size="${size}" from context="${context}"`);
  
  // Handle 'xlarge' vs 'extra-large' mapping
  const normalizedSize = size === 'xlarge' ? 'extra-large' : size;
  
  if (normalizedSize in EMPLOYEE_RANGES) {
    const result = EMPLOYEE_RANGES[normalizedSize as keyof typeof EMPLOYEE_RANGES];
    console.log(`[CompanySizeHelper] ✅ Found employee range: ${result}`);
    return result;
  }
  
  console.warn(`[CompanySizeHelper] ⚠️ Unknown size "${size}" from ${context}, using fallback`);
  return '10-100 employees'; // Safe fallback
}

/**
 * Gets revenue range display text for a company size
 * Safe function with fallback for unknown sizes
 * 
 * @param size - Company size ('small', 'medium', 'large', 'extra-large', 'xlarge')
 * @param context - Context for logging (e.g., 'onboarding-modal', 'demo-page')  
 * @returns Revenue range display text
 */
export function getRevenueRangeText(size: string, context: string = 'unknown'): string {
  console.log(`[CompanySizeHelper] Getting revenue range for size="${size}" from context="${context}"`);
  
  // Handle 'xlarge' vs 'extra-large' mapping
  const normalizedSize = size === 'xlarge' ? 'extra-large' : size;
  
  if (normalizedSize in REVENUE_RANGES) {
    const result = REVENUE_RANGES[normalizedSize as keyof typeof REVENUE_RANGES];
    console.log(`[CompanySizeHelper] ✅ Found revenue range: ${result}`);
    return result;
  }
  
  console.warn(`[CompanySizeHelper] ⚠️ Unknown size "${size}" from ${context}, using fallback`);
  return '$1M-$10M'; // Safe fallback
}

/**
 * Gets representative employee count for database storage
 * Safe function with fallback for unknown sizes
 * 
 * @param size - Company size ('small', 'medium', 'large', 'xlarge', 'extra-large')
 * @param context - Context for logging
 * @returns Representative employee count
 */
export function getEmployeeCount(size: string, context: string = 'unknown'): number {
  console.log(`[CompanySizeHelper] Getting employee count for size="${size}" from context="${context}"`);
  
  // Handle 'extra-large' vs 'xlarge' mapping
  const normalizedSize = size === 'extra-large' ? 'xlarge' : size;
  
  if (normalizedSize in EMPLOYEE_COUNT_MAP) {
    const result = EMPLOYEE_COUNT_MAP[normalizedSize as keyof typeof EMPLOYEE_COUNT_MAP];
    console.log(`[CompanySizeHelper] ✅ Found employee count: ${result}`);
    return result;
  }
  
  console.warn(`[CompanySizeHelper] ⚠️ Unknown size "${size}" from ${context}, using fallback`);
  return 55; // Safe fallback (small company)
}

/**
 * Gets representative revenue value for database storage
 * Safe function with fallback for unknown sizes
 * 
 * @param size - Company size ('small', 'medium', 'large', 'xlarge', 'extra-large')
 * @param context - Context for logging
 * @returns Representative revenue amount in dollars
 */
export function getRevenueValue(size: string, context: string = 'unknown'): number {
  console.log(`[CompanySizeHelper] Getting revenue value for size="${size}" from context="${context}"`);
  
  // Handle 'extra-large' vs 'xlarge' mapping
  const normalizedSize = size === 'extra-large' ? 'xlarge' : size;
  
  if (normalizedSize in REVENUE_VALUE_MAP) {
    const result = REVENUE_VALUE_MAP[normalizedSize as keyof typeof REVENUE_VALUE_MAP];
    console.log(`[CompanySizeHelper] ✅ Found revenue value: $${(result / 1000000).toFixed(1)}M`);
    return result;
  }
  
  console.warn(`[CompanySizeHelper] ⚠️ Unknown size "${size}" from ${context}, using fallback`);
  return 5500000; // Safe fallback ($5.5M - small company)
}