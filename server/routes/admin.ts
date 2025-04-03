import express from 'express';
import { updateTaskTitles } from '../../db/migrations/update_task_titles';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Admin-only route to update task titles
router.post('/update-task-titles', requireAuth, async (req, res) => {
  try {
    // Check if user is an admin (company ID 1 is Invela admin)
    if (!req.user || req.user.company_id !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Admin access required'
      });
    }
    
    console.log(`[Admin API] User ${req.user.id} triggered task title update`);
    
    // Run the task title update
    const result = await updateTaskTitles();
    
    return res.status(200).json({
      success: true,
      message: 'Task titles updated successfully',
      data: result
    });
  } catch (error) {
    console.error('[Admin API] Error updating task titles:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update task titles',
      error: String(error)
    });
  }
});

export default router;