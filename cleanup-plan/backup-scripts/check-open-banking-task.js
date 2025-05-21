/**
 * Simple SQL check for Open Banking task state
 * 
 * This script uses direct SQL to check the state of an Open Banking task
 * and the associated company, avoiding ESM/TypeScript import issues.
 */

import { Pool } from 'pg';

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkTask(taskId, companyId) {
  try {
    console.log(`Checking Open Banking task ${taskId} for company ${companyId}`);
    
    // Check task status
    const taskQuery = `
      SELECT id, task_type, status, progress, metadata, company_id
      FROM tasks
      WHERE id = $1
    `;
    
    const taskResult = await pool.query(taskQuery, [taskId]);
    
    if (taskResult.rowCount === 0) {
      console.error(`Task ${taskId} not found`);
      return;
    }
    
    const task = taskResult.rows[0];
    
    console.log('\n--- Task State ---');
    console.log(`ID: ${task.id}`);
    console.log(`Type: ${task.task_type}`);
    console.log(`Status: ${task.status}`);
    console.log(`Progress: ${task.progress}%`);
    console.log(`Metadata: ${JSON.stringify(task.metadata, null, 2)}`);
    
    // Check company state
    const companyQuery = `
      SELECT id, name, onboarding_company_completed, accreditation_status, 
             risk_score, risk_clusters, available_tabs
      FROM companies
      WHERE id = $1
    `;
    
    const companyResult = await pool.query(companyQuery, [companyId]);
    
    if (companyResult.rowCount === 0) {
      console.error(`Company ${companyId} not found`);
      return;
    }
    
    const company = companyResult.rows[0];
    
    console.log('\n--- Company State ---');
    console.log(`ID: ${company.id}`);
    console.log(`Name: ${company.name}`);
    console.log(`Onboarding completed: ${company.onboarding_company_completed ? 'YES' : 'NO'}`);
    console.log(`Accreditation status: ${company.accreditation_status || 'NOT SET'}`);
    console.log(`Risk score: ${company.risk_score || 'NOT SET'}`);
    console.log(`Risk clusters: ${JSON.stringify(company.risk_clusters, null, 2) || 'NOT SET'}`);
    console.log(`Available tabs: ${company.available_tabs ? company.available_tabs.join(', ') : 'NONE'}`);
    
    // Success checks
    const isTaskComplete = task.status === 'submitted' && task.progress === 100;
    const isOnboardingComplete = company.onboarding_company_completed === true;
    const isAccreditationApproved = company.accreditation_status === 'APPROVED';
    const hasRiskScore = company.risk_score !== null && company.risk_score !== undefined;
    const hasRiskClusters = company.risk_clusters !== null && company.risk_clusters !== undefined;
    const hasDashboardTab = company.available_tabs && company.available_tabs.includes('dashboard');
    const hasInsightsTab = company.available_tabs && company.available_tabs.includes('insights');
    
    console.log('\n--- Post-Submission Checks ---');
    console.log(`Task is Submitted + 100%: ${isTaskComplete ? 'PASS' : 'FAIL'}`);
    console.log(`Onboarding completed: ${isOnboardingComplete ? 'PASS' : 'FAIL'}`);
    console.log(`Accreditation APPROVED: ${isAccreditationApproved ? 'PASS' : 'FAIL'}`);
    console.log(`Risk score set: ${hasRiskScore ? 'PASS' : 'FAIL'}`);
    console.log(`Risk clusters set: ${hasRiskClusters ? 'PASS' : 'FAIL'}`);
    console.log(`Dashboard tab unlocked: ${hasDashboardTab ? 'PASS' : 'FAIL'}`);
    console.log(`Insights tab unlocked: ${hasInsightsTab ? 'PASS' : 'FAIL'}`);
    
    const allPassed = 
      isTaskComplete && 
      isOnboardingComplete && 
      isAccreditationApproved && 
      hasRiskScore && 
      hasRiskClusters && 
      hasDashboardTab && 
      hasInsightsTab;
    
    console.log('\n--- Summary ---');
    if (allPassed) {
      console.log('✅ All post-submission steps are properly completed!');
    } else {
      console.log('❌ Some post-submission steps are not properly completed.');
      console.log('\nTo fix, run:');
      console.log(`node fix-open-banking-task.js ${taskId} ${companyId} --fix`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

// Get taskId and companyId from command-line arguments
const taskId = process.argv[2] ? parseInt(process.argv[2]) : 784;  
const companyId = process.argv[3] ? parseInt(process.argv[3]) : 278;

// Run the check
checkTask(taskId, companyId);