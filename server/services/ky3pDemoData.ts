/**
 * KY3P Demo Data Service
 * 
 * This module provides demo data generation functions for KY3P forms.
 * It generates realistic looking data that can be used to auto-fill KY3P forms for testing or demo purposes.
 */

import { logger } from '../utils/logger';

/**
 * Generate and return demo data for KY3P forms
 */
export async function getKy3pDemoData() {
  try {
    const demoData = {
      fields: [
        // Company Overview
        { id: 101, value: 'SecureTech Solutions Inc.', status: 'COMPLETE' },
        { id: 102, value: '1234 Cyber Drive, San Jose, CA 95134', status: 'COMPLETE' },
        { id: 103, value: 'www.securetechsolutions.example', status: 'COMPLETE' },
        { id: 104, value: '2015-08-25', status: 'COMPLETE' },
        { id: 105, value: 'Security Software and Services Provider', status: 'COMPLETE' },
        
        // Security Framework
        { id: 106, value: 'ISO 27001, SOC 2 Type II, NIST CSF, PCI DSS', status: 'COMPLETE' },
        { id: 107, value: 'Annual, conducted by BigFour Security Auditors', status: 'COMPLETE' },
        { id: 108, value: 'Yes, dedicated CISO reporting to CEO', status: 'COMPLETE' },
        { id: 109, value: 'Security Council meets bi-weekly, Board review quarterly', status: 'COMPLETE' },
        { id: 110, value: 'Yes, integrated with SDLC and procurement processes', status: 'COMPLETE' },
        
        // Network Security
        { id: 111, value: 'Enterprise-grade firewalls, IDS/IPS, SIEM solutions', status: 'COMPLETE' },
        { id: 112, value: 'Yes, monthly vulnerability scans, quarterly penetration tests', status: 'COMPLETE' },
        { id: 113, value: 'Yes, using encryption at rest (AES-256) and in transit (TLS 1.3)', status: 'COMPLETE' },
        { id: 114, value: 'Multi-zone architecture with DMZ and private segments', status: 'COMPLETE' },
        { id: 115, value: '24/7 SOC with automated threat detection and response', status: 'COMPLETE' },
        
        // Data Protection
        { id: 116, value: 'Multi-tier backup strategy with daily incremental and weekly full backups', status: 'COMPLETE' },
        { id: 117, value: 'Yes, annually tested with 4-hour RTO and 15-minute RPO', status: 'COMPLETE' },
        { id: 118, value: 'Data classified into Public, Internal, Confidential, and Restricted tiers', status: 'COMPLETE' },
        { id: 119, value: 'Secure multi-cloud infrastructure with geo-redundancy', status: 'COMPLETE' },
        { id: 120, value: 'Yes, all PII data is encrypted and access is strictly audited', status: 'COMPLETE' },
        
        // Access Control
        { id: 121, value: 'Centralized IAM solution with role-based access control', status: 'COMPLETE' },
        { id: 122, value: 'Yes, implementing least privilege and separation of duties', status: 'COMPLETE' },
        { id: 123, value: 'All access requires MFA (hardware tokens for privileged access)', status: 'COMPLETE' },
        { id: 124, value: 'Privileged Access Management system with session recording', status: 'COMPLETE' },
        { id: 125, value: 'Zero Trust architecture, verified access for all resources', status: 'COMPLETE' },
        
        // Human Resources Security
        { id: 126, value: '100% of employees receive security training during onboarding', status: 'COMPLETE' },
        { id: 127, value: 'Monthly security awareness training, quarterly phishing simulations', status: 'COMPLETE' },
        { id: 128, value: 'Background checks for all employees, enhanced for sensitive roles', status: 'COMPLETE' },
        { id: 129, value: 'Detailed offboarding process with access revocation checklist', status: 'COMPLETE' },
        { id: 130, value: 'Regular security performance reviews affect compensation', status: 'COMPLETE' },
        
        // Incident Response
        { id: 131, value: 'Yes, comprehensive IR plan covering all incident types', status: 'COMPLETE' },
        { id: 132, value: 'IR team includes IT, Legal, Compliance, Communications, and Executive', status: 'COMPLETE' },
        { id: 133, value: 'Quarterly tabletop exercises, annual full-scale simulation', status: 'COMPLETE' },
        { id: 134, value: '24-hour notification for critical incidents, followed by detailed reports', status: 'COMPLETE' },
        { id: 135, value: 'Integration with third-party forensics and IR services', status: 'COMPLETE' },
        
        // Vendor Management
        { id: 136, value: 'Tiered vendor risk assessment based on data access and criticality', status: 'COMPLETE' },
        { id: 137, value: 'Annual security reviews for critical vendors, bi-annual for others', status: 'COMPLETE' },
        { id: 138, value: 'All vendor contracts include security and breach notification requirements', status: 'COMPLETE' },
        { id: 139, value: 'Centralized vendor risk management platform with continuous monitoring', status: 'COMPLETE' },
        { id: 140, value: 'Right to audit clause enforced with critical vendors', status: 'COMPLETE' },
        
        // Compliance
        { id: 141, value: 'PCI DSS, GDPR, CCPA, HIPAA, FedRAMP Moderate', status: 'COMPLETE' },
        { id: 142, value: 'Dedicated compliance team with specialized certifications', status: 'COMPLETE' },
        { id: 143, value: 'Automated compliance monitoring with dashboards and alerts', status: 'COMPLETE' },
        { id: 144, value: 'Annual training on regulations affecting our business', status: 'COMPLETE' },
        { id: 145, value: 'Working with regulatory bodies to ensure ongoing compliance', status: 'COMPLETE' },
        
        // Physical Security
        { id: 146, value: 'Badge access control, biometric for restricted areas', status: 'COMPLETE' },
        { id: 147, value: 'CCTV monitoring with 90-day retention, 24/7 security guards', status: 'COMPLETE' },
        { id: 148, value: 'Visitor management system with escort requirements', status: 'COMPLETE' },
        { id: 149, value: 'Environmental controls including fire suppression and UPS', status: 'COMPLETE' },
        { id: 150, value: 'Quarterly physical security assessments', status: 'COMPLETE' },
        
        // Software Development Security
        { id: 151, value: 'Security integrated into all phases of SDLC', status: 'COMPLETE' },
        { id: 152, value: 'Automated code scanning, SAST, DAST, and dependency analysis', status: 'COMPLETE' },
        { id: 153, value: 'All developers receive secure coding training quarterly', status: 'COMPLETE' },
        { id: 154, value: 'Pre-release security checklist and sign-off required', status: 'COMPLETE' },
        { id: 155, value: 'Bug bounty program for external security research', status: 'COMPLETE' },
        
        // Additional Security Controls
        { id: 156, value: 'AI-powered threat detection and anomaly identification', status: 'COMPLETE' },
        { id: 157, value: 'Specialized security controls for cloud environments', status: 'COMPLETE' },
        { id: 158, value: 'Regular purple team exercises to validate security posture', status: 'COMPLETE' },
        { id: 159, value: 'Participation in industry threat intelligence sharing', status: 'COMPLETE' },
        { id: 160, value: 'Security research team focused on emerging threats', status: 'COMPLETE' },
      ],
      metadata: {
        autoFilled: true,
        fillTimestamp: new Date().toISOString(),
        source: 'unified-demo-service'
      }
    };
    
    logger.info(`[Ky3pDemoData] Generated demo data with ${demoData.fields.length} fields`);
    return demoData;
  } catch (error) {
    logger.error(`[Ky3pDemoData] Error generating demo data: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
