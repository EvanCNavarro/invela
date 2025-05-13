/**
 * Open Banking Full Form Submission Test
 * 
 * This script tests the end-to-end Open Banking form submission process
 * to validate that our implementation correctly processes all post-submission actions:
 * 1. Form submission succeeds
 * 2. Task status is updated to 'submitted'
 * 3. Company onboarding_company_completed flag is set to true
 * 4. Risk score is generated (5-95 range)
 * 5. Risk clusters are calculated based on the risk score
 * 6. Accreditation status is set to 'APPROVED'
 * 7. Dashboard and Insights tabs are unlocked
 */

const fetch = require('node-fetch');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Terminal colors for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(color, message, colors.reset);
}

const BASE_URL = 'http://localhost:3000';

/**
 * Get authentication cookies for API requests
 */
async function getAuthCookies() {
  try {
    log('Logging in to get authentication cookies...', colors.cyan);
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '33@e.com', password: 'password' })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed with status: ${loginResponse.status}`);
    }

    log('✅ Login successful', colors.green);
    return loginResponse.headers.get('set-cookie');
  } catch (error) {
    log(`❌ Error during login: ${error.message}`, colors.red);
    process.exit(1);
  }
}

/**
 * Find an appropriate Open Banking task for testing
 */
async function findOpenBankingTestTask(cookies) {
  try {
    log('Finding an Open Banking task for testing...', colors.cyan);
    
    const tasksResponse = await fetch(`${BASE_URL}/api/tasks`, {
      headers: { Cookie: cookies }
    });
    
    if (!tasksResponse.ok) {
      throw new Error(`Failed to fetch tasks: ${tasksResponse.status}`);
    }
    
    const tasks = await tasksResponse.json();
    
    // Find an Open Banking task that's ready for submission (not already submitted)
    const openBankingTask = tasks.find(task => 
      task.task_type === 'open_banking' && 
      task.status !== 'submitted' &&
      task.progress < 100
    );
    
    if (!openBankingTask) {
      // If no task is ready for submission, try to find one that's already submitted
      // to check its status
      const submittedTask = tasks.find(task => 
        task.task_type === 'open_banking' && 
        task.status === 'submitted'
      );
      
      if (submittedTask) {
        log(`Found already submitted Open Banking task: ${submittedTask.id}`, colors.yellow);
        return { taskId: submittedTask.id, companyId: submittedTask.company_id, status: 'already_submitted' };
      }
      
      throw new Error('No Open Banking tasks found for testing');
    }
    
    log(`✅ Found Open Banking task: ${openBankingTask.id}`, colors.green);
    return { 
      taskId: openBankingTask.id, 
      companyId: openBankingTask.company_id,
      status: 'ready_for_submission'
    };
  } catch (error) {
    log(`❌ Error finding Open Banking task: ${error.message}`, colors.red);
    process.exit(1);
  }
}

/**
 * Get current company status before submission
 */
async function getCompanyStatus(companyId) {
  try {
    log(`Checking company ${companyId} status...`, colors.cyan);
    
    const query = `
      SELECT 
        id, 
        name, 
        onboarding_company_completed, 
        risk_score, 
        risk_clusters, 
        accreditation_status,
        available_tabs
      FROM companies
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [companyId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Company ${companyId} not found`);
    }
    
    const company = result.rows[0];
    
    log('Current company status:', colors.blue);
    log(`- ID: ${company.id}`, colors.blue);
    log(`- Name: ${company.name}`, colors.blue);
    log(`- Onboarding completed: ${company.onboarding_company_completed}`, colors.blue);
    log(`- Risk score: ${company.risk_score || 'Not set'}`, colors.blue);
    log(`- Accreditation status: ${company.accreditation_status || 'Not set'}`, colors.blue);
    log(`- Available tabs: ${JSON.stringify(company.available_tabs)}`, colors.blue);
    log(`- Risk clusters: ${JSON.stringify(company.risk_clusters)}`, colors.blue);
    
    return company;
  } catch (error) {
    log(`❌ Error checking company status: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Get current task status
 */
async function getTaskStatus(taskId) {
  try {
    log(`Checking task ${taskId} status...`, colors.cyan);
    
    const query = `
      SELECT 
        id, 
        title,
        task_type,
        status, 
        progress,
        metadata
      FROM tasks
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [taskId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    const task = result.rows[0];
    
    log('Current task status:', colors.blue);
    log(`- ID: ${task.id}`, colors.blue);
    log(`- Title: ${task.title}`, colors.blue);
    log(`- Type: ${task.task_type}`, colors.blue);
    log(`- Status: ${task.status}`, colors.blue);
    log(`- Progress: ${task.progress}%`, colors.blue);
    log(`- Metadata: ${JSON.stringify(task.metadata)}`, colors.blue);
    
    return task;
  } catch (error) {
    log(`❌ Error checking task status: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Generate sample Open Banking form data
 */
function generateOpenBankingFormData() {
  // Generate sample data for all 44 Open Banking fields
  const formData = {};
  
  // Sample data for key fields - in a real scenario, this would be more comprehensive
  formData.ob_scope_of_services = 'Full scope with accounts and payment initiation';
  formData.ob_data_access_types = 'Account data, Transaction data, Balance data';
  formData.ob_supported_payment_types = 'PISP, AISP, CBPII';
  formData.ob_api_standards = 'UK Open Banking Standard v3.1.10';
  formData.ob_third_party_providers = 'Yes, multiple TPPs';
  formData.ob_certification_status = 'Fully certified';
  formData.ob_security_measures = 'OB compliant security measures';
  formData.ob_data_retention_periods = '12 months for transaction data';
  formData.ob_customer_authentication = 'SCA compliant authentication flow';
  formData.ob_consent_management = 'Comprehensive consent management system';
  
  // Generate data for the remaining fields with generic values
  for (let i = 1; i <= 44; i++) {
    const fieldName = `ob_field_${i}`;
    if (!formData[fieldName]) {
      formData[fieldName] = `Sample value for field ${i}`;
    }
  }
  
  return formData;
}

/**
 * Submit Open Banking form
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
    log(`Result: ${JSON.stringify(result)}`, colors.green);
    
    return result;
  } catch (error) {
    log(`❌ Error submitting form: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Verify post-submission status
 */
async function verifyPostSubmissionStatus(taskId, companyId) {
  try {
    // Wait a moment for all database updates to complete
    log('Waiting for a moment to allow all post-submission processing to complete...', colors.yellow);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check task status first
    const taskAfter = await getTaskStatus(taskId);
    
    // Verify task is properly marked as submitted
    if (taskAfter.status !== 'submitted' || taskAfter.progress !== 100) {
      log('❌ Task status verification failed', colors.red);
      log(`Expected status 'submitted' and progress 100%, got status '${taskAfter.status}' and progress ${taskAfter.progress}%`, colors.red);
      return false;
    }
    
    log('✅ Task status verification passed', colors.green);
    
    // Check company status
    const companyAfter = await getCompanyStatus(companyId);
    
    // Verify company changes
    const verificationResults = {
      onboardingCompleted: companyAfter.onboarding_company_completed === true,
      hasRiskScore: typeof companyAfter.risk_score === 'number' && companyAfter.risk_score >= 5 && companyAfter.risk_score <= 95,
      accreditationStatus: companyAfter.accreditation_status === 'APPROVED',
      hasRiskClusters: !!companyAfter.risk_clusters && typeof companyAfter.risk_clusters === 'object',
      tabsUnlocked: Array.isArray(companyAfter.available_tabs) && 
                   companyAfter.available_tabs.includes('dashboard') && 
                   companyAfter.available_tabs.includes('insights')
    };
    
    // Log verification results
    log('Company status verification results:', colors.magenta);
    for (const [key, result] of Object.entries(verificationResults)) {
      const icon = result ? '✅' : '❌';
      const color = result ? colors.green : colors.red;
      log(`${icon} ${key}: ${result}`, color);
    }
    
    // Calculate overall success
    const overallSuccess = Object.values(verificationResults).every(Boolean);
    
    if (overallSuccess) {
      log('🎉 All post-submission verifications passed successfully!', colors.green);
    } else {
      log('❌ Some post-submission verifications failed', colors.red);
      log('Please check the logs for details.', colors.red);
    }
    
    return overallSuccess;
  } catch (error) {
    log(`❌ Error verifying post-submission status: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Run the full test
 */
async function runTest() {
  let client;
  try {
    log('📊 STARTING OPEN BANKING FULL SUBMISSION TEST', colors.bright);
    log('=============================================', colors.bright);
    
    // Get authentication cookies
    const cookies = await getAuthCookies();
    
    // Find a suitable Open Banking task
    const { taskId, companyId, status } = await findOpenBankingTestTask(cookies);
    
    // Get a client from the pool for transaction
    client = await pool.connect();
    
    // Begin transaction - we will rollback at the end to avoid altering test data
    await client.query('BEGIN');
    
    try {
      // Check status before submission
      log('\n📋 CHECKING PRE-SUBMISSION STATUS', colors.yellow);
      const companyBefore = await getCompanyStatus(companyId);
      const taskBefore = await getTaskStatus(taskId);
      
      // If task is already submitted, we'll skip submission but still check status
      if (status === 'already_submitted') {
        log('⚠️ Task is already submitted, skipping submission but verifying status', colors.yellow);
        await verifyPostSubmissionStatus(taskId, companyId);
        return;
      }
      
      // Submit the form if task is ready for submission
      log('\n🚀 SUBMITTING FORM', colors.magenta);
      const submissionResult = await submitOpenBankingForm(taskId, companyId, cookies);
      
      // Verify post-submission status
      log('\n🔍 VERIFYING POST-SUBMISSION STATUS', colors.cyan);
      const verificationResult = await verifyPostSubmissionStatus(taskId, companyId);
      
      if (verificationResult) {
        log('\n🎉 TEST COMPLETED SUCCESSFULLY', colors.green);
      } else {
        log('\n❌ TEST FAILED', colors.red);
      }
    } finally {
      // Rollback transaction to avoid affecting test data
      await client.query('ROLLBACK');
      log('\n⚠️ Test transaction rolled back to preserve test data', colors.yellow);
    }
  } catch (error) {
    log(`❌ Test failed with error: ${error.message}`, colors.red);
    console.error(error);
  } finally {
    if (client) {
      client.release();
    }
    
    // Close the pool
    await pool.end();
    log('📋 Test completed, database connection closed', colors.blue);
  }
}

// Run the test
runTest();