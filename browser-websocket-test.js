/**
 * Browser WebSocket Test Script
 * 
 * This script tests the WebSocket connection and functionality.
 * Copy and paste this code into your browser console to test the WebSocket.
 */

(function() {
  const logContainer = document.createElement('div');
  logContainer.id = 'ws-test-logs';
  logContainer.style.position = 'fixed';
  logContainer.style.bottom = '20px';
  logContainer.style.right = '20px';
  logContainer.style.width = '400px';
  logContainer.style.maxHeight = '600px';
  logContainer.style.overflow = 'auto';
  logContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  logContainer.style.color = 'white';
  logContainer.style.padding = '10px';
  logContainer.style.borderRadius = '5px';
  logContainer.style.fontFamily = 'monospace';
  logContainer.style.fontSize = '12px';
  logContainer.style.zIndex = '10000';
  document.body.appendChild(logContainer);

  // Status element
  const statusEl = document.createElement('div');
  statusEl.id = 'ws-status';
  statusEl.style.padding = '5px';
  statusEl.style.marginBottom = '10px';
  statusEl.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
  statusEl.style.borderRadius = '3px';
  statusEl.textContent = 'Disconnected';
  logContainer.appendChild(statusEl);
  
  // Controls
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.display = 'flex';
  buttonsContainer.style.gap = '5px';
  buttonsContainer.style.marginBottom = '10px';
  
  const connectBtn = document.createElement('button');
  connectBtn.textContent = 'Connect';
  connectBtn.onclick = connect;
  
  const disconnectBtn = document.createElement('button');
  disconnectBtn.textContent = 'Disconnect';
  disconnectBtn.onclick = disconnect;
  
  const pingBtn = document.createElement('button');
  pingBtn.textContent = 'Ping';
  pingBtn.onclick = sendPing;
  
  const authBtn = document.createElement('button');
  authBtn.textContent = 'Authenticate';
  authBtn.onclick = authenticate;
  
  const taskUpdateBtn = document.createElement('button');
  taskUpdateBtn.textContent = 'Task Update';
  taskUpdateBtn.onclick = sendTaskUpdate;
  
  buttonsContainer.appendChild(connectBtn);
  buttonsContainer.appendChild(disconnectBtn);
  buttonsContainer.appendChild(pingBtn);
  buttonsContainer.appendChild(authBtn);
  buttonsContainer.appendChild(taskUpdateBtn);
  logContainer.appendChild(buttonsContainer);
  
  // Logs container
  const logsContainer = document.createElement('div');
  logsContainer.id = 'ws-logs';
  logContainer.appendChild(logsContainer);

  let socket = null;
  let userId = null;
  
  // Try to get the current user ID from the page
  try {
    // Look for it in localStorage
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const parsedUserInfo = JSON.parse(userInfo);
      userId = parsedUserInfo.id;
      log(`Found user ID: ${userId}`);
    }
  } catch (error) {
    log(`Error getting user ID: ${error.message}`, 'error');
  }

  function log(message, type = 'info') {
    const logEl = document.createElement('div');
    logEl.style.marginBottom = '5px';
    logEl.style.borderLeft = '3px solid';
    logEl.style.paddingLeft = '5px';
    
    switch (type) {
      case 'error':
        logEl.style.borderLeftColor = '#ff5555';
        break;
      case 'success':
        logEl.style.borderLeftColor = '#55ff55';
        break;
      case 'warning':
        logEl.style.borderLeftColor = '#ffff55';
        break;
      case 'received':
        logEl.style.borderLeftColor = '#55ffff';
        break;
      default:
        logEl.style.borderLeftColor = '#5555ff';
    }
    
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    logEl.innerHTML = `<span style="color: #aaa">[${timestamp}]</span> ${message}`;
    
    const logsContainer = document.getElementById('ws-logs');
    logsContainer.prepend(logEl);
  }

  function updateStatus(status) {
    const statusEl = document.getElementById('ws-status');
    switch (status) {
      case 'connected':
        statusEl.style.backgroundColor = 'rgba(0, 255, 0, 0.5)';
        statusEl.textContent = 'Connected';
        break;
      case 'disconnected':
        statusEl.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
        statusEl.textContent = 'Disconnected';
        break;
      case 'connecting':
        statusEl.style.backgroundColor = 'rgba(255, 255, 0, 0.5)';
        statusEl.textContent = 'Connecting...';
        break;
      case 'authenticated':
        statusEl.style.backgroundColor = 'rgba(0, 255, 255, 0.5)';
        statusEl.textContent = 'Authenticated';
        break;
    }
  }

  function connect() {
    if (socket && socket.readyState === WebSocket.OPEN) {
      log('Already connected', 'warning');
      return;
    }
    
    updateStatus('connecting');
    log('Connecting to WebSocket server...');
    
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      socket = new WebSocket(wsUrl);
      
      socket.onopen = function() {
        log('WebSocket connection established', 'success');
        updateStatus('connected');
      };
      
      socket.onmessage = function(event) {
        try {
          const message = JSON.parse(event.data);
          log(`WebSocket Received message: ${JSON.stringify(message, null, 2)}`, 'received');
          
          if (message.type === 'authenticated') {
            updateStatus('authenticated');
          }
        } catch (error) {
          log(`Error parsing message: ${error.message}`, 'error');
        }
      };
      
      socket.onclose = function(event) {
        log(`WebSocket connection closed: ${event.code} ${event.reason}`, 'warning');
        updateStatus('disconnected');
      };
      
      socket.onerror = function(error) {
        log(`WebSocket error: ${error}`, 'error');
      };
    } catch (error) {
      log(`Error connecting to WebSocket: ${error.message}`, 'error');
      updateStatus('disconnected');
    }
  }

  function disconnect() {
    if (!socket) {
      log('Not connected', 'warning');
      return;
    }
    
    log('Disconnecting from WebSocket server...');
    socket.close();
  }

  function authenticate() {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      log('Not connected', 'error');
      return;
    }
    
    if (!userId) {
      const promptedUserId = prompt('Enter user ID:');
      if (!promptedUserId) {
        log('Authentication cancelled', 'warning');
        return;
      }
      userId = parseInt(promptedUserId, 10);
    }
    
    log(`Authenticating with user ID: ${userId}`);
    const message = {
      type: 'authenticate',
      userId: userId,
      timestamp: new Date().toISOString()
    };
    
    socket.send(JSON.stringify(message));
  }

  function sendPing() {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      log('Not connected', 'error');
      return;
    }
    
    log('Sending ping...');
    const message = {
      type: 'ping',
      timestamp: new Date().toISOString()
    };
    
    socket.send(JSON.stringify(message));
  }

  function sendTaskUpdate() {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      log('Not connected', 'error');
      return;
    }
    
    const taskId = prompt('Enter task ID:');
    if (!taskId) {
      log('Task update cancelled', 'warning');
      return;
    }
    
    log(`Sending task update for task ID: ${taskId}`);
    const message = {
      type: 'task_updated',
      taskId: parseInt(taskId, 10),
      progress: Math.floor(Math.random() * 100),
      status: 'in_progress',
      timestamp: new Date().toISOString()
    };
    
    socket.send(JSON.stringify(message));
  }
  
  // Auto-connect on script load
  connect();
  
  // Expose functions to global scope for debugging
  window.wsTest = {
    connect,
    disconnect,
    authenticate,
    sendPing,
    sendTaskUpdate,
    log
  };
})();