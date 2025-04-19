import { Router } from 'express';
import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { broadcastMessage, broadcastTaskUpdate } from '../services/websocket';

const router = Router();

// Test endpoint for sending WebSocket notifications
router.post('/test-notification', requireAuth, async (req, res) => {
  try {
    const { taskId, status, progress } = req.body;
    
    if (!taskId) {
      return res.status(400).json({ message: 'Task ID is required' });
    }

    // Get the task if it exists
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, parseInt(taskId))
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const testPayload = {
      taskId: parseInt(taskId),
      status: status || task.status,
      progress: progress !== undefined ? progress : task.progress,
      metadata: {
        lastUpdated: new Date().toISOString(),
        testNotification: true,
        message: 'This is a test notification from the WebSocket debugger'
      }
    };

    // Broadcast the task update
    broadcastMessage('task_test_notification', testPayload);

    // Also broadcast as a regular task update for complete testing
    broadcastTaskUpdate({
      id: parseInt(taskId),
      status: status || task.status,
      progress: progress !== undefined ? progress : task.progress,
      metadata: {
        lastUpdated: new Date().toISOString(),
        testNotification: true
      }
    });

    res.json({ 
      success: true, 
      message: 'Test notification sent',
      payload: testPayload
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ 
      message: 'Error sending test notification',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Ping endpoint to test WebSocket connection
router.post('/ping', requireAuth, (req, res) => {
  try {
    broadcastMessage('ping', { timestamp: new Date().toISOString() });
    res.json({ success: true, message: 'Ping sent to all connected clients' });
  } catch (error) {
    console.error('Error sending ping:', error);
    res.status(500).json({ 
      message: 'Error sending ping',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;