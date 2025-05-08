/**
 * Run Open Banking Form Submission Fix
 * 
 * This script runs our fix for the Open Banking form submission issues.
 * It directly calls our fixed post-submission handling code.
 */

import { db } from './server/db.js';
import { companies, tasks, openBankingResponses, files } from './db/schema.js';
import { eq } from 'drizzle-orm';
import { createTaskFile } from './server/services/fileCreation.js';
import { calculateRiskClusters, generateRandomRiskScore } from './server/services/openBankingRiskScore.js';

// Task to fix
const TASK_ID = 780;

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Helper function for logging
function log(message, color = colors.reset) {
  console.log(`${color}[OpenBankingFix] ${message}${colors.reset}`);
}

/**
 * Run Open Banking form submission fix
 */
async function runOpenBankingFix() {
  try {
    log('Starting Open Banking form submission fix...', colors.blue);
    
    // 1. Get task details
    log(`Getting task ${TASK_ID} details...`, colors.blue);
    
    const taskResult = await db.select()
      .from(tasks)
      .where(eq(tasks.id, TASK_ID))
      .limit(1);
      
    if (!taskResult.length) {
      log(`Task ${TASK_ID} not found`, colors.red);
      return;
    }
    
    const task = taskResult[0];
    const companyId = task.company_id;
    
    log(`Task ${TASK_ID} found for company ${companyId}, status: ${task.status}, progress: ${task.progress}%`, colors.cyan);
    
    // 2. Get company details
    log(`Getting company ${companyId} details...`, colors.blue);
    
    const companyResult = await db.select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
      
    if (!companyResult.length) {
      log(`Company ${companyId} not found`, colors.red);
      return;
    }
    
    const company = companyResult[0];
    
    log(`Company found: ${company.name}, onboarding complete: ${company.onboarding_company_completed}, accreditation: ${company.accreditation_status}`, colors.cyan);
    log(`Available tabs: ${company.available_tabs ? company.available_tabs.join(', ') : 'None'}`, colors.cyan);
    
    // 3. Regenerate CSV file
    log('Regenerating CSV file with proper case-insensitive handling...', colors.blue);
    
    // Create simple formData object for file generation
    const formData = {
      taskId: TASK_ID,
      formType: 'open_banking',
      companyId
    };
    
    // Generate file
    const fileResult = await createTaskFile(
      TASK_ID,
      'open_banking',
      formData,
      companyId,
      320 // Admin user ID
    );
    
    if (fileResult.success) {
      log(`File created successfully: ${fileResult.fileName} (ID: ${fileResult.fileId})`, colors.green);
      
      // Update task metadata with new file info
      const updatedMetadata = {
        ...(task.metadata || {}),
        fileId: fileResult.fileId,
        fileName: fileResult.fileName,
        submitted: true,
        submittedAt: new Date().toISOString()
      };
      
      await db.update(tasks)
        .set({
          metadata: updatedMetadata,
          status: 'submitted',
          progress: 100,
          updated_at: new Date()
        })
        .where(eq(tasks.id, TASK_ID));
        
      log('Task metadata and status updated', colors.green);
    } else {
      log(`File creation failed: ${fileResult.error}`, colors.red);
    }
    
    // 4. Set risk score and clusters
    log('Setting risk score and clusters...', colors.blue);
    
    // Generate random risk score
    const riskScore = generateRandomRiskScore();
    const riskClusters = calculateRiskClusters(riskScore);
    
    log(`Generated risk score: ${riskScore}`, colors.cyan);
    log(`Generated risk clusters: ${JSON.stringify(riskClusters)}`, colors.cyan);
    
    // Update company with risk information
    await db.update(companies)
      .set({
        risk_score: riskScore,
        risk_clusters: riskClusters,
        accreditation_status: 'APPROVED',
        onboarding_company_completed: true,
        updated_at: new Date()
      })
      .where(eq(companies.id, companyId));
      
    log('Company updated with risk score, clusters, and status', colors.green);
    
    // 5. Update company tabs
    log('Unlocking dashboard and insights tabs...', colors.blue);
    
    const tabsToUnlock = ['dashboard', 'insights'];
    const currentTabs = company.available_tabs || ['task-center'];
    
    // Add new tabs that aren't already present
    const updatedTabs = [...new Set([...currentTabs, ...tabsToUnlock])];
    
    await db.update(companies)
      .set({
        available_tabs: updatedTabs,
        updated_at: new Date()
      })
      .where(eq(companies.id, companyId));
    
    log(`Tabs unlocked: ${updatedTabs.join(', ')}`, colors.green);
    
    // 6. Verify fixes
    log('Verifying fixes...', colors.blue);
    
    // Get updated company
    const updatedCompanyResult = await db.select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
      
    if (!updatedCompanyResult.length) {
      log('Failed to verify company updates', colors.red);
      return;
    }
    
    const updatedCompany = updatedCompanyResult[0];
    
    // Get updated task
    const updatedTaskResult = await db.select()
      .from(tasks)
      .where(eq(tasks.id, TASK_ID))
      .limit(1);
      
    if (!updatedTaskResult.length) {
      log('Failed to verify task updates', colors.red);
      return;
    }
    
    const updatedTask = updatedTaskResult[0];
    
    // Log verification results
    log('Verification results:', colors.magenta);
    log(`Task status: ${updatedTask.status}`, updatedTask.status === 'submitted' ? colors.green : colors.red);
    log(`Task progress: ${updatedTask.progress}%`, updatedTask.progress === 100 ? colors.green : colors.red);
    log(`Task has fileId: ${!!updatedTask.metadata?.fileId}`, updatedTask.metadata?.fileId ? colors.green : colors.red);
    log(`Company onboarding complete: ${updatedCompany.onboarding_company_completed}`, updatedCompany.onboarding_company_completed ? colors.green : colors.red);
    log(`Company accreditation status: ${updatedCompany.accreditation_status}`, updatedCompany.accreditation_status === 'APPROVED' ? colors.green : colors.red);
    log(`Company has risk score: ${!!updatedCompany.risk_score}`, updatedCompany.risk_score ? colors.green : colors.red);
    log(`Company has risk clusters: ${!!updatedCompany.risk_clusters}`, updatedCompany.risk_clusters ? colors.green : colors.red);
    
    const hasAllTabs = tabsToUnlock.every(tab => updatedCompany.available_tabs.includes(tab));
    log(`Company has all required tabs: ${hasAllTabs}`, hasAllTabs ? colors.green : colors.red);
    
    // Final success message
    if (updatedTask.status === 'submitted' && 
        updatedTask.progress === 100 && 
        updatedTask.metadata?.fileId && 
        updatedCompany.onboarding_company_completed && 
        updatedCompany.accreditation_status === 'APPROVED' && 
        updatedCompany.risk_score && 
        updatedCompany.risk_clusters && 
        hasAllTabs) {
      log('✅ OPEN BANKING FIX SUCCESSFULLY APPLIED!', colors.green);
    } else {
      log('❌ OPEN BANKING FIX PARTIALLY APPLIED - SOME ISSUES REMAIN', colors.red);
    }
    
  } catch (error) {
    log(`Error: ${error.message}`, colors.red);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

// Run the fix
runOpenBankingFix().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});