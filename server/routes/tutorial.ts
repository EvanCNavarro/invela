/**
 * Tutorial API Routes
 * 
 * This module provides API endpoints for managing tab-specific tutorials.
 * It supports creating, updating, and retrieving tutorial progress for users.
 */

import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '@db';
import { userTabTutorials } from '@db/schema';
import { requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';
import { broadcastTutorialUpdate } from '../utils/unified-websocket';

// Create router instance
const router = Router();

// Get tutorial status for current user and tab
router.get('/user/tab/:tabName/status', requireAuth, async (req, res) => {
  const { tabName } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const normalizedTabName = tabName.toLowerCase().trim();
    
    // Get tutorial status for the specified tab and user
    const tutorialEntry = await db.query.userTabTutorials.findFirst({
      where: and(
        eq(userTabTutorials.user_id, userId),
        eq(userTabTutorials.tab_name, normalizedTabName)
      )
    });

    if (!tutorialEntry) {
      // If no entry exists, return a default status
      return res.status(200).json({
        tabName: normalizedTabName,
        userId,
        currentStep: 0,
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: null
      });
    }

    // Return the tutorial status
    return res.status(200).json(tutorialEntry);
  } catch (error) {
    logger.error('Failed to get tutorial status', {
      error: error instanceof Error ? error.message : String(error),
      tabName,
      userId
    });
    return res.status(500).json({ error: 'Failed to get tutorial status' });
  }
});

// Update tutorial progress
router.post('/user/tab/:tabName/update', requireAuth, async (req, res) => {
  const { tabName } = req.params;
  const { currentStep, completed } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const normalizedTabName = tabName.toLowerCase().trim();
    
    // Find existing tutorial entry
    const existingEntry = await db.query.userTabTutorials.findFirst({
      where: and(
        eq(userTabTutorials.user_id, userId),
        eq(userTabTutorials.tab_name, normalizedTabName)
      )
    });

    const now = new Date();

    if (!existingEntry) {
      // Create a new tutorial entry if none exists
      const newEntry = await db.insert(userTabTutorials).values({
        user_id: userId,
        tab_name: normalizedTabName,
        current_step: currentStep || 0,
        completed: completed || false,
        created_at: now,
        updated_at: now
      }).returning();

      // Broadcast tutorial update via WebSocket
      broadcastTutorialUpdate({
        tabName: normalizedTabName,
        userId,
        currentStep: currentStep || 0,
        completed: completed || false
      });

      return res.status(201).json(newEntry[0]);
    }

    // Update existing tutorial entry
    const updatedEntry = await db.update(userTabTutorials)
      .set({
        current_step: currentStep !== undefined ? currentStep : existingEntry.current_step,
        completed: completed !== undefined ? completed : existingEntry.completed,
        updated_at: now
      })
      .where(
        and(
          eq(userTabTutorials.user_id, userId),
          eq(userTabTutorials.tab_name, normalizedTabName)
        )
      )
      .returning();

    // Broadcast tutorial update via WebSocket
    broadcastTutorialUpdate({
      tabName: normalizedTabName,
      userId,
      currentStep: currentStep !== undefined ? currentStep : existingEntry.current_step,
      completed: completed !== undefined ? completed : existingEntry.completed
    });

    return res.status(200).json(updatedEntry[0]);
  } catch (error) {
    logger.error('Failed to update tutorial progress', {
      error: error instanceof Error ? error.message : String(error),
      tabName,
      userId,
      currentStep,
      completed
    });
    return res.status(500).json({ error: 'Failed to update tutorial status', details: error instanceof Error ? error.message : String(error) });
  }
});

// Create a new tutorial entry
router.post('/user/tab/:tabName/create', requireAuth, async (req, res) => {
  const { tabName } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const normalizedTabName = tabName.toLowerCase().trim();
    
    // Check if a tutorial entry already exists
    const existingEntry = await db.query.userTabTutorials.findFirst({
      where: and(
        eq(userTabTutorials.user_id, userId),
        eq(userTabTutorials.tab_name, normalizedTabName)
      )
    });

    if (existingEntry) {
      // Tutorial entry already exists
      return res.status(200).json({
        message: 'Tutorial entry already exists',
        entry: existingEntry
      });
    }

    // Create a new tutorial entry
    const now = new Date();
    const newEntry = await db.insert(userTabTutorials).values({
      user_id: userId,
      tab_name: normalizedTabName,
      current_step: 0,
      completed: false,
      created_at: now,
      updated_at: now
    }).returning();

    // Broadcast tutorial creation via WebSocket
    broadcastTutorialUpdate({
      tabName: normalizedTabName,
      userId,
      currentStep: 0,
      completed: false
    });

    return res.status(201).json({
      message: 'Tutorial entry created successfully',
      entry: newEntry[0]
    });
  } catch (error) {
    logger.error('Failed to create tutorial entry', {
      error: error instanceof Error ? error.message : String(error),
      tabName,
      userId
    });
    return res.status(500).json({ error: 'Failed to create tutorial entry', details: error instanceof Error ? error.message : String(error) });
  }
});

// Mark tutorial as completed
router.post('/user/tab/:tabName/complete', requireAuth, async (req, res) => {
  const { tabName } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const normalizedTabName = tabName.toLowerCase().trim();
    
    // Find existing tutorial entry
    const existingEntry = await db.query.userTabTutorials.findFirst({
      where: and(
        eq(userTabTutorials.user_id, userId),
        eq(userTabTutorials.tab_name, normalizedTabName)
      )
    });

    const now = new Date();

    if (!existingEntry) {
      // Create a new completed tutorial entry if none exists
      const newEntry = await db.insert(userTabTutorials).values({
        user_id: userId,
        tab_name: normalizedTabName,
        current_step: 99, // Use a high number to indicate completion
        completed: true,
        completed_at: now,
        created_at: now,
        updated_at: now
      }).returning();

      // Broadcast tutorial completion via WebSocket
      broadcastTutorialUpdate({
        tabName: normalizedTabName,
        userId,
        currentStep: 99,
        completed: true
      });

      return res.status(201).json(newEntry[0]);
    }

    // Update existing tutorial entry to completed
    const updatedEntry = await db.update(userTabTutorials)
      .set({
        completed: true,
        completed_at: now,
        updated_at: now
      })
      .where(
        and(
          eq(userTabTutorials.user_id, userId),
          eq(userTabTutorials.tab_name, normalizedTabName)
        )
      )
      .returning();

    // Broadcast tutorial completion via WebSocket
    broadcastTutorialUpdate({
      tabName: normalizedTabName,
      userId,
      currentStep: existingEntry.current_step,
      completed: true
    });

    return res.status(200).json(updatedEntry[0]);
  } catch (error) {
    logger.error('Failed to complete tutorial', {
      error: error instanceof Error ? error.message : String(error),
      tabName,
      userId
    });
    return res.status(500).json({ error: 'Failed to complete tutorial', details: error instanceof Error ? error.message : String(error) });
  }
});

export default router;