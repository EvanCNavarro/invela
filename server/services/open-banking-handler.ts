/**
 * Open Banking Handler
 * 
 * This module handles post-submission actions for Open Banking tasks,
 * ensuring that all required steps are completed after submission.
 */

import { db } from '@db';
import { companies, tasks } from '@db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { broadcast } from '../utils/unified-websocket';

/**
 * Handle post-submission actions for Open Banking tasks
 * 
 * This function:
 * 1. Calculates and assigns a random risk score
 * 2. Generates risk clusters based on the risk score
 * 3. Updates company onboarding and accreditation status
 * 4. Unlocks Dashboard and Insights tabs
 * 5. Broadcasts updates to connected clients
 * 
 * @param taskId ID of the Open Banking task
 * @param companyId ID of the company
 * @returns Success status and any warnings
 */
export async function handleOpenBankingPostSubmission(
  taskId: number,
  companyId: number
): Promise<{ success: boolean; warnings?: string[] }> {
  const warnings: string[] = [];
  
  try {
    logger.info(`[OpenBankingHandler] Processing post-submission for task ${taskId}`, {
      taskId,
      companyId
    });
    
    // Step 1: Calculate a random risk score (5-95)
    const riskScore = Math.floor(Math.random() * 91) + 5;
    
    // Step 2: Calculate risk clusters based on the total risk score
    const riskClusters = calculateRiskClusters(riskScore);
    
    // Step 3: Get the current company data
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId)
    });
    
    if (!company) {
      throw new Error(`Company ${companyId} not found`);
    }
    
    // Step 4: Determine which tabs to unlock
    const currentTabs = company.available_tabs || ['task-center'];
    const tabsToAdd = [];
    
    if (!currentTabs.includes('dashboard')) {
      tabsToAdd.push('dashboard');
    }
    
    if (!currentTabs.includes('insights')) {
      tabsToAdd.push('insights');
    }
    
    const updatedTabs = [...currentTabs, ...tabsToAdd];
    
    // Step 5: Update the company record
    const [updatedCompany] = await db.update(companies)
      .set({
        risk_score: riskScore,
        risk_clusters: riskClusters,
        onboarding_company_completed: true,
        accreditation_status: 'APPROVED',
        available_tabs: updatedTabs,
        updated_at: new Date()
      })
      .where(eq(companies.id, companyId))
      .returning();
    
    if (!updatedCompany) {
      throw new Error(`Failed to update company ${companyId}`);
    }
    
    logger.info(`[OpenBankingHandler] Successfully updated company ${companyId}`, {
      riskScore,
      accreditationStatus: updatedCompany.accreditation_status,
      onboardingCompleted: updatedCompany.onboarding_company_completed,
      updatedTabs: updatedCompany.available_tabs
    });
    
    // Step 6: Update the task metadata with post-submission info
    await db.update(tasks)
      .set({
        metadata: {
          ...(await getTaskMetadata(taskId)),
          postSubmissionProcessed: true,
          riskScore,
          riskClusters,
          processedAt: new Date().toISOString()
        },
        updated_at: new Date()
      })
      .where(eq(tasks.id, taskId));
    
    // Step 7: Broadcast updates via WebSocket
    if (tabsToAdd.length > 0) {
      try {
        // Broadcast company tabs update
        broadcast('company_tabs_updated', {
          companyId,
          availableTabs: updatedTabs,
          timestamp: new Date().toISOString()
        });
        
        logger.info(`[OpenBankingHandler] Broadcast company tabs update`, {
          companyId,
          tabsAdded: tabsToAdd
        });
      } catch (broadcastError) {
        const errorMessage = broadcastError instanceof Error 
          ? broadcastError.message 
          : String(broadcastError);
          
        warnings.push(`Warning: Failed to broadcast tabs update: ${errorMessage}`);
        logger.warn(`[OpenBankingHandler] Failed to broadcast tabs update`, {
          error: errorMessage,
          companyId
        });
      }
    }
    
    return { 
      success: true,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error(`[OpenBankingHandler] Error processing post-submission`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      taskId,
      companyId
    });
    
    return {
      success: false,
      warnings: [...warnings, `Failed to process post-submission: ${errorMessage}`]
    };
  }
}

/**
 * Calculate risk clusters based on the total risk score
 * 
 * This function distributes the risk score across different risk categories
 * with higher weight on PII Data and Account Data categories.
 * 
 * @param riskScore The total risk score (0-100)
 * @returns An object containing risk scores distributed across categories
 */
function calculateRiskClusters(riskScore: number): Record<string, number> {
  // Define weights for each category (sum = 1.0)
  const weights = {
    piiData: 0.25,         // PII Data weight - highest
    accountData: 0.25,      // Account Data weight - highest
    dataTransfers: 0.15,    // Data Transfers
    certificationsRisk: 0.12, // Certifications
    securityRisk: 0.13,     // Security Risk
    financialRisk: 0.10     // Financial Risk - lowest
  };
  
  // Add a small random variance to each cluster (±10% of category score)
  const getVariance = (baseScore: number) => {
    const variance = baseScore * 0.1; // 10% of base score
    return Math.random() * variance * 2 - variance; // Random value between -variance and +variance
  };
  
  // Calculate each category score with variance
  return {
    piiData: Math.min(100, Math.max(0, Math.round(riskScore * weights.piiData + getVariance(riskScore * weights.piiData)))),
    accountData: Math.min(100, Math.max(0, Math.round(riskScore * weights.accountData + getVariance(riskScore * weights.accountData)))),
    dataTransfers: Math.min(100, Math.max(0, Math.round(riskScore * weights.dataTransfers + getVariance(riskScore * weights.dataTransfers)))),
    certificationsRisk: Math.min(100, Math.max(0, Math.round(riskScore * weights.certificationsRisk + getVariance(riskScore * weights.certificationsRisk)))),
    securityRisk: Math.min(100, Math.max(0, Math.round(riskScore * weights.securityRisk + getVariance(riskScore * weights.securityRisk)))),
    financialRisk: Math.min(100, Math.max(0, Math.round(riskScore * weights.financialRisk + getVariance(riskScore * weights.financialRisk))))
  };
}

/**
 * Helper function to get task metadata
 */
async function getTaskMetadata(taskId: number): Promise<Record<string, any>> {
  try {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    return task?.metadata || {};
  } catch (error) {
    logger.error(`[OpenBankingHandler] Error getting task metadata`, {
      error: error instanceof Error ? error.message : String(error),
      taskId
    });
    
    return {};
  }
}