/**
 * Simple script to broadcast a task update via WebSocket
 */

import { broadcastMessage } from './server/services/websocket.js';

async function run() {
  try {
    console.log('Broadcasting task update for task 602...');
    
    // Simulate the task_updated event that would normally be sent
    // when a task is unlocked or updated
    broadcastMessage({
      type: 'task_updated',
      payload: {
        taskId: 602,
        companyId: 232,
        status: 'not_started',
        cache_invalidation: true
      }
    });
    
    console.log('Broadcast sent successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

run()
  .then(() => console.log('Script completed!'))
  .catch(error => console.error('Script failed:', error));