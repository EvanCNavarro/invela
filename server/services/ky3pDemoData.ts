/**
 * KY3P Demo Data Service
 * 
 * This service provides demo data for KY3P forms.
 */

import { logger } from '../utils/logger';

export interface DemoField {
  id: number;
  value: string;
  status?: string;
}

export interface DemoData {
  fields: DemoField[];
  metadata?: Record<string, any>;
}

/**
 * Get KY3P demo data for automatically filling forms
 * 
 * @returns Promise with demo field data
 */
export async function getKy3pDemoData(): Promise<DemoData> {
  logger.info('[KY3PDemoData] Generating KY3P demo data');
  
  // Generate demo field data
  const fields: DemoField[] = [];
  
  // Generate 120 sample fields with realistic values
  for (let i = 1; i <= 120; i++) {
    fields.push({
      id: i,
      value: getDemoValueForField(i),
      status: 'COMPLETE'
    });
  }
  
  return {
    fields,
    metadata: {
      generatedAt: new Date().toISOString(),
      source: 'ky3p_demo_generator'
    }
  };
}

/**
 * Get a realistic value for a KY3P field based on its ID
 * 
 * @param fieldId Field ID
 * @returns Demo value string
 */
function getDemoValueForField(fieldId: number): string {
  // Common field patterns for KY3P assessments
  switch (fieldId % 12) { // Use modulo to create repeating patterns
    case 0: // Yes/No pattern
      return fieldId % 3 === 0 ? 'Yes' : 'No';
    case 1: // Date pattern
      return generateRandomDate(new Date(2020, 0, 1), new Date());
    case 2: // Rating pattern
      return String(Math.floor(Math.random() * 5) + 1); // 1-5 rating
    case 3: // Text field
      return getRandomText(20, 50);
    case 4: // Compliance options
      return ['Compliant', 'Non-Compliant', 'Partially Compliant', 'Not Applicable'][Math.floor(Math.random() * 4)];
    case 5: // Frequency options
      return ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annually'][Math.floor(Math.random() * 5)];
    case 6: // Security level
      return ['Low', 'Medium', 'High', 'Critical'][Math.floor(Math.random() * 4)];
    case 7: // Document type
      return ['Policy', 'Procedure', 'Standard', 'Guideline'][Math.floor(Math.random() * 4)];
    case 8: // Access level
      return ['Public', 'Internal', 'Confidential', 'Restricted'][Math.floor(Math.random() * 4)];
    case 9: // Currency amount
      return `$${(Math.random() * 1000000).toFixed(2)}`;
    case 10: // Percentage
      return `${(Math.random() * 100).toFixed(2)}%`;
    case 11: // Status
      return ['Active', 'Inactive', 'Pending', 'In Review'][Math.floor(Math.random() * 4)];
    default:
      return 'Sample Value';
  }
}

/**
 * Generate a random date string in YYYY-MM-DD format
 * 
 * @param start Start date range
 * @param end End date range
 * @returns Date string
 */
function generateRandomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

/**
 * Generate random text for longer text fields
 * 
 * @param minLength Minimum length of text
 * @param maxLength Maximum length of text
 * @returns Random text string
 */
function getRandomText(minLength: number, maxLength: number): string {
  const words = [
    'security', 'compliance', 'assessment', 'vendor', 'risk', 'management',
    'policy', 'procedure', 'control', 'audit', 'review', 'document',
    'implementation', 'process', 'system', 'application', 'infrastructure', 'network',
    'data', 'protection', 'encryption', 'authentication', 'authorization', 'monitoring',
    'incident', 'response', 'business', 'continuity', 'disaster', 'recovery',
    'backup', 'restore', 'testing', 'training', 'awareness', 'governance',
    'standard', 'framework', 'requirement', 'regulation', 'law', 'contract'
  ];
  
  const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
  let result = '';
  
  while (result.length < length) {
    const word = words[Math.floor(Math.random() * words.length)];
    result += (result ? ' ' : '') + word;
  }
  
  return result.substring(0, maxLength);
}
