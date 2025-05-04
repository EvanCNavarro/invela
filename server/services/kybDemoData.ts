/**
 * KYB Demo Data Service
 * 
 * This module provides demo data generation functions for KYB (Know Your Business) forms.
 * It generates realistic looking data that can be used to auto-fill KYB forms for testing or demo purposes.
 */

import { logger } from '../utils/logger';

/**
 * Generate and return demo data for KYB forms
 */
export async function getKybDemoData() {
  try {
    const demoData = {
      fields: [
        // Company Information
        { id: 1, value: 'DevTech Solutions Inc.', status: 'COMPLETE' },
        { id: 2, value: 'Limited Liability Company (LLC)', status: 'COMPLETE' },
        { id: 3, value: '123 Main Street, Suite 500, San Francisco, CA 94105', status: 'COMPLETE' },
        { id: 4, value: 'https://www.devtechsolutions.example', status: 'COMPLETE' },
        
        // Business Information
        { id: 5, value: 'Financial Technology', status: 'COMPLETE' },
        { id: 6, value: 'Payment processing, fraud detection, and risk management solutions', status: 'COMPLETE' },
        { id: 7, value: '2018', status: 'COMPLETE' },
        { id: 8, value: '101-250', status: 'COMPLETE' },
        
        // Regulatory Information
        { id: 9, value: 'Yes', status: 'COMPLETE' },
        { id: 10, value: 'Money Services Business (MSB) License', status: 'COMPLETE' },
        { id: 11, value: 'Financial Crimes Enforcement Network (FinCEN)', status: 'COMPLETE' },
        { id: 12, value: 'April 2023', status: 'COMPLETE' },
        
        // Financial Information
        { id: 13, value: '$10-50 million', status: 'COMPLETE' },
        { id: 14, value: '35%', status: 'COMPLETE' },
        { id: 15, value: 'Series B', status: 'COMPLETE' },
        { id: 16, value: 'Venture Capital', status: 'COMPLETE' },
        
        // Key Personnel
        { id: 17, value: 'Jane Smith, CEO and Co-founder', status: 'COMPLETE' },
        { id: 18, value: 'John Davis, CTO and Co-founder', status: 'COMPLETE' },
        { id: 19, value: 'Sarah Johnson, CFO', status: 'COMPLETE' },
        { id: 20, value: 'Michael Chen, Chief Compliance Officer', status: 'COMPLETE' },
        
        // Compliance Information
        { id: 21, value: 'Yes', status: 'COMPLETE' },
        { id: 22, value: 'Anti-Money Laundering (AML) Policy', status: 'COMPLETE' },
        { id: 23, value: 'Know Your Customer (KYC) Procedures', status: 'COMPLETE' },
        { id: 24, value: 'Suspicious Activity Reporting Protocol', status: 'COMPLETE' },
        
        // Risk Assessment
        { id: 25, value: 'Low to Medium', status: 'COMPLETE' },
        { id: 26, value: 'Yes', status: 'COMPLETE' },
        { id: 27, value: 'Internal audit team and annual third-party assessment', status: 'COMPLETE' },
        { id: 28, value: 'Compliance department with direct reporting to CCO', status: 'COMPLETE' },
        
        // Business Relationships
        { id: 29, value: 'Mastercard, Visa', status: 'COMPLETE' },
        { id: 30, value: 'AWS, Microsoft Azure', status: 'COMPLETE' }
      ],
      metadata: {
        autoFilled: true,
        fillTimestamp: new Date().toISOString(),
        source: 'unified-demo-service'
      }
    };
    
    logger.info(`[KYBDemoData] Generated demo data with ${demoData.fields.length} fields`);
    return demoData;
  } catch (error) {
    logger.error(`[KYBDemoData] Error generating demo data: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
