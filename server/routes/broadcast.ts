import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { broadcastTaskUpdate } from '../services/websocket';

const router = Router();

/**
 * Broadcast a task update via WebSocket
 * This is used by the KY3P demo autofill functionality to update all clients
 * when a task's fields have been populated with demo data
 */
router.post('/api/broadcast/task-update', requireAuth, (req, res) => {
  try {
    const { taskId, type = 'task_updated', timestamp } = req.body;
    
    if (!taskId) {
      return res.status(400).json({ error: 'Missing taskId' });
    }
    
    // Use the existing broadcastTaskUpdate function
    broadcastTaskUpdate({
      taskId,
      timestamp: timestamp || new Date().toISOString(),
      source: 'demo_autofill'
    });
    
    console.log(`[Broadcast API] Sent task update for taskId: ${taskId}`);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Broadcast API] Error:', error);
    return res.status(500).json({ error: 'Failed to broadcast message' });
  }
});

export default router;