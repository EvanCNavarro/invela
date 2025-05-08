/**
 * Direct Fix for Open Banking Post-Submission Steps
 * 
 * This script directly applies the post-submission steps that should happen
 * after an Open Banking form is submitted.
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
 * Calculate risk clusters based on the total risk score
 * 
 * This function distributes the risk score across different risk categories
 * with higher weight on PII Data and Account Data categories.
 * 
 * @param {number} riskScore The total risk score (0-100)
 * @returns {Object} An object containing risk scores distributed across categories
 */
function calculateRiskClusters(riskScore) {
  // Define weights for each category
  const weights = {
    "PII Data": 0.35,           // 35% of total score
    "Account Data": 0.30,        // 30% of total score
    "Data Transfers": 0.10,      // 10% of total score
    "Certifications Risk": 0.10, // 10% of total score
    "Security Risk": 0.10,       // 10% of total score
    "Financial Risk": 0.05       // 5% of total score
  };
  
  // Calculate base values for each category
  let riskClusters = {
    "PII Data": Math.round(riskScore * weights["PII Data"]),
    "Account Data": Math.round(riskScore * weights["Account Data"]),
    "Data Transfers": Math.round(riskScore * weights["Data Transfers"]),
    "Certifications Risk": Math.round(riskScore * weights["Certifications Risk"]),
    "Security Risk": Math.round(riskScore * weights["Security Risk"]),
    "Financial Risk": Math.round(riskScore * weights["Financial Risk"])
  };
  
  // Ensure the sum equals the total risk score by adjusting the main categories
  const sum = Object.values(riskClusters).reduce((total, value) => total + value, 0);
  const diff = riskScore - sum;
  
  // If there's a difference, adjust the main categories to match the total
  if (diff !== 0) {
    if (diff > 0) {
      riskClusters["PII Data"] += Math.ceil(diff * 0.6);
      riskClusters["Account Data"] += Math.floor(diff * 0.4);
    } else {
      const absDiff = Math.abs(diff);
      riskClusters["PII Data"] -= Math.ceil(absDiff * 0.6);
      riskClusters["Account Data"] -= Math.floor(absDiff * 0.4);
    }
  }
  
  // Ensure no negative values
  for (const key in riskClusters) {
    riskClusters[key] = Math.max(0, riskClusters[key]);
  }
  
  return riskClusters;
}

/**
 * Directly apply Open Banking post-submission fix to a task
 * 
 * @param {number} taskId - Task ID to fix
 * @param {number} companyId - Company ID associated with the task
 * @param {boolean} dryRun - If true, will not make any database changes
 */
async function fixOpenBankingPostSubmission(taskId, companyId, dryRun = false) {
  try {
    console.log(`${dryRun ? '[DRY RUN] ' : ''}Applying Open Banking post-submission fix for task ${taskId}, company ${companyId}`);
    
    // Import schemas directly
    const schema = await import('./db/schema.ts');
    const { tasks, companies } = schema;
    
    // STEP 1: Update task status to submitted with 100% progress if needed
    console.log('\nStep 1: Checking task status...');
    
    const taskResult = await db.select({
      id: tasks.id,
      task_type: tasks.task_type,
      status: tasks.status,
      progress: tasks.progress,
      metadata: tasks.metadata
    })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
    
    if (!taskResult.length) {
      console.error(`Task ${taskId} not found!`);
      process.exit(1);
    }
    
    const task = taskResult[0];
    
    if (task.task_type !== 'open_banking') {
      console.error(`Task ${taskId} is not an Open Banking task! Type: ${task.task_type}`);
      process.exit(1);
    }
    
    const needsTaskUpdate = 
      task.status !== 'submitted' || 
      task.progress !== 100;
    
    if (needsTaskUpdate) {
      console.log(`Task status needs update: Current status=${task.status}, progress=${task.progress}`);
      
      if (!dryRun) {
        const metadata = task.metadata || {};
        // Ensure submission info is preserved in metadata
        const updatedMetadata = {
          ...metadata,
          submission: {
            ...(metadata.submission || {}),
            timestamp: new Date().toISOString(),
            status: 'completed'
          }
        };
        
        await db.update(tasks)
          .set({ 
            status: 'submitted', 
            progress: 100,
            metadata: updatedMetadata,
            updated_at: new Date()
          })
          .where(eq(tasks.id, taskId));
        
        console.log('✅ Task status updated to submitted with 100% progress');
      } else {
        console.log('[DRY RUN] Would update task status to submitted with 100% progress');
      }
    } else {
      console.log('✅ Task status is already correct');
    }
    
    // STEP 2: Check company state and apply fixes
    console.log('\nStep 2: Checking company state...');
    
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
    
    // STEP 3: Set onboarding completed flag
    console.log('\nStep 3: Setting onboarding_company_completed flag...');
    
    const needsOnboardingUpdate = !company.onboarding_company_completed;
    
    if (needsOnboardingUpdate) {
      if (!dryRun) {
        await db.update(companies)
          .set({ 
            onboarding_company_completed: true,
            updated_at: new Date()
          })
          .where(eq(companies.id, companyId));
        
        console.log('✅ Company onboarding_company_completed flag set to true');
      } else {
        console.log('[DRY RUN] Would set company onboarding_company_completed flag to true');
      }
    } else {
      console.log('✅ Company onboarding_company_completed flag is already set');
    }
    
    // STEP 4: Generate risk score and clusters
    console.log('\nStep 4: Setting risk score and clusters...');
    
    // Generate a random risk score between 5 and 95
    const riskScore = company.risk_score || Math.floor(Math.random() * (95 - 5 + 1)) + 5;
    console.log(`Risk score: ${riskScore}`);
    
    // Calculate risk clusters based on the risk score
    const riskClusters = company.risk_clusters || calculateRiskClusters(riskScore);
    console.log(`Risk clusters: ${JSON.stringify(riskClusters, null, 2)}`);
    
    const needsRiskUpdate = 
      company.risk_score === null || 
      company.risk_score === undefined || 
      company.risk_clusters === null || 
      company.risk_clusters === undefined;
    
    if (needsRiskUpdate) {
      if (!dryRun) {
        await db.update(companies)
          .set({ 
            risk_score: riskScore,
            risk_clusters: riskClusters,
            updated_at: new Date()
          })
          .where(eq(companies.id, companyId));
        
        console.log('✅ Company risk score and clusters updated');
      } else {
        console.log('[DRY RUN] Would update company risk score and clusters');
      }
    } else {
      console.log('✅ Company risk score and clusters are already set');
    }
    
    // STEP 5: Set accreditation status to APPROVED
    console.log('\nStep 5: Setting accreditation status to APPROVED...');
    
    const needsAccreditationUpdate = company.accreditation_status !== 'APPROVED';
    
    if (needsAccreditationUpdate) {
      if (!dryRun) {
        await db.update(companies)
          .set({ 
            accreditation_status: 'APPROVED',
            updated_at: new Date()
          })
          .where(eq(companies.id, companyId));
        
        console.log('✅ Company accreditation status set to APPROVED');
      } else {
        console.log('[DRY RUN] Would set company accreditation status to APPROVED');
      }
    } else {
      console.log('✅ Company accreditation status is already APPROVED');
    }
    
    // STEP 6: Unlock Dashboard and Insights tabs
    console.log('\nStep 6: Unlocking Dashboard and Insights tabs...');
    
    const tabsToUnlock = ['dashboard', 'insights'];
    const currentTabs = Array.isArray(company.available_tabs) ? company.available_tabs : ['task-center'];
    
    // Check if tabs need to be added
    const needsDashboard = !currentTabs.includes('dashboard');
    const needsInsights = !currentTabs.includes('insights');
    const needsTabsUpdate = needsDashboard || needsInsights;
    
    // Add missing tabs
    if (needsTabsUpdate) {
      const updatedTabs = [...new Set([...currentTabs, ...tabsToUnlock])];
      
      if (!dryRun) {
        await db.update(companies)
          .set({ 
            available_tabs: updatedTabs,
            updated_at: new Date()
          })
          .where(eq(companies.id, companyId));
        
        console.log(`✅ Company tabs updated to include: ${updatedTabs.join(', ')}`);
        
        // Broadcast tab update via WebSocket if we have the WebSocket server
        try {
          const WebSocketService = await import('./server/services/websocket.js');
          if (WebSocketService && WebSocketService.getWebSocketServer) {
            const wss = WebSocketService.getWebSocketServer();
            if (wss && typeof wss.broadcastCompanyTabs === 'function') {
              wss.broadcastCompanyTabs(companyId, updatedTabs);
              console.log('✅ Tab update broadcasted via WebSocket');
            }
          }
        } catch (wsError) {
          console.log('⚠️ WebSocket service not available for broadcasting tab update');
        }
      } else {
        console.log(`[DRY RUN] Would update company tabs to include: ${[...new Set([...currentTabs, ...tabsToUnlock])].join(', ')}`);
      }
    } else {
      console.log('✅ Dashboard and Insights tabs are already unlocked');
    }
    
    // STEP 7: Final verification
    if (!dryRun) {
      console.log('\nVerifying changes...');
      
      const updatedCompany = await db.select({
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
      
      const company2 = updatedCompany[0];
      
      const allGood = 
        company2.onboarding_company_completed === true &&
        company2.accreditation_status === 'APPROVED' &&
        company2.risk_score !== null &&
        company2.risk_clusters !== null &&
        Array.isArray(company2.available_tabs) &&
        company2.available_tabs.includes('dashboard') &&
        company2.available_tabs.includes('insights');
      
      if (allGood) {
        console.log('🎉 All post-submission steps have been successfully applied!');
      } else {
        console.log('⚠️ Some post-submission steps might not have been applied correctly. Run the check script again.');
      }
    } else {
      console.log('\n[DRY RUN] No changes were made. Run again without --dry-run to apply fixes.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

// Get command line arguments (taskId, companyId, dryRun)
const taskId = process.argv[2] ? parseInt(process.argv[2]) : 784;
const companyId = process.argv[3] ? parseInt(process.argv[3]) : 278;
const dryRun = process.argv.includes('--dry-run');

// Run the fix
fixOpenBankingPostSubmission(taskId, companyId, dryRun);