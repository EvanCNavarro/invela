/**
 * Open Banking Form Submission Test
 * 
 * This script tests the submission of an Open Banking form
 * through the transactional form submission API to validate
 * that our fix for post-submission processing is working.
 */

import axios from 'axios';
import pg from 'pg';
const { Pool } = pg;

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Task ID to test with
const TASK_ID = 792; // Open Banking task for company 280
const COMPANY_ID = 280; // DevTest25

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Get authentication cookies for API requests
 */
async function getAuthCookies() {
  // For testing purposes, we'll connect directly to the database
  // In production, you'd use a proper login flow
  try {
    const { rows } = await pool.query(`
      SELECT id, email 
      FROM users 
      WHERE is_admin = true
      LIMIT 1
    `);
    
    if (!rows.length) {
      throw new Error('No admin users found for testing');
    }
    
    // Use the first admin user
    return {
      userid: rows[0].id,
      useremail: rows[0].email
    };
  } catch (error) {
    log(`Error getting auth cookies: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Check company status before submission
 */
async function checkCompanyStatusBefore() {
  log(`Checking company ${COMPANY_ID} status BEFORE submission...`, colors.cyan);
  
  try {
    const { rows } = await pool.query(`
      SELECT 
        id, 
        name, 
        onboarding_company_completed, 
        risk_score, 
        accreditation_status, 
        risk_clusters,
        available_tabs
      FROM companies
      WHERE id = $1
    `, [COMPANY_ID]);
    
    if (!rows.length) {
      throw new Error(`Company ${COMPANY_ID} not found`);
    }
    
    const company = rows[0];
    log(`Company "${company.name}" status BEFORE submission:`, colors.cyan);
    log(`  - Onboarding Completed: ${company.onboarding_company_completed ? 'YES' : 'NO'}`, 
        company.onboarding_company_completed ? colors.green : colors.yellow);
    log(`  - Risk Score: ${company.risk_score || 'Not set'}`, 
        company.risk_score ? colors.green : colors.yellow);
    log(`  - Accreditation Status: ${company.accreditation_status || 'Not set'}`, 
        colors.yellow);
    log(`  - Risk Clusters: ${company.risk_clusters ? 'Set' : 'Not set'}`, 
        company.risk_clusters ? colors.green : colors.yellow);
    
    const tabs = Array.isArray(company.available_tabs) 
      ? company.available_tabs 
      : (typeof company.available_tabs === 'string' 
          ? JSON.parse(company.available_tabs) 
          : []);
    
    log(`  - Available Tabs: ${tabs.join(', ')}`, colors.yellow);
    
    return company;
  } catch (error) {
    log(`Error checking company status: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Check company status after submission
 */
async function checkCompanyStatusAfter() {
  log(`\nChecking company ${COMPANY_ID} status AFTER submission...`, colors.cyan);
  
  try {
    const { rows } = await pool.query(`
      SELECT 
        id, 
        name, 
        onboarding_company_completed, 
        risk_score, 
        accreditation_status, 
        risk_clusters,
        available_tabs
      FROM companies
      WHERE id = $1
    `, [COMPANY_ID]);
    
    if (!rows.length) {
      throw new Error(`Company ${COMPANY_ID} not found`);
    }
    
    const company = rows[0];
    log(`Company "${company.name}" status AFTER submission:`, colors.cyan);
    log(`  - Onboarding Completed: ${company.onboarding_company_completed ? 'YES' : 'NO'}`, 
        company.onboarding_company_completed ? colors.green : colors.red);
    log(`  - Risk Score: ${company.risk_score || 'Not set'}`, 
        company.risk_score ? colors.green : colors.red);
    log(`  - Accreditation Status: ${company.accreditation_status || 'Not set'}`, 
        company.accreditation_status ? colors.green : colors.yellow);
    
    if (company.risk_clusters) {
      log(`  - Risk Clusters: Set`, colors.green);
      const clusters = typeof company.risk_clusters === 'string' 
        ? JSON.parse(company.risk_clusters) 
        : company.risk_clusters;
      
      Object.entries(clusters).forEach(([key, value]) => {
        log(`    - ${key}: ${value}`, colors.blue);
      });
    } else {
      log(`  - Risk Clusters: Not set`, colors.red);
    }
    
    const tabs = Array.isArray(company.available_tabs) 
      ? company.available_tabs 
      : (typeof company.available_tabs === 'string' 
          ? JSON.parse(company.available_tabs) 
          : []);
    
    log(`  - Available Tabs: ${tabs.join(', ')}`, colors.cyan);
    log(`    - Dashboard Tab: ${tabs.includes('dashboard') ? '✅' : '❌'}`,
        tabs.includes('dashboard') ? colors.green : colors.red);
    log(`    - Insights Tab: ${tabs.includes('insights') ? '✅' : '❌'}`,
        tabs.includes('insights') ? colors.green : colors.red);
    
    return company;
  } catch (error) {
    log(`Error checking company status: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Get task status before submission
 */
async function getTaskStatusBefore() {
  log(`\nChecking task ${TASK_ID} status BEFORE submission...`, colors.cyan);
  
  try {
    const { rows } = await pool.query(`
      SELECT id, title, status, progress, company_id
      FROM tasks
      WHERE id = $1
    `, [TASK_ID]);
    
    if (!rows.length) {
      throw new Error(`Task ${TASK_ID} not found`);
    }
    
    const task = rows[0];
    log(`Task "${task.title}" (ID: ${task.id}) status BEFORE submission:`, colors.cyan);
    log(`  - Status: ${task.status}`, colors.yellow);
    log(`  - Progress: ${task.progress}%`, colors.yellow);
    
    return task;
  } catch (error) {
    log(`Error checking task status: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Get task status after submission
 */
async function getTaskStatusAfter() {
  log(`\nChecking task ${TASK_ID} status AFTER submission...`, colors.cyan);
  
  try {
    const { rows } = await pool.query(`
      SELECT id, title, status, progress, company_id, file_id, submitted
      FROM tasks
      WHERE id = $1
    `, [TASK_ID]);
    
    if (!rows.length) {
      throw new Error(`Task ${TASK_ID} not found`);
    }
    
    const task = rows[0];
    log(`Task "${task.title}" (ID: ${task.id}) status AFTER submission:`, colors.cyan);
    log(`  - Status: ${task.status}`, 
        task.status === 'submitted' ? colors.green : colors.red);
    log(`  - Progress: ${task.progress}%`, 
        task.progress === 100 ? colors.green : colors.yellow);
    log(`  - Submitted Flag: ${task.submitted ? 'YES' : 'NO'}`,
        task.submitted ? colors.green : colors.red);
    log(`  - File ID: ${task.file_id || 'Not set'}`,
        task.file_id ? colors.green : colors.yellow);
    
    return task;
  } catch (error) {
    log(`Error checking task status: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Submit the form using the transactional submission API
 */
async function submitForm() {
  log(`\nSubmitting form for task ${TASK_ID}...`, colors.magenta);
  
  try {
    // Get form data from the database
    const { rows: formDataRows } = await pool.query(`
      SELECT field_key, field_value
      FROM open_banking_responses
      WHERE task_id = $1
    `, [TASK_ID]);
    
    if (!formDataRows.length) {
      throw new Error(`No form data found for task ${TASK_ID}`);
    }
    
    // Convert to a form data object
    const formData = formDataRows.reduce((acc, row) => {
      acc[row.field_key] = row.field_value;
      return acc;
    }, {});
    
    log(`Retrieved ${Object.keys(formData).length} form fields`, colors.green);
    
    // Get auth cookies
    const authCookies = await getAuthCookies();
    log(`Using auth: User ID ${authCookies.userid}`, colors.blue);
    
    // Prepare submission payload
    const submissionPayload = {
      taskId: TASK_ID,
      userId: authCookies.userid,
      companyId: COMPANY_ID,
      formType: 'open_banking',
      formData
    };
    
    log('Sending submission request to API...', colors.blue);
    
    // Make the API request
    const response = await axios.post(
      'http://localhost:5000/api/transactional-forms/submit', 
      submissionPayload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    log(`Form submission response status: ${response.status}`, colors.green);
    log(`Form submission response data:`, colors.green);
    console.log(response.data);
    
    return response.data;
  } catch (error) {
    log(`Error submitting form: ${error.message}`, colors.red);
    if (error.response) {
      log('API response error:', colors.red);
      console.error(error.response.data);
    }
    throw error;
  }
}

/**
 * Main function to run the test
 */
async function runTest() {
  log('🚀 Starting Open Banking Form Submission Test', colors.magenta);
  
  try {
    // 1. Check company and task status before submission
    await checkCompanyStatusBefore();
    await getTaskStatusBefore();
    
    // 2. Submit the form
    await submitForm();
    
    // Wait for processing to complete
    log('\nWaiting 2 seconds for processing to complete...', colors.yellow);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. Check company and task status after submission
    await checkCompanyStatusAfter();
    await getTaskStatusAfter();
    
    log('\n✅ Test completed successfully', colors.green);
  } catch (error) {
    log(`❌ Test failed: ${error.message}`, colors.red);
    console.error(error);
  } finally {
    // Clean up resources
    pool.end();
  }
}

// Run the test
runTest();