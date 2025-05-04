/**
 * KYB Demo Data Service
 * 
 * This service provides demo data for KYB forms.
 */

import { logger } from '../utils/logger';
import { DemoData, DemoField } from './ky3pDemoData';

/**
 * Get KYB demo data for automatically filling forms
 * 
 * @returns Promise with demo field data
 */
export async function getKybDemoData(): Promise<DemoData> {
  logger.info('[KYBDemoData] Generating KYB demo data');
  
  // Generate demo field data
  const fields: DemoField[] = [];
  
  // Generate 30 sample fields with realistic values
  for (let i = 1; i <= 30; i++) {
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
      source: 'kyb_demo_generator'
    }
  };
}

/**
 * Get a realistic value for a KYB field based on its ID
 * 
 * @param fieldId Field ID
 * @returns Demo value string
 */
function getDemoValueForField(fieldId: number): string {
  // Common field patterns for KYB forms
  switch (fieldId % 15) { // Use modulo to create repeating patterns
    case 0: // Company name
      return ['TechFin Solutions', 'Global Payment Systems', 'NextGen Banking', 'Digital Financial Services', 'Secure Transaction Technologies'][Math.floor(Math.random() * 5)];
    case 1: // Company registration number
      return `REG-${Math.floor(1000000 + Math.random() * 9000000)}`;
    case 2: // Incorporation date
      return generateRandomDate(new Date(2010, 0, 1), new Date(2022, 11, 31));
    case 3: // Business address
      return generateBusinessAddress();
    case 4: // Business type
      return ['LLC', 'Corporation', 'Partnership', 'Sole Proprietorship', 'Public Company'][Math.floor(Math.random() * 5)];
    case 5: // Industry sector
      return ['Financial Technology', 'Banking Services', 'Payment Processing', 'Lending', 'Investment Management'][Math.floor(Math.random() * 5)];
    case 6: // Number of employees
      return String(Math.floor(10 + Math.random() * 990)); // 10-1000 employees
    case 7: // Annual revenue
      return `$${(Math.floor(1 + Math.random() * 100)) * 1000000}`; // $1M-$100M
    case 8: // Website URL
      const domains = ['example.com', 'tech-finance.com', 'digitalpayments.io', 'securetransact.com', 'nextgenbanking.net'];
      return `https://www.${domains[Math.floor(Math.random() * domains.length)]}`;
    case 9: // Contact email
      const emailDomains = ['example.com', 'business.com', 'enterprise.io', 'corporate.net', 'fintech.co'];
      return `contact@${emailDomains[Math.floor(Math.random() * emailDomains.length)]}`;
    case 10: // Contact phone
      return `+1 (${Math.floor(100 + Math.random() * 900)}) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`;
    case 11: // Tax ID
      return `TAX-${Math.floor(10000000 + Math.random() * 90000000)}`;
    case 12: // Regulatory status
      return ['Fully Regulated', 'Partially Regulated', 'Exempt', 'Pending Approval', 'Not Regulated'][Math.floor(Math.random() * 5)];
    case 13: // Long description
      return getRandomText(30, 100);
    case 14: // Yes/No field
      return fieldId % 3 === 0 ? 'Yes' : 'No';
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
 * Generate a realistic business address
 * 
 * @returns Address string
 */
function generateBusinessAddress(): string {
  const streetNumbers = [123, 456, 789, 555, 999, 1000, 1200, 8800];
  const streetNames = ['Main Street', 'Technology Drive', 'Financial Avenue', 'Corporate Boulevard', 'Innovation Way', 'Commerce Street'];
  const cities = ['New York', 'San Francisco', 'Chicago', 'Boston', 'Austin', 'Seattle', 'Denver', 'Atlanta', 'Miami'];
  const states = ['NY', 'CA', 'IL', 'MA', 'TX', 'WA', 'CO', 'GA', 'FL'];
  const zipCodes = ['10001', '94105', '60604', '02110', '78701', '98101', '80202', '30303', '33131'];
  
  const streetNumber = streetNumbers[Math.floor(Math.random() * streetNumbers.length)];
  const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
  const cityIndex = Math.floor(Math.random() * cities.length);
  
  return `${streetNumber} ${streetName}, ${cities[cityIndex]}, ${states[cityIndex]} ${zipCodes[cityIndex]}`;
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
    'business', 'company', 'financial', 'services', 'technology', 'platform',
    'solution', 'enterprise', 'corporate', 'commercial', 'banking', 'payment',
    'transaction', 'processing', 'digital', 'secure', 'innovative', 'compliant',
    'regulatory', 'customer', 'client', 'partner', 'global', 'local',
    'international', 'domestic', 'market', 'industry', 'sector', 'growth',
    'development', 'strategy', 'implementation', 'management', 'leadership', 'team'
  ];
  
  const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
  let result = '';
  
  while (result.length < length) {
    const word = words[Math.floor(Math.random() * words.length)];
    result += (result ? ' ' : '') + word;
  }
  
  return result.substring(0, maxLength);
}
