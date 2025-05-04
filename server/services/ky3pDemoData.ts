/**
 * KY3P Demo Data Service
 * 
 * This module provides demo data generation functions for KY3P (Security Assessment) forms.
 * It generates realistic looking data that can be used to auto-fill KY3P forms for testing or demo purposes.
 */

import { logger } from '../utils/logger';

/**
 * Generate and return demo data for KY3P assessment forms
 */
export async function getKy3pDemoData() {
  try {
    const demoData = {
      fields: [
        // Security Team & Experience
        { id: 1, value: 'Yes', status: 'COMPLETE' },
        { id: 2, value: '5-10 years', status: 'COMPLETE' },
        { id: 3, value: '5-10 team members', status: 'COMPLETE' },
        
        // Security Certifications
        { id: 4, value: 'ISO 27001, SOC 2 Type II', status: 'COMPLETE' },
        { id: 5, value: 'January 2024', status: 'COMPLETE' },
        { id: 6, value: 'External auditor: Deloitte', status: 'COMPLETE' },
        
        // Network Security
        { id: 7, value: 'Yes', status: 'COMPLETE' },
        { id: 8, value: 'Fortinet, Cisco', status: 'COMPLETE' },
        { id: 9, value: 'Monthly', status: 'COMPLETE' },
        
        // Access Controls
        { id: 10, value: 'Yes, role-based access control (RBAC)', status: 'COMPLETE' },
        { id: 11, value: 'Yes, MFA for all systems', status: 'COMPLETE' },
        { id: 12, value: 'Quarterly', status: 'COMPLETE' },
        
        // Vulnerability Management
        { id: 13, value: 'Yes, using Tenable and Qualys', status: 'COMPLETE' },
        { id: 14, value: 'Monthly', status: 'COMPLETE' },
        { id: 15, value: 'Critical: 24 hours, High: 7 days, Medium: 30 days', status: 'COMPLETE' },
        
        // Incident Response
        { id: 16, value: 'Yes, tested annually', status: 'COMPLETE' },
        { id: 17, value: 'Yes, tabletop exercises quarterly', status: 'COMPLETE' },
        { id: 18, value: '4 hours', status: 'COMPLETE' },
        
        // Business Continuity
        { id: 19, value: 'Yes, updated annually', status: 'COMPLETE' },
        { id: 20, value: 'RPO: 4 hours, RTO: 8 hours', status: 'COMPLETE' },
        { id: 21, value: 'Annually', status: 'COMPLETE' },
        
        // Data Protection
        { id: 22, value: 'AES-256 encryption', status: 'COMPLETE' },
        { id: 23, value: 'Yes, using DLP solutions', status: 'COMPLETE' },
        { id: 24, value: '7 years based on regulatory requirements', status: 'COMPLETE' },
        
        // Application Security
        { id: 25, value: 'Yes, using OWASP SAMM', status: 'COMPLETE' },
        { id: 26, value: 'Yes, SAST, DAST, and SCA', status: 'COMPLETE' },
        { id: 27, value: 'Every release', status: 'COMPLETE' },
        
        // Cloud Security
        { id: 28, value: 'AWS and Azure', status: 'COMPLETE' },
        { id: 29, value: 'CIS benchmarks, Cloud Security Alliance', status: 'COMPLETE' },
        { id: 30, value: 'Real-time monitoring with automated alerts', status: 'COMPLETE' },
        
        // Vendor Management
        { id: 31, value: 'Yes, risk-based approach', status: 'COMPLETE' },
        { id: 32, value: 'Annually for critical vendors', status: 'COMPLETE' },
        { id: 33, value: 'Security, financial, operational, compliance', status: 'COMPLETE' },
        
        // Compliance
        { id: 34, value: 'GDPR, CCPA, SOX, PCI-DSS', status: 'COMPLETE' },
        { id: 35, value: 'Quarterly internal, annual external', status: 'COMPLETE' },
        { id: 36, value: 'Yes, all employees annually', status: 'COMPLETE' },
        
        // Physical Security
        { id: 37, value: 'Badge access, biometrics, CCTV', status: 'COMPLETE' },
        { id: 38, value: 'Yes, 24/7 monitoring', status: 'COMPLETE' },
        { id: 39, value: 'Semi-annually', status: 'COMPLETE' },
        
        // Mobile Security
        { id: 40, value: 'Yes, MDM solution implemented', status: 'COMPLETE' },
        { id: 41, value: 'Remote wipe, encryption, containerization', status: 'COMPLETE' },
        { id: 42, value: 'Yes, all devices are encrypted', status: 'COMPLETE' }
      ],
      metadata: {
        autoFilled: true,
        fillTimestamp: new Date().toISOString(),
        source: 'unified-demo-service'
      }
    };
    
    logger.info(`[KY3PDemoData] Generated demo data with ${demoData.fields.length} fields`);
    return demoData;
  } catch (error) {
    logger.error(`[KY3PDemoData] Error generating demo data: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
