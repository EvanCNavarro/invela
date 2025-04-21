/**
 * Open Banking Timestamp API Routes
 * 
 * Handles field-level timestamps for consistent conflict resolution
 * across all form types, following the pattern established by KYB
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { 
  getTaskTimestamps, 
  saveTaskTimestamps, 
  deleteTaskTimestamps,
  getFieldTimestamp
} from './open-banking-timestamp-handler';

/**
 * Register Open Banking timestamp routes
 * @param router Express router to add routes to
 */
export function registerOpenBankingTimestampRoutes(router: Router): void {
  // Get all timestamps for a task
  router.get('/api/open-banking/timestamps/:taskId', requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      
      if (isNaN(taskId)) {
        return res.status(400).json({ error: 'Invalid task ID' });
      }
      
      const timestamps = await getTaskTimestamps(taskId);
      res.json(timestamps);
    } catch (error) {
      console.error('[OpenBanking Timestamp API] Error fetching timestamps:', error);
      res.status(500).json({ 
        error: 'Failed to fetch timestamps',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Get a single field timestamp
  router.get('/api/open-banking/timestamps/:taskId/:fieldKey', requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const fieldKey = req.params.fieldKey;
      
      if (isNaN(taskId)) {
        return res.status(400).json({ error: 'Invalid task ID' });
      }
      
      if (!fieldKey) {
        return res.status(400).json({ error: 'Field key required' });
      }
      
      const timestamp = await getFieldTimestamp(taskId, fieldKey);
      
      if (timestamp) {
        res.json({ timestamp });
      } else {
        res.status(404).json({ error: 'Timestamp not found' });
      }
    } catch (error) {
      console.error('[OpenBanking Timestamp API] Error fetching field timestamp:', error);
      res.status(500).json({ 
        error: 'Failed to fetch field timestamp',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Save timestamps for multiple fields
  router.post('/api/open-banking/timestamps/:taskId', requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const { fieldKeys } = req.body;
      
      if (isNaN(taskId)) {
        return res.status(400).json({ error: 'Invalid task ID' });
      }
      
      if (!Array.isArray(fieldKeys) || fieldKeys.length === 0) {
        return res.status(400).json({ error: 'Field keys array required' });
      }
      
      await saveTaskTimestamps(taskId, fieldKeys);
      res.json({ success: true, message: `Saved ${fieldKeys.length} timestamps` });
    } catch (error) {
      console.error('[OpenBanking Timestamp API] Error saving timestamps:', error);
      res.status(500).json({ 
        error: 'Failed to save timestamps',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Delete all timestamps for a task
  router.delete('/api/open-banking/timestamps/:taskId', requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      
      if (isNaN(taskId)) {
        return res.status(400).json({ error: 'Invalid task ID' });
      }
      
      await deleteTaskTimestamps(taskId);
      res.json({ success: true, message: 'Deleted all timestamps for task' });
    } catch (error) {
      console.error('[OpenBanking Timestamp API] Error deleting timestamps:', error);
      res.status(500).json({ 
        error: 'Failed to delete timestamps',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}