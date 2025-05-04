/**
 * Open Banking Demo Data Service
 * 
 * This service provides demo data for Open Banking forms.
 */

import { logger } from '../utils/logger';
import { DemoData, DemoField } from './ky3pDemoData';

/**
 * Get Open Banking demo data for automatically filling forms
 * 
 * @returns Promise with demo field data
 */
export async function getOpenBankingDemoData(): Promise<DemoData> {
  logger.info('[OpenBankingDemoData] Generating Open Banking demo data');
  
  // Generate demo field data
  const fields: DemoField[] = [];
  
  // Generate 44 sample fields with realistic values
  for (let i = 1; i <= 44; i++) {
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
      source: 'open_banking_demo_generator'
    }
  };
}

/**
 * Get a realistic value for an Open Banking field based on its ID
 * 
 * @param fieldId Field ID
 * @returns Demo value string
 */
function getDemoValueForField(fieldId: number): string {
  // Common field patterns for Open Banking assessments
  switch (fieldId % 10) { // Use modulo to create repeating patterns
    case 0: // Yes/No pattern
      return fieldId % 3 === 0 ? 'Yes' : 'No';
    case 1: // API status
      return ['Active', 'In Development', 'Planned', 'Deprecated'][Math.floor(Math.random() * 4)];
    case 2: // Implementation timeline
      return ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026'][Math.floor(Math.random() * 5)];
    case 3: // Standards compliance
      return ['Fully Compliant', 'Partially Compliant', 'Non-Compliant', 'In Progress'][Math.floor(Math.random() * 4)];
    case 4: // Data sharing scope
      return ['Account Information', 'Payment Initiation', 'Both', 'Other'][Math.floor(Math.random() * 4)];
    case 5: // Authentication method
      return ['OAuth 2.0', 'FAPI', 'Proprietary', 'Multiple Methods'][Math.floor(Math.random() * 4)];
    case 6: // Regulatory status
      return ['Regulated', 'Exempt', 'Pending Approval', 'Not Applicable'][Math.floor(Math.random() * 4)];
    case 7: // API versions
      return ['v1.0', 'v2.0', 'v3.0', 'Multiple Versions'][Math.floor(Math.random() * 4)];
    case 8: // Long text field
      return getRandomText(20, 80);
    case 9: // Numeric field
      return String(Math.floor(Math.random() * 1000));
    default:
      return 'Sample Value';
  }
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
    'api', 'integration', 'banking', 'open', 'standard', 'financial',
    'data', 'customer', 'account', 'payment', 'transaction', 'balance',
    'authentication', 'authorization', 'consent', 'security', 'encryption', 'implementation',
    'regulation', 'compliance', 'interface', 'sandbox', 'production', 'testing',
    'documentation', 'specification', 'version', 'endpoint', 'response', 'request',
    'service', 'provider', 'third-party', 'access', 'permission', 'scope',
    'developer', 'portal', 'registry', 'certificate', 'token', 'credential'
  ];
  
  const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
  let result = '';
  
  while (result.length < length) {
    const word = words[Math.floor(Math.random() * words.length)];
    result += (result ? ' ' : '') + word;
  }
  
  return result.substring(0, maxLength);
}
