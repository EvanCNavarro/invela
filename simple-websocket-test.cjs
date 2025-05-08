/**
 * Simple WebSocket Test Script
 * 
 * This script tests the WebSocket broadcast functionality without database dependencies.
 * It connects to the WebSocket server and registers event handlers for WebSocket events.
 * 
 * Usage: Run this script in the browser console by copy-pasting it.
 */

(function() {
  // WebSocket test configuration
  const config = {
    reconnectInterval: 1000,
    maxReconnectAttempts: 5,
    pingInterval: 5000,
    logEnabled: true
  };
  
  // Track connection state
  let status = 'disconnected';
  let socket = null;
  let reconnectAttempts = 0;
  let pingIntervalId = null;
  let connectionId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Styled console logging
  function log(message, type = 'info') {
    if (!config.logEnabled) return;
    
    const styles = {
      info: 'background: #2196F3; color: white; padding: 2px 4px; border-radius: 2px;',
      success: 'background: #4CAF50; color: white; padding: 2px 4px; border-radius: 2px;',
      error: 'background: #F44336; color: white; padding: 2px 4px; border-radius: 2px;',
      warning: 'background: #FF9800; color: white; padding: 2px 4px; border-radius: 2px;',
    };
    
    console.log(`%c[WebSocket Test] ${message}`, styles[type]);
  }
  
  // Connect to WebSocket server
  function connect() {
    try {
      // Use the current host's WebSocket path
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      log(`Connecting to ${wsUrl}...`);
      socket = new WebSocket(wsUrl);
      status = 'connecting';
      
      // Handle WebSocket connection open
      socket.onopen = () => {
        status = 'connected';
        log('WebSocket connection established!', 'success');
        reconnectAttempts = 0;
        
        // Send authentication message
        authenticate();
        
        // Start ping interval
        startPingInterval();
      };
      
      // Handle WebSocket connection close
      socket.onclose = (event) => {
        status = 'disconnected';
        log(`WebSocket connection closed: ${event.code} ${event.reason}`, 'error');
        
        // Clear ping interval
        clearInterval(pingIntervalId);
        
        // Try to reconnect if not explicitly closed
        if (event.code !== 1000 && reconnectAttempts < config.maxReconnectAttempts) {
          reconnectAttempts++;
          log(`Scheduling reconnection attempt ${reconnectAttempts} in ${config.reconnectInterval}ms...`);
          
          setTimeout(() => {
            log(`Executing reconnection attempt ${reconnectAttempts}...`);
            connect();
          }, config.reconnectInterval);
        }
      };
      
      // Handle WebSocket errors
      socket.onerror = (error) => {
        log('WebSocket error occurred', 'error');
        console.error(error);
      };
      
      // Handle incoming WebSocket messages
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
      status = 'error';
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
      clearInterval(pingIntervalId);
      socket.close(1000, 'User initiated disconnect');
      socket = null;
      status = 'disconnected';
    } catch (error) {
      log('Error disconnecting', 'error');
      console.error(error);
    }
  }
  
  // Authenticate with WebSocket server
  function authenticate() {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      log('Not connected, cannot authenticate', 'error');
      return;
    }
    
    try {
      log('Authenticating with WebSocket server...');
      const authMessage = {
        messageType: 'authenticate',
        connectionId
      };
      
      socket.send(JSON.stringify(authMessage));
      log('Authentication message sent');
    } catch (error) {
      log('Error during authentication', 'error');
      console.error(error);
    }
  }
  
  // Start ping interval to keep connection alive
  function startPingInterval() {
    clearInterval(pingIntervalId);
    pingIntervalId = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        try {
          const pingMessage = {
            messageType: 'ping',
            connectionId
          };
          
          socket.send(JSON.stringify(pingMessage));
          log('Ping sent');
        } catch (error) {
          log('Error sending ping', 'error');
          console.error(error);
        }
      }
    }, config.pingInterval);
  }
  
  // Send a test task update message
  function sendTestTaskUpdate(taskId = 795, status = 'submitted', progress = 100) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      log('Not connected, cannot send test message', 'error');
      return;
    }
    
    try {
      log(`Sending test task update for task ${taskId}...`);
      const message = {
        messageType: 'task-update',
        taskId,
        status,
        progress,
        connectionId
      };
      
      socket.send(JSON.stringify(message));
      log('Test task update sent');
    } catch (error) {
      log('Error sending test task update', 'error');
      console.error(error);
    }
  }
  
  // Get the current connection status
  function getStatus() {
    return status;
  }
  
  // Get the WebSocket instance
  function getSocket() {
    return socket;
  }
  
  // API for WebSocket testing
  const wsTest = {
    connect,
    disconnect,
    authenticate,
    sendTestTaskUpdate,
    getStatus,
    getSocket,
    setLogEnabled: (enabled) => { config.logEnabled = enabled; }
  };
  
  // If in browser environment, expose API globally
  if (typeof window !== 'undefined') {
    window.wsTest = wsTest;
    console.log('WebSocket test initialized. Call wsTest.connect() to begin testing.');
  }
  
  return wsTest;
})();