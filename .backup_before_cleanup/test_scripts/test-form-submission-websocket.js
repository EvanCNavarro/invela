/**
 * Test script for form submission WebSocket broadcasting
 * 
 * This script uses the broadcast function from the server/services/websocket module
 * to test broadcasting a form submission event.
 */

import websocketService from './server/services/websocket.js';
const { broadcast, broadcastTaskUpdate, broadcastCompanyTabsUpdate } = websocketService;

// Test data
const taskId = 999;
const formType = 'kyb';
const companyId = 254;

console.log('[Test] Broadcasting form submission event');

// Broadcast a test form submission event
broadcast('form_submission_update', {
  taskId,
  formType,
  status: 'success',
  companyId,
  submissionDate: new Date().toISOString(),
  unlockedTabs: ['file_vault', 'risk_assessment'],
  fileName: `test_submission_${taskId}.csv`,
  fileId: 12345
});

// Also update task via the task_update WebSocket event
broadcastTaskUpdate({
  id: taskId,
  status: 'submitted',
  progress: 100,
  formType
});

// If tabs were unlocked, broadcast company tabs update
broadcastCompanyTabsUpdate(
  companyId,
  ['file_vault', 'risk_assessment'],
  { 
    source: 'test_script',
    cache_invalidation: true 
  }
);

console.log('[Test] Test completed successfully!');