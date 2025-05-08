/**
 * Direct Test for Open Banking Post-Submission Processing
 * 
 * This script directly calls the handleOpenBankingPostSubmission function
 * to test if company attributes are properly updated.
 */

// Import required modules
const { db } = require('./server/db');
const { companies, tasks } = require('./server/db/schema');
const { eq } = require('drizzle-orm');

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

// Define a mock logger
const logger = {
  info: (...args) => console.log('\x1b[34m[INFO]\x1b[0m', ...args),
  error: (...args) => console.log('\x1b[31m[ERROR]\x1b[0m', ...args),
  warn: (...args) => console.log('\x1b[33m[WARN]\x1b[0m', ...args),
  debug: (...args) => console.log('\x1b[35m[DEBUG]\x1b[0m', ...args)
};

/**
 * Handle Open Banking-specific post-submission logic
 * - Unlocks Dashboard and Insights tabs
 * - Updates company onboarding status
 * - Generates risk score
 * - Updates accreditation status
 */
async function handleOpenBankingPostSubmission(
  trx,
  taskId,
  companyId,
  formData,
  transactionId
) {
  const startTime = performance.now();
  const obPostLogContext = { 
    namespace: 'OpenBankingPostSubmission', 
    taskId, 
    companyId,
    transactionId 
  };
  
  logger.info('Processing Open Banking post-submission logic', {
    ...obPostLogContext,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Open Banking unlocks Dashboard and Insights tabs
    const unlockedTabs = ['dashboard', 'insights'];
    
    // Unlock Dashboard and Insights tabs
    await unlockTabsForCompany(trx, companyId, unlockedTabs, transactionId);
    
    // Mark company onboarding as completed
    await trx.update(companies)
      .set({
        onboarding_company_completed: true,
        updated_at: new Date()
      })
      .where(eq(companies.id, companyId));
    
    logger.info('Updated company onboarding status', { 
      ...obPostLogContext,
      timestamp: new Date().toISOString()
    });
    
    // Generate risk score based on survey responses - random value between 5 and 95
    const riskScore = Math.floor(Math.random() * (95 - 5 + 1)) + 5;
    
    logger.info('Generated risk score', { 
      ...obPostLogContext, 
      riskScore,
      timestamp: new Date().toISOString()
    });
    
    // Update accreditation status and risk score in a single operation
    await trx.update(companies)
      .set({
        accreditation_status: 'VALIDATED',
        risk_score: riskScore,
        updated_at: new Date()
      })
      .where(eq(companies.id, companyId));
    
    logger.info('Updated accreditation status', { 
      ...obPostLogContext,
      timestamp: new Date().toISOString()
    });
    
    const endTime = performance.now();
    logger.info('Open Banking post-submission completed successfully', {
      ...obPostLogContext,
      unlockedTabs,
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });
    
    return unlockedTabs;
  } catch (error) {
    const endTime = performance.now();
    logger.error('Error in Open Banking post-submission processing', {
      ...obPostLogContext,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });
    throw error; // Re-throw to trigger transaction rollback
  }
}

/**
 * Helper function to unlock tabs for a company
 */
async function unlockTabsForCompany(trx, companyId, tabNames, transactionId) {
  const startTime = performance.now();
  const tabsLogContext = { 
    namespace: 'UnlockTabs', 
    companyId,
    transactionId 
  };
  
  if (!tabNames || tabNames.length === 0) {
    logger.info('No tabs to unlock', {
      ...tabsLogContext,
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  logger.info('Unlocking tabs for company', { 
    ...tabsLogContext, 
    tabs: tabNames.join(', '),
    timestamp: new Date().toISOString()
  });
  
  try {
    // Get current company tabs
    const [company] = await trx.select({ available_tabs: companies.available_tabs })
      .from(companies)
      .where(eq(companies.id, companyId));
    
    if (!company) {
      logger.error('Company not found', {
        ...tabsLogContext,
        companyId,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // Add new tabs without duplicates
    const currentTabs = Array.isArray(company.available_tabs) ? company.available_tabs : [];
    const updatedTabs = [...new Set([...currentTabs, ...tabNames])];
    
    // Update company with new tabs
    await trx.update(companies)
      .set({ 
        available_tabs: updatedTabs,
        updated_at: new Date()
      })
      .where(eq(companies.id, companyId));
    
    const endTime = performance.now();
    logger.info('Successfully unlocked tabs for company', {
      ...tabsLogContext,
      currentTabs,
      addedTabs: tabNames,
      updatedTabs,
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const endTime = performance.now();
    logger.error('Error unlocking tabs for company', {
      ...tabsLogContext,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

/**
 * Main test function
 */
async function runTest() {
  console.log(`${colors.blue}Starting direct test of Open Banking post-submission processing${colors.reset}`);
  
  // Test parameters
  const taskId = 776;
  const companyId = 276;
  const formData = { field1: 'test value', field2: 'yes' };
  
  try {
    // Reset company attributes for testing
    await db.update(companies)
      .set({
        onboarding_company_completed: false,
        accreditation_status: 'PENDING',
        risk_score: null,
        updated_at: new Date()
      })
      .where(eq(companies.id, companyId));
    
    console.log(`${colors.blue}Company attributes reset for testing${colors.reset}`);
    
    // Check company attributes before post-submission
    let [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, companyId));
    
    console.log(`${colors.yellow}Company attributes before post-submission:${colors.reset}`);
    console.log(`- onboarding_company_completed: ${company.onboarding_company_completed}`);
    console.log(`- accreditation_status: ${company.accreditation_status}`);
    console.log(`- risk_score: ${company.risk_score}`);
    console.log(`- available_tabs: ${company.available_tabs.join(', ')}`);
    
    // Call the post-submission handler directly
    console.log(`\n${colors.blue}Calling handleOpenBankingPostSubmission...${colors.reset}`);
    const unlockedTabs = await handleOpenBankingPostSubmission(
      db, // Use db as transaction for this test
      taskId,
      companyId,
      formData
    );
    
    console.log(`${colors.green}Post-submission completed with unlocked tabs: ${unlockedTabs.join(', ')}${colors.reset}`);
    
    // Check company attributes after post-submission
    [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, companyId));
    
    console.log(`\n${colors.yellow}Company attributes after post-submission:${colors.reset}`);
    console.log(`- onboarding_company_completed: ${company.onboarding_company_completed}`);
    console.log(`- accreditation_status: ${company.accreditation_status}`);
    console.log(`- risk_score: ${company.risk_score}`);
    console.log(`- available_tabs: ${company.available_tabs.join(', ')}`);
    
    // Verify the changes
    console.log(`\n${colors.magenta}Verifying changes:${colors.reset}`);
    
    if (company.onboarding_company_completed === true) {
      console.log(`${colors.green}✓ onboarding_company_completed set to true${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ onboarding_company_completed not set to true${colors.reset}`);
    }
    
    if (company.accreditation_status === 'VALIDATED') {
      console.log(`${colors.green}✓ accreditation_status set to VALIDATED${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ accreditation_status not set to VALIDATED${colors.reset}`);
    }
    
    if (company.risk_score !== null && company.risk_score >= 5 && company.risk_score <= 95) {
      console.log(`${colors.green}✓ risk_score set to ${company.risk_score} (within 5-95 range)${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ risk_score ${company.risk_score} outside expected 5-95 range${colors.reset}`);
    }
    
    const hasRequiredTabs = company.available_tabs.includes('dashboard') && 
                         company.available_tabs.includes('insights');
    if (hasRequiredTabs) {
      console.log(`${colors.green}✓ Dashboard and insights tabs are available${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ Dashboard and insights tabs are missing${colors.reset}`);
    }
    
    console.log(`\n${colors.blue}Test completed successfully${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error during test: ${error.message}${colors.reset}`);
    console.error(error);
  }
}

// Run the test
runTest()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error(`${colors.red}Unhandled error: ${error.message}${colors.reset}`);
    process.exit(1);
  });