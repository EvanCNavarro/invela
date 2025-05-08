/**
 * Direct Fix Script for Open Banking Post-Submission Processing
 * 
 * This script applies the Open Banking post-submission handling steps directly to a specific task.
 * Use this script to fix tasks that have been submitted but didn't complete the post-submission
 * processing correctly.
 * 
 * The script will:
 * 1. Set the company's onboarding status to completed
 * 2. Generate a random risk score between 5-95
 * 3. Calculate risk clusters with correct weighting 
 * 4. Set accreditation status to APPROVED
 * 5. Unlock Dashboard and Insights tabs
 * 
 * Usage: node direct-fix-open-banking-post-submission.js [taskId] [companyId]
 */

// Import required modules
const { drizzle } = require('drizzle-orm/neon-serverless');
const { Pool } = require('pg');
const colors = require('../server/utils/colors');

// Import companies schema
const { companies, tasks } = require('../db/schema');
const { eq, and } = require('drizzle-orm');

// Setup database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

// WebSocket server setup for broadcasting (optional)
let webSocketServer;
try {
  const { getWebSocketServer } = require('../server/services/websocket');
  webSocketServer = getWebSocketServer();
} catch (error) {
  console.warn(`${colors.yellow}[Fix] ⚠️ Could not initialize WebSocket server: ${error.message}${colors.reset}`);
  console.warn(`${colors.yellow}[Fix] ⚠️ Tab updates will not be broadcasted to clients${colors.reset}`);
}

/**
 * Calculate risk clusters based on the total risk score
 * 
 * This function distributes the risk score across different risk categories
 * with higher weight on PII Data and Account Data categories.
 * 
 * @param {number} riskScore The total risk score (0-100)
 * @returns {Object} An object containing risk scores distributed across categories
 */
function calculateRiskClusters(riskScore) {
  // Base distribution weights for each category
  const weights = {
    "PII Data": 0.35,           // 35% of total score
    "Account Data": 0.30,        // 30% of total score
    "Data Transfers": 0.10,      // 10% of total score
    "Certifications Risk": 0.10, // 10% of total score
    "Security Risk": 0.10,       // 10% of total score
    "Financial Risk": 0.05       // 5% of total score
  };
  
  // Calculate base values for each category
  let clusters = {
    "PII Data": Math.round(riskScore * weights["PII Data"]),
    "Account Data": Math.round(riskScore * weights["Account Data"]),
    "Data Transfers": Math.round(riskScore * weights["Data Transfers"]),
    "Certifications Risk": Math.round(riskScore * weights["Certifications Risk"]),
    "Security Risk": Math.round(riskScore * weights["Security Risk"]),
    "Financial Risk": Math.round(riskScore * weights["Financial Risk"])
  };
  
  // Ensure the sum equals the total risk score by adjusting the main categories
  const sum = Object.values(clusters).reduce((total, value) => total + value, 0);
  const diff = riskScore - sum;
  
  // If there's a difference, adjust the main categories to match the total
  if (diff !== 0) {
    // If positive, add to the highest weighted categories
    // If negative, subtract from them
    if (diff > 0) {
      clusters["PII Data"] += Math.ceil(diff * 0.6);
      clusters["Account Data"] += Math.floor(diff * 0.4);
    } else {
      const absDiff = Math.abs(diff);
      clusters["PII Data"] -= Math.ceil(absDiff * 0.6);
      clusters["Account Data"] -= Math.floor(absDiff * 0.4);
    }
  }
  
  // Ensure no negative values
  for (const key in clusters) {
    clusters[key] = Math.max(0, clusters[key]);
  }
  
  return clusters;
}

/**
 * Directly apply Open Banking post-submission fix to a task
 * 
 * @param {number} taskId - Task ID to fix
 * @param {number} companyId - Company ID associated with the task
 * @param {boolean} dryRun - If true, will not make any database changes
 */
async function fixOpenBankingPostSubmission(taskId, companyId, dryRun = false) {
  console.log(`${colors.cyan}[Fix] Starting Open Banking post-submission fix for Task #${taskId}, Company #${companyId}${colors.reset}`);
  
  if (dryRun) {
    console.log(`${colors.yellow}[Fix] ⚠️ DRY RUN MODE - No database changes will be made${colors.reset}`);
  }
  
  try {
    // Step 1: Verify task exists and is an Open Banking task
    console.log(`${colors.cyan}[Fix] Step 1: Verifying task #${taskId}${colors.reset}`);
    
    const taskResult = await db.select({
      id: tasks.id,
      type: tasks.task_type,
      status: tasks.status,
      company_id: tasks.company_id
    })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
    
    if (!taskResult.length) {
      console.error(`${colors.red}[Fix] ❌ Task #${taskId} not found${colors.reset}`);
      process.exit(1);
    }
    
    const task = taskResult[0];
    
    if (task.type !== 'open_banking' && task.type !== 'OpenBanking') {
      console.error(`${colors.red}[Fix] ❌ Task #${taskId} is not an Open Banking task (type: ${task.type})${colors.reset}`);
      process.exit(1);
    }
    
    if (task.company_id !== companyId) {
      console.warn(`${colors.yellow}[Fix] ⚠️ Task #${taskId} belongs to company #${task.company_id}, not company #${companyId}${colors.reset}`);
      console.log(`${colors.cyan}[Fix] Using company ID from task: ${task.company_id}${colors.reset}`);
      companyId = task.company_id;
    }
    
    console.log(`${colors.green}[Fix] ✅ Verified task #${taskId} is an Open Banking task for company #${companyId}${colors.reset}`);
    
    // Step 2: Verify company exists
    console.log(`${colors.cyan}[Fix] Step 2: Verifying company #${companyId}${colors.reset}`);
    
    const companyResult = await db.select({
      id: companies.id,
      name: companies.name,
      onboarding_completed: companies.onboarding_company_completed,
      risk_score: companies.risk_score,
      risk_clusters: companies.risk_clusters,
      accreditation_status: companies.accreditation_status,
      available_tabs: companies.available_tabs
    })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
    
    if (!companyResult.length) {
      console.error(`${colors.red}[Fix] ❌ Company #${companyId} not found${colors.reset}`);
      process.exit(1);
    }
    
    const company = companyResult[0];
    console.log(`${colors.green}[Fix] ✅ Verified company #${companyId} (${company.name})${colors.reset}`);
    
    // Log initial state
    console.log(`${colors.cyan}[Fix] Initial company state:${colors.reset}`);
    console.log(`  - Onboarding completed: ${company.onboarding_completed ? 'Yes' : 'No'}`);
    console.log(`  - Risk score: ${company.risk_score || 'Not set'}`);
    console.log(`  - Accreditation status: ${company.accreditation_status || 'Not set'}`);
    console.log(`  - Available tabs: ${company.available_tabs ? company.available_tabs.join(', ') : 'None'}`);
    
    // Step 3: Update onboarding status
    console.log(`${colors.cyan}[Fix] Step 3: Setting onboarding_company_completed to true${colors.reset}`);
    
    if (!dryRun) {
      await db.update(companies)
        .set({
          onboarding_company_completed: true,
          updated_at: new Date()
        })
        .where(eq(companies.id, companyId));
    }
    
    console.log(`${colors.green}[Fix] ✅ Updated onboarding status to true for company #${companyId}${colors.reset}`);
    
    // Step 4: Generate risk score and clusters
    console.log(`${colors.cyan}[Fix] Step 4: Generating risk score and clusters${colors.reset}`);
    
    // Generate random risk score between 5 and 95
    const riskScore = Math.floor(Math.random() * (95 - 5 + 1)) + 5;
    console.log(`${colors.green}[Fix] ✅ Generated risk score: ${riskScore}${colors.reset}`);
    
    // Calculate risk clusters based on the risk score
    const riskClusters = calculateRiskClusters(riskScore);
    console.log(`${colors.green}[Fix] ✅ Calculated risk clusters:${colors.reset}`, riskClusters);
    
    // Step 5: Update accreditation status and risk data
    console.log(`${colors.cyan}[Fix] Step 5: Setting accreditation status to APPROVED and saving risk data${colors.reset}`);
    
    if (!dryRun) {
      await db.update(companies)
        .set({
          accreditation_status: 'APPROVED',
          risk_score: riskScore,
          risk_clusters: riskClusters,
          updated_at: new Date()
        })
        .where(eq(companies.id, companyId));
    }
    
    console.log(`${colors.green}[Fix] ✅ Updated accreditation status to APPROVED and saved risk data${colors.reset}`);
    
    // Step 6: Unlock Dashboard and Insights tabs
    console.log(`${colors.cyan}[Fix] Step 6: Unlocking Dashboard and Insights tabs${colors.reset}`);
    
    const tabsToUnlock = ['dashboard', 'insights'];
    
    if (!dryRun) {
      // Get current tabs
      const [currentCompany] = await db.select({ available_tabs: companies.available_tabs })
        .from(companies)
        .where(eq(companies.id, companyId));
      
      // Ensure available_tabs is an array
      const currentTabs = Array.isArray(currentCompany.available_tabs) 
        ? currentCompany.available_tabs 
        : ['task-center'];
      
      // Add new tabs if not already present
      const updatedTabs = [...new Set([...currentTabs, ...tabsToUnlock])];
      
      // Update company tabs
      await db.update(companies)
        .set({ 
          available_tabs: updatedTabs,
          updated_at: new Date()
        })
        .where(eq(companies.id, companyId));
    }
    
    console.log(`${colors.green}[Fix] ✅ Unlocked tabs:${colors.reset}`, tabsToUnlock);
    
    // Step 7: Broadcast tab updates if WebSocket server is available
    console.log(`${colors.cyan}[Fix] Step 7: Broadcasting tab updates${colors.reset}`);
    
    if (webSocketServer && !dryRun) {
      try {
        const broadcastResult = webSocketServer.broadcastCompanyTabs(companyId, tabsToUnlock);
        console.log(`${colors.green}[Fix] ✅ Broadcasted tab updates to ${broadcastResult.clientCount} clients${colors.reset}`);
      } catch (error) {
        console.warn(`${colors.yellow}[Fix] ⚠️ Could not broadcast tab updates: ${error.message}${colors.reset}`);
      }
    } else {
      console.warn(`${colors.yellow}[Fix] ⚠️ Skipping tab broadcast - WebSocket server not available or dry run mode${colors.reset}`);
    }
    
    // Step 8: Verify changes
    if (!dryRun) {
      console.log(`${colors.cyan}[Fix] Step 8: Verifying changes${colors.reset}`);
      
      const updatedCompany = await db.select({
        id: companies.id,
        name: companies.name,
        onboarding_completed: companies.onboarding_company_completed,
        risk_score: companies.risk_score,
        risk_clusters: companies.risk_clusters,
        accreditation_status: companies.accreditation_status,
        available_tabs: companies.available_tabs
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
      
      if (!updatedCompany.length) {
        console.error(`${colors.red}[Fix] ❌ Could not verify changes - company not found${colors.reset}`);
      } else {
        const company = updatedCompany[0];
        console.log(`${colors.green}[Fix] ✅ Updated company state:${colors.reset}`);
        console.log(`  - Onboarding completed: ${company.onboarding_completed ? 'Yes' : 'No'}`);
        console.log(`  - Risk score: ${company.risk_score || 'Not set'}`);
        console.log(`  - Accreditation status: ${company.accreditation_status || 'Not set'}`);
        console.log(`  - Available tabs: ${company.available_tabs ? company.available_tabs.join(', ') : 'None'}`);
        
        // Check if all changes were applied
        let allChangesApplied = true;
        
        if (!company.onboarding_completed) {
          console.error(`${colors.red}[Fix] ❌ onboarding_company_completed not set to true${colors.reset}`);
          allChangesApplied = false;
        }
        
        if (company.risk_score !== riskScore) {
          console.error(`${colors.red}[Fix] ❌ risk_score not set to ${riskScore}${colors.reset}`);
          allChangesApplied = false;
        }
        
        if (company.accreditation_status !== 'APPROVED') {
          console.error(`${colors.red}[Fix] ❌ accreditation_status not set to APPROVED${colors.reset}`);
          allChangesApplied = false;
        }
        
        const hasDashboard = company.available_tabs && company.available_tabs.includes('dashboard');
        const hasInsights = company.available_tabs && company.available_tabs.includes('insights');
        
        if (!hasDashboard || !hasInsights) {
          console.error(`${colors.red}[Fix] ❌ Dashboard and Insights tabs not unlocked${colors.reset}`);
          allChangesApplied = false;
        }
        
        if (allChangesApplied) {
          console.log(`${colors.green}[Fix] 🎉 All changes applied successfully!${colors.reset}`);
        } else {
          console.error(`${colors.red}[Fix] ❌ Some changes were not applied successfully${colors.reset}`);
        }
      }
    } else {
      console.log(`${colors.yellow}[Fix] ⚠️ Skipping verification - dry run mode${colors.reset}`);
    }
    
    console.log(`${colors.green}[Fix] 🎉 Open Banking post-submission fix ${dryRun ? 'would be' : 'has been'} applied to task #${taskId}, company #${companyId}${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}[Fix] ❌ Error applying Open Banking post-submission fix:${colors.reset}`, error);
  } finally {
    // Close database connection
    await pool.end();
  }
}

// Get command line arguments
const taskId = process.argv[2] ? parseInt(process.argv[2]) : 777;
const companyId = process.argv[3] ? parseInt(process.argv[3]) : 277;
const dryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');

// Run the fix
fixOpenBankingPostSubmission(taskId, companyId, dryRun);