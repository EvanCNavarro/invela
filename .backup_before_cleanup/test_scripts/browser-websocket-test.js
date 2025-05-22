/**
 * Browser WebSocket Test Script
 * 
 * This script can be pasted directly into the browser console to test
 * WebSocket connections and message handling. It provides a simple UI
 * for testing WebSocket functionality.
 * 
 * Usage: Copy the entire code and paste it into your browser's developer console
 */

// Create UI
(function createWebSocketTestUI() {
  // Remove existing UI if present
  const existingUI = document.getElementById('ws-test-ui');
  if (existingUI) {
    existingUI.remove();
  }
  
  // Create UI container
  const container = document.createElement('div');
  container.id = 'ws-test-ui';
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 400px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    box-shadow: 0 0 10px rgba(0,0,0,0.2);
    z-index: 10000;
    font-family: Arial, sans-serif;
    font-size: 14px;
  `;
  
  // Create header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 10px;
    background: #f4f4f4;
    border-bottom: 1px solid #ccc;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  header.innerHTML = '<strong>WebSocket Tester</strong>';
  
  // Create close button
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.cssText = `
    border: none;
    background: #ddd;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
  `;
  closeButton.onclick = () => container.remove();
  header.appendChild(closeButton);
  
  // Create content
  const content = document.createElement('div');
  content.style.cssText = `
    padding: 10px;
    max-height: 300px;
    overflow-y: auto;
  `;
  
  // Create status display
  const statusDisplay = document.createElement('div');
  statusDisplay.id = 'ws-test-status';
  statusDisplay.style.cssText = `
    margin-bottom: 10px;
    padding: 5px;
    background: #eee;
    border-radius: 4px;
  `;
  statusDisplay.textContent = 'Status: Disconnected';
  content.appendChild(statusDisplay);
  
  // Create message log
  const messageLog = document.createElement('div');
  messageLog.id = 'ws-test-log';
  messageLog.style.cssText = `
    height: 150px;
    overflow-y: auto;
    border: 1px solid #ccc;
    padding: 5px;
    margin-bottom: 10px;
    font-family: monospace;
    font-size: 12px;
    background: #f9f9f9;
  `;
  content.appendChild(messageLog);
  
  // Create buttons
  const buttons = document.createElement('div');
  buttons.style.cssText = `
    display: flex;
    gap: 5px;
    margin-bottom: 10px;
  `;
  
  // Connect button
  const connectButton = document.createElement('button');
  connectButton.textContent = 'Connect';
  connectButton.id = 'ws-test-connect';
  connectButton.style.cssText = `
    padding: 5px 10px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `;
  buttons.appendChild(connectButton);
  
  // Disconnect button
  const disconnectButton = document.createElement('button');
  disconnectButton.textContent = 'Disconnect';
  disconnectButton.id = 'ws-test-disconnect';
  disconnectButton.style.cssText = `
    padding: 5px 10px;
    background: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `;
  buttons.appendChild(disconnectButton);
  
  // Send ping button
  const pingButton = document.createElement('button');
  pingButton.textContent = 'Send Ping';
  pingButton.id = 'ws-test-ping';
  pingButton.style.cssText = `
    padding: 5px 10px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `;
  buttons.appendChild(pingButton);
  
  // Send task update button
  const taskUpdateButton = document.createElement('button');
  taskUpdateButton.textContent = 'Task Update';
  taskUpdateButton.id = 'ws-test-task-update';
  taskUpdateButton.style.cssText = `
    padding: 5px 10px;
    background: #FF9800;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `;
  buttons.appendChild(taskUpdateButton);
  
  content.appendChild(buttons);
  
  // Add custom message input
  const customMessageDiv = document.createElement('div');
  customMessageDiv.style.cssText = `
    display: flex;
    gap: 5px;
  `;
  
  const customMessageInput = document.createElement('input');
  customMessageInput.type = 'text';
  customMessageInput.id = 'ws-test-custom-message';
  customMessageInput.placeholder = 'Enter custom JSON message';
  customMessageInput.style.cssText = `
    flex: 1;
    padding: 5px;
    border: 1px solid #ccc;
    border-radius: 4px;
  `;
  customMessageDiv.appendChild(customMessageInput);
  
  const sendCustomButton = document.createElement('button');
  sendCustomButton.textContent = 'Send';
  sendCustomButton.id = 'ws-test-send-custom';
  sendCustomButton.style.cssText = `
    padding: 5px 10px;
    background: #9C27B0;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `;
  customMessageDiv.appendChild(sendCustomButton);
  
  content.appendChild(customMessageDiv);
  
  // Assemble the UI
  container.appendChild(header);
  container.appendChild(content);
  document.body.appendChild(container);
})();

// WebSocket functionality
(function setupWebSocketTester() {
  let socket = null;
  
  // Helper to log messages
  function log(message) {
    const logElement = document.getElementById('ws-test-log');
    if (!logElement) return;
    
    const entry = document.createElement('div');
    entry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
    logElement.appendChild(entry);
    logElement.scrollTop = logElement.scrollHeight;
    
    // Also log to console for debugging
    console.log(`[WebSocketTest] ${message}`);
  }
  
  // Update status display
  function updateStatus(status) {
    const statusElement = document.getElementById('ws-test-status');
    if (!statusElement) return;
    
    statusElement.textContent = `Status: ${status}`;
  }
  
  // Connect to WebSocket
  function connect() {
    if (socket && socket.readyState <= 1) {
      log('Already connected or connecting');
      return;
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    log(`Connecting to ${wsUrl}`);
    updateStatus('Connecting...');
    
    try {
      socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        log('Connected!');
        updateStatus('Connected');
        
        // Authenticate
        authenticate();
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          log(`Received: ${JSON.stringify(data)}`);
          
          // If this is a task update, show more details
          if (data.type === 'task_update' || data.type === 'task_updated') {
            const payload = data.payload || data.data || {};
            const taskId = payload.id || payload.taskId;
            const status = payload.status;
            const progress = payload.progress;
            
            if (taskId) {
              log(`Task Update: ID=${taskId}, Status=${status}, Progress=${progress}%`);
            }
          }
        } catch (e) {
          log(`Received: ${event.data}`);
        }
      };
      
      socket.onclose = () => {
        log('Disconnected');
        updateStatus('Disconnected');
        socket = null;
      };
      
      socket.onerror = (error) => {
        log(`Error: ${error}`);
        updateStatus('Error');
      };
    } catch (e) {
      log(`Connection error: ${e.message}`);
      updateStatus('Error');
    }
  }
  
  // Disconnect from WebSocket
  function disconnect() {
    if (!socket) {
      log('Not connected');
      return;
    }
    
    socket.close();
    log('Disconnected');
    updateStatus('Disconnected');
  }
  
  // Send authentication message
  function authenticate() {
    if (!socket || socket.readyState !== 1) {
      log('Cannot authenticate: Not connected');
      return;
    }
    
    // Try to get user ID and company ID from the page
    let userId = null;
    let companyId = null;
    
    // Look for common variables
    if (window.USER_ID) userId = window.USER_ID;
    if (window.COMPANY_ID) companyId = window.COMPANY_ID;
    
    // Try to extract from localStorage
    try {
      const authData = localStorage.getItem('auth');
      if (authData) {
        const parsedAuth = JSON.parse(authData);
        if (parsedAuth.user) {
          userId = parsedAuth.user.id;
          companyId = parsedAuth.user.company_id;
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    
    socket.send(JSON.stringify({
      type: 'authenticate',
      userId,
      companyId,
      clientId: `ws_test_${Date.now()}`,
      timestamp: new Date().toISOString()
    }));
    
    log(`Authenticated: User=${userId}, Company=${companyId}`);
  }
  
  // Send ping message
  function sendPing() {
    if (!socket || socket.readyState !== 1) {
      log('Cannot send ping: Not connected');
      return;
    }
    
    socket.send(JSON.stringify({
      type: 'ping',
      timestamp: new Date().toISOString()
    }));
    
    log('Sent ping');
  }
  
  // Send task update request
  function sendTaskUpdate() {
    if (!socket || socket.readyState !== 1) {
      log('Cannot send task update: Not connected');
      return;
    }
    
    // Find a task ID on the page
    let taskId = 123; // Default
    
    // Try to extract from URL
    const match = window.location.pathname.match(/\/tasks\/(\d+)/);
    if (match && match[1]) {
      taskId = parseInt(match[1]);
    }
    
    socket.send(JSON.stringify({
      type: 'client_task_update_request',
      taskId,
      requestId: `req_${Date.now()}`,
      timestamp: new Date().toISOString()
    }));
    
    log(`Sent task update request for task ${taskId}`);
  }
  
  // Send custom message
  function sendCustomMessage() {
    if (!socket || socket.readyState !== 1) {
      log('Cannot send message: Not connected');
      return;
    }
    
    const inputElement = document.getElementById('ws-test-custom-message');
    if (!inputElement) return;
    
    const message = inputElement.value.trim();
    if (!message) {
      log('No message to send');
      return;
    }
    
    try {
      // Try to parse as JSON
      const jsonMessage = JSON.parse(message);
      socket.send(JSON.stringify(jsonMessage));
      log(`Sent custom JSON message: ${message}`);
    } catch (e) {
      // Send as plain text
      socket.send(message);
      log(`Sent custom text message: ${message}`);
    }
    
    // Clear input
    inputElement.value = '';
  }
  
  // Set up event listeners
  document.getElementById('ws-test-connect')?.addEventListener('click', connect);
  document.getElementById('ws-test-disconnect')?.addEventListener('click', disconnect);
  document.getElementById('ws-test-ping')?.addEventListener('click', sendPing);
  document.getElementById('ws-test-task-update')?.addEventListener('click', sendTaskUpdate);
  document.getElementById('ws-test-send-custom')?.addEventListener('click', sendCustomMessage);
  document.getElementById('ws-test-custom-message')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendCustomMessage();
  });
  
  // Auto-connect on startup
  setTimeout(connect, 500);
})();

// Export to global scope for console access
window.WebSocketTester = {
  connect: () => document.getElementById('ws-test-connect')?.click(),
  disconnect: () => document.getElementById('ws-test-disconnect')?.click(),
  ping: () => document.getElementById('ws-test-ping')?.click(),
  taskUpdate: () => document.getElementById('ws-test-task-update')?.click(),
  sendMessage: (message) => {
    const inputElement = document.getElementById('ws-test-custom-message');
    if (inputElement) {
      inputElement.value = typeof message === 'object' ? JSON.stringify(message) : message;
      document.getElementById('ws-test-send-custom')?.click();
    }
  }
};