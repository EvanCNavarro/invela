/**
 * Test Script for Open Banking Form Submission Fix
 * 
 * This script tests that our fix for the Open Banking submission issue works properly.
 * It submits a form to the /api/transactional-form endpoint and verifies that the
 * post-submission actions execute correctly.
 */

import fetch from 'node-fetch';
import pg from 'pg';
const { Pool } = pg;

// ANSI color codes for better console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m'
};

// Config
const BASE_URL = 'http://localhost:5000';
const USERNAME = '35@e.com';  // Use a known existing account from logs
const PASSWORD = 'password123';

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Logger helper
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Login to get session cookies
 */
async function login() {
  try {
    log('Logging in...', colors.blue);
    
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: USERNAME, password: PASSWORD }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Login failed with status ${response.status}`);
    }
    
    // Extract cookies from response
    const cookieHeader = response.headers.get('set-cookie');
    log('✅ Login successful', colors.green);
    
    // Node-fetch doesn't handle cookies automatically, so we need to parse them
    let cookies = '';
    if (cookieHeader) {
      // This is a simple approach - in production you'd use a cookie parsing library
      cookies = cookieHeader.split(',').map(cookie => cookie.split(';')[0]).join('; ');
    }
    
    // Verify the session by calling a protected endpoint
    const verifyResponse = await fetch(`${BASE_URL}/api/companies/current`, {
      headers: {
        Cookie: cookies
      }
    });
    
    if (!verifyResponse.ok) {
      throw new Error(`Session verification failed with status ${verifyResponse.status}`);
    }
    
    log('✅ Session verified successfully', colors.green);
    return cookies;
  } catch (error) {
    log(`❌ Login error: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Find a suitable Open Banking task for testing
 */
async function findOpenBankingTask(cookies) {
  try {
    log('Finding a testable Open Banking task...', colors.blue);
    
    const response = await fetch(`${BASE_URL}/api/tasks`, {
      headers: { Cookie: cookies }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tasks: ${response.status}`);
    }
    
    const tasks = await response.json();
    
    // Filter to find an Open Banking task that's ready for submission
    const openBankingTasks = tasks.filter(task => 
      task.task_type === 'open_banking' && 
      task.status === 'ready_for_submission'
    );
    
    if (openBankingTasks.length === 0) {
      log('❌ No suitable Open Banking tasks found', colors.red);
      throw new Error('No suitable Open Banking tasks found');
    }
    
    const selectedTask = openBankingTasks[0];
    
    log(`✅ Found Open Banking task: ${selectedTask.id} (${selectedTask.title})`, colors.green);
    return { taskId: selectedTask.id, companyId: selectedTask.company_id };
  } catch (error) {
    log(`❌ Error finding task: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Generate sample Open Banking form data
 */
function generateOpenBankingFormData() {
  // Generate sample responses for Open Banking form
  return {
    "apiAgreementDocumentation": "Yes",
    "apiDocumentationStandardsUsed": "Yes",
    "apiMethodsUsed": ["REST", "SOAP"],
    "apiRateLimit": "1000 requests per minute",
    "apiUserManagement": "Yes",
    "applicationTenancyModel": "Multi-tenant",
    "authMechanismsSupported": ["OAuth 2.0", "API Keys"],
    "authenticationDetailsStorageMethod": "Encrypted in database",
    "authenticationMethodsSupported": ["Password", "2FA"],
    "backupFrequency": "Daily",
    "backupStrategy": "Full daily backup with hourly incrementals",
    "certificationLevel": "SOC 2 Type II",
    "certifications": ["ISO 27001", "SOC 2", "PCI DSS"],
    "cloudServiceProvider": ["AWS", "Azure"],
    "countryDataResidency": ["United States", "European Union"],
    "dataBreachNotificationProcess": "Comprehensive process with 24-hour notification timeline",
    "dataClassificationPolicy": "Yes",
    "dataCollectionCategoriesPersonal": ["Name", "Email", "Address", "Phone"],
    "dataCollectionCategoriesTransactional": ["Account numbers", "Transaction details", "Balance information"],
    "dataEncryptionAtRest": "Yes",
    "dataEncryptionInTransit": "Yes",
    "dataProcessingPurposes": ["Account management", "Payment processing", "Fraud detection"],
    "dataProviderType": "Regulated financial institution",
    "dataSecurityAndPrivacyWalkthrough": "Yes, available upon request with signed NDA",
    "disasterRecoveryPlan": "Yes",
    "discoveryMethodsSupported": ["API Documentation", "Sandbox environment"],
    "employeeSecurityTrainingFrequency": "Quarterly",
    "endpointDocumentationAvailable": "Yes",
    "externalPenetrationTestingFrequency": "Annually",
    "fapiAndDpopSupport": "Yes",
    "financialServicesOffered": ["Payment initiation", "Account information"],
    "incidentResponseTeam": "Yes",
    "incidentResponseTimeSLA": "15 minutes for critical issues",
    "licenseOrRegulatoryApprovals": ["Banking license", "Payment Institution license"],
    "mfaImplementation": "Yes",
    "multiTenantDataSegregation": "Yes",
    "oAuth20FlowsSupported": ["Authorization Code", "Client Credentials"],
    "openAPISpecification": "Yes",
    "openBankingStandards": ["UK Open Banking", "Berlin Group"],
    "passwordPolicyEnforcement": "Yes",
    "privacyPolicyProvided": "Yes",
    "privacyPolicyURL": "https://example.com/privacy-policy",
    "productionAccessProcess": "Formal onboarding with security review",
    "providerInsurance": "Yes",
    "recoveryPointObjective": "4 hours",
    "recoveryTimeObjective": "8 hours",
    "regulatoryComplianceFramework": "Yes",
    "sandboxAvailability": "Yes",
    "scopes": "account:read, payment:write, balance:read",
    "sensitiveDataHandlingTraining": "Yes",
    "serviceTypeOpenBanking": ["Account Information", "Payment Initiation"],
    "thirdPartyAuditFrequency": "Annually",
    "thirdPartySecurityAudits": "Yes",
    "tppIdentityVerificationProcess": "Document verification and regulatory checks",
    "vendorName": "Open Banking Example Corp."
  };
}

/**
 * Submit the Open Banking form via the /api/transactional-form endpoint
 */
async function submitOpenBankingForm(taskId, companyId, cookies) {
  try {
    log(`Submitting Open Banking form for task ${taskId}...`, colors.cyan);
    
    const formData = generateOpenBankingFormData();
    
    const submissionResponse = await fetch(`${BASE_URL}/api/transactional-form`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Cookie: cookies
      },
      body: JSON.stringify({
        taskId,
        companyId,
        formType: 'open_banking',
        formData
      })
    });
    
    if (!submissionResponse.ok) {
      const errorText = await submissionResponse.text();
      throw new Error(`Form submission failed with status: ${submissionResponse.status}, error: ${errorText}`);
    }
    
    const result = await submissionResponse.json();
    
    log('✅ Form submission successful', colors.green);
    log(`Result: ${JSON.stringify(result, null, 2)}`, colors.green);
    
    return result;
  } catch (error) {
    log(`❌ Error submitting form: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Check company status after form submission
 */
async function checkCompanyStatus(companyId) {
  try {
    log(`Checking company ${companyId} status after submission...`, colors.blue);
    
    const client = await pool.connect();
    
    try {
      // Query company data
      const companyResult = await client.query(
        `SELECT id, name, risk_score, chosen_score, accreditation_status, 
         onboarding_company_completed, available_tabs
         FROM companies WHERE id = $1`,
        [companyId]
      );
      
      if (companyResult.rows.length === 0) {
        throw new Error(`Company ${companyId} not found`);
      }
      
      const company = companyResult.rows[0];
      
      log(`Company details:`, colors.brightYellow);
      log(`- Name: ${company.name}`, colors.yellow);
      log(`- Risk score: ${company.risk_score ?? 'Not set'}`, colors.yellow);
      log(`- Chosen score: ${company.chosen_score ?? 'Not set'}`, colors.yellow);
      log(`- Accreditation status: ${company.accreditation_status ?? 'Not set'}`, colors.yellow);
      log(`- Onboarding completed: ${company.onboarding_company_completed ? 'Yes' : 'No'}`, colors.yellow);
      log(`- Available tabs: ${JSON.stringify(company.available_tabs)}`, colors.yellow);
      
      return {
        id: company.id,
        name: company.name,
        riskScore: company.risk_score,
        chosenScore: company.chosen_score,
        accreditationStatus: company.accreditation_status,
        onboardingCompleted: company.onboarding_company_completed,
        availableTabs: company.available_tabs || []
      };
    } finally {
      client.release();
    }
  } catch (error) {
    log(`❌ Error checking company status: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Check task status after form submission
 */
async function checkTaskStatus(taskId) {
  try {
    log(`Checking task ${taskId} status after submission...`, colors.blue);
    
    const client = await pool.connect();
    
    try {
      // Query task data
      const taskResult = await client.query(
        `SELECT id, title, status, progress, metadata 
         FROM tasks WHERE id = $1`,
        [taskId]
      );
      
      if (taskResult.rows.length === 0) {
        throw new Error(`Task ${taskId} not found`);
      }
      
      const task = taskResult.rows[0];
      
      log(`Task details:`, colors.brightYellow);
      log(`- Title: ${task.title}`, colors.yellow);
      log(`- Status: ${task.status}`, colors.yellow);
      log(`- Progress: ${task.progress}%`, colors.yellow);
      log(`- Has file ID: ${task.metadata && task.metadata.fileId ? 'Yes' : 'No'}`, colors.yellow);
      
      return {
        id: task.id,
        title: task.title,
        status: task.status,
        progress: task.progress,
        metadata: task.metadata
      };
    } finally {
      client.release();
    }
  } catch (error) {
    log(`❌ Error checking task status: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Run the test
 */
async function runTest() {
  try {
    log('\n===========================================', colors.brightCyan);
    log('🧪 TESTING OPEN BANKING FORM SUBMISSION FIX', colors.brightCyan);
    log('===========================================\n', colors.brightCyan);
    
    // Login
    const cookies = await login();
    
    // Find an Open Banking task
    let taskId, companyId;
    try {
      const result = await findOpenBankingTask(cookies);
      taskId = result.taskId;
      companyId = result.companyId;
    } catch (error) {
      log('⚠️ Using default test task/company values due to error', colors.yellow);
      // Fallback to hardcoded values if no suitable task is found
      taskId = 764; // Adjust this value based on a known valid Open Banking task ID
      companyId = 269; // Adjust this value based on a known valid company ID
    }
    
    // Check initial state
    log('\n📊 CHECKING INITIAL STATE', colors.magenta);
    const initialCompanyStatus = await checkCompanyStatus(companyId);
    const initialTaskStatus = await checkTaskStatus(taskId);
    
    // Skip submission if the task is already submitted
    if (initialTaskStatus.status === 'submitted') {
      log('⚠️ Task is already in submitted state. Skipping submission.', colors.yellow);
      log('This test will only verify the current state.', colors.yellow);
    } else {
      // Submit form
      log('\n🚀 SUBMITTING FORM', colors.magenta);
      await submitOpenBankingForm(taskId, companyId, cookies);
    }
    
    // Check final state
    log('\n📊 CHECKING FINAL STATE', colors.magenta);
    const finalCompanyStatus = await checkCompanyStatus(companyId);
    const finalTaskStatus = await checkTaskStatus(taskId);
    
    // Compare states
    log('\n📋 SUMMARY OF CHANGES', colors.brightMagenta);
    
    // Task changes
    log('Task changes:', colors.cyan);
    log(`- Status: ${initialTaskStatus.status} -> ${finalTaskStatus.status}`, 
      initialTaskStatus.status !== finalTaskStatus.status ? colors.brightGreen : colors.yellow);
    log(`- Progress: ${initialTaskStatus.progress}% -> ${finalTaskStatus.progress}%`, 
      initialTaskStatus.progress !== finalTaskStatus.progress ? colors.brightGreen : colors.yellow);
    log(`- File ID: ${initialTaskStatus.metadata?.fileId ? 'Present' : 'Missing'} -> ${finalTaskStatus.metadata?.fileId ? 'Present' : 'Missing'}`, 
      initialTaskStatus.metadata?.fileId !== finalTaskStatus.metadata?.fileId ? colors.brightGreen : colors.yellow);
    
    // Company changes
    log('Company changes:', colors.cyan);
    log(`- Risk score: ${initialCompanyStatus.riskScore ?? 'None'} -> ${finalCompanyStatus.riskScore ?? 'None'}`, 
      initialCompanyStatus.riskScore !== finalCompanyStatus.riskScore ? colors.brightGreen : colors.yellow);
    log(`- Accreditation status: ${initialCompanyStatus.accreditationStatus ?? 'None'} -> ${finalCompanyStatus.accreditationStatus ?? 'None'}`, 
      initialCompanyStatus.accreditationStatus !== finalCompanyStatus.accreditationStatus ? colors.brightGreen : colors.yellow);
    log(`- Onboarding completed: ${initialCompanyStatus.onboardingCompleted ? 'Yes' : 'No'} -> ${finalCompanyStatus.onboardingCompleted ? 'Yes' : 'No'}`, 
      initialCompanyStatus.onboardingCompleted !== finalCompanyStatus.onboardingCompleted ? colors.brightGreen : colors.yellow);
    
    // Tabs changes
    const initialTabs = initialCompanyStatus.availableTabs || [];
    const finalTabs = finalCompanyStatus.availableTabs || [];
    const newTabs = finalTabs.filter(tab => !initialTabs.includes(tab));
    
    log(`- Available tabs: ${initialTabs.length} -> ${finalTabs.length}`, 
      initialTabs.length !== finalTabs.length ? colors.brightGreen : colors.yellow);
    
    if (newTabs.length > 0) {
      log(`  New tabs: ${newTabs.join(', ')}`, colors.brightGreen);
    }
    
    // Overall validation
    log('\n🔍 VALIDATION', colors.brightBlue);
    
    // Check task is submitted
    const taskSubmitted = finalTaskStatus.status === 'submitted';
    log(`✓ Task status is 'submitted': ${taskSubmitted ? 'PASS' : 'FAIL'}`, 
      taskSubmitted ? colors.brightGreen : colors.brightRed);
    
    // Check task progress is 100%
    const taskProgress100 = finalTaskStatus.progress === 100;
    log(`✓ Task progress is 100%: ${taskProgress100 ? 'PASS' : 'FAIL'}`, 
      taskProgress100 ? colors.brightGreen : colors.brightRed);
    
    // Check file ID exists
    const hasFileId = !!finalTaskStatus.metadata?.fileId;
    log(`✓ Task has fileId: ${hasFileId ? 'PASS' : 'FAIL'}`, 
      hasFileId ? colors.brightGreen : colors.brightRed);
    
    // Check risk score is set and between 5-95
    const hasValidRiskScore = finalCompanyStatus.riskScore !== null && 
                             finalCompanyStatus.riskScore >= 5 && 
                             finalCompanyStatus.riskScore <= 95;
    log(`✓ Risk score is set (5-95): ${hasValidRiskScore ? 'PASS' : 'FAIL'}${hasValidRiskScore ? ' - Value: ' + finalCompanyStatus.riskScore : ''}`, 
      hasValidRiskScore ? colors.brightGreen : colors.brightRed);
    
    // Check accreditation status is APPROVED
    const isAccredited = finalCompanyStatus.accreditationStatus === 'APPROVED';
    log(`✓ Accreditation status is APPROVED: ${isAccredited ? 'PASS' : 'FAIL'}`, 
      isAccredited ? colors.brightGreen : colors.brightRed);
    
    // Check onboarding is completed
    const onboardingCompleted = finalCompanyStatus.onboardingCompleted === true;
    log(`✓ Onboarding is marked as completed: ${onboardingCompleted ? 'PASS' : 'FAIL'}`, 
      onboardingCompleted ? colors.brightGreen : colors.brightRed);
    
    // Overall result
    const allChecksPass = taskSubmitted && taskProgress100 && hasFileId && 
                         hasValidRiskScore && isAccredited && onboardingCompleted;
    
    log('\n📝 TEST RESULT', colors.brightMagenta);
    log(`${allChecksPass ? '✅ All checks PASSED! The fix works correctly!' : '❌ Some checks FAILED. The fix needs more work.'}`, 
      allChecksPass ? colors.brightGreen : colors.brightRed);
    
  } catch (error) {
    log(`\n❌ TEST FAILED with error: ${error.message}`, colors.brightRed);
    console.error(error);
  } finally {
    // Close the pool when done
    await pool.end();
  }
}

// Run the test
runTest()
  .catch(error => {
    console.error('Unhandled error in runTest:', error);
    process.exit(1);
  });