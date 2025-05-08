/**
 * Direct WebSocket Test Script
 * 
 * This script initializes the WebSocket server on the server, and
 * defines a client-side WebSocket test that can be run in the browser
 * console to verify the real-time communication functionality.
 */

// Server-side WebSocket initialization (already done in routes.ts)
// This would be triggered when the server starts

/**
 * Client-side test script - can be pasted into the browser console
 * 
 * Usage: Paste this entire script into the browser console while on the app
 */
function testWebSocketConnection() {
  // Track connection status
  let status = 'disconnected';
  let socket = null;
  let reconnectInterval = null;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 5;
  
  // Define a styled logger
  function log(message, type = 'info') {
    const styles = {
      info: 'background: #2196F3; color: white; padding: 2px 4px; border-radius: 2px;',
      success: 'background: #4CAF50; color: white; padding: 2px 4px; border-radius: 2px;',
      error: 'background: #F44336; color: white; padding: 2px 4px; border-radius: 2px;',
      warning: 'background: #FF9800; color: white; padding: 2px 4px; border-radius: 2px;',
    };
    
    console.log(`%c[WebSocket Test] ${message}`, styles[type]);
  }
  
  // Update connection status display
  function updateStatus(newStatus) {
    status = newStatus;
    log(`Connection status: ${status}`, status === 'connected' ? 'success' : (status === 'connecting' ? 'warning' : 'error'));
  }
  
  // Connect to WebSocket server
  function connect() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      log('Already connected or connecting, skipping...', 'warning');
      return;
    }
    
    try {
      updateStatus('connecting');
      // Determine the WebSocket URL based on the current page URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      log(`Connecting to ${wsUrl}...`);
      socket = new WebSocket(wsUrl);
      
      // Connection event handlers
      socket.onopen = () => {
        updateStatus('connected');
        log('WebSocket connection established!', 'success');
        // Reset reconnection attempts on successful connection
        reconnectAttempts = 0;
        clearInterval(reconnectInterval);
        
        // Authenticate after connection
        authenticate();
      };
      
      socket.onclose = (event) => {
        updateStatus('disconnected');
        log(`WebSocket connection closed: ${event.code} ${event.reason}`, 'error');
        
        // Try to reconnect if not explicitly closed by user
        if (event.code !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 10000);
          log(`Scheduling reconnection attempt ${reconnectAttempts} in ${delay/1000} seconds...`);
          
          clearInterval(reconnectInterval);
          reconnectInterval = setTimeout(() => {
            log(`Executing reconnection attempt ${reconnectAttempts}...`);
            connect();
          }, delay);
        }
      };
      
      socket.onerror = (error) => {
        log('WebSocket error occurred', 'error');
        console.error(error);
      };
      
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          log(`Received message: ${message.type || 'unknown'}`, 'info');
          console.log('Message data:', message);
          
          // Handle specific message types
          if (message.type === 'task-update') {
            log(`Task ${message.taskId} updated - Status: ${message.status}, Progress: ${message.progress}%`, 'success');
          } else if (message.type === 'form-submission-completed') {
            log(`Form submission completed for task ${message.taskId}`, 'success');
          } else if (message.type === 'company-tabs-updated') {
            log(`Company ${message.companyId} tabs updated: ${message.availableTabs.join(', ')}`, 'success');
          }
        } catch (e) {
          log('Error parsing message:', 'error');
          console.error(e);
          console.log('Raw message:', event.data);
        }
      };
    } catch (error) {
      log('Error establishing WebSocket connection', 'error');
      console.error(error);
    }
  }
  
  // Disconnect from WebSocket server
  function disconnect() {
    if (!socket) {
      log('Not connected, nothing to disconnect', 'warning');
      return;
    }
    
    try {
      log('Closing WebSocket connection...');
      socket.close(1000, 'User initiated disconnect');
      socket = null;
      clearInterval(reconnectInterval);
      reconnectAttempts = 0;
      updateStatus('disconnected');
    } catch (error) {
      log('Error disconnecting', 'error');
      console.error(error);
    }
  }
  
  // Authenticate with the WebSocket server
  function authenticate() {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      log('Not connected, cannot authenticate', 'error');
      return;
    }
    
    try {
      log('Authenticating with WebSocket server...');
      const authMessage = {
        messageType: 'authenticate',
        connectionId: socket._connectionId || `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      socket.send(JSON.stringify(authMessage));
      log('Authentication message sent');
    } catch (error) {
      log('Error during authentication', 'error');
      console.error(error);
    }
  }
  
  // Send a ping message to test the connection
  function sendPing() {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      log('Not connected, cannot send ping', 'error');
      return;
    }
    
    try {
      log('Sending ping message...');
      const pingMessage = {
        messageType: 'ping',
        connectionId: socket._connectionId || `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      socket.send(JSON.stringify(pingMessage));
      log('Ping message sent');
    } catch (error) {
      log('Error sending ping', 'error');
      console.error(error);
    }
  }
  
  // Send a custom message
  function sendCustomMessage(messageType, data = {}) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      log('Not connected, cannot send message', 'error');
      return;
    }
    
    try {
      log(`Sending custom message: ${messageType}...`);
      const message = {
        messageType,
        ...data,
        connectionId: socket._connectionId || `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      socket.send(JSON.stringify(message));
      log('Custom message sent');
    } catch (error) {
      log('Error sending custom message', 'error');
      console.error(error);
    }
  }
  
  // Return the public API for this test module
  return {
    connect,
    disconnect,
    authenticate,
    sendPing,
    sendCustomMessage,
    getStatus: () => status,
    getSocket: () => socket
  };
}

// Run the test if in a browser environment
if (typeof window !== 'undefined') {
  console.log('WebSocket test initialized. Call wsTest = testWebSocketConnection() and then wsTest.connect() to begin testing.');
} else {
  console.log('This script is designed to be run in a browser environment.');
}

// Export the test function if in a Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testWebSocketConnection
  };
}