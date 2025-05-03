/**
 * WebSocket Test Script for Task Progress Updates
 * 
 * This script tests WebSocket connectivity and ensures task progress
 * updates are properly broadcast to connected clients.
 * 
 * Usage: Paste this script into your browser console while logged into the application.
 */

// Track WebSocket connections and received events
let wsConnections = [];
let receivedEvents = [];

/**
 * Create a WebSocket connection and listen for task updates
 */
function createWebSocketConnection() {
  try {
    // Use the correct WebSocket URL with the proper protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    
    console.log(`Creating WebSocket connection to ${wsUrl}...`);
    
    const ws = new WebSocket(wsUrl);
    const connectionId = Date.now();
    
    // Connection event handlers
    ws.addEventListener('open', () => {
      console.log(`%cWebSocket connection established! (ID: ${connectionId})`, 'color: green; font-weight: bold');
      
      // Send an authentication message (if needed)
      const authMessage = {
        type: 'authenticate',
        data: {
          timestamp: new Date().toISOString()
        }
      };
      
      ws.send(JSON.stringify(authMessage));
    });
    
    ws.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Record the received event
        const eventWithTimestamp = {
          ...message,
          receivedAt: new Date().toISOString(),
          connectionId
        };
        
        receivedEvents.push(eventWithTimestamp);
        
        // Only log task_updated events or if it's the first few events
        if (message.type === 'task_updated' || receivedEvents.length < 5) {
          console.log(`%cReceived WebSocket message:`, 'color: blue; font-weight: bold');
          console.log(message);
        }
        
        // Special handling for task_updated events
        if (message.type === 'task_updated') {
          console.log(`%cTask #${message.payload.taskId} updated:`, 'color: magenta; font-weight: bold');
          console.log(`  - Progress: ${message.payload.progress}%`);
          console.log(`  - Status: ${message.payload.status}`);
          console.log(`  - Updated: ${message.payload.lastUpdated}`);
          
          // Highlight updates from our test task
          if (window.currentTestTaskId && message.payload.taskId === window.currentTestTaskId) {
            console.log(`%c✅ Received WebSocket update for our test task #${window.currentTestTaskId}!`, 
              'color: green; font-weight: bold; font-size: 14px');
          }
        }
      } catch (parseError) {
        console.error('Error parsing WebSocket message:', parseError);
        console.log('Raw message:', event.data);
      }
    });
    
    ws.addEventListener('error', (error) => {
      console.error(`WebSocket error (ID: ${connectionId}):`, error);
    });
    
    ws.addEventListener('close', (event) => {
      console.log(`WebSocket connection closed (ID: ${connectionId}):`, {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
      
      // Remove this connection from our tracking
      wsConnections = wsConnections.filter(conn => conn.id !== connectionId);
    });
    
    // Store the connection for later reference
    wsConnections.push({
      id: connectionId,
      ws,
      createdAt: new Date().toISOString()
    });
    
    return {
      id: connectionId,
      ws
    };
  } catch (error) {
    console.error('Error creating WebSocket connection:', error);
    return null;
  }
}

/**
 * Test task progress updates via the unified API and WebSocket broadcasts
 */
async function testTaskProgressWebSocket(taskId, taskType = 'ky3p') {
  try {
    console.log(`%c===== Testing Task #${taskId} Progress WebSocket Broadcast =====`, 
      'color: cyan; font-weight: bold; font-size: 14px');
    
    // Store the current test task ID globally
    window.currentTestTaskId = taskId;
    
    // Create a WebSocket connection if needed
    if (wsConnections.length === 0) {
      console.log('No active WebSocket connections, creating a new one...');
      const connection = createWebSocketConnection();
      
      if (!connection) {
        throw new Error('Failed to create WebSocket connection');
      }
      
      // Wait a moment for the connection to establish
      console.log('Waiting for WebSocket connection to establish...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`Active WebSocket connections: ${wsConnections.length}`);
    
    // Clear any previous events related to our test task
    receivedEvents = receivedEvents.filter(event => 
      !(event.type === 'task_updated' && 
        event.payload && 
        event.payload.taskId === taskId));
    
    // Call the API to update task progress
    console.log(`%cCalling API to test progress for task #${taskId} (${taskType})...`, 'color: blue');
    const response = await fetch('/api/debug/test-unified-progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        taskId,
        taskType,
        debug: true,
        forceUpdate: true
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error ${response.status}: ${error}`);
    }
    
    const result = await response.json();
    
    console.log('%cAPI response:', 'color: green');
    console.log(result);
    
    // Wait a moment for WebSocket messages to arrive
    console.log('Waiting for WebSocket broadcast...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if we received a task_updated event for our test task
    const taskUpdates = receivedEvents.filter(event => 
      event.type === 'task_updated' && 
      event.payload && 
      event.payload.taskId === taskId);
    
    if (taskUpdates.length > 0) {
      console.log(`%c✅ SUCCESS: Received ${taskUpdates.length} WebSocket updates for task #${taskId}`, 
        'color: green; font-weight: bold; font-size: 14px');
      
      // Display the most recent update
      const latestUpdate = taskUpdates[taskUpdates.length - 1];
      console.log('Latest update:', latestUpdate);
      
      return {
        success: true,
        taskId,
        updates: taskUpdates,
        apiResult: result
      };
    } else {
      console.log(`%c❌ FAILURE: No WebSocket updates received for task #${taskId}`, 
        'color: red; font-weight: bold; font-size: 14px');
      
      return {
        success: false,
        taskId,
        updates: [],
        apiResult: result,
        receivedEvents: receivedEvents.slice(-10) // Only include the last 10 events
      };
    }
  } catch (error) {
    console.error('Error testing task progress WebSocket broadcast:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Expose utility functions globally
window.createWebSocketConnection = createWebSocketConnection;
window.testTaskProgressWebSocket = testTaskProgressWebSocket;
window.getWsConnections = () => wsConnections;
window.getReceivedEvents = () => receivedEvents;

// Automatically create a WebSocket connection when the script loads
const connection = createWebSocketConnection();

console.log(`
=== WebSocket Test Utils Loaded ===

Available functions:
- createWebSocketConnection(): Create a new WebSocket connection
- testTaskProgressWebSocket(taskId, taskType): Test progress updates via WebSocket
- getWsConnections(): Get all active WebSocket connections
- getReceivedEvents(): Get all received WebSocket events

Example usage:
  testTaskProgressWebSocket(702, 'ky3p')
`);
