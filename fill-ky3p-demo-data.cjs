/**
 * KY3P Demo Data Fill Script
 * 
 * This script directly fills the ky3p_responses table with demo data values
 * for all fields related to a specific task.
 */

// Import pg without requiring an install
const { Pool } = require('pg');

// Function to get a database connection
async function getDbConnection() {
  // Use the DATABASE_URL from environment variables or fall back to the default
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
  
  console.log('Using database URL:', dbUrl);
  
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: false
  });
  
  // Test the connection
  try {
    const client = await pool.connect();
    console.log('Successfully connected to the database');
    return client;
  } catch (err) {
    console.error('Database connection error:', err);
    throw err;
  }
}

// Fill KY3P responses with demo data
async function fillKy3pDemoData(taskId) {
  if (!taskId) {
    throw new Error('Task ID is required');
  }
  
  console.log(`Filling KY3P demo data for task ${taskId}...`);
  
  const client = await getDbConnection();
  
  try {
    // Get all KY3P fields from the database
    const { rows: fields } = await client.query(`
      SELECT * FROM ky3p_fields
      WHERE field_type != 'section'
    `);
    
    console.log(`Found ${fields.length} fields to fill with demo data`);
    
    // Get demo data values from the database or use the default set
    const demoData = getDemoValues();
    
    // Delete existing responses to avoid duplicates
    const deleteResult = await client.query(`
      DELETE FROM ky3p_responses
      WHERE task_id = $1
    `, [taskId]);
    
    console.log(`Deleted ${deleteResult.rowCount} existing responses`);
    
    // Process each field
    let insertedCount = 0;
    let errorCount = 0;
    
    for (const field of fields) {
      try {
        // Get the demo value for this field
        // First check if there's a specific demo value for this field key
        let demoValue = demoData[field.field_key];
        
        // If no specific value, use type-based defaults
        if (demoValue === undefined) {
          demoValue = getDefaultValueByType(field.field_type);
        }
        
        // Skip fields with no demo value
        if (demoValue === undefined || demoValue === null) {
          console.log(`Skipping field ${field.field_key} (no demo value available)`);
          continue;
        }
        
        // Insert the response
        await client.query(`
          INSERT INTO ky3p_responses
          (task_id, field_id, response_value, status, created_at, updated_at, version)
          VALUES ($1, $2, $3, 'COMPLETE', NOW(), NOW(), 1)
        `, [taskId, field.id, String(demoValue)]);
        
        insertedCount++;
        
        // Log progress periodically
        if (insertedCount % 10 === 0) {
          console.log(`Inserted ${insertedCount} responses...`);
        }
      } catch (fieldError) {
        console.error(`Error inserting response for field ${field.field_key}:`, fieldError);
        errorCount++;
      }
    }
    
    console.log(`Successfully inserted ${insertedCount} responses with ${errorCount} errors`);
    
    // Update task progress to 100% if any responses were inserted
    if (insertedCount > 0) {
      await client.query(`
        UPDATE tasks
        SET progress = 100, status = 'in_progress', updated_at = NOW()
        WHERE id = $1
      `, [taskId]);
      
      console.log(`Updated task ${taskId} progress to 100%`);
    }
    
    return {
      taskId,
      insertedCount,
      errorCount,
      success: insertedCount > 0
    };
  } finally {
    // Close the database connection
    await client.end();
    console.log('Database connection closed');
  }
}

// Get demo values for KY3P fields
function getDemoValues() {
  // Extensive demo values for a variety of KY3P fields
  // These values match what's used in the ky3p-form-service.ts
  return {
    // Development fields
    'externalSystems': "We maintain a comprehensive inventory system that tracks all external information assets. Updates occur monthly through automated discovery scans.",
    'softwareQualityControl': "Our software development life cycle includes multiple quality control checkpoints including automated testing, code reviews, and security scanning.",
    'changeMgmtProcess': "We follow a formal change management process with documented approval workflows and rollback procedures.",
    'softwareInventory': "All software assets are cataloged in our centralized CMDB which is updated daily through automated discovery.",
    'dataGovernance': "Our data governance program includes data classification, retention policies, and access controls based on least privilege principles.",
    'releaseManagement': "We use a staged release process with separate development, testing, and production environments with formal sign-offs between stages.",
    'testingControls': "Automated testing includes unit, integration, security, and performance testing, with manual QA verification before production deployment.",
    'softwareArchitecture': "Our multi-tier architecture separates presentation, application, and data layers with defined security boundaries between each tier.",
    'serviceProviders': "Third-party service providers undergo rigorous security assessments before integration and annual security reviews.",
    'changeTesting': "All changes undergo comprehensive testing including regression testing in a pre-production environment that mirrors production.",
    
    // Governance fields
    'privacyStandards': "Our privacy policy framework aligns with GDPR, CCPA, and CPPA requirements with quarterly compliance reviews.",
    'privacyNotices': "Privacy notices are prominently displayed at all data collection points in multiple languages with clear opt-in mechanisms.",
    'privacyIncidentProcedure': "We have a dedicated privacy incident response team with formalized procedures for reporting, containment, and resolution.",
    'breachNotification': "Our incident response team immediately notifies data controllers via our secure alert system within 24 hours of breach confirmation.",
    'dataRetention': "Personal data is retained only for the duration specified in our data retention schedule with automated purging.",
    'dataPurposeLimit': "Access controls and data classification ensure collection is limited to what's necessary for the stated purpose.",
    'individualRights': "We have a dedicated portal for users to exercise their privacy rights with 30-day response guarantees.",
    'dataMinimization': "Our data minimization policy requires justification for all data fields collected in any system.",
    'informationSecurity': "Our ISO 27001 certified information security program includes multi-layered controls and 24/7 monitoring.",
    'riskAssessments': "We conduct quarterly risk assessments using a combination of automated vulnerability scanning and manual penetration testing.",
    
    // Resilience fields
    'disasterRecovery': "Our disaster recovery plan includes daily backups, redundant systems, and quarterly testing.",
    'businessContinuity': "Our business continuity plan ensures critical functions can resume within 4 hours of a major disruption.",
    'backupProcess': "We maintain encrypted, geographically dispersed backups with daily incremental and weekly full backups.",
    'redundancy': "Critical systems have N+1 redundancy with automatic failover and load balancing across multiple availability zones.",
    'testingFrequency': "Disaster recovery testing occurs quarterly with tabletop exercises and annual full system recovery tests.",
    'recoveryTime': "Our Recovery Time Objective (RTO) is 4 hours and Recovery Point Objective (RPO) is 1 hour for all critical systems.",
    'incidentResponse': "Our 24/7 SOC team has documented incident response procedures with 15-minute SLAs for critical alerts.",
    'communicationPlan': "Our emergency communication plan includes multiple channels including SMS, email, and voice with defined escalation paths.",
    'serviceAvailability': "We maintain 99.95% uptime with a distributed architecture that minimizes single points of failure.",
    'capacityPlanning': "Capacity planning includes monthly reviews of resource utilization with automatic scaling for demand spikes.",
    
    // Security fields
    'vulnerabilityTesting': "Our security team conducts weekly automated scans and quarterly penetration tests of all systems.",
    'patchManagement': "Critical security patches are applied within 24 hours following our documented patch management process.",
    'accessControl': "Multi-layered access controls include biometric, MFA, and role-based permissions with quarterly reviews.",
    'defaultPasswords': "All default passwords are immediately changed using an automated provisioning process before deployment.",
    'remoteMfa': "MFA is mandatory for all remote access using a combination of authenticator apps and hardware tokens.",
    'encryptionStandards': "We use AES-256 encryption for data at rest and TLS 1.3 for data in transit across all systems.",
    'physicalSecurity': "Our facilities include 24/7 security personnel, biometric access, CCTV monitoring, and mantrap entries.",
    'securityAwareness': "Security awareness training is mandatory for all employees quarterly with simulated phishing tests monthly.",
    'securityTesting': "We conduct internal and external penetration testing quarterly using certified security professionals.",
    'assetRetrieval': "Our HR and security teams have a documented process for retrieving all company assets during offboarding.",
    'vendorSecurity': "Third-party vendors undergo rigorous security assessments before onboarding and annual security reviews."
  };
}

// Get default value by field type
function getDefaultValueByType(fieldType) {
  switch (fieldType?.toLowerCase()) {
    case 'text':
      return "Sample text response for demo purposes.";
    case 'textarea':
      return "This is a longer text response that demonstrates how text area fields are populated with demo data. Our systematic approach ensures comprehensive data for testing.";
    case 'select':
    case 'dropdown':
      return "Option 1";
    case 'radio':
      return "Yes";
    case 'checkbox':
      return "true";
    case 'date':
      return new Date().toISOString().split('T')[0];
    case 'email':
      return "demo@example.com";
    case 'number':
      return "42";
    case 'url':
      return "https://example.com";
    case 'file':
      return "demo-file.pdf";
    default:
      return "Sample response for field type: " + fieldType;
  }
}

// Main function to run the script
async function main() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    
    // Check if a task ID was provided
    if (args.length === 0) {
      console.error('Please provide a task ID as an argument');
      process.exit(1);
    }
    
    const taskId = parseInt(args[0], 10);
    
    if (isNaN(taskId)) {
      console.error('Task ID must be a number');
      process.exit(1);
    }
    
    // Fill KY3P demo data
    const result = await fillKy3pDemoData(taskId);
    
    console.log('Script completed successfully:', result);
  } catch (error) {
    console.error('Error running script:', error);
    process.exit(1);
  }
}

// Run the script
main();