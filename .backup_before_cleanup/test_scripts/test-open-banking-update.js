/**
 * Test script for Open Banking form submission and company attribute updates
 * 
 * This script allows us to test if an Open Banking form submission correctly:
 * 1. Calculates a random risk score (5-95)
 * 2. Sets the company's onboarding status to "completed"
 * 3. Sets the company's accreditation to "VALIDATED"
 */

// Import required modules
import { db } from './server/db/index.js';
import { tasks, companies, openBankingResponses } from './server/db/schema.js';
import { eq } from 'drizzle-orm';
import { submitForm } from './server/services/unified-form-submission-service.js';

// Set test parameters
const taskId = 776; // The task ID to test with
const companyId = 276; // The company ID to test with
const userId = 8; // A valid user ID to associate with the submission

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Helper function to log with color
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Helper to check company attributes before and after submission
async function checkCompanyAttributes(companyId) {
  const [company] = await db.select({
    id: companies.id,
    name: companies.name,
    onboardingCompleted: companies.onboarding_company_completed,
    accreditationStatus: companies.accreditation_status,
    riskScore: companies.risk_score,
    availableTabs: companies.available_tabs
  })
  .from(companies)
  .where(eq(companies.id, companyId));

  return company;
}

// Main test function
async function runTest() {
  try {
    log('Starting Open Banking form submission test...', colors.blue);
    log(`Testing with task ID: ${taskId}, company ID: ${companyId}`, colors.blue);

    // Check company attributes before submission
    log('\nChecking company attributes before submission...', colors.cyan);
    const beforeCompany = await checkCompanyAttributes(companyId);
    
    log(`Company: ${beforeCompany.name} (ID: ${beforeCompany.id})`, colors.yellow);
    log(`- Onboarding completed: ${beforeCompany.onboardingCompleted}`, colors.yellow);
    log(`- Accreditation status: ${beforeCompany.accreditationStatus}`, colors.yellow);
    log(`- Risk score: ${beforeCompany.riskScore}`, colors.yellow);
    log(`- Available tabs: ${beforeCompany.availableTabs.join(', ')}`, colors.yellow);

    // Create sample form data
    const formData = {
      "field1": "Sample response 1",
      "field2": "Yes",
      "field3": "No",
      "field4": "50%",
      "field5": "2025-05-08"
    };

    // Submit the form
    log('\nSubmitting Open Banking form...', colors.cyan);
    const result = await submitForm(
      taskId,
      formData,
      'open_banking',
      userId,
      companyId
    );

    log(`Submission result: ${result.success ? 'Success' : 'Failed'}`, 
      result.success ? colors.green : colors.red);

    if (result.success) {
      log(`- File ID: ${result.fileId}`, colors.green);
      log(`- File name: ${result.fileName}`, colors.green);
      log(`- Unlocked tabs: ${result.unlockedTabs.join(', ')}`, colors.green);
    } else {
      log(`- Error: ${result.error}`, colors.red);
    }

    // Check company attributes after submission
    log('\nChecking company attributes after submission...', colors.cyan);
    const afterCompany = await checkCompanyAttributes(companyId);
    
    log(`Company: ${afterCompany.name} (ID: ${afterCompany.id})`, colors.yellow);
    log(`- Onboarding completed: ${afterCompany.onboardingCompleted}`, colors.yellow);
    log(`- Accreditation status: ${afterCompany.accreditationStatus}`, colors.yellow);
    log(`- Risk score: ${afterCompany.riskScore}`, colors.yellow);
    log(`- Available tabs: ${afterCompany.availableTabs.join(', ')}`, colors.yellow);

    // Verify changes
    log('\nVerifying changes...', colors.magenta);
    
    if (afterCompany.onboardingCompleted === true) {
      log('✓ Company onboarding status set to completed', colors.green);
    } else {
      log('✗ Company onboarding status not set to completed', colors.red);
    }

    if (afterCompany.accreditationStatus === 'VALIDATED') {
      log('✓ Company accreditation status set to VALIDATED', colors.green);
    } else {
      log('✗ Company accreditation status not set to VALIDATED', colors.red);
    }

    if (afterCompany.riskScore !== null && afterCompany.riskScore >= 5 && afterCompany.riskScore <= 95) {
      log(`✓ Risk score set to ${afterCompany.riskScore} (within 5-95 range)`, colors.green);
    } else {
      log(`✗ Risk score ${afterCompany.riskScore} not within expected range (5-95)`, colors.red);
    }

    const hasRequiredTabs = afterCompany.availableTabs.includes('dashboard') && 
                          afterCompany.availableTabs.includes('insights');
    
    if (hasRequiredTabs) {
      log('✓ Required tabs (dashboard, insights) are available', colors.green);
    } else {
      log('✗ Required tabs (dashboard, insights) are missing', colors.red);
    }

    log('\nTest completed.', colors.blue);
  } catch (error) {
    log(`Error running test: ${error.message}`, colors.red);
    console.error(error);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

// Run the test
runTest();