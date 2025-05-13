/**
 * Fix Open Banking Form Submission Issues
 * 
 * This script addresses two critical issues:
 * 1. Task status stuck as "ready_for_submission" instead of changing to "submitted"
 * 2. Open Banking post-submission steps not executing properly:
 *    - Risk score not being set (should be random 5-95)
 *    - Accreditation status not changing from PENDING to APPROVED
 *    - Onboarding completion flag not being set
 *    - Risk radar not being generated
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

// Terminal colors for better output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Calculate risk clusters based on total risk score using the 
 * same distribution as the production code
 */
function calculateRiskClusters(totalRiskScore) {
  return {
    "PII Data": Math.floor(totalRiskScore * 0.35),
    "Account Data": Math.floor(totalRiskScore * 0.3),
    "Data Transfers": Math.floor(totalRiskScore * 0.1),
    "Certifications Risk": Math.floor(totalRiskScore * 0.1),
    "Security Risk": Math.floor(totalRiskScore * 0.1),
    "Financial Risk": Math.floor(totalRiskScore * 0.05)
  };
}

/**
 * Fix task status and metadata
 */
async function fixTaskStatus(taskId) {
  console.log(`${colors.bright}${colors.magenta}[Fix Task Status]${colors.reset} Checking task ${taskId}...`);
  
  try {
    // First check the task's current status
    const taskCheck = await pool.query(
      `SELECT id, status, progress, metadata FROM tasks WHERE id = $1`,
      [taskId]
    );
    
    if (taskCheck.rows.length === 0) {
      console.log(`${colors.red}[Fix Task Status] Task ${taskId} not found!${colors.reset}`);
      return false;
    }
    
    const task = taskCheck.rows[0];
    console.log(`${colors.cyan}[Fix Task Status] Current state:${colors.reset}`, {
      id: task.id,
      status: task.status,
      progress: task.progress,
      metadata: {
        submitted: task.metadata?.submitted,
        submissionDate: task.metadata?.submissionDate,
        fileId: task.metadata?.fileId,
        hasFile: !!task.metadata?.fileId
      }
    });
    
    // Only update if needed
    if (task.status !== 'submitted' || task.progress !== 100 || !task.metadata?.submitted) {
      const submissionDate = task.metadata?.submissionDate || new Date().toISOString();
      
      console.log(`${colors.yellow}[Fix Task Status] Updating task to 'submitted' status...${colors.reset}`);
      
      const updateResult = await pool.query(
        `UPDATE tasks 
         SET status = 'submitted', 
             progress = 100,
             metadata = jsonb_set(
               jsonb_set(COALESCE(metadata, '{}'::jsonb), '{submitted}', 'true'::jsonb),
               '{submissionDate}', to_jsonb($2::text)
             ),
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, status, progress, metadata`,
        [taskId, submissionDate]
      );
      
      console.log(`${colors.green}[Fix Task Status] Updated task status:${colors.reset}`, {
        id: updateResult.rows[0].id,
        newStatus: updateResult.rows[0].status,
        newProgress: updateResult.rows[0].progress,
        submitted: updateResult.rows[0].metadata?.submitted,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } else {
      console.log(`${colors.green}[Fix Task Status] Task ${taskId} already has correct status${colors.reset}`);
      return true;
    }
  } catch (error) {
    console.error(`${colors.red}[Fix Task Status] Error updating task status:${colors.reset}`, error);
    return false;
  }
}

/**
 * Fix Open Banking post-submission steps for a company
 */
async function fixOpenBankingPostSubmission(companyId) {
  console.log(`${colors.bright}${colors.magenta}[Fix OB Post-Submission]${colors.reset} Checking company ${companyId}...`);
  
  try {
    // First check the company's current state
    const companyCheck = await pool.query(
      `SELECT 
        id, 
        name, 
        onboarding_company_completed, 
        risk_score, 
        accreditation_status, 
        risk_clusters,
        available_tabs
       FROM companies 
       WHERE id = $1`,
      [companyId]
    );
    
    if (companyCheck.rows.length === 0) {
      console.log(`${colors.red}[Fix OB Post-Submission] Company ${companyId} not found!${colors.reset}`);
      return false;
    }
    
    const company = companyCheck.rows[0];
    console.log(`${colors.cyan}[Fix OB Post-Submission] Current company state:${colors.reset}`, {
      id: company.id,
      name: company.name,
      onboardingCompleted: company.onboarding_company_completed,
      riskScore: company.risk_score,
      accreditationStatus: company.accreditation_status,
      hasRiskClusters: !!company.risk_clusters,
      availableTabs: company.available_tabs
    });
    
    // Generate a new risk score if needed
    const needsRiskScore = company.risk_score === null || company.risk_score === undefined;
    const needsAccreditationUpdate = company.accreditation_status !== 'APPROVED';
    const needsOnboardingCompletion = !company.onboarding_company_completed;
    
    if (needsRiskScore || needsAccreditationUpdate || needsOnboardingCompletion) {
      console.log(`${colors.yellow}[Fix OB Post-Submission] Updating company state...${colors.reset}`);
      
      // Generate a risk score between 5-95
      const riskScore = Math.floor(Math.random() * (95 - 5 + 1)) + 5;
      const riskClusters = calculateRiskClusters(riskScore);
      
      // Ensure Dashboard and Insights tabs are available
      let availableTabs = company.available_tabs || [];
      if (!availableTabs.includes('dashboard')) availableTabs.push('dashboard');
      if (!availableTabs.includes('insights')) availableTabs.push('insights');
      
      // Update the company
      const updateResult = await pool.query(
        `UPDATE companies 
         SET onboarding_company_completed = true,
             risk_score = $2,
             accreditation_status = 'APPROVED',
             risk_clusters = $3::jsonb,
             available_tabs = $4::jsonb,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, name, onboarding_company_completed, risk_score, accreditation_status`,
        [companyId, riskScore, JSON.stringify(riskClusters), JSON.stringify(availableTabs)]
      );
      
      const updatedCompany = updateResult.rows[0];
      console.log(`${colors.green}[Fix OB Post-Submission] Company updated successfully:${colors.reset}`, {
        id: updatedCompany.id,
        name: updatedCompany.name,
        onboardingCompleted: updatedCompany.onboarding_company_completed,
        riskScore: updatedCompany.risk_score,
        accreditationStatus: updatedCompany.accreditation_status,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } else {
      console.log(`${colors.green}[Fix OB Post-Submission] Company ${companyId} already has correct state${colors.reset}`);
      return true;
    }
  } catch (error) {
    console.error(`${colors.red}[Fix OB Post-Submission] Error updating company:${colors.reset}`, error);
    return false;
  }
}

/**
 * Broadcast a task update via WebSocket
 */
async function broadcastTaskUpdate(taskId) {
  console.log(`${colors.bright}${colors.blue}[Broadcast]${colors.reset} Sending WebSocket update for task ${taskId}...`);
  
  try {
    // Get task details first
    const taskQuery = await pool.query(
      `SELECT id, status, progress, metadata FROM tasks WHERE id = $1`,
      [taskId]
    );
    
    if (taskQuery.rows.length === 0) {
      console.log(`${colors.red}[Broadcast] Task ${taskId} not found!${colors.reset}`);
      return false;
    }
    
    const task = taskQuery.rows[0];
    
    // Insert a WebSocket message directly into the database
    // This is a direct approach that bypasses the WebSocket server
    await pool.query(
      `INSERT INTO websocket_messages (
         type, 
         message, 
         created_at,
         metadata
       ) VALUES (
         'task_update', 
         $1::jsonb, 
         NOW(),
         '{"broadcast": true, "source": "direct-fix"}'::jsonb
       )`,
      [JSON.stringify({
        id: taskId,
        taskId: taskId,
        status: 'submitted',
        progress: 100,
        metadata: {
          submissionDate: task.metadata?.submissionDate || new Date().toISOString(),
          fileId: task.metadata?.fileId,
          submitted: true,
          formSubmission: true,
          source: 'manual_status_correction',
          timestamp: new Date().toISOString()
        }
      })]
    );
    
    console.log(`${colors.green}[Broadcast] Successfully inserted WebSocket message${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}[Broadcast] Error broadcasting task update:${colors.reset}`, error);
    
    if (error.message.includes('relation "websocket_messages" does not exist')) {
      console.log(`${colors.yellow}[Broadcast] WebSocket messages table doesn't exist. This is not critical.${colors.reset}`);
      return true; // Continue despite error
    }
    
    return false;
  }
}

/**
 * Run the full fix for a specific task and company
 */
async function fixOpenBankingSubmission(taskId, companyId) {
  console.log(`\n${colors.bright}${colors.green}=== Starting Open Banking Submission Fix ===${colors.reset}`);
  console.log(`Task ID: ${taskId}, Company ID: ${companyId}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);
  
  try {
    // 1. Fix the task status
    const taskFixed = await fixTaskStatus(taskId);
    if (!taskFixed) {
      console.log(`${colors.red}Failed to fix task status. Aborting.${colors.reset}`);
      return false;
    }
    
    // 2. Fix the Open Banking post-submission steps
    const postSubmissionFixed = await fixOpenBankingPostSubmission(companyId);
    if (!postSubmissionFixed) {
      console.log(`${colors.red}Failed to fix Open Banking post-submission steps. Aborting.${colors.reset}`);
      return false;
    }
    
    // 3. Broadcast the task update
    const broadcasted = await broadcastTaskUpdate(taskId);
    if (!broadcasted) {
      console.log(`${colors.yellow}Warning: Failed to broadcast task update. The fix may still work, but UI refresh may be needed.${colors.reset}`);
    }
    
    console.log(`\n${colors.bright}${colors.green}=== Open Banking Submission Fix Completed Successfully ===${colors.reset}`);
    console.log(`Please refresh the application UI to see the changes.\n`);
    return true;
  } catch (error) {
    console.error(`${colors.red}Error in fixOpenBankingSubmission:${colors.reset}`, error);
    return false;
  } finally {
    // Close the database pool
    await pool.end();
  }
}

// Get task and company IDs from command-line arguments or use defaults
const taskId = parseInt(process.argv[2]) || 820; // Default task ID
const companyId = parseInt(process.argv[3]) || 289; // Default company ID

// Run the fix
fixOpenBankingSubmission(taskId, companyId).catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});