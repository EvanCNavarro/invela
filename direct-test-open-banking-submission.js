/**
 * Direct Test Script for Open Banking Form Submission
 * 
 * This script submits an Open Banking form for a specific task
 * and verifies that all post-submission actions are executed correctly.
 * 
 * Usage: 
 *   node direct-test-open-banking-submission.js [taskId] [companyId]
 */

const fetch = require('node-fetch');
const https = require('https');
const { promisify } = require('util');
const readline = require('readline');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

// Logging helper
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Base URL for API requests
const BASE_URL = 'http://localhost:5000';

/**
 * Generate sample Open Banking form data
 */
function generateOpenBankingFormData() {
  // Generate sample form data with all required fields
  const formData = {
    responses: {
      "obIntroduction": { 
        fieldId: 1, 
        value: true,
        status: "completed" 
      },
      "hasFapiImplementation": { 
        fieldId: 2, 
        value: "yes",
        status: "completed" 
      },
      "fapiStandard": { 
        fieldId: 3, 
        value: "v3.1",
        status: "completed" 
      },
      "fapiAndDpopSupport": { 
        fieldId: 4, 
        value: "both",
        status: "completed" 
      },
      // Fill all required fields with valid values
      "encryptionMethods": { 
        fieldId: 5, 
        value: ["TLS_1_2", "TLS_1_3"],
        status: "completed" 
      },
      "hasCertifications": { 
        fieldId: 6, 
        value: "yes",
        status: "completed" 
      },
      "certificationDetails": { 
        fieldId: 7, 
        value: "FAPI Advanced Certification",
        status: "completed" 
      },
      "securityAuditFrequency": { 
        fieldId: 8, 
        value: "quarterly",
        status: "completed" 
      },
      "penetrationTestingFrequency": { 
        fieldId: 9, 
        value: "annually",
        status: "completed" 
      },
      "incidentResponseTime": { 
        fieldId: 10, 
        value: "4-8_hours",
        status: "completed" 
      },
      "dataRetentionPolicy": { 
        fieldId: 11, 
        value: "yes",
        status: "completed" 
      },
      "dataRetentionPeriod": { 
        fieldId: 12, 
        value: "5_years",
        status: "completed" 
      },
      "dataEncryptionAtRest": { 
        fieldId: 13, 
        value: "yes",
        status: "completed" 
      },
      "encryptionKeyManagement": { 
        fieldId: 14, 
        value: "hsm",
        status: "completed" 
      },
      "multiFactorAuth": { 
        fieldId: 15, 
        value: "yes",
        status: "completed" 
      },
      "apiRateLimiting": { 
        fieldId: 16, 
        value: "yes",
        status: "completed" 
      },
      "ddosProtection": { 
        fieldId: 17, 
        value: "yes",
        status: "completed" 
      },
      "securityMonitoring": { 
        fieldId: 18, 
        value: "24_7",
        status: "completed" 
      },
      "dataLocationRestrictions": { 
        fieldId: 19, 
        value: "yes",
        status: "completed" 
      },
      "allowedDataLocations": { 
        fieldId: 20, 
        value: ["EU", "US"],
        status: "completed" 
      },
      "thirdPartyDataSharing": { 
        fieldId: 21, 
        value: "no",
        status: "completed" 
      },
      "privacyPolicy": { 
        fieldId: 22, 
        value: "yes",
        status: "completed" 
      },
      "privacyOfficer": { 
        fieldId: 23, 
        value: "yes",
        status: "completed" 
      },
      "piiDataTypes": { 
        fieldId: 24, 
        value: ["name", "address", "email", "phone"],
        status: "completed" 
      },
      "dataMinimization": { 
        fieldId: 25, 
        value: "yes",
        status: "completed" 
      },
      "dataSubjectRights": { 
        fieldId: 26, 
        value: "yes",
        status: "completed" 
      },
      "apiMonitoring": { 
        fieldId: 27, 
        value: "yes",
        status: "completed" 
      },
      "slaUptimeGuarantee": { 
        fieldId: 28, 
        value: "99.9",
        status: "completed" 
      },
      "apiVersioning": { 
        fieldId: 29, 
        value: "yes",
        status: "completed" 
      },
      "apiDeprecationPolicy": { 
        fieldId: 30, 
        value: "yes",
        status: "completed" 
      },
      "apiChangeCommunication": { 
        fieldId: 31, 
        value: "yes",
        status: "completed" 
      },
      "supportChannels": { 
        fieldId: 32, 
        value: ["email", "phone", "chat"],
        status: "completed" 
      },
      "documentationQuality": { 
        fieldId: 33, 
        value: "comprehensive",
        status: "completed" 
      },
      "developerPortal": { 
        fieldId: 34, 
        value: "yes",
        status: "completed" 
      },
      "sandboxEnvironment": { 
        fieldId: 35, 
        value: "yes",
        status: "completed" 
      },
      "financialLicenses": { 
        fieldId: 36, 
        value: "yes",
        status: "completed" 
      },
      "licenseDetails": { 
        fieldId: 37, 
        value: "Electronic Money Institution License",
        status: "completed" 
      },
      "insuranceCoverage": { 
        fieldId: 38, 
        value: "yes",
        status: "completed" 
      },
      "complianceOfficer": { 
        fieldId: 39, 
        value: "yes",
        status: "completed" 
      },
      "auditTrails": { 
        fieldId: 40, 
        value: "yes",
        status: "completed" 
      },
      "apiSandboxTesting": { 
        fieldId: 41, 
        value: "yes",
        status: "completed" 
      },
      "apiTestAccounts": { 
        fieldId: 42, 
        value: "yes",
        status: "completed" 
      },
      "apiTestingTools": { 
        fieldId: 43, 
        value: "yes",
        status: "completed" 
      },
      "openBankingFormConfirmation": { 
        fieldId: 44, 
        value: true,
        status: "completed" 
      }
    }
  };

  return formData;
}

/**
 * Login to get a session cookie
 */
async function login(email = '34@e.com', password = 'password123') {
  try {
    log('Logging in to get session...', colors.cyan);
    
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Login failed with status: ${response.status}, error: ${errorText}`);
    }
    
    const setCookieHeader = response.headers.raw()['set-cookie'];
    
    if (!setCookieHeader || setCookieHeader.length === 0) {
      throw new Error('No session cookie received');
    }
    
    const sessionCookie = setCookieHeader.join('; ');
    log('✅ Login successful', colors.green);
    
    return sessionCookie;
  } catch (error) {
    log(`❌ Login error: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Submit Open Banking form through the transactional form endpoint
 */
async function submitOpenBankingForm(taskId, companyId, cookies) {
  try {
    log(`Submitting Open Banking form for task ${taskId}...`, colors.cyan);
    
    const formData = generateOpenBankingFormData();
    const fileName = `OpenBanking_Survey_${taskId}_TestCompany_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.json`;
    
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
        formData,
        fileName
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
async function checkCompanyStatus(companyId, cookies) {
  try {
    log(`Checking company ${companyId} status after form submission...`, colors.cyan);
    
    const response = await fetch(`${BASE_URL}/api/companies/${companyId}`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        Cookie: cookies
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Company check failed with status: ${response.status}, error: ${errorText}`);
    }
    
    const company = await response.json();
    
    log('✅ Company data retrieved', colors.green);
    log('Company status:', colors.cyan);
    log(`- Risk Score: ${company.risk_score || 'Not set'}`, company.risk_score ? colors.green : colors.red);
    log(`- Accreditation Status: ${company.accreditation_status || 'Not set'}`, company.accreditation_status === 'APPROVED' ? colors.green : colors.red);
    log(`- Onboarding Completed: ${company.onboarding_company_completed ? 'YES' : 'NO'}`, company.onboarding_company_completed ? colors.green : colors.red);
    log(`- Risk Clusters: ${company.risk_clusters ? 'Present' : 'Missing'}`, company.risk_clusters ? colors.green : colors.red);
    
    if (company.risk_clusters) {
      log('Risk Clusters:', colors.cyan);
      Object.entries(company.risk_clusters).forEach(([key, value]) => {
        log(`  ${key}: ${value}`, colors.blue);
      });
    }
    
    return company;
  } catch (error) {
    log(`❌ Error checking company status: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Check company's available tabs
 */
async function checkCompanyTabs(companyId, cookies) {
  try {
    log(`Checking available tabs for company ${companyId}...`, colors.cyan);
    
    const response = await fetch(`${BASE_URL}/api/companies/${companyId}/tabs`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        Cookie: cookies
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tab check failed with status: ${response.status}, error: ${errorText}`);
    }
    
    const tabData = await response.json();
    
    log('✅ Company tabs retrieved', colors.green);
    log('Available Tabs:', colors.cyan);
    
    const tabs = tabData.available_tabs || [];
    tabs.forEach(tab => {
      log(`- ${tab}`, colors.blue);
    });
    
    const hasDashboard = tabs.includes('dashboard');
    const hasInsights = tabs.includes('insights');
    
    log(`Dashboard Tab: ${hasDashboard ? 'UNLOCKED' : 'LOCKED'}`, hasDashboard ? colors.green : colors.red);
    log(`Insights Tab: ${hasInsights ? 'UNLOCKED' : 'LOCKED'}`, hasInsights ? colors.green : colors.red);
    
    return tabData;
  } catch (error) {
    log(`❌ Error checking company tabs: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Check task status
 */
async function checkTaskStatus(taskId, cookies) {
  try {
    log(`Checking status for task ${taskId}...`, colors.cyan);
    
    const response = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        Cookie: cookies
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Task check failed with status: ${response.status}, error: ${errorText}`);
    }
    
    const task = await response.json();
    
    log('✅ Task data retrieved', colors.green);
    log('Task status:', colors.cyan);
    log(`- Status: ${task.status || 'Not set'}`, task.status === 'submitted' ? colors.green : colors.red);
    log(`- Progress: ${task.progress || 0}%`, task.progress === 100 ? colors.green : colors.red);
    log(`- Ready for Submission: ${task.ready_for_submission ? 'YES' : 'NO'}`, !task.ready_for_submission ? colors.green : colors.red);
    
    return task;
  } catch (error) {
    log(`❌ Error checking task status: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Main function to run the test
 */
async function runTest() {
  try {
    // Get task and company IDs from command line args or use defaults
    const taskId = parseInt(process.argv[2], 10) || 820;
    const companyId = parseInt(process.argv[3], 10) || 289;
    
    log('===============================================', colors.bright);
    log('🚀 OPEN BANKING FORM SUBMISSION TEST', colors.bright);
    log('===============================================', colors.bright);
    log(`TaskID: ${taskId}`, colors.yellow);
    log(`CompanyID: ${companyId}`, colors.yellow);
    log('===============================================', colors.bright);
    
    // Get session cookie
    const cookies = await login();
    
    // Submit Open Banking form
    await submitOpenBankingForm(taskId, companyId, cookies);
    
    // Wait a moment for post-submission actions to complete
    log('Waiting for post-submission actions to complete...', colors.yellow);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check company status
    await checkCompanyStatus(companyId, cookies);
    
    // Check company tabs
    await checkCompanyTabs(companyId, cookies);
    
    // Check task status
    await checkTaskStatus(taskId, cookies);
    
    log('===============================================', colors.bright);
    log('✅ TEST COMPLETED', colors.bright);
    log('===============================================', colors.bright);
  } catch (error) {
    log('===============================================', colors.bright);
    log(`❌ TEST FAILED: ${error.message}`, colors.red);
    log('===============================================', colors.bright);
    process.exit(1);
  }
}

// Run the test
runTest();