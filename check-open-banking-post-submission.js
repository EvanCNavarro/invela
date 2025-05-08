/**
 * Check Open Banking Post-Submission State
 * 
 * This script checks if the Open Banking post-submission steps 
 * have been properly executed for a given task.
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Create drizzle instance
const db = drizzle(pool);

/**
 * Check if Open Banking post-submission steps were completed
 * 
 * @param {number} taskId - ID of the Open Banking task to check
 * @param {number} companyId - ID of the company
 */
async function checkOpenBankingPostSubmission(taskId, companyId) {
  try {
    console.log(`Checking post-submission state for Open Banking task ${taskId}, company ${companyId}`);
    
    // Import schemas directly
    const schema = await import('./db/schema.ts');
    const { tasks, companies } = schema;
    
    // Check task status
    const taskResult = await db.select({
      id: tasks.id,
      task_type: tasks.task_type,
      status: tasks.status,
      progress: tasks.progress,
      metadata: tasks.metadata,
      company_id: tasks.company_id
    })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
    
    if (!taskResult.length) {
      console.error(`Task ${taskId} not found!`);
      process.exit(1);
    }
    
    const task = taskResult[0];
    console.log('\n--- Task State ---');
    console.log(`ID: ${task.id}`);
    console.log(`Type: ${task.task_type}`);
    console.log(`Status: ${task.status}`);
    console.log(`Progress: ${task.progress}%`);
    console.log(`Metadata: ${JSON.stringify(task.metadata, null, 2)}`);
    
    // Check if task is complete
    const isTaskComplete = 
      task.status === 'submitted' || 
      task.status === 'completed' || 
      task.progress === 100;
    
    console.log(`Task completion status: ${isTaskComplete ? 'COMPLETE' : 'NOT COMPLETE'}`);
    
    // Check company state
    const companyResult = await db.select({
      id: companies.id,
      name: companies.name,
      onboarding_company_completed: companies.onboarding_company_completed,
      accreditation_status: companies.accreditation_status,
      risk_score: companies.risk_score,
      risk_clusters: companies.risk_clusters,
      available_tabs: companies.available_tabs
    })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
    
    if (!companyResult.length) {
      console.error(`Company ${companyId} not found!`);
      process.exit(1);
    }
    
    const company = companyResult[0];
    console.log('\n--- Company State ---');
    console.log(`ID: ${company.id}`);
    console.log(`Name: ${company.name}`);
    console.log(`Onboarding completed: ${company.onboarding_company_completed ? 'YES' : 'NO'}`);
    console.log(`Accreditation status: ${company.accreditation_status || 'NOT SET'}`);
    console.log(`Risk score: ${company.risk_score || 'NOT SET'}`);
    console.log(`Risk clusters: ${JSON.stringify(company.risk_clusters, null, 2) || 'NOT SET'}`);
    console.log(`Available tabs: ${company.available_tabs ? company.available_tabs.join(', ') : 'NONE'}`);
    
    // Check if post-submission steps were completed
    const isOnboardingCompleted = !!company.onboarding_company_completed;
    const isAccreditationApproved = company.accreditation_status === 'APPROVED';
    const hasRiskScore = company.risk_score !== null && company.risk_score !== undefined;
    const hasRiskClusters = company.risk_clusters !== null && company.risk_clusters !== undefined;
    const hasDashboardTab = company.available_tabs && company.available_tabs.includes('dashboard');
    const hasInsightsTab = company.available_tabs && company.available_tabs.includes('insights');
    
    console.log('\n--- Post-Submission Checks ---');
    console.log(`Step 1: Onboarding completed: ${isOnboardingCompleted ? 'PASS' : 'FAIL'}`);
    console.log(`Step 2: Accreditation status set to APPROVED: ${isAccreditationApproved ? 'PASS' : 'FAIL'}`);
    console.log(`Step 3: Risk score set: ${hasRiskScore ? 'PASS' : 'FAIL'}`);
    console.log(`Step 4: Risk clusters set: ${hasRiskClusters ? 'PASS' : 'FAIL'}`);
    console.log(`Step 5: Dashboard tab unlocked: ${hasDashboardTab ? 'PASS' : 'FAIL'}`);
    console.log(`Step 6: Insights tab unlocked: ${hasInsightsTab ? 'PASS' : 'FAIL'}`);
    
    // Overall check
    const allChecksPass = 
      isTaskComplete && 
      isOnboardingCompleted && 
      isAccreditationApproved && 
      hasRiskScore && 
      hasRiskClusters && 
      hasDashboardTab && 
      hasInsightsTab;
    
    console.log('\n--- Summary ---');
    if (allChecksPass) {
      console.log('✅ All post-submission steps were properly completed!');
    } else {
      console.log('❌ Some post-submission steps were not completed properly.');
      
      // Detailed explanation of issues
      if (!isTaskComplete) {
        console.log('   - Task is not marked as complete/submitted or progress is not 100%');
      }
      if (!isOnboardingCompleted) {
        console.log('   - Company onboarding_company_completed flag is not set to true');
      }
      if (!isAccreditationApproved) {
        console.log('   - Company accreditation_status is not set to APPROVED');
      }
      if (!hasRiskScore) {
        console.log('   - No risk score has been set for the company');
      }
      if (!hasRiskClusters) {
        console.log('   - No risk clusters have been calculated for the company');
      }
      if (!hasDashboardTab) {
        console.log('   - Dashboard tab has not been unlocked');
      }
      if (!hasInsightsTab) {
        console.log('   - Insights tab has not been unlocked');
      }
    }
    
    // Show fix command if needed
    if (!allChecksPass) {
      console.log('\n--- Fix Command ---');
      console.log(`To fix these issues, run:`);
      console.log(`node direct-fix-open-banking-post-submission.js ${taskId} ${companyId}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

// Get command line arguments (taskId, companyId)
const taskId = process.argv[2] ? parseInt(process.argv[2]) : 784;
const companyId = process.argv[3] ? parseInt(process.argv[3]) : 278;

// Run the check
checkOpenBankingPostSubmission(taskId, companyId);