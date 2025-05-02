/**
 * WebSocket Client Test for Progress Updates
 * 
 * This script creates a WebSocket client to monitor progress updates
 * and tests our fix for small progress updates (0-5%)
 */

import WebSocket from 'ws';

// Connect to the WebSocket server
const ws = new WebSocket('ws://localhost:5000/ws');

// Event handlers
ws.on('open', () => {
  console.log('[WS Client] Connected to WebSocket server');
  
  // Send a test ping message
  ws.send(JSON.stringify({
    type: 'ping',
    timestamp: new Date().toISOString()
  }));
  
  console.log('[WS Client] Ping message sent');
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('[WS Client] Received message:', message);
    
    // Check for progress update messages
    if (message.type === 'progress_update') {
      console.log('[WS Client] *** PROGRESS UPDATE RECEIVED ***');
      console.log(`[WS Client] Task ${message.taskId}: ${message.oldProgress || 0}% -> ${message.progress}%`);
      
      // Check for small progress changes (0-5%)
      if (message.progress > 0 && message.progress <= 5) {
        console.log('[WS Client] !!! SMALL PROGRESS UPDATE DETECTED !!!');
        console.log(`[WS Client] Task ${message.taskId}: Small progress ${message.progress}%`);
        console.log('[WS Client] This confirms our fix is working correctly!');
      }
      
      // Check for zero to non-zero transitions
      if ((message.oldProgress === 0 || message.oldProgress === '0') && message.progress > 0) {
        console.log('[WS Client] !!! ZERO-TO-NON-ZERO TRANSITION DETECTED !!!');
        console.log(`[WS Client] Task ${message.taskId}: 0% -> ${message.progress}%`);
        console.log('[WS Client] This confirms our zero-to-non-zero fix is working!');
      }
    }
    
    // Check for task update messages
    if (message.type === 'task_update') {
      console.log('[WS Client] Task update received:', message);
    }
  } catch (error) {
    console.error('[WS Client] Error parsing message:', error);
    console.log('[WS Client] Raw message:', data.toString());
  }
});

ws.on('close', (code, reason) => {
  console.log(`[WS Client] Connection closed: ${code} ${reason}`);
});

ws.on('error', (error) => {
  console.error('[WS Client] WebSocket error:', error);
});

// Keep the process running
const interval = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    // Send a keepalive ping every 30 seconds
    ws.send(JSON.stringify({
      type: 'ping',
      timestamp: new Date().toISOString()
    }));
  }
}, 30000);

// Handle process termination
process.on('SIGINT', () => {
  console.log('[WS Client] Closing WebSocket connection...');
  clearInterval(interval);
  ws.close();
  process.exit(0);
});

console.log('[WS Client] WebSocket client started. Waiting for messages...');
