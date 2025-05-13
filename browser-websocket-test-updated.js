/**
 * Updated Browser WebSocket Test Script
 * 
 * This script tests the WebSocket connection and functionality.
 * Copy and paste this code into your browser console to test the WebSocket.
 */

(function() {
  // Create UI container for WebSocket testing
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.bottom = '10px';
  container.style.right = '10px';
  container.style.width = '300px';
  container.style.padding = '10px';
  container.style.backgroundColor = '#f0f0f0';
  container.style.border = '1px solid #ccc';
  container.style.borderRadius = '5px';
  container.style.zIndex = '9999';
  container.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.fontSize = '12px';
  
  // Create header
  const header = document.createElement('div');
  header.style.fontWeight = 'bold';
  header.style.marginBottom = '5px';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.innerHTML = '<span>WebSocket Tester</span>';
  
  // Create close button
  const closeButton = document.createElement('button');
  closeButton.innerHTML = 'X';
  closeButton.style.border = 'none';
  closeButton.style.background = 'none';
  closeButton.style.cursor = 'pointer';
  closeButton.style.fontWeight = 'bold';
  closeButton.style.padding = '0 5px';
  closeButton.onclick = function() {
    document.body.removeChild(container);
    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
      window.ws.close();
    }
  };
  header.appendChild(closeButton);
  
  // Create status display
  const statusDisplay = document.createElement('div');
  statusDisplay.id = 'ws-status';
  statusDisplay.style.padding = '5px';
  statusDisplay.style.marginBottom = '5px';
  statusDisplay.style.backgroundColor = '#eee';
  statusDisplay.style.borderRadius = '3px';
  statusDisplay.innerHTML = 'Status: Disconnected';
  
  // Create log container
  const logContainer = document.createElement('div');
  logContainer.style.height = '150px';
  logContainer.style.overflowY = 'auto';
  logContainer.style.marginBottom = '5px';
  logContainer.style.padding = '5px';
  logContainer.style.backgroundColor = '#333';
  logContainer.style.color = '#eee';
  logContainer.style.borderRadius = '3px';
  logContainer.style.fontFamily = 'monospace';
  logContainer.style.whiteSpace = 'pre-wrap';
  logContainer.style.fontSize = '11px';
  
  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '5px';
  buttonContainer.style.flexWrap = 'wrap';
  
  // Create connect button
  const connectButton = document.createElement('button');
  connectButton.innerHTML = 'Connect';
  connectButton.style.padding = '5px';
  connectButton.style.flex = '1';
  connectButton.onclick = function() { connect(); };
  
  // Create disconnect button
  const disconnectButton = document.createElement('button');
  disconnectButton.innerHTML = 'Disconnect';
  disconnectButton.style.padding = '5px';
  disconnectButton.style.flex = '1';
  disconnectButton.onclick = function() { disconnect(); };
  
  // Create ping button
  const pingButton = document.createElement('button');
  pingButton.innerHTML = 'Ping';
  pingButton.style.padding = '5px';
  pingButton.style.flex = '1';
  pingButton.onclick = function() { sendPing(); };
  
  // Create authenticate button
  const authButton = document.createElement('button');
  authButton.innerHTML = 'Auth';
  authButton.style.padding = '5px';
  authButton.style.flex = '1';
  authButton.onclick = function() { authenticate(); };
  
  // Append buttons to container
  buttonContainer.appendChild(connectButton);
  buttonContainer.appendChild(disconnectButton);
  buttonContainer.appendChild(pingButton);
  buttonContainer.appendChild(authButton);
  
  // Assemble all elements
  container.appendChild(header);
  container.appendChild(statusDisplay);
  container.appendChild(logContainer);
  container.appendChild(buttonContainer);
  
  // Add to document
  document.body.appendChild(container);
  
  // Define utility functions
  function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.style.marginBottom = '2px';
    
    let color = '#fff';
    switch(type) {
      case 'info': color = '#8ad4ff'; break;
      case 'success': color = '#8aff9d'; break;
      case 'error': color = '#ff8a8a'; break;
      case 'receive': color = '#d7a9ff'; break;
      case 'send': color = '#ffe28a'; break;
    }
    
    entry.innerHTML = `<span style="color: ${color}">[${timestamp}] ${message}</span>`;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
  }
  
  function updateStatus(status) {
    const statusDisplay = document.getElementById('ws-status');
    let color = '#eee';
    switch(status) {
      case 'Connected': color = '#d4ffda'; break;
      case 'Connecting...': color = '#fff6d4'; break;
      case 'Disconnected': color = '#ffd4d4'; break;
      case 'Authenticated': color = '#d4f6ff'; break;
    }
    statusDisplay.style.backgroundColor = color;
    statusDisplay.innerHTML = `Status: ${status}`;
  }
  
  // WebSocket functions
  window.connect = function() {
    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
      log('Already connected', 'info');
      return;
    }
    
    updateStatus('Connecting...');
    log('Connecting to WebSocket server...', 'info');
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    log(`WebSocket URL: ${wsUrl}`, 'info');
    
    try {
      window.ws = new WebSocket(wsUrl);
      
      window.ws.onopen = function() {
        updateStatus('Connected');
        log('Connection established', 'success');
      };
      
      window.ws.onmessage = function(event) {
        try {
          const data = JSON.parse(event.data);
          const formattedData = JSON.stringify(data, null, 2);
          log(`Received: ${formattedData}`, 'receive');
          
          if (data.type === 'authenticated') {
            updateStatus('Authenticated');
          }
        } catch (error) {
          log(`Error parsing message: ${error.message}`, 'error');
          log(`Raw message: ${event.data}`, 'receive');
        }
      };
      
      window.ws.onclose = function(event) {
        updateStatus('Disconnected');
        log(`Connection closed (code: ${event.code}, reason: ${event.reason || 'No reason provided'})`, 'info');
      };
      
      window.ws.onerror = function(error) {
        updateStatus('Error');
        log(`WebSocket error: ${error.message || 'Unknown error'}`, 'error');
      };
    } catch (error) {
      updateStatus('Error');
      log(`Connection error: ${error.message}`, 'error');
    }
  };
  
  window.disconnect = function() {
    if (!window.ws || window.ws.readyState !== WebSocket.OPEN) {
      log('Not connected', 'info');
      return;
    }
    
    log('Disconnecting...', 'info');
    window.ws.close();
  };
  
  window.sendPing = function() {
    if (!window.ws || window.ws.readyState !== WebSocket.OPEN) {
      log('Not connected', 'error');
      return;
    }
    
    const ping = {
      type: 'ping',
      timestamp: new Date().toISOString()
    };
    
    window.ws.send(JSON.stringify(ping));
    log(`Sent: ${JSON.stringify(ping)}`, 'send');
  };
  
  window.authenticate = function() {
    if (!window.ws || window.ws.readyState !== WebSocket.OPEN) {
      log('Not connected', 'error');
      return;
    }
    
    // Try to get user ID and company ID from the page context
    // This is a best effort and may not work depending on how the app stores this info
    let userId = null;
    let companyId = null;
    
    // Try to find user information in localStorage or global variables
    try {
      if (window.currentUser) {
        userId = window.currentUser.id || null;
        companyId = window.currentUser.company_id || null;
      } else if (localStorage.getItem('user')) {
        const user = JSON.parse(localStorage.getItem('user'));
        userId = user.id || null;
        companyId = user.company_id || null;
      }
    } catch (error) {
      log('Error getting user information', 'error');
    }
    
    // If we couldn't find it, use some default IDs for testing
    if (!userId) userId = 8;  // Default test user ID
    if (!companyId) companyId = 1;  // Default test company ID
    
    const auth = {
      type: 'authenticate',
      userId: userId,
      companyId: companyId,
      clientId: `browser-test-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    
    window.ws.send(JSON.stringify(auth));
    log(`Sent authentication request: ${JSON.stringify(auth)}`, 'send');
  };
  
  // Start with a connected WebSocket
  log('WebSocket tester initialized', 'info');
  connect();
})();