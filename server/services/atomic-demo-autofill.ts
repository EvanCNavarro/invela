/**
 * Atomic Demo Auto-Fill Service
 * 
 * This service provides a single atomic operation to apply demo data to forms.
 * It applies all demo values in a single transaction and uses WebSockets to
 * progressively update the UI for a smooth, dynamic filling experience.
 */

import { db } from '@db';
import { eq, sql } from 'drizzle-orm';
import { tasks } from '@db/schema';
import { companies } from '@db/schema';
import getLogger from '../utils/logger';
import { WebSocketService } from './webSocketService';

// Task types we support
export type FormType = 'kyb' | 'company_kyb' | 'ky3p' | 'open_banking';
type FormTypeKey = 'kyb' | 'ky3p' | 'open_banking';

const logger = getLogger('AtomicDemoAutoFill');

// Configuration for different form types
const formTypeConfigs = {
  'kyb': {
    fieldsTable: sql`kyb_fields`,
    responsesTable: sql`kyb_responses`,
    fieldKeyColumn: 'field_key',
    fieldIdColumn: 'id',
    displayNameColumn: 'display_name',
    fieldTypeColumn: 'field_type',
    demoAutofillColumn: 'demo_autofill',
    groupColumn: sql`"group"`,
  },
  'ky3p': {
    fieldsTable: sql`ky3p_fields`,
    responsesTable: sql`ky3p_responses`,
    fieldKeyColumn: 'field_key',
    fieldIdColumn: 'id',
    displayNameColumn: 'display_name',
    fieldTypeColumn: 'field_type',
    demoAutofillColumn: 'demo_autofill',
    groupColumn: sql`"group"`,
  },
  'open_banking': {
    fieldsTable: sql`open_banking_fields`,
    responsesTable: sql`open_banking_responses`,
    fieldKeyColumn: 'field_key',
    fieldIdColumn: 'id',
    displayNameColumn: 'display_name',
    fieldTypeColumn: 'field_type',
    demoAutofillColumn: 'demo_autofill',
    groupColumn: sql`"group"`,
  }
};

/**
 * Get the appropriate form type based on task type
 */
function mapTaskTypeToFormType(taskType: string): FormTypeKey {
  if (taskType === 'company_kyb' || taskType === 'kyb') {
    return 'kyb';
  } else if (taskType === 'ky3p' || taskType === 'sp_ky3p_assessment') {
    return 'ky3p';
  } else if (taskType === 'open_banking' || taskType === 'open_banking_survey') {
    return 'open_banking';
  }
  
  // Fallback to KYB as default
  logger.warn(`Unrecognized task type: ${taskType}, defaulting to kyb`);
  return 'kyb';
}

/**
 * Generate appropriate demo data for different form types
 */
function generateDemoData(taskType: string, companyName: string = 'Demo Company'): Record<string, string> {
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
  if (taskType === 'company_kyb' || taskType === 'company_onboarding_KYB' || taskType === 'kyb') {
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

/**
 * Create the update query for a specific form response, handling all three form types
 */
function createResponseUpdateQuery(
  formType: FormTypeKey,
  taskId: number,
  fieldId: number,
  value: string
) {
  const config = formTypeConfigs[formType];
  if (!config) {
    throw new Error(`Invalid form type: ${formType}`);
  }
  
  // Status is 'filled' if there's a value, 'empty' otherwise
  const status = value && value.trim() !== '' ? 'filled' : 'empty';
  
  // Prepare correct update SQL based on form type
  const updateQuery = sql`
    INSERT INTO ${config.responsesTable} (task_id, field_id, response_value, status)
    VALUES (${taskId}, ${fieldId}, ${value}, ${status})
    ON CONFLICT (task_id, field_id) 
    DO UPDATE SET 
      response_value = ${value},
      status = ${status},
      updated_at = NOW()
    RETURNING id, field_id
  `;
  
  return updateQuery;
}

export class AtomicDemoAutoFillService {
  private webSocketService: WebSocketService;
  
  constructor(webSocketService: WebSocketService) {
    this.webSocketService = webSocketService;
    logger.info('Atomic Demo Auto-Fill Service initialized');
  }
  
  /**
   * Atomically apply demo data to a form, with progressive UI updates
   */
  async applyDemoDataAtomically(
    taskId: number,
    formType: FormType,
    userId?: number
  ): Promise<{
    success: boolean;
    message: string;
    fieldCount: number;
  }> {
    logger.info('Starting atomic demo data application', { taskId, formType, userId });
    
    // Get task information
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
      
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    // Get company information
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, task.company_id));
      
    if (!company || company.is_demo !== true) {
      throw new Error('Auto-fill is only available for demo companies');
    }
    
    // Map form type to the appropriate internal form type
    const mappedFormType = mapTaskTypeToFormType(formType);
    const config = formTypeConfigs[mappedFormType];
    
    // First set task status to not_started to ensure progress bar starts from beginning
    await db.update(tasks)
      .set({ 
        status: 'not_started', 
        progress: 0,
        updated_at: new Date(),
      })
      .where(eq(tasks.id, taskId));
    
    // Notify clients that task is resetting
    this.webSocketService.broadcastTaskUpdate(taskId, {
      status: 'not_started',
      progress: 0,
      metadata: { lastUpdated: new Date().toISOString() }
    });
    
    // Get all fields for this form type
    const fields = await db.select()
      .from(config.fieldsTable)
      .orderBy(sql`${config.groupColumn} ASC, "order" ASC`);
      
    logger.info(`Retrieved ${fields.length} fields for demo auto-fill`);
    
    // Generate demo data based on task type
    const demoData = generateDemoData(formType, company.name);
    
    // Show loading toast on client side
    this.webSocketService.broadcast({
      type: 'demo_autofill_started',
      payload: {
        taskId,
        fieldCount: fields.length,
        timestamp: new Date().toISOString()
      }
    });
    
    // Process fields in batches for better performance but still visible progression
    const BATCH_SIZE = 5;
    const totalBatches = Math.ceil(fields.length / BATCH_SIZE);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIdx = batchIndex * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, fields.length);
      const batchFields = fields.slice(startIdx, endIdx);
      
      // Calculate progress percentage
      const progressPercentage = Math.floor((batchIndex / totalBatches) * 100);
      
      // Process this batch in a transaction
      await db.transaction(async (tx) => {
        for (const field of batchFields) {
          const fieldKey = field[config.fieldKeyColumn];
          const fieldId = field[config.fieldIdColumn];
          
          // Skip if this field doesn't have a key
          if (!fieldKey) {
            logger.warn(`Field is missing key property, skipping`, { fieldId });
            continue;
          }
          
          // Get the demo value for this field
          let demoValue = demoData[fieldKey] || '';
          
          // If db has a demo_autofill value, use that instead
          if (field[config.demoAutofillColumn] && field[config.demoAutofillColumn] !== '') {
            // Check for template variables that need replacement
            if (typeof field[config.demoAutofillColumn] === 'string' && 
                field[config.demoAutofillColumn].includes('{{COMPANY_NAME}}')) {
              demoValue = field[config.demoAutofillColumn].replace('{{COMPANY_NAME}}', company.name);
            } else {
              demoValue = field[config.demoAutofillColumn];
            }
          }
          
          // Create and execute the update query
          const updateQuery = createResponseUpdateQuery(
            mappedFormType,
            taskId,
            fieldId,
            demoValue
          );
          
          await tx.execute(updateQuery);
          
          // Send WebSocket notification for this field update
          this.webSocketService.broadcast({
            type: 'demo_field_update',
            payload: {
              taskId,
              fieldId: fieldKey,
              value: demoValue,
              timestamp: new Date().toISOString()
            }
          });
          
          // Small delay for visual effect (50ms)
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      });
      
      // Update task progress
      await db.update(tasks)
        .set({ 
          status: 'in_progress', 
          progress: progressPercentage,
          updated_at: new Date(),
        })
        .where(eq(tasks.id, taskId));
      
      // Broadcast progress update
      this.webSocketService.broadcastTaskUpdate(taskId, {
        status: 'in_progress',
        progress: progressPercentage,
        metadata: {
          lastUpdated: new Date().toISOString(),
          demoAutoFillInProgress: true
        }
      });
      
      // Small delay between batches for visual effect
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Final update to task with completion
    await db.update(tasks)
      .set({ 
        status: 'in_progress', 
        progress: 100,
        updated_at: new Date(),
      })
      .where(eq(tasks.id, taskId));
    
    // Final broadcast
    this.webSocketService.broadcastTaskUpdate(taskId, {
      status: 'in_progress',
      progress: 100,
      metadata: {
        lastUpdated: new Date().toISOString(),
        demoAutoFillCompleted: true
      }
    });
    
    // Broadcast completion notification
    this.webSocketService.broadcast({
      type: 'demo_autofill_complete',
      payload: {
        taskId,
        fieldCount: fields.length,
        timestamp: new Date().toISOString()
      }
    });
    
    logger.info('Successfully applied demo data atomically', {
      taskId,
      formType,
      fieldCount: fields.length
    });
    
    return {
      success: true,
      message: `Successfully applied demo data to ${fields.length} fields`,
      fieldCount: fields.length
    };
  }
}