/**
 * User Tab Tutorials API Routes
 * 
 * This module provides routes for managing the tab-specific tutorial system
 * that shows onboarding modals the first time a user visits each main tab.
 */
import { Router } from 'express';
import { db } from '@db';
import { eq, and } from 'drizzle-orm';
import { 
  users, 
  userTabTutorials, 
  insertUserTabTutorialSchema,
  updateUserTabTutorialSchema 
} from '@db/schema';
import { logger } from '../utils/logger';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * GET /api/user-tab-tutorials
 * 
 * Retrieves all tab tutorials status for the current user
 */
router.get('/', requireAuth, async (req: any, res) => {
  try {
    // Get user ID from the authenticated request
    // The auth middleware sets req.user
    const userId = req.user?.id;
    
    if (!userId) {
      logger.warn('[TabTutorials] Missing user ID in authenticated request');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found in authenticated session'
      });
    }
    
    // Query all tab tutorials for this user
    const tutorialsData = await db.query.userTabTutorials.findMany({
      where: eq(userTabTutorials.user_id, userId)
    });
    
    // Format the response with detailed information for each tutorial
    const tutorials = tutorialsData.map(tutorial => ({
      tabName: tutorial.tab_name,
      userId: tutorial.user_id,
      completed: tutorial.completed,
      lastSeenAt: tutorial.last_seen_at,
      currentStep: tutorial.current_step
    }));
    
    logger.info(`[TabTutorials] Retrieved ${tutorials.length} tutorials for user ${userId}`);
    
    return res.json({
      tutorials
    });
  } catch (error) {
    logger.error(`[TabTutorials] Error retrieving tutorials: ${error}`);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Failed to retrieve tutorials'
    });
  }
});

/**
 * POST /api/user-tab-tutorials
 * 
 * Updates a specific tab tutorial's status for the current user
 */
router.post('/', requireAuth, async (req: any, res) => {
  try {
    // Get user ID from the authenticated request
    // The auth middleware sets req.user
    const userId = req.user?.id;
    
    if (!userId) {
      logger.warn('[TabTutorials] Missing user ID in authenticated request');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found in authenticated session'
      });
    }
    
    const { tabName, completed, currentStep } = req.body;
    
    if (!tabName) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Tab name is required'
      });
    }
    
    // Check if this tutorial already exists for the user
    const existingTutorial = await db.query.userTabTutorials.findFirst({
      where: and(
        eq(userTabTutorials.user_id, userId),
        eq(userTabTutorials.tab_name, tabName)
      )
    });
    
    if (existingTutorial) {
      // Update the existing tutorial
      const updateData: any = {
        updated_at: new Date(),
        last_seen_at: new Date(),
      };
      
      if (currentStep !== undefined) {
        updateData.current_step = currentStep;
      }
      
      if (completed !== undefined) {
        updateData.completed = completed;
        
        // If marking as completed, set completed_at timestamp
        if (completed && !existingTutorial.completed) {
          updateData.completed_at = new Date();
        }
      }
      
      await db.update(userTabTutorials)
        .set(updateData)
        .where(and(
          eq(userTabTutorials.user_id, userId),
          eq(userTabTutorials.tab_name, tabName)
        ));
      
      logger.info(`[TabTutorials] Updated tutorial ${tabName} for user ${userId} (completed: ${completed}, currentStep: ${currentStep})`);
      
      return res.json({
        success: true,
        message: 'Tutorial status updated successfully',
        tutorialStatus: {
          tabName,
          userId,
          completed: completed !== undefined ? completed : existingTutorial.completed,
          currentStep: currentStep !== undefined ? currentStep : existingTutorial.current_step,
          lastSeenAt: new Date()
        }
      });
    } else {
      // Insert new tutorial record
      const newTutorial = {
        user_id: userId,
        tab_name: tabName,
        completed: completed === true,
        current_step: currentStep || 0,
        last_seen_at: new Date(),
        completed_at: completed === true ? new Date() : null
      };
      
      await db.insert(userTabTutorials).values(newTutorial);
      
      logger.info(`[TabTutorials] Created new tutorial entry for ${tabName} for user ${userId}`);
      
      return res.json({
        success: true,
        message: 'Tutorial created successfully',
        tutorialStatus: {
          tabName,
          userId,
          completed: completed === true,
          currentStep: currentStep || 0,
          lastSeenAt: new Date()
        }
      });
    }
  } catch (error) {
    logger.error(`[TabTutorials] Error updating tutorial: ${error}`);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Failed to update tutorial status'
    });
  }
});

/**
 * GET /api/user-tab-tutorials/:tabName/status
 * 
 * Gets the status of a specific tab tutorial for the current user
 */
router.get('/:tabName/status', requireAuth, async (req: any, res) => {
  try {
    // Get user ID from the authenticated request
    // The auth middleware sets req.user
    const userId = req.user?.id;
    
    if (!userId) {
      logger.warn('[TabTutorials] Missing user ID in authenticated request');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found in authenticated session'
      });
    }
    
    const { tabName } = req.params;
    
    // Get the tutorial status for this tab
    const tutorial = await db.query.userTabTutorials.findFirst({
      where: and(
        eq(userTabTutorials.user_id, userId),
        eq(userTabTutorials.tab_name, tabName)
      )
    });
    
    if (!tutorial) {
      logger.info(`[TabTutorials] No tutorial status found for ${tabName} for user ${userId}`);
      return res.json({
        exists: false,
        completed: false,
        currentStep: 0,
        tabName
      });
    }
    
    // Update the last seen timestamp
    await db.update(userTabTutorials)
      .set({ last_seen_at: new Date(), updated_at: new Date() })
      .where(and(
        eq(userTabTutorials.user_id, userId),
        eq(userTabTutorials.tab_name, tabName)
      ));
    
    logger.info(`[TabTutorials] Retrieved tutorial status for ${tabName} for user ${userId}: completed=${tutorial.completed}, step=${tutorial.current_step}`);
    
    return res.json({
      exists: true,
      completed: tutorial.completed,
      currentStep: tutorial.current_step,
      lastSeenAt: tutorial.last_seen_at,
      completedAt: tutorial.completed_at,
      tabName
    });
  } catch (error) {
    logger.error(`[TabTutorials] Error retrieving tutorial status: ${error}`);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Failed to retrieve tutorial status'
    });
  }
});

export default router;