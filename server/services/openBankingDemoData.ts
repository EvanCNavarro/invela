/**
 * Open Banking Demo Data Service
 * 
 * This module provides demo data generation functions for Open Banking Survey forms.
 * It generates realistic looking data that can be used to auto-fill forms for testing or demo purposes.
 */

import { logger } from '../utils/logger';

/**
 * Generate and return demo data for Open Banking Survey forms
 */
export async function getOpenBankingDemoData() {
  try {
    const demoData = {
      fields: [
        // API Infrastructure
        { id: 1, value: 'Yes', status: 'COMPLETE' },
        { id: 2, value: 'REST APIs with OAuth 2.0', status: 'COMPLETE' },
        { id: 3, value: 'Account Information, Payment Initiation, Funds Confirmation', status: 'COMPLETE' },
        { id: 4, value: 'Yes, published on developer portal', status: 'COMPLETE' },
        
        // Security Measures
        { id: 5, value: 'OAuth 2.0 with mutual TLS', status: 'COMPLETE' },
        { id: 6, value: 'Yes, following OWASP guidelines', status: 'COMPLETE' },
        { id: 7, value: 'Monthly penetration testing', status: 'COMPLETE' },
        { id: 8, value: 'Yes, HTTPS with TLS 1.3', status: 'COMPLETE' },
        
        // Data Protection
        { id: 9, value: 'End-to-end encryption (AES-256)', status: 'COMPLETE' },
        { id: 10, value: 'Yes, all customer data is encrypted at rest and in transit', status: 'COMPLETE' },
        { id: 11, value: 'Yes, using access tokens with short expiry', status: 'COMPLETE' },
        { id: 12, value: 'Yes, using secure data tokenization', status: 'COMPLETE' },
        
        // Customer Consent
        { id: 13, value: 'Yes, granular permission system', status: 'COMPLETE' },
        { id: 14, value: 'Consent management dashboard for users', status: 'COMPLETE' },
        { id: 15, value: 'Yes, can be revoked through mobile app or website', status: 'COMPLETE' },
        { id: 16, value: '90 days with option to extend', status: 'COMPLETE' },
        
        // Regulatory Compliance
        { id: 17, value: 'Yes, PSD2, GDPR, and local regulations', status: 'COMPLETE' },
        { id: 18, value: 'Quarterly audits by external firm', status: 'COMPLETE' },
        { id: 19, value: 'Yes, dedicated compliance team', status: 'COMPLETE' },
        { id: 20, value: 'Yes, annual certification process', status: 'COMPLETE' },
        
        // Third-Party Access
        { id: 21, value: 'Strict vetting process with security assessment', status: 'COMPLETE' },
        { id: 22, value: 'Yes, using granular permission model', status: 'COMPLETE' },
        { id: 23, value: 'Real-time monitoring system with alerts', status: 'COMPLETE' },
        { id: 24, value: 'Detailed audit logs for all access events', status: 'COMPLETE' },
        
        // User Experience
        { id: 25, value: 'In-app and web interface', status: 'COMPLETE' },
        { id: 26, value: 'Yes, usability testing conducted monthly', status: 'COMPLETE' },
        { id: 27, value: 'Yes, multi-language support', status: 'COMPLETE' },
        { id: 28, value: 'Accessibility guidelines WCAG 2.1 AA', status: 'COMPLETE' },
        
        // Incident Response
        { id: 29, value: 'Yes, 24/7 response team', status: 'COMPLETE' },
        { id: 30, value: '15 minutes SLA for critical issues', status: 'COMPLETE' },
        { id: 31, value: 'Yes, automated and manual monitoring', status: 'COMPLETE' },
        { id: 32, value: 'Quarterly simulations and drills', status: 'COMPLETE' },
        
        // Technical Standards
        { id: 33, value: 'ISO20022, JSON, OAuth 2.0, OpenID Connect', status: 'COMPLETE' },
        { id: 34, value: 'Yes, comprehensive implementation', status: 'COMPLETE' },
        { id: 35, value: 'Yes, sandbox environment available', status: 'COMPLETE' },
        { id: 36, value: 'Bi-weekly updates to API standards', status: 'COMPLETE' },
        
        // Performance & Scalability
        { id: 37, value: '99.99% uptime SLA', status: 'COMPLETE' },
        { id: 38, value: '<200ms response time', status: 'COMPLETE' },
        { id: 39, value: 'Auto-scaling cloud infrastructure', status: 'COMPLETE' },
        { id: 40, value: 'Daily load testing', status: 'COMPLETE' },
        
        // Innovation & Future Plans
        { id: 41, value: 'Account aggregation, financial insights, predictive analytics', status: 'COMPLETE' },
        { id: 42, value: 'Biometric authentication integration', status: 'COMPLETE' },
        { id: 43, value: 'Yes, quarterly roadmap updates', status: 'COMPLETE' },
        { id: 44, value: 'Active participation in industry working groups', status: 'COMPLETE' }
      ],
      metadata: {
        autoFilled: true,
        fillTimestamp: new Date().toISOString(),
        source: 'unified-demo-service'
      }
    };
    
    logger.info(`[OpenBankingDemoData] Generated demo data with ${demoData.fields.length} fields`);
    return demoData;
  } catch (error) {
    logger.error(`[OpenBankingDemoData] Error generating demo data: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
