/**
 * Open Banking Demo Data Helper Functions
 * 
 * This module provides functions for generating demo data for Open Banking Survey fields.
 * It generates consistent, realistic-looking demo values for Open Banking assessment forms.
 */

import { Logger } from './logger';

const logger = new Logger('OB-Demo-Helpers');

/**
 * Generate demo values for Open Banking Survey form fields
 * 
 * @param companyName - Optional company name to use in generated values
 * @returns A record mapping field IDs to demo values
 */
export function generateDemoOpenBankingValues(companyName: string = 'Demo Company'): Record<string, string> {
  logger.info(`Generating Open Banking demo values for company: ${companyName}`);

  const safeCompanyName = companyName.replace(/[^\w\s]/gi, '');
  
  // Generate demo data with realistic-looking values
  return {
    // API Implementation
    '1001': 'RESTful API with OAuth 2.0',
    '1002': 'Yes, fully compliant with v3.1.9',
    '1003': 'TLS 1.3 with mutual authentication',
    '1004': 'OAuth 2.0 with JWT tokens and MTLS',
    '1005': 'Client credential and authorization code flows',
    
    // Data Governance
    '2001': 'Yes, with dedicated data stewards for each domain',
    '2002': 'ISO 27001, GDPR, and PSD2 compliant',
    '2003': 'Quarterly data quality assessments with automated controls',
    '2004': 'Automated data lineage tracking across all systems',
    '2005': 'Yes, with granular consent management capabilities',
    
    // Security Measures
    '3001': 'Layered security with SIEM, WAF, and API gateway controls',
    '3002': 'Yes, with real-time monitoring and automated blocking',
    '3003': 'Rate limiting, anomaly detection, and behavioral analytics',
    '3004': 'Yes, with dedicated CERT team and 24/7 monitoring',
    '3005': 'Yes, through our Advanced Threat Protection platform',
    
    // Performance
    '4001': '99.99% availability with geographic redundancy',
    '4002': 'Less than 300ms for 95th percentile',
    '4003': '20,000 requests per second sustained, 50,000 burst capacity',
    '4004': 'Automated circuit breakers and graceful degradation patterns',
    '4005': 'Real-time dashboards with granular metrics and alerting',
    
    // Compliance
    '5001': 'PSD2, GDPR, ISO 27001, SOC 2 Type II, and NIST CSF',
    '5002': 'Quarterly external audits and continuous control monitoring',
    '5003': `${safeCompanyName} maintains a dedicated regulatory compliance team`,
    '5004': 'Yes, with automated tracking of regulatory changes',
    '5005': 'Yes, including sandbox environments for compliance testing',
    
    // Third Party Risk
    '6001': 'Comprehensive due diligence with continuous monitoring',
    '6002': 'Yes, with real-time risk scoring and assessment',
    '6003': 'Detailed SLAs with performance guarantees and penalties',
    '6004': 'Annual on-site audits for critical providers',
    '6005': 'Yes, with contractual right-to-audit provisions',
    
    // User Experience
    '7001': 'Mobile-first design with accessibility compliance',
    '7002': 'Yes, with continuous A/B testing and user feedback',
    '7003': 'Less than 3 steps with biometric authentication options',
    '7004': 'Yes, with robust event tracking and funnel analysis',
    '7005': 'Yes, through our UX research lab and customer panels',
    
    // Business Continuity
    '8001': 'Multi-region active-active architecture with automated failover',
    '8002': 'RPO of 5 minutes, RTO of 15 minutes for critical services',
    '8003': 'Monthly DR tests with annual full-scale simulation',
    '8004': 'Yes, with automated recovery procedures for all scenarios',
    '8005': '30 days of backup retention with point-in-time recovery',
    
    // Change Management
    '9001': 'CI/CD pipeline with automated testing and deployment',
    '9002': 'Yes, with formal CAB review for all production changes',
    '9003': 'Yes, with comprehensive pre and post-deployment validation',
    '9004': 'Yes, including canary deployments and feature flags',
    '9005': 'Daily deployments with zero-downtime capability',
    
    // Innovation
    '10001': `${safeCompanyName} implements quarterly innovation sprints to explore new technologies`,
    '10002': 'Yes, through our fintech accelerator program',
    '10003': 'AI-driven fraud detection and personalized insights',
    '10004': 'Yes, with biannual hackathons and innovation awards',
    '10005': 'Advanced analytics, AI/ML models, and blockchain integration'
  };
}