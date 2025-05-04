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
        // Open Banking Strategy
        { id: 201, value: 'Comprehensive platform for financial data aggregation and API services', status: 'COMPLETE' },
        { id: 202, value: 'Current phase of multi-year roadmap implementing Account Information and Payment Services', status: 'COMPLETE' },
        { id: 203, value: 'Q2 2024 for next major feature release', status: 'COMPLETE' },
        { id: 204, value: 'Collaboration with existing financial partners and new FinTech entrants', status: 'COMPLETE' },
        { id: 205, value: '25-person dedicated Open Banking team with banking and API expertise', status: 'COMPLETE' },
        
        // Technical Implementation
        { id: 206, value: 'RESTful APIs with OAuth 2.0 and OpenID Connect for authentication', status: 'COMPLETE' },
        { id: 207, value: 'Microservices architecture running on Kubernetes in multi-region cloud', status: 'COMPLETE' },
        { id: 208, value: 'ISO 20022, JSON, and XML supported for data formats', status: 'COMPLETE' },
        { id: 209, value: 'Real-time data processing with event-driven architecture', status: 'COMPLETE' },
        { id: 210, value: 'Yes, all APIs fully documented with interactive Swagger/OpenAPI portal', status: 'COMPLETE' },
        
        // Security Measures
        { id: 211, value: 'Multi-layered security with TLS 1.3, certificate pinning, and JWS', status: 'COMPLETE' },
        { id: 212, value: 'Tokenization of sensitive data with session-specific encryption', status: 'COMPLETE' },
        { id: 213, value: 'Multi-factor authentication with biometric options', status: 'COMPLETE' },
        { id: 214, value: 'Yes, quarterly by independent security firms, most recent Feb 2025', status: 'COMPLETE' },
        { id: 215, value: 'SOC 2 Type II, ISO 27001, PCI-DSS Level 1', status: 'COMPLETE' },
        
        // Regulatory Compliance
        { id: 216, value: 'Full compliance with PSD2, GDPR, and UK Open Banking standards', status: 'COMPLETE' },
        { id: 217, value: 'Yes, regulatory requirements mapped to control framework with testing', status: 'COMPLETE' },
        { id: 218, value: 'Legal, Compliance, and Data Protection teams review all changes', status: 'COMPLETE' },
        { id: 219, value: 'Yes, dedicated regulatory technology tracking with automated alerts', status: 'COMPLETE' },
        { id: 220, value: 'Open Banking Implementation Entity (OBIE) and Financial Conduct Authority (FCA)', status: 'COMPLETE' },
        
        // Data Handling
        { id: 221, value: 'Data classified by sensitivity with appropriate controls for each tier', status: 'COMPLETE' },
        { id: 222, value: 'Encrypted data at rest and in transit with key rotation', status: 'COMPLETE' },
        { id: 223, value: 'Strict data minimization and purpose limitation principles applied', status: 'COMPLETE' },
        { id: 224, value: 'Automated data retention and purge cycles based on classification', status: 'COMPLETE' },
        { id: 225, value: 'Data Protection Impact Assessment completed for all data flows', status: 'COMPLETE' },
        
        // Third Party Management
        { id: 226, value: 'Tiered access model with strict verification for API consumers', status: 'COMPLETE' },
        { id: 227, value: 'Sandbox environment with synthetic data for development and testing', status: 'COMPLETE' },
        { id: 228, value: 'Monitored onboarding process with technical and compliance verification', status: 'COMPLETE' },
        { id: 229, value: 'Annual security reviews and continuous monitoring for connected partners', status: 'COMPLETE' },
        { id: 230, value: 'Real-time activity monitoring with automated anomaly detection', status: 'COMPLETE' },
        
        // User Experience
        { id: 231, value: 'User-centric design with focus on simplified consent journeys', status: 'COMPLETE' },
        { id: 232, value: 'Yes, granular permission controls with easy management interface', status: 'COMPLETE' },
        { id: 233, value: 'Mobile-first responsive design with accessibility compliance', status: 'COMPLETE' },
        { id: 234, value: 'Biweekly user testing sessions and A/B testing for enhancements', status: 'COMPLETE' },
        { id: 235, value: '87% satisfaction rating from consent journey user surveys', status: 'COMPLETE' },
        
        // Performance and Reliability
        { id: 236, value: '99.99% uptime for core API services with 24/7 monitoring', status: 'COMPLETE' },
        { id: 237, value: 'Average response time under 200ms with 99th percentile under 500ms', status: 'COMPLETE' },
        { id: 238, value: 'Auto-scaling infrastructure with multi-region failover capability', status: 'COMPLETE' },
        { id: 239, value: 'Monthly DR exercises and quarterly full recovery simulations', status: 'COMPLETE' },
        { id: 240, value: 'Real-time monitoring dashboards with proactive alerting', status: 'COMPLETE' },
        
        // Business Model
        { id: 241, value: 'Tiered pricing based on API call volume and service level', status: 'COMPLETE' },
        { id: 242, value: 'Premium services include advanced analytics and dedicated support', status: 'COMPLETE' },
        { id: 243, value: 'Enterprise partnerships with revenue sharing arrangements', status: 'COMPLETE' },
        { id: 244, value: '35% year-over-year growth in API transaction volume', status: 'COMPLETE' },
        { id: 245, value: 'Expanding to additional markets in North America and Asia-Pacific', status: 'COMPLETE' },
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
