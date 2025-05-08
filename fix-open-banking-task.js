/**
 * Fix Open Banking Task Post-Submission Steps
 * 
 * This script uses direct SQL queries to fix any Open Banking post-submission
 * steps that may not have completed properly. It:
 * 
 * 1. Ensures task status is 'submitted' and progress is 100%
 * 2. Sets company onboarding_company_completed to true
 * 3. Generates a risk score (5-95) if not already set
 * 4. Calculates risk clusters with appropriate weighting
 * 5. Sets accreditation status to APPROVED
 * 6. Unlocks Dashboard and Insights tabs
 * 
 * Usage: node fix-open-banking-task.js <taskId> <companyId> [--check-only]
 * 
 * Example:
 *   Check only: node fix-open-banking-task.js 784 278 --check-only
 *   Fix: node fix-open-banking-task.js 784 278
 */

import { Pool } from 'pg';

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Calculate risk clusters based on the total risk score
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

async function fixOpenBankingTask(taskId, companyId, checkOnly = false) {
  const client = await pool.connect();
  
  try {
    // Begin transaction if we're actually fixing
    if (!checkOnly) {
      await client.query('BEGIN');
    }
    
    console.log(`${checkOnly ? 'Checking' : 'Fixing'} Open Banking task ${taskId} for company ${companyId}`);
    
    // STEP 1: Check task status
    const taskResult = await client.query(
      'SELECT id, task_type, status, progress, metadata FROM tasks WHERE id = $1',
      [taskId]
    );
    
    if (taskResult.rows.length === 0) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    const task = taskResult.rows[0];
    
    if (task.task_type !== 'open_banking') {
      throw new Error(`Task ${taskId} is not an Open Banking task (type: ${task.task_type})`);
    }
    
    console.log('\n--- Task State Before ---');
    console.log(`ID: ${task.id}`);
    console.log(`Type: ${task.task_type}`);
    console.log(`Status: ${task.status}`);
    console.log(`Progress: ${task.progress}%`);
    
    // STEP 2: Check company state
    const companyResult = await client.query(
      'SELECT id, name, onboarding_company_completed, accreditation_status, risk_score, risk_clusters, available_tabs FROM companies WHERE id = $1',
      [companyId]
    );
    
    if (companyResult.rows.length === 0) {
      throw new Error(`Company ${companyId} not found`);
    }
    
    const company = companyResult.rows[0];
    
    console.log('\n--- Company State Before ---');
    console.log(`ID: ${company.id}`);
    console.log(`Name: ${company.name}`);
    console.log(`Onboarding completed: ${company.onboarding_company_completed ? 'YES' : 'NO'}`);
    console.log(`Accreditation status: ${company.accreditation_status || 'NOT SET'}`);
    console.log(`Risk score: ${company.risk_score || 'NOT SET'}`);
    console.log(`Available tabs: ${company.available_tabs ? company.available_tabs.join(', ') : 'NONE'}`);
    
    // STEP 3: Fix task status if needed
    const taskNeedsUpdate = task.status !== 'submitted' || task.progress !== 100;
    
    if (taskNeedsUpdate) {
      console.log('\n--- Task Status Fix ---');
      console.log(`Task status needs update: status=${task.status}, progress=${task.progress}`);
      
      if (!checkOnly) {
        // Update metadata with submission info
        const metadata = task.metadata || {};
        const updatedMetadata = {
          ...metadata,
          submission: {
            ...(metadata.submission || {}),
            timestamp: new Date().toISOString(),
            status: 'completed'
          }
        };
        
        await client.query(
          'UPDATE tasks SET status = $1, progress = $2, metadata = $3, updated_at = NOW() WHERE id = $4',
          ['submitted', 100, updatedMetadata, taskId]
        );
        
        console.log('✅ Task status updated to submitted with 100% progress');
      } else {
        console.log('❌ Would update task status to submitted with 100% progress');
      }
    } else {
      console.log('\n--- Task Status Check ---');
      console.log('✅ Task status is already correct (submitted with 100% progress)');
    }
    
    // STEP 4: Fix company onboarding flag if needed
    const onboardingNeedsUpdate = !company.onboarding_company_completed;
    
    if (onboardingNeedsUpdate) {
      console.log('\n--- Onboarding Flag Fix ---');
      console.log('Company onboarding_company_completed flag is not set');
      
      if (!checkOnly) {
        await client.query(
          'UPDATE companies SET onboarding_company_completed = TRUE, updated_at = NOW() WHERE id = $1',
          [companyId]
        );
        
        console.log('✅ Company onboarding_company_completed flag set to true');
      } else {
        console.log('❌ Would set company onboarding_company_completed flag to true');
      }
    } else {
      console.log('\n--- Onboarding Flag Check ---');
      console.log('✅ Company onboarding_company_completed flag is already set');
    }
    
    // STEP 5: Fix risk score and clusters if needed
    const riskScoreNeedsUpdate = 
      company.risk_score === null || 
      company.risk_clusters === null || 
      company.risk_clusters === undefined;
    
    let riskScore = company.risk_score;
    let riskClusters = company.risk_clusters;
    
    if (riskScoreNeedsUpdate) {
      console.log('\n--- Risk Score Fix ---');
      console.log('Risk score or clusters not set');
      
      // Generate risk score if not already set
      if (riskScore === null || riskScore === undefined) {
        riskScore = Math.floor(Math.random() * (95 - 5 + 1)) + 5;
        console.log(`Generated new risk score: ${riskScore}`);
      } else {
        console.log(`Using existing risk score: ${riskScore}`);
      }
      
      // Calculate risk clusters
      riskClusters = calculateRiskClusters(riskScore);
      console.log(`Calculated risk clusters:`, riskClusters);
      
      if (!checkOnly) {
        await client.query(
          'UPDATE companies SET risk_score = $1, risk_clusters = $2, updated_at = NOW() WHERE id = $3',
          [riskScore, riskClusters, companyId]
        );
        
        console.log('✅ Company risk score and clusters updated');
      } else {
        console.log('❌ Would update company risk score and clusters');
      }
    } else {
      console.log('\n--- Risk Score Check ---');
      console.log('✅ Risk score and clusters are already set');
    }
    
    // STEP 6: Fix accreditation status if needed
    const accreditationNeedsUpdate = company.accreditation_status !== 'APPROVED';
    
    if (accreditationNeedsUpdate) {
      console.log('\n--- Accreditation Status Fix ---');
      console.log(`Current accreditation status: ${company.accreditation_status || 'NOT SET'}`);
      
      if (!checkOnly) {
        await client.query(
          'UPDATE companies SET accreditation_status = $1, updated_at = NOW() WHERE id = $2',
          ['APPROVED', companyId]
        );
        
        console.log('✅ Company accreditation status set to APPROVED');
      } else {
        console.log('❌ Would set company accreditation status to APPROVED');
      }
    } else {
      console.log('\n--- Accreditation Status Check ---');
      console.log('✅ Company accreditation status is already APPROVED');
    }
    
    // STEP 7: Fix available tabs if needed
    const tabsToUnlock = ['dashboard', 'insights'];
    const currentTabs = company.available_tabs || ['task-center'];
    
    const dashboardMissing = !currentTabs.includes('dashboard');
    const insightsMissing = !currentTabs.includes('insights');
    const tabsNeedUpdate = dashboardMissing || insightsMissing;
    
    if (tabsNeedUpdate) {
      console.log('\n--- Available Tabs Fix ---');
      console.log(`Current tabs: ${currentTabs.join(', ')}`);
      console.log(`Missing tabs: ${[
        ...(dashboardMissing ? ['dashboard'] : []), 
        ...(insightsMissing ? ['insights'] : [])
      ].join(', ')}`);
      
      if (!checkOnly) {
        // Add the missing tabs
        const updatedTabs = [...new Set([...currentTabs, ...tabsToUnlock])];
        
        await client.query(
          'UPDATE companies SET available_tabs = $1, updated_at = NOW() WHERE id = $2',
          [updatedTabs, companyId]
        );
        
        console.log(`✅ Company tabs updated to: ${updatedTabs.join(', ')}`);
      } else {
        console.log('❌ Would update company tabs to include dashboard and insights');
      }
    } else {
      console.log('\n--- Available Tabs Check ---');
      console.log('✅ Dashboard and Insights tabs are already unlocked');
    }
    
    // Commit transaction if we're fixing
    if (!checkOnly) {
      await client.query('COMMIT');
      console.log('\n✅ All fixes have been applied successfully');
      
      // Get final state
      const finalCompanyResult = await pool.query(
        'SELECT onboarding_company_completed, accreditation_status, risk_score, available_tabs FROM companies WHERE id = $1',
        [companyId]
      );
      
      const finalTaskResult = await pool.query(
        'SELECT status, progress FROM tasks WHERE id = $1',
        [taskId]
      );
      
      console.log('\n--- Final State ---');
      console.log(`Task: status=${finalTaskResult.rows[0].status}, progress=${finalTaskResult.rows[0].progress}%`);
      console.log(`Company: onboarding=${finalCompanyResult.rows[0].onboarding_company_completed}, accreditation=${finalCompanyResult.rows[0].accreditation_status}`);
      console.log(`Risk score: ${finalCompanyResult.rows[0].risk_score}`);
      console.log(`Available tabs: ${finalCompanyResult.rows[0].available_tabs.join(', ')}`);
    } else {
      console.log('\n🔍 Check completed without making any changes');
      
      // List what needs fixing
      const needsFixing = [
        ...(taskNeedsUpdate ? ['Task status needs updating to submitted + 100%'] : []),
        ...(onboardingNeedsUpdate ? ['Company onboarding_company_completed flag needs to be set'] : []),
        ...(riskScoreNeedsUpdate ? ['Risk score and clusters need to be set'] : []),
        ...(accreditationNeedsUpdate ? ['Accreditation status needs to be set to APPROVED'] : []),
        ...(tabsNeedUpdate ? ['Dashboard and/or Insights tabs need to be unlocked'] : [])
      ];
      
      if (needsFixing.length > 0) {
        console.log('\n--- Items That Need Fixing ---');
        needsFixing.forEach((item, i) => console.log(`${i + 1}. ${item}`));
        console.log('\nTo apply these fixes, run the command without --check-only:');
        console.log(`node fix-open-banking-task.js ${taskId} ${companyId}`);
      } else {
        console.log('\n✅ All post-submission steps are already properly completed. No fixes needed.');
      }
    }
    
  } catch (error) {
    // Rollback transaction if we're fixing
    if (!checkOnly) {
      await client.query('ROLLBACK');
      console.log('❌ Transaction rolled back due to error');
    }
    
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Get command-line arguments
const taskId = process.argv[2] ? parseInt(process.argv[2]) : 784;
const companyId = process.argv[3] ? parseInt(process.argv[3]) : 278;
const checkOnly = process.argv.includes('--check-only');

// Run the fix
fixOpenBankingTask(taskId, companyId, checkOnly);