/**
 * KY3P Demo Data Helper Functions
 * 
 * This module provides functions for generating demo data for the KY3P forms.
 * It generates consistent, realistic-looking demo values for KY3P Security Assessment fields.
 */

import { Logger } from './logger';

const logger = new Logger('KY3P-Demo-Helpers');

/**
 * Generate demo values for KY3P Security Assessment form fields
 * 
 * @param companyName - Optional company name to use in generated values
 * @returns A record mapping field IDs to demo values
 */
export function generateDemoKy3pValues(companyName: string = 'Demo Company'): Record<string, string> {
  logger.info(`Generating KY3P demo values for company: ${companyName}`);

  const safeCompanyName = companyName.replace(/[^\w\s]/gi, '');
  
  const securityDepartments = [
    'Security Operations',
    'Security Engineering',
    'Security Architecture',
    'Threat Intelligence',
    'Security Compliance',
    'Identity and Access Management'
  ];
  
  const securityLeaders = [
    'Director of Security',
    'VP of Security Engineering',
    'Chief Information Security Officer (CISO)',
    'SVP of Security Operations',
    'Head of Cyber Risk'
  ];
  
  const securityFrameworks = [
    'NIST CSF',
    'ISO 27001',
    'CIS Controls',
    'SOC 2',
    'COBIT',
    'PCI DSS'
  ];
  
  // Generate demo data with realistic-looking values
  return {
    // Security Organization
    '101': `${safeCompanyName} maintains a comprehensive security organization with dedicated teams for threat detection, vulnerability management, and compliance monitoring.`,
    '102': securityDepartments.slice(0, 3 + Math.floor(Math.random() * 3)).join(', '),
    '103': securityLeaders[Math.floor(Math.random() * securityLeaders.length)],
    '104': Math.floor(10 + Math.random() * 20).toString(),
    
    // Security Policies
    '201': `${safeCompanyName} has implemented a comprehensive information security policy framework aligned with industry standards.`,
    '202': securityFrameworks.slice(0, 2 + Math.floor(Math.random() * 3)).join(', '),
    '203': 'Annually',
    '204': 'Yes, mandatory for all employees and contractors',
    
    // Access Control
    '301': '${safeCompanyName} implements a robust identity and access management program with principle of least privilege.',
    '302': 'Multi-factor authentication (MFA) is required for all administrative access and remote connections.',
    '303': 'Quarterly access reviews, with immediate reviews upon role changes',
    '304': 'Yes, through a centralized identity management solution',
    
    // Data Protection
    '401': 'All sensitive data is encrypted both in transit and at rest using AES-256 encryption.',
    '402': 'Yes, we maintain data classification standards with corresponding security controls.',
    '403': 'Data retention periods defined based on data classification and regulatory requirements.',
    '404': 'Yes, through secure erasure procedures with validation.',
    
    // Incident Response
    '501': `${safeCompanyName} maintains a formal incident response plan with clearly defined roles and procedures.`,
    '502': 'Yes, managed by a dedicated incident response team with 24/7 coverage.',
    '503': 'Annual tabletop exercises and quarterly technical drills.',
    '504': 'Yes, we maintain a formal threat intelligence program.',
    
    // Business Continuity
    '601': 'Yes, with RTO and RPO targets aligned with business criticality.',
    '602': 'Semi-annual testing with scenario-based exercises.',
    '603': 'Yes, with geographical diversity for critical systems.',
    '604': 'Yes, we maintain formal SLAs with all key third-party providers.',
    
    // Vulnerability Management
    '701': 'Weekly automated scans with daily review of critical systems.',
    '702': 'Critical: 7 days, High: 30 days, Medium: 90 days, Low: 180 days',
    '703': 'Yes, we conduct quarterly external penetration tests and annual red team exercises.',
    '704': 'Yes, with coverage for all production code deployments.',
    
    // Third-Party Risk
    '801': 'Yes, we maintain a formal third-party risk management program.',
    '802': 'Annual for critical vendors, biennial for others based on risk.',
    '803': 'Yes, with right-to-audit clauses in all critical vendor contracts.',
    '804': 'Yes, we conduct continuous monitoring of our critical vendors.',
    
    // Compliance
    '901': 'SOC 2 Type II, ISO 27001, PCI DSS',
    '902': 'Yes, we maintain a formal compliance management program.',
    '903': 'Annual SOC 2 Type II, biennial ISO 27001 surveillance audits',
    '904': 'Yes, mapped to multiple frameworks including NIST, ISO, and CIS controls.',
    
    // Employee Security
    '1001': 'Yes, including pre-employment background checks and periodic rescreening.',
    '1002': 'Yes, all employees receive security training on hire and quarterly refreshers.',
    '1003': 'Yes, we conduct role-specific security training for technical staff.',
    '1004': 'Yes, formalized process with security and HR involvement.'
  };
}