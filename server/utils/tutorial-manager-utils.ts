/**
 * Tutorial Manager Utility Functions
 * 
 * This module provides utility functions for managing tutorial entries
 * in a centralized way. It can be used by administrators to create, update,
 * and manage tutorial entries for different tabs.
 */
import { db } from '@db';
import { userTabTutorials } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger';

/**
 * Default tab configuration for tutorials
 * This matches the TUTORIAL_CONTENT object in the frontend
 */
export const DEFAULT_TUTORIAL_TABS = [
  'risk-score',
  'claims-risk',
  'network-view',
  'dashboard',
  'file-vault',
  'claims',
  'insights',
  'network',
  'company-profile',
  'playground'
];

/**
 * Tab name normalization mapping
 * This ensures consistent tab naming between frontend and backend
 */
export const TAB_NAME_MAPPINGS: Record<string, string> = {
  'risk-score-configuration': 'risk-score',
  'claims-risk-analysis': 'claims-risk',
  'network-visualization': 'network-view',
  'company-profile-page': 'company-profile',
  'file-vault-page': 'file-vault',
  'FileVault': 'file-vault',
  'dashboard-page': 'dashboard'
};

/**
 * Normalize a tab name using the standard mapping
 * 
 * @param tabName The tab name to normalize
 * @returns The normalized tab name
 */
export function normalizeTabName(tabName: string): string {
  return TAB_NAME_MAPPINGS[tabName] || tabName;
}

/**
 * Create a tutorial entry for a specific user and tab
 * 
 * @param userId The user ID
 * @param tabName The tab name (will be normalized)
 * @param completed Whether the tutorial is completed
 * @param currentStep The current step (default: 0)
 * @returns Promise that resolves when the operation completes
 */
export async function createTutorialEntry(
  userId: number,
  tabName: string,
  completed: boolean = false,
  currentStep: number = 0
): Promise<boolean> {
  try {
    const normalizedTabName = normalizeTabName(tabName);
    
    logger.info(`[TutorialUtils] Creating tutorial entry for user ${userId}, tab ${normalizedTabName}`);
    
    // Check if this tutorial already exists
    const existingTutorial = await db.query.userTabTutorials.findFirst({
      where: and(
        eq(userTabTutorials.user_id, userId),
        eq(userTabTutorials.tab_name, normalizedTabName)
      )
    });
    
    if (existingTutorial) {
      // Update the existing tutorial
      await db.update(userTabTutorials)
        .set({
          completed,
          current_step: currentStep,
          last_seen_at: new Date(),
          updated_at: new Date(),
          completed_at: completed ? new Date() : new Date('2099-12-31')
        })
        .where(and(
          eq(userTabTutorials.user_id, userId),
          eq(userTabTutorials.tab_name, normalizedTabName)
        ));
      
      logger.info(`[TutorialUtils] Updated tutorial entry for user ${userId}, tab ${normalizedTabName}`);
      return true;
    } else {
      // Create a new tutorial entry
      await db.insert(userTabTutorials).values({
        user_id: userId,
        tab_name: normalizedTabName,
        completed,
        current_step: currentStep,
        last_seen_at: new Date(),
        updated_at: new Date(),
        created_at: new Date(),
        completed_at: completed ? new Date() : new Date('2099-12-31')
      });
      
      logger.info(`[TutorialUtils] Created new tutorial entry for user ${userId}, tab ${normalizedTabName}`);
      return true;
    }
  } catch (error) {
    logger.error(`[TutorialUtils] Error creating tutorial entry: ${error}`);
    return false;
  }
}

/**
 * Create tutorial entries for all default tabs for a specific user
 * 
 * @param userId The user ID to create tutorials for
 * @param skipTabNames Array of tab names to skip (e.g., ['task-center'])
 * @returns Promise that resolves to the number of successfully created entries
 */
export async function createAllTutorials(
  userId: number,
  skipTabNames: string[] = []
): Promise<number> {
  let successCount = 0;
  
  // Create entries for each default tab
  for (const tabName of DEFAULT_TUTORIAL_TABS) {
    // Skip specified tabs
    if (skipTabNames.includes(tabName)) {
      logger.info(`[TutorialUtils] Skipping tutorial creation for tab ${tabName}`);
      continue;
    }
    
    const success = await createTutorialEntry(userId, tabName);
    if (success) successCount++;
  }
  
  // Also create entries for tab variations to ensure consistent behavior
  for (const [variation, normalizedName] of Object.entries(TAB_NAME_MAPPINGS)) {
    // Skip if the normalized name is in the skip list
    if (skipTabNames.includes(normalizedName)) {
      logger.info(`[TutorialUtils] Skipping tutorial creation for tab variation ${variation}`);
      continue;
    }
    
    const success = await createTutorialEntry(userId, variation);
    if (success) successCount++;
  }
  
  logger.info(`[TutorialUtils] Created ${successCount} tutorial entries for user ${userId}`);
  return successCount;
}

/**
 * Reset all tutorials for a user, setting them back to not completed
 * 
 * @param userId The user ID
 * @returns Promise that resolves when the operation completes
 */
export async function resetAllTutorials(userId: number): Promise<boolean> {
  try {
    await db.update(userTabTutorials)
      .set({
        completed: false,
        current_step: 0,
        last_seen_at: new Date(),
        updated_at: new Date(),
        completed_at: new Date('2099-12-31')
      })
      .where(eq(userTabTutorials.user_id, userId));
    
    logger.info(`[TutorialUtils] Reset all tutorials for user ${userId}`);
    return true;
  } catch (error) {
    logger.error(`[TutorialUtils] Error resetting tutorials: ${error}`);
    return false;
  }
}

/**
 * Get all tutorial entries for a user
 * 
 * @param userId The user ID
 * @returns Promise that resolves to an array of tutorial entries
 */
export async function getUserTutorials(userId: number) {
  try {
    const tutorials = await db.query.userTabTutorials.findMany({
      where: eq(userTabTutorials.user_id, userId)
    });
    
    return tutorials.map(tutorial => ({
      tabName: tutorial.tab_name,
      completed: tutorial.completed,
      currentStep: tutorial.current_step,
      lastSeenAt: tutorial.last_seen_at,
      completedAt: tutorial.completed_at
    }));
  } catch (error) {
    logger.error(`[TutorialUtils] Error fetching tutorials: ${error}`);
    return [];
  }
}