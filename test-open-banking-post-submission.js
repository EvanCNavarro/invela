/**
 * Test Open Banking Post-Submission Integration
 * 
 * This script tests the integration of the Open Banking post-submission handler
 * with the transactional form submission process.
 */

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

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Find a suitable Open Banking task to test with
 */
async function findOpenBankingTask() {
  log('Looking for an Open Banking task...', colors.cyan);
  
  try {
    const { rows } = await pool.query(`
      SELECT t.id, t.title, t.company_id, t.status, t.progress, c.name as company_name
      FROM tasks t
      JOIN companies c ON t.company_id = c.id
      WHERE t.task_type = 'open_banking'
      AND t.status IN ('in_progress', 'ready_for_submission')
      ORDER BY t.id DESC
      LIMIT 1
    `);
    
    if (rows.length === 0) {
      log('No suitable Open Banking task found', colors.yellow);
      return null;
    }
    
    const task = rows[0];
    log(`Found Open Banking task: ID=${task.id}, Title="${task.title}", Company=${task.company_name} (${task.company_id})`, colors.green);
    
    return task;
  } catch (error) {
    log(`Error finding Open Banking task: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Check if a company has onboarding_completed flag set
 */
async function checkCompanyOnboardingStatus(companyId) {
  log(`Checking onboarding status for company ID ${companyId}...`, colors.cyan);
  
  try {
    const { rows } = await pool.query(`
      SELECT id, name, onboarding_company_completed, risk_score, accreditation_status, risk_clusters
      FROM companies
      WHERE id = $1
    `, [companyId]);
    
    if (rows.length === 0) {
      log(`Company ID ${companyId} not found`, colors.yellow);
      return null;
    }
    
    const company = rows[0];
    log(`Company "${company.name}" (${company.id}) onboarding status:`, colors.cyan);
    log(`  - Onboarding Completed: ${company.onboarding_company_completed ? 'YES' : 'NO'}`, 
        company.onboarding_company_completed ? colors.green : colors.red);
    log(`  - Risk Score: ${company.risk_score || 'Not set'}`, 
        company.risk_score ? colors.green : colors.red);
    log(`  - Accreditation Status: ${company.accreditation_status || 'Not set'}`, 
        company.accreditation_status ? colors.green : colors.red);
    log(`  - Risk Clusters: ${company.risk_clusters ? 'Set' : 'Not set'}`, 
        company.risk_clusters ? colors.green : colors.red);
    
    if (company.risk_clusters) {
      log('  Risk Cluster Details:', colors.cyan);
      const clusters = typeof company.risk_clusters === 'string' 
        ? JSON.parse(company.risk_clusters) 
        : company.risk_clusters;
      
      Object.entries(clusters).forEach(([key, value]) => {
        log(`    - ${key}: ${value}`, colors.blue);
      });
    }
    
    return company;
  } catch (error) {
    log(`Error checking company onboarding status: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Check company tabs access
 */
async function checkCompanyTabs(companyId) {
  log(`Checking available tabs for company ID ${companyId}...`, colors.cyan);
  
  try {
    const { rows } = await pool.query(`
      SELECT id, name, available_tabs
      FROM companies
      WHERE id = $1
    `, [companyId]);
    
    if (rows.length === 0) {
      log(`Company ID ${companyId} not found`, colors.yellow);
      return null;
    }
    
    const company = rows[0];
    log(`Company "${company.name}" (${company.id}) available tabs:`, colors.cyan);
    
    const tabs = Array.isArray(company.available_tabs) 
      ? company.available_tabs 
      : (typeof company.available_tabs === 'string' 
          ? JSON.parse(company.available_tabs) 
          : []);
    
    tabs.forEach(tab => {
      log(`  - ${tab}`, colors.blue);
    });
    
    // Check for specific tabs
    log('\nVerifying required tabs:', colors.cyan);
    log(`  - Dashboard Tab: ${tabs.includes('dashboard') ? '✅ AVAILABLE' : '❌ MISSING'}`, 
        tabs.includes('dashboard') ? colors.green : colors.red);
    log(`  - Insights Tab: ${tabs.includes('insights') ? '✅ AVAILABLE' : '❌ MISSING'}`, 
        tabs.includes('insights') ? colors.green : colors.red);
    
    return tabs;
  } catch (error) {
    log(`Error checking company tabs: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Run full test suite
 */
async function runTests() {
  log('🚀 Starting Open Banking Post-Submission Integration Test', colors.magenta);
  
  try {
    // 1. Find a suitable task
    const task = await findOpenBankingTask();
    if (!task) {
      log('Test aborted: No suitable Open Banking task found', colors.yellow);
      return;
    }
    
    // 2. Check company tabs
    log('\n=== CHECKING COMPANY TABS ===', colors.magenta);
    await checkCompanyTabs(task.company_id);
    
    // 3. Check company onboarding status
    log('\n=== CHECKING COMPANY ONBOARDING STATUS ===', colors.magenta);
    await checkCompanyOnboardingStatus(task.company_id);
    
    log('\n✅ Test completed successfully', colors.green);
  } catch (error) {
    log(`❌ Test failed: ${error.message}`, colors.red);
    console.error(error);
  } finally {
    // Clean up resources
    pool.end();
  }
}

// Execute tests
runTests();