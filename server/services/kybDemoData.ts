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
        { id: 1, value: 'FinTech Solutions Inc.', status: 'COMPLETE' },
        { id: 2, value: 'Delaware', status: 'COMPLETE' },
        { id: 3, value: '2018-05-12', status: 'COMPLETE' },
        { id: 4, value: '1 Innovation Drive, San Francisco, CA 94105', status: 'COMPLETE' },
        { id: 5, value: 'www.fintechsolutions.example', status: 'COMPLETE' },
        
        // Business Classification
        { id: 6, value: 'FinTech', status: 'COMPLETE' },
        { id: 7, value: 'Financial Technology Services', status: 'COMPLETE' },
        { id: 8, value: 'Payment Processing, Digital Banking, Personal Finance Management', status: 'COMPLETE' },
        { id: 9, value: 'United States, Canada, Europe', status: 'COMPLETE' },
        { id: 10, value: 'C-Corporation', status: 'COMPLETE' },
        
        // Financial Information
        { id: 11, value: '12,500,000', status: 'COMPLETE' },
        { id: 12, value: '78,000,000', status: 'COMPLETE' },
        { id: 13, value: 'Series B', status: 'COMPLETE' },
        { id: 14, value: 'Acme Ventures, Innovation Capital, Tech Growth Fund', status: 'COMPLETE' },
        { id: 15, value: 'FTS123456789', status: 'COMPLETE' },
        
        // Compliance & Risk
        { id: 16, value: 'SOC 2 Type II, PCI DSS Level 1', status: 'COMPLETE' },
        { id: 17, value: 'Yes, quarterly penetration testing', status: 'COMPLETE' },
        { id: 18, value: 'Yes, Chief Compliance Officer and dedicated team', status: 'COMPLETE' },
        { id: 19, value: 'Annual third-party audits, internal quarterly reviews', status: 'COMPLETE' },
        { id: 20, value: 'No regulatory actions or material litigation', status: 'COMPLETE' },
        
        // Leadership & Organization
        { id: 21, value: '145', status: 'COMPLETE' },
        { id: 22, value: 'Sarah Johnson (CEO), Michael Chen (CTO), Elena Rodriguez (CFO)', status: 'COMPLETE' },
        { id: 23, value: 'Board consists of 7 members including 3 independent directors', status: 'COMPLETE' },
        { id: 24, value: 'Yes, quarterly reviews and annual strategy sessions', status: 'COMPLETE' },
        { id: 25, value: 'Engineering (35%), Sales (25%), Operations (20%), Other (20%)', status: 'COMPLETE' },
        
        // Customer & Partnership Information
        { id: 26, value: 'Major Bank A, Financial Institution B, Technology Platform C', status: 'COMPLETE' },
        { id: 27, value: 'Cloud Provider X, Security Firm Y, Data Analytics Partner Z', status: 'COMPLETE' },
        { id: 28, value: 'Subscription model with tiered pricing, enterprise contracts', status: 'COMPLETE' },
        { id: 29, value: '350+ business clients, 2.2M end users through our platform', status: 'COMPLETE' },
        { id: 30, value: 'HIPAA, GDPR, CCPA compliance where applicable', status: 'COMPLETE' }
      ],
      metadata: {
        autoFilled: true,
        fillTimestamp: new Date().toISOString(),
        source: 'unified-demo-service'
      }
    };
    
    logger.info(`[KybDemoData] Generated demo data with ${demoData.fields.length} fields`);
    return demoData;
  } catch (error) {
    logger.error(`[KybDemoData] Error generating demo data: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
