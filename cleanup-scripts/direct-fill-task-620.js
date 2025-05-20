/**
 * Direct database approach to populate task 620 with demo data
 * 
 * This script bypasses the API endpoints and works directly with the database
 * to populate task 620 with demo data and mark it as submitted.
 */

const { db } = require('./db');
const { eq } = require('drizzle-orm');
const { tasks, kyb_responses, ky3p_responses, open_banking_responses } = require('./db/schema');

async function directFillTask(taskId) {
  console.log(`[Direct Fill] Starting to populate task ID ${taskId} with demo data`);
  
  try {
    // 1. First, determine the task type
    const [task] = await db
      .select({
        id: tasks.id,
        title: tasks.title, 
        task_type: tasks.task_type,
        metadata: tasks.metadata
      })
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!task) {
      console.error(`[Direct Fill] Task ID ${taskId} not found`);
      return;
    }
    
    console.log(`[Direct Fill] Found task: ${task.title} (${task.task_type})`);
    console.log(`[Direct Fill] Task metadata:`, task.metadata);
    
    // 2. Generate demo data based on the task type
    if (task.task_type === 'company_kyb') {
      await populateKybResponses(taskId);
    } else if (task.task_type === 'ky3p' || task.task_type === 'security_assessment') {
      await populateKy3pResponses(taskId);
    } else if (task.task_type === 'open_banking') {
      await populateOpenBankingResponses(taskId);
    } else {
      console.error(`[Direct Fill] Unsupported task type: ${task.task_type}`);
      return;
    }
    
    // 3. Mark the task as submitted
    await db
      .update(tasks)
      .set({
        status: 'submitted',
        progress: 100,
        metadata: {
          ...task.metadata,
          submitted: true,
          submitted_at: new Date().toISOString()
        }
      })
      .where(eq(tasks.id, taskId));
    
    console.log(`[Direct Fill] Task ID ${taskId} marked as submitted`);
    
  } catch (error) {
    console.error(`[Direct Fill] Error:`, error);
  }
}

// KYB demo data generator
async function populateKybResponses(taskId) {
  console.log(`[Direct Fill] Populating KYB responses for task ID ${taskId}`);
  
  const demoData = [
    { field_id: 'corporateRegistration', value: 'Yes', task_id: taskId },
    { field_id: 'registrationNumber', value: 'CRN-12345678', task_id: taskId },
    { field_id: 'registrationDate', value: '2020-01-15', task_id: taskId },
    { field_id: 'registrationAuthority', value: 'Companies House UK', task_id: taskId },
    { field_id: 'goodStanding', value: 'Yes', task_id: taskId },
    { field_id: 'standingCertificate', value: 'https://example.com/cert.pdf', task_id: taskId },
    { field_id: 'standingCertificateDate', value: '2025-01-10', task_id: taskId },
    { field_id: 'regulatoryActions', value: 'No', task_id: taskId },
    { field_id: 'regulatoryActionDetails', value: '', task_id: taskId },
    { field_id: 'investigationsIncidents', value: 'No', task_id: taskId },
    { field_id: 'investigationDetails', value: '', task_id: taskId },
    { field_id: 'companyName', value: 'ExampleFinTech Ltd.', task_id: taskId },
    { field_id: 'businessType', value: 'Private Limited Company', task_id: taskId },
    { field_id: 'incorporationDate', value: '2020-01-15', task_id: taskId },
    { field_id: 'taxIdentificationNumber', value: 'GB123456789', task_id: taskId },
    { field_id: 'vatNumber', value: 'VAT-GB-987654321', task_id: taskId },
    { field_id: 'companyWebsite', value: 'https://examplefintech.com', task_id: taskId },
    { field_id: 'primaryEmail', value: 'contact@examplefintech.com', task_id: taskId },
    { field_id: 'primaryPhone', value: '+44 20 1234 5678', task_id: taskId },
    { field_id: 'registeredAddress', value: '123 Financial Street, London, EC1A 1BB', task_id: taskId },
    { field_id: 'operationalAddress', value: '456 Tech Park, London, EC2A 2BB', task_id: taskId },
    { field_id: 'mainCountry', value: 'United Kingdom', task_id: taskId },
    { field_id: 'operatingCountries', value: 'United Kingdom, France, Germany', task_id: taskId },
    { field_id: 'ownership', value: 'Private Investors (75%), Venture Capital (25%)', task_id: taskId },
    { field_id: 'ultimateBeneficialOwners', value: 'Jane Smith (40%), John Doe (35%), Acme VC (25%)', task_id: taskId },
    { field_id: 'ceo', value: 'Jane Smith', task_id: taskId },
    { field_id: 'cfo', value: 'John Doe', task_id: taskId },
    { field_id: 'companySize', value: '50-100', task_id: taskId },
    { field_id: 'annualRevenue', value: '£5M - £10M', task_id: taskId },
    { field_id: 'financialYearEnd', value: 'December 31', task_id: taskId }
  ];
  
  // Delete any existing responses
  await db
    .delete(kyb_responses)
    .where(eq(kyb_responses.task_id, taskId));
  
  // Insert demo responses
  for (const response of demoData) {
    await db
      .insert(kyb_responses)
      .values(response);
  }
  
  console.log(`[Direct Fill] Inserted ${demoData.length} KYB responses for task ID ${taskId}`);
}

// KY3P demo data generator
async function populateKy3pResponses(taskId) {
  console.log(`[Direct Fill] Populating KY3P responses for task ID ${taskId}`);
  
  // Generate 120 demo responses covering all KY3P fields
  const demoData = [];
  
  // These are example field IDs for KY3P - we'll generate 120 of them
  const prefixes = [
    'securityPolicy', 'accessControl', 'dataEncryption', 'networkSecurity',
    'incidentResponse', 'businessContinuity', 'vulnerabilityManagement',
    'securityAwareness', 'physicalSecurity', 'thirdPartyManagement'
  ];
  
  // For each prefix, create 12 fields (total 120)
  let responseId = 1;
  for (const prefix of prefixes) {
    for (let i = 1; i <= 12; i++) {
      const fieldId = `${prefix}_${i}`;
      
      // Generate appropriate demo values based on the field type
      let value = '';
      if (i % 4 === 0) {
        value = 'Yes';
      } else if (i % 4 === 1) {
        value = 'Comprehensive controls in place';
      } else if (i % 4 === 2) {
        value = 'High';
      } else {
        value = 'Implemented with regular testing';
      }
      
      demoData.push({
        id: responseId++,
        field_id: fieldId,
        value: value,
        task_id: taskId,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }
  
  // Delete any existing responses
  await db
    .delete(ky3p_responses)
    .where(eq(ky3p_responses.task_id, taskId));
  
  // Insert demo responses
  for (const response of demoData) {
    await db
      .insert(ky3p_responses)
      .values(response);
  }
  
  console.log(`[Direct Fill] Inserted ${demoData.length} KY3P responses for task ID ${taskId}`);
}

// Open Banking demo data generator
async function populateOpenBankingResponses(taskId) {
  console.log(`[Direct Fill] Populating Open Banking responses for task ID ${taskId}`);
  
  // Generate 45 demo responses covering Open Banking fields
  const demoData = [];
  
  // These are example field IDs for Open Banking
  const prefixes = [
    'apiCapabilities', 'standardsCompliance', 'securityFeatures',
    'dataProtection', 'consentManagement', 'userExperience',
    'performanceMetrics', 'integrationCapabilities', 'supportServices'
  ];
  
  // For each prefix, create 5 fields (total 45)
  let responseId = 1;
  for (const prefix of prefixes) {
    for (let i = 1; i <= 5; i++) {
      const fieldId = `${prefix}_${i}`;
      
      // Generate appropriate demo values based on the field type
      let value = '';
      if (i % 5 === 0) {
        value = 'Yes';
      } else if (i % 5 === 1) {
        value = 'Fully compliant with latest standards';
      } else if (i % 5 === 2) {
        value = 'High';
      } else if (i % 5 === 3) {
        value = '99.99%';
      } else {
        value = 'Comprehensive documentation available';
      }
      
      demoData.push({
        id: responseId++,
        field_id: fieldId,
        value: value,
        task_id: taskId,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }
  
  // Delete any existing responses
  await db
    .delete(open_banking_responses)
    .where(eq(open_banking_responses.task_id, taskId));
  
  // Insert demo responses
  for (const response of demoData) {
    await db
      .insert(open_banking_responses)
      .values(response);
  }
  
  console.log(`[Direct Fill] Inserted ${demoData.length} Open Banking responses for task ID ${taskId}`);
}

// Execute for task ID 620
directFillTask(620)
  .then(() => console.log('[Direct Fill] Script completed'))
  .catch(error => console.error('[Direct Fill] Unhandled error:', error));