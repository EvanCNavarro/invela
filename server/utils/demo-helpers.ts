import { db } from "@db";
import { companies } from "@db/schema";
import { eq } from "drizzle-orm";
import { logger } from './logger';

/**
 * Enhanced logging utility for demo operations
 * Provides consistent, trackable log messages with structured data
 */
export function logDemoOperation(
  level: 'info' | 'warn' | 'error',
  operation: string,
  data?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    module: 'DemoAPI',
    operation,
    ...data,
  };

  const logMessage = `[DemoAPI] ${operation}`;
  
  switch (level) {
    case 'info':
      console.log(logMessage, logData);
      break;
    case 'warn':
      console.warn(logMessage, logData);
      break;
    case 'error':
      console.error(logMessage, logData);
      break;
  }
}

// Logger is already initialized in the imported module

/**
 * Checks if a company name contains any of the demo indicators
 * This is a simple utility function to standardize demo company detection
 */
export function isDemoCompanyName(companyName: string): boolean {
  if (!companyName) return false;
  
  // Convert to lowercase for case-insensitive comparison
  const nameLower = companyName.toLowerCase();
  
  // Check for various demo name patterns
  return (
    nameLower.includes('devtest') ||
    nameLower.includes('developmenttesting') ||
    nameLower.includes('demo')
  );
}

/**
 * Checks if a company is marked as a demo company
 * This checks both the is_demo flag (if it exists) and the company name pattern
 */
export async function isCompanyDemo(companyId: number): Promise<boolean> {
  try {
    // Get the company
    const companyData = await db.select().from(companies).where(eq(companies.id, companyId));
    
    if (!companyData || companyData.length === 0) {
      logger.warn('Company not found when checking demo status', { companyId });
      return false;
    }
    
    const company = companyData[0];
    
    // First check the explicit is_demo flag if it exists
    if (company.is_demo === true) {
      return true;
    }
    
    // If no explicit flag or it's false, check the name
    return isDemoCompanyName(company.name);
  } catch (error) {
    logger.error('Error checking if company is demo', { companyId, error });
    // Default to false to ensure we don't accidentally expose demo features
    return false;
  }
}

/**
 * Generates a standardized demo data object for a task based on task type
 */
export function generateDemoData(taskType: string, companyName: string = 'Demo Company'): Record<string, string> {
  // Create a base demo data object with common fields
  const baseData = {
    'legalEntityName': companyName,
    'registrationNumber': '12-3456789',
    'incorporationDate': '5/12/2010',
    'businessType': 'Corporation',
    'jurisdiction': 'Delaware, United States',
    'registeredAddress': '123 Corporate Plaza, Suite 500, New York, NY 10001',
    'companyPhone': '+1 (555) 123-4567',
    'contactEmail': 'contact@demofintech.com',
  };
  
  // Add task-specific fields based on task type
  if (taskType === 'company_kyb' || taskType === 'company_onboarding_KYB') {
    // Specific sections mapping to ensure 100% coverage
    
    // Company Profile section fields (8 fields)
    const companyProfileFields = {
      'legalEntityName': companyName,
      'registrationNumber': '12-3456789',
      'incorporationDate': '5/12/2010',
      'businessType': 'Corporation',
      'jurisdiction': 'Delaware, United States',
      'registeredAddress': '123 Corporate Plaza, Suite 500, New York, NY 10001',
      'companyPhone': '+1 (555) 123-4567',
      'priorNames': 'TechDemo Inc. (2010-2015)',
    };
    
    // Governance & Leadership section fields (10 fields)
    const governanceFields = {
      'contactEmail': 'contact@demofintech.com',
      'goodStanding': 'Yes',
      'corporateRegistration': 'Active and in good standing',
      'externalAudit': 'Annual audit by PricewaterhouseCoopers (PWC)',
      'controlEnvironment': 'Comprehensive governance framework with quarterly internal audits',
      'authorizedSigners': 'Jane Smith (CEO), John Davis (CFO), Sarah Johnson (COO)',
      'governmentOwnership': 'No',
      'ultimateBeneficialOwners': 'Jane Smith (35%), Venture Capital Firm XYZ (40%), Angel Investors (25%)',
      'directorsAndOfficers': 'Jane Smith (CEO, Director), John Davis (CFO, Director), Sarah Johnson (COO, Director), Michael Anderson (Independent Director)',
      'licenses': 'Financial Services License #12345, Electronic Money Institution License #67890',
    };
    
    // Financial Profile section fields (4 fields)
    const financialFields = {
      'marketCapitalization': '$120,000,000',
      'lifetimeCustomerValue': '$45,000,000',
      'annualRecurringRevenue': '$28,500,000',
      'monthlyRecurringRevenue': '$2,375,000',
    };
    
    // Operations & Compliance section fields (8 fields)
    const operationsFields = {
      'investigationsIncidents': 'None in the last 5 years',
      'financialStatements': 'Audited statements available for past 3 fiscal years',
      'operationalPolicies': 'Comprehensive policy framework covering AML, KYC, data protection, and information security',
      'dataVolume': '500,000 customer records processed monthly',
      'dataTypes': 'Customer PII, transaction data, merchant information',
      'sanctionsCheck': 'Regular screening against OFAC, UN, and EU sanctions lists',
      'dueDiligence': 'Enhanced due diligence procedures for high-risk customers',
      'regulatoryActions': 'None in the last 5 years',
    };
    
    // Combine all sections
    return {
      ...companyProfileFields,
      ...governanceFields,
      ...financialFields,
      ...operationsFields,
    };
  } else if (taskType === 'ky3p' || taskType === 'sp_ky3p_assessment') {
    return {
      ...baseData,
      'dataProtectionPolicy': 'Yes, compliant with GDPR, CCPA, and industry standards',
      'securityBreaches': 'No security breaches in the last 5 years',
      'penetrationTesting': 'Annual penetration testing by third-party security firm',
      'dataEncryption': 'AES-256 encryption for data at rest, TLS 1.3 for data in transit',
      'accessControls': 'Role-based access controls with multi-factor authentication for all employees',
      'disasterRecovery': 'Comprehensive disaster recovery plan with quarterly testing',
      'vendorManagement': 'Formal vendor risk assessment and ongoing monitoring program',
      'incidentResponse': 'Documented incident response plan with 24/7 security operations center',
      'securityCertifications': 'ISO 27001, SOC 2 Type II, PCI DSS Level 1',
      'securityTeam': 'Dedicated security team with CISSP, CISM, and OSCP certifications',
      'vulnerabilityManagement': '30-day remediation for critical vulnerabilities, 90-day for non-critical',
      'cloudSecurity': 'Multi-layered security controls for all cloud environments',
      'employeeTraining': 'Mandatory security awareness training for all employees',
      'physicalSecurity': 'Biometric access controls at all data centers and offices',
    };
  } else if (taskType === 'open_banking' || taskType === 'open_banking_survey') {
    return {
      ...baseData,
      'apiSecurity': 'OAuth 2.0 with mutual TLS for all API endpoints',
      'openBankingCompliance': 'Fully compliant with PSD2 and Open Banking standards',
      'dataSharing': 'Transparent consent model with granular permission controls',
      'thirdPartyAccess': 'Secure onboarding and ongoing monitoring of all third-party providers',
      'customerAuthentication': 'Strong Customer Authentication (SCA) implemented for all transactions',
      'transactionMonitoring': 'Real-time transaction monitoring with AI-powered fraud detection',
      'auditTrail': 'Comprehensive audit logging for all data access and API calls',
      'informationClassification': 'Data classification framework with separate handling procedures',
      'backupProcedures': 'Daily incremental and weekly full backups with offsite storage',
      'apiRateLimiting': 'Intelligent rate limiting to prevent abuse and DDoS attacks',
      'sdkSecurity': 'Secure SDK with code signing and integrity verification',
      'openApiDocumentation': 'Detailed API documentation with security best practices',
      'techStack': 'Modern microservices architecture with containerization and orchestration',
      'dataResidency': 'Data centers in EU and US with region-specific data handling',
    };
  }
  
  // Default to base data for unknown task types
  return baseData;
}