/**
 * User Tab Tutorials API Routes
 * 
 * This module provides routes for managing the tab-specific tutorial system
 * that shows onboarding modals the first time a user visits each main tab.
 */
import { Router } from 'express';
import { db } from '@db';
import { eq, and } from 'drizzle-orm';
import { users, userTabTutorials, insertUserTabTutorialSchema } from '@db/schema';
import { logger } from '../utils/logger';

const router = Router();

// Middleware to check if the user is authenticated
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
      details: {
        authenticated: false,
        hasUser: !!req.session?.user,
        hasSession: !!req.session,
        timestamp: new Date().toISOString()
      }
    });
  }
  next();
};

/**
 * GET /api/user-tab-tutorials
 * 
 * Retrieves all completed tab tutorials for the current user
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
    
    // Query all completed tab tutorials for this user
    const completedTutorials = await db.query.userTabTutorials.findMany({
      where: eq(userTabTutorials.user_id, userId)
    });
    
    // Return as a simple array of tab keys for frontend convenience
    const completedTabKeys = completedTutorials.map(tutorial => tutorial.tab_key);
    
    logger.info(`[TabTutorials] Retrieved ${completedTabKeys.length} completed tutorials for user ${userId}`);
    
    return res.json({
      completedTutorials: completedTabKeys
    });
  } catch (error) {
    logger.error(`[TabTutorials] Error retrieving completed tutorials: ${error}`);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Failed to retrieve completed tutorials'
    });
  }
});

/**
 * POST /api/user-tab-tutorials
 * 
 * Marks a specific tab tutorial as completed for the current user
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
    
    const { tabKey } = req.body;
    
    if (!tabKey) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Tab key is required'
      });
    }
    
    // Check if this tutorial is already marked as completed
    const existingTutorial = await db.query.userTabTutorials.findFirst({
      where: and(
        eq(userTabTutorials.user_id, userId),
        eq(userTabTutorials.tab_key, tabKey)
      )
    });
    
    if (existingTutorial) {
      // Tutorial already completed, just return success
      logger.info(`[TabTutorials] Tutorial ${tabKey} already completed for user ${userId}`);
      return res.json({
        completed: true,
        message: 'Tutorial already marked as completed'
      });
    }
    
    // Insert new completed tutorial record
    const newTutorial = {
      user_id: userId,
      tab_key: tabKey,
      completed_at: new Date()
    };
    
    await db.insert(userTabTutorials).values(newTutorial);
    
    logger.info(`[TabTutorials] Marked tutorial ${tabKey} as completed for user ${userId}`);
    
    return res.json({
      completed: true,
      message: 'Tutorial marked as completed'
    });
  } catch (error) {
    logger.error(`[TabTutorials] Error marking tutorial as completed: ${error}`);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Failed to mark tutorial as completed'
    });
  }
});

/**
 * GET /api/user-tab-tutorials/:tabKey/check
 * 
 * Checks if a specific tab tutorial has been completed by the current user
 */
router.get('/:tabKey/check', requireAuth, async (req: any, res) => {
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
    
    const { tabKey } = req.params;
    
    // Check if this tutorial is marked as completed
    const existingTutorial = await db.query.userTabTutorials.findFirst({
      where: and(
        eq(userTabTutorials.user_id, userId),
        eq(userTabTutorials.tab_key, tabKey)
      )
    });
    
    logger.info(`[TabTutorials] Checked completion status of tutorial ${tabKey} for user ${userId}: ${!!existingTutorial}`);
    
    return res.json({
      completed: !!existingTutorial
    });
  } catch (error) {
    logger.error(`[TabTutorials] Error checking tutorial completion: ${error}`);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Failed to check tutorial completion status'
    });
  }
});

export default router;