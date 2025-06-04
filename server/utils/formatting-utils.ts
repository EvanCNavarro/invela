/**
 * ========================================
 * Unified Formatting Utilities
 * ========================================
 * 
 * Centralized formatting functions for consistent number display across the application.
 * Provides standardized K/M/B suffix formatting and business-friendly number rounding.
 * 
 * @module FormattingUtils
 * @version 1.0.0
 */

/**
 * Formats revenue amounts with K/M/B suffixes
 * 
 * @param amount - Revenue amount in dollars
 * @returns Formatted string (e.g., "$25.4K", "$55.7M", "$1.2B")
 */
export function formatRevenue(amount: number): string {
  if (amount >= 1_000_000_000) {
    const billions = amount / 1_000_000_000;
    return `$${parseFloat(billions.toFixed(1))}B`;
  } else if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `$${parseFloat(millions.toFixed(1))}M`;
  } else if (amount >= 1_000) {
    const thousands = amount / 1_000;
    return `$${parseFloat(thousands.toFixed(1))}K`;
  } else {
    return `$${amount}`;
  }
}

/**
 * Formats raw revenue numbers to display format
 * Handles both raw numbers and already formatted strings
 * 
 * @param revenue - Revenue value (number or string)
 * @returns Formatted revenue string
 */
export function formatRevenueDisplay(revenue: number | string): string {
  if (typeof revenue === 'string') {
    // If already formatted (contains $ or letters), return as-is
    if (revenue.includes('$') || /[a-zA-Z]/.test(revenue)) {
      return revenue;
    }
    // If string number, parse and format
    const parsed = parseFloat(revenue);
    return isNaN(parsed) ? revenue : formatRevenue(parsed);
  }
  return formatRevenue(revenue);
}

/**
 * Rounds employee counts to business-friendly numbers
 * 
 * @param count - Raw employee count
 * @returns Rounded employee count (e.g., 5697 → 5700, 1833 → 1830)
 */
export function roundEmployeeCount(count: number): number {
  if (count >= 10000) {
    // Round to nearest 100 for large companies
    return Math.round(count / 100) * 100;
  } else if (count >= 1000) {
    // Round to nearest 50 for medium companies
    return Math.round(count / 50) * 50;
  } else if (count >= 100) {
    // Round to nearest 10 for smaller companies
    return Math.round(count / 10) * 10;
  } else {
    // Round to nearest 5 for very small companies
    return Math.round(count / 5) * 5;
  }
}

/**
 * Formats employee count with K suffix for large numbers
 * 
 * @param count - Employee count
 * @returns Formatted string (e.g., "1.2K", "25.4K", "350")
 */
export function formatEmployeeCount(count: number): string {
  const rounded = roundEmployeeCount(count);
  
  if (rounded >= 1000) {
    const thousands = rounded / 1000;
    return `${parseFloat(thousands.toFixed(1))}K`;
  }
  
  return rounded.toString();
}