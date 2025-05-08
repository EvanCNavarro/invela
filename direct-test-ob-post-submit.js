/**
 * Direct test for Open Banking post-submission processing
 * 
 * This direct test script calls handleOpenBankingPostSubmission directly to test if
 * our fixes for company attributes updates are working properly.
 */

const { db } = require('./server/db');
const { companies, tasks } = require('./server/db/schema');
const { eq } = require('drizzle-orm');
const fs = require('fs');

// Mock console for logging
const originalConsole = { ...console };
const logs = [];
console.log = (...args) => {
  logs.push(args.join(' '));
  originalConsole.log(...args);
};

// Get handleOpenBankingPostSubmission from source code
const unified_form_service_path = './server/services/unified-form-submission-service.ts';
const source = fs.readFileSync(unified_form_service_path, 'utf8');

// Extract the function code using regex
const functionRegex = /async\s+function\s+handleOpenBankingPostSubmission[\s\S]*?}\s*}\s*}/;
const functionCode = source.match(functionRegex)[0];

// Prepare the function with dependencies
const functionScript = `
const { db } = require('./server/db');
const { companies } = require('./server/db/schema');
const { eq } = require('drizzle-orm');

// Mock logger
const logger = {
  info: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.log
};

// Mock tab service
async function unlockTabsForCompany(trx, companyId, tabNames) {
  console.log('Unlocking tabs:', tabNames, 'for company:', companyId);
  console.log('Using transaction:', !!trx);
  
  try {
    // Get current company tabs
    const [company] = await db.select({ available_tabs: companies.available_tabs })
      .from(companies)
      .where(eq(companies.id, companyId));
    
    // Add new tabs
    const currentTabs = Array.isArray(company.available_tabs) ? company.available_tabs : ['task-center'];
    const updatedTabs = [...new Set([...currentTabs, ...tabNames])];
    
    // Update company
    await db.update(companies)
      .set({ 
        available_tabs: updatedTabs,
        updated_at: new Date()
      })
      .where(eq(companies.id, companyId));
      
    return;
  } catch (error) {
    console.error('Error unlocking tabs:', error);
    throw error;
  }
}

// Add the extracted function
${functionCode}

// Export for use in our test
module.exports = { handleOpenBankingPostSubmission };
`;

// Write the function script to a temporary file
fs.writeFileSync('./temp-function.js', functionScript);

// Now test the function
async function testOpenBankingPostSubmission() {
  try {
    // Import the extracted function
    const { handleOpenBankingPostSubmission } = require('./temp-function');
    
    // Parameters for testing
    const taskId = 776;
    const companyId = 276;
    const formData = { 
      field1: 'test response',
      field2: 'yes',
      field3: 'no'
    };
    
    // Clear any previous state
    await db.update(companies)
      .set({ 
        onboarding_company_completed: false,
        accreditation_status: 'PENDING',
        risk_score: null
      })
      .where(eq(companies.id, companyId));
    
    console.log('\nCompany status before post-submission:');
    let company = await db.select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    console.log(JSON.stringify({
      id: company[0].id,
      name: company[0].name,
      onboarding_company_completed: company[0].onboarding_company_completed,
      accreditation_status: company[0].accreditation_status,
      risk_score: company[0].risk_score,
      available_tabs: company[0].available_tabs
    }, null, 2));
    
    // Call the function directly - use dummy transaction
    console.log('\nCalling handleOpenBankingPostSubmission...');
    const dummyTrx = db; // Just use the regular db as our transaction for testing
    const result = await handleOpenBankingPostSubmission(dummyTrx, taskId, companyId, formData);
    
    console.log('\nPost-submission result:', result);
    
    // Check the company status after post-submission
    console.log('\nCompany status after post-submission:');
    company = await db.select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    console.log(JSON.stringify({
      id: company[0].id,
      name: company[0].name,
      onboarding_company_completed: company[0].onboarding_company_completed,
      accreditation_status: company[0].accreditation_status,
      risk_score: company[0].risk_score,
      available_tabs: company[0].available_tabs
    }, null, 2));
    
    // Verification
    console.log('\nVerification:');
    if (company[0].onboarding_company_completed === true) {
      console.log('✅ onboarding_company_completed set to true');
    } else {
      console.log('❌ onboarding_company_completed not set to true');
    }
    
    if (company[0].accreditation_status === 'VALIDATED') {
      console.log('✅ accreditation_status set to VALIDATED');
    } else {
      console.log('❌ accreditation_status not set to VALIDATED');
    }
    
    if (company[0].risk_score !== null && company[0].risk_score >= 5 && company[0].risk_score <= 95) {
      console.log(`✅ risk_score set to ${company[0].risk_score} (within range 5-95)`);
    } else {
      console.log(`❌ risk_score ${company[0].risk_score} not within expected range`);
    }
    
    const hasRequiredTabs = company[0].available_tabs.includes('dashboard') && 
                           company[0].available_tabs.includes('insights');
    if (hasRequiredTabs) {
      console.log('✅ tabs dashboard and insights are available');
    } else {
      console.log('❌ required tabs dashboard and insights not available');
    }
    
    // Clean up temp file
    fs.unlinkSync('./temp-function.js');
    
    // Return all logs for analysis
    return logs;
  } catch (error) {
    console.error('Test error:', error);
    // Clean up temp file even if error
    try { fs.unlinkSync('./temp-function.js'); } catch (e) {}
    return logs;
  }
}

// Run the test
testOpenBankingPostSubmission()
  .then(logs => {
    console.log('\nTest completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running test:', error);
    process.exit(1);
  });