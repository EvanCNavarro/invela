/**
 * Test WebSocket Progress Updates
 * 
 * This script tests the WebSocket implementation for task progress updates.
 * It connects to the WebSocket server and listens for progress update messages.
 */

// WebSocket connection
let socket;

// Connect to WebSocket server
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  console.log(`[WebSocket Test] Connecting to WebSocket server at ${wsUrl}`);
  
  socket = new WebSocket(wsUrl);
  
  socket.onopen = function() {
    console.log('[WebSocket Test] Connection established');
    // Send a test message to check connection
    socket.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
  };
  
  socket.onmessage = function(event) {
    const message = JSON.parse(event.data);
    console.log('[WebSocket Test] Message received:', message);
    
    // Check for progress update messages
    if (message.type === 'progress_update') {
      console.log('[WebSocket Test] Progress update received:', {
        taskId: message.taskId,
        progress: message.progress,
        oldProgress: message.oldProgress || 'unknown',
        timestamp: message.timestamp
      });
      
      // Check for small progress changes (0-5%)
      if (message.progress > 0 && message.progress <= 5) {
        console.log('[WebSocket Test] SMALL PROGRESS UPDATE DETECTED!', {
          taskId: message.taskId,
          progress: message.progress,
          details: message
        });
      }
      
      // Check for zero to non-zero transitions
      if (message.oldProgress === 0 && message.progress > 0) {
        console.log('[WebSocket Test] ZERO-TO-NON-ZERO TRANSITION DETECTED!', {
          taskId: message.taskId,
          oldProgress: 0,
          newProgress: message.progress,
          details: message
        });
      }
    }
  };
  
  socket.onclose = function(event) {
    console.log('[WebSocket Test] Connection closed:', event.code, event.reason);
    // Try to reconnect after 5 seconds
    setTimeout(connectWebSocket, 5000);
  };
  
  socket.onerror = function(error) {
    console.error('[WebSocket Test] WebSocket error:', error);
  };
}

// Start the test
connectWebSocket();

// Export the tester so it can be accessed globally
window.WebSocketProgressTester = {
  connectWebSocket,
  testTaskUpdate: function(taskId) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error('[WebSocket Test] Socket not connected. Please try again.');
      return;
    }
    
    console.log(`[WebSocket Test] Testing task update for task ID: ${taskId}`);
    socket.send(JSON.stringify({
      type: 'test_task_update',
      taskId: parseInt(taskId, 10),
      timestamp: new Date().toISOString()
    }));
  }
};

// Log available test methods
console.log('[WebSocket Test] WebSocket Progress Tester initialized. Available methods:');
console.log('  - WebSocketProgressTester.connectWebSocket() - Reconnect to the WebSocket server');
console.log('  - WebSocketProgressTester.testTaskUpdate(taskId) - Test task progress update for a specific task ID');
