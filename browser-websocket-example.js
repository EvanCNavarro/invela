/**
 * Browser WebSocket Example
 * 
 * This script provides a complete browser-side example of WebSocket usage
 * according to the development guidelines. Copy and paste this code into 
 * the browser console to test the WebSocket connection.
 */

(function() {
  // Create a simple logger for WebSocket actions
  const wsLogger = {
    container: null,
    colors: {
      info: '#4caf50',
      warn: '#ff9800',
      error: '#f44336',
      debug: '#2196f3'
    },
    
    // Initialize logger UI
    init: function() {
      // Check if container already exists
      if (document.getElementById('websocket-logger')) {
        this.container = document.getElementById('websocket-logger');
        this.clear();
        return;
      }
      
      // Create container
      this.container = document.createElement('div');
      this.container.id = 'websocket-logger';
      this.container.style.cssText = 'position: fixed; bottom: 10px; right: 10px; width: 400px; max-height: 500px; ' +
                                     'background: rgba(0, 0, 0, 0.8); color: white; font-family: monospace; ' +
                                     'border-radius: 4px; z-index: 9999; overflow-y: auto; padding: 10px;';
      
      // Create header
      const header = document.createElement('div');
      header.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #444;';
      header.innerHTML = '<div><strong>WebSocket Logger</strong></div>';
      
      // Create controls
      const controls = document.createElement('div');
      
      // Clear button
      const clearBtn = document.createElement('button');
      clearBtn.innerHTML = 'Clear';
      clearBtn.style.cssText = 'background: #333; color: white; border: none; border-radius: 2px; padding: 2px 8px; margin-left: 5px; cursor: pointer;';
      clearBtn.onclick = () => this.clear();
      
      // Close button
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = 'Close';
      closeBtn.style.cssText = 'background: #333; color: white; border: none; border-radius: 2px; padding: 2px 8px; margin-left: 5px; cursor: pointer;';
      closeBtn.onclick = () => this.container.remove();
      
      controls.appendChild(clearBtn);
      controls.appendChild(closeBtn);
      header.appendChild(controls);
      
      this.container.appendChild(header);
      
      // Create log content area
      const content = document.createElement('div');
      content.id = 'websocket-logger-content';
      content.style.cssText = 'font-size: 12px;';
      this.container.appendChild(content);
      
      // Add to body
      document.body.appendChild(this.container);
    },
    
    // Log a message
    log: function(message, data = null, type = 'info') {
      if (!this.container) {
        this.init();
      }
      
      const content = document.getElementById('websocket-logger-content');
      const entry = document.createElement('div');
      entry.style.cssText = 'margin-bottom: 5px; border-left: 3px solid ' + this.colors[type] + '; padding-left: 5px;';
      
      // Add timestamp
      const time = new Date().toLocaleTimeString();
      const timeElement = document.createElement('span');
      timeElement.style.cssText = 'color: #aaa; margin-right: 5px;';
      timeElement.textContent = `[${time}]`;
      entry.appendChild(timeElement);
      
      // Add message
      const messageElement = document.createElement('span');
      messageElement.textContent = message;
      entry.appendChild(messageElement);
      
      // Add data if provided
      if (data) {
        const dataElement = document.createElement('pre');
        dataElement.style.cssText = 'margin: 2px 0 0 15px; background: rgba(0, 0, 0, 0.3); padding: 3px; border-radius: 2px; max-height: 100px; overflow-y: auto;';
        
        // Format data
        let formattedData;
        try {
          if (typeof data === 'object') {
            formattedData = JSON.stringify(data, null, 2);
          } else {
            formattedData = String(data);
          }
        } catch (e) {
          formattedData = '[Unable to format data]';
        }
        
        dataElement.textContent = formattedData;
        entry.appendChild(dataElement);
      }
      
      content.appendChild(entry);
      
      // Auto-scroll to bottom
      this.container.scrollTop = this.container.scrollHeight;
      
      // Also log to console
      console[type === 'error' ? 'error' : type === 'warn' ? 'warn' : 'log'](
        `[WebSocket] ${message}`, data || ''
      );
    },
    
    info: function(message, data = null) {
      this.log(message, data, 'info');
    },
    
    warn: function(message, data = null) {
      this.log(message, data, 'warn');
    },
    
    error: function(message, data = null) {
      this.log(message, data, 'error');
    },
    
    debug: function(message, data = null) {
      this.log(message, data, 'debug');
    },
    
    clear: function() {
      if (this.container) {
        const content = document.getElementById('websocket-logger-content');
        if (content) {
          content.innerHTML = '';
        }
      }
    }
  };

  // WebSocket connection manager
  const wsManager = {
    socket: null,
    connectionId: `ws_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    reconnectTimeout: null,
    pingInterval: null,
    
    // Connect to WebSocket server
    connect: function() {
      if (this.socket) {
        wsLogger.warn('WebSocket already connected or connecting');
        return;
      }
      
      try {
        // Determine the correct protocol based on the current page protocol
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        wsLogger.info(`Connecting to WebSocket: ${wsUrl}`);
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = this.handleOpen.bind(this);
        this.socket.onclose = this.handleClose.bind(this);
        this.socket.onerror = this.handleError.bind(this);
        this.socket.onmessage = this.handleMessage.bind(this);
        
        wsLogger.debug('Connection attempt initiated');
      } catch (error) {
        wsLogger.error('Error creating WebSocket connection', error);
        this.attemptReconnect();
      }
    },
    
    // Disconnect from WebSocket server
    disconnect: function() {
      if (!this.socket) {
        return;
      }
      
      try {
        this.socket.close();
        this.socket = null;
        wsLogger.info('Disconnected from WebSocket server');
      } catch (error) {
        wsLogger.error('Error disconnecting from WebSocket server', error);
      }
      
      this.clearPingInterval();
    },
    
    // Send a message to the WebSocket server
    send: function(type, data = {}) {
      if (!this.isConnected()) {
        wsLogger.warn('Cannot send message: WebSocket not connected');
        return false;
      }
      
      try {
        const message = {
          type,
          ...data,
          timestamp: new Date().toISOString(),
          connectionId: this.connectionId
        };
        
        this.socket.send(JSON.stringify(message));
        wsLogger.debug(`Sent message: ${type}`, message);
        return true;
      } catch (error) {
        wsLogger.error('Error sending message', error);
        return false;
      }
    },
    
    // Check if connected to the WebSocket server
    isConnected: function() {
      return !!this.socket && this.socket.readyState === WebSocket.OPEN;
    },
    
    // Get connection status text
    getConnectionStatus: function() {
      if (!this.socket) return 'Disconnected';
      
      switch (this.socket.readyState) {
        case WebSocket.CONNECTING: return 'Connecting...';
        case WebSocket.OPEN: return 'Connected';
        case WebSocket.CLOSING: return 'Closing...';
        case WebSocket.CLOSED: return 'Disconnected';
        default: return 'Unknown';
      }
    },
    
    // Handle WebSocket open event
    handleOpen: function(event) {
      wsLogger.info('WebSocket connection established');
      this.reconnectAttempts = 0;
      
      // Authenticate
      this.authenticate();
      
      // Start ping interval
      this.startPingInterval();
    },
    
    // Handle WebSocket close event
    handleClose: function(event) {
      wsLogger.info(`WebSocket connection closed: ${event.code} ${event.reason}`);
      this.socket = null;
      this.clearPingInterval();
      
      this.attemptReconnect();
    },
    
    // Handle WebSocket error event
    handleError: function(event) {
      wsLogger.error('WebSocket error:', event);
    },
    
    // Handle WebSocket message event
    handleMessage: function(event) {
      try {
        const message = JSON.parse(event.data);
        wsLogger.info('Received message:', message);
        
        // Handle specific message types
        switch (message.type) {
          case 'pong':
            wsLogger.debug('Received pong response', message);
            break;
          
          case 'task_updated':
            wsLogger.info('Task updated:', message);
            break;
          
          case 'form_submission_completed':
            wsLogger.info('Form submission completed:', message);
            break;
            
          case 'tabs_updated':
            wsLogger.info('Available tabs updated:', message);
            break;
        }
      } catch (error) {
        wsLogger.error('Error parsing message', error);
      }
    },
    
    // Send authentication message
    authenticate: function() {
      // In a real app, you would get this data from your auth service
      const userId = 331; // Example user ID
      const companyId = 288; // Example company ID
      
      this.send('authenticate', {
        userId,
        companyId,
        clientId: this.connectionId
      });
      
      wsLogger.info('Sent authentication request');
    },
    
    // Send a ping message
    ping: function() {
      if (this.isConnected()) {
        this.send('ping');
      }
    },
    
    // Start ping interval
    startPingInterval: function() {
      this.clearPingInterval();
      
      this.pingInterval = setInterval(() => {
        this.ping();
      }, 30000);
    },
    
    // Clear ping interval
    clearPingInterval: function() {
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
    },
    
    // Attempt to reconnect
    attemptReconnect: function() {
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        wsLogger.warn(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached`);
        return;
      }
      
      const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts);
      this.reconnectAttempts++;
      
      wsLogger.warn(`Attempting to reconnect in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      this.reconnectTimeout = setTimeout(() => {
        wsLogger.info(`Executing reconnection attempt ${this.reconnectAttempts}`);
        this.connect();
      }, delay);
    },
    
    // Create UI elements
    createUI: function() {
      // Create control panel if it doesn't exist yet
      if (document.getElementById('ws-control-panel')) {
        return;
      }
      
      const panel = document.createElement('div');
      panel.id = 'ws-control-panel';
      panel.style.cssText = 'position: fixed; top: 10px; right: 10px; background: rgba(0, 0, 0, 0.8); ' +
                           'color: white; font-family: sans-serif; padding: 10px; border-radius: 4px; ' +
                           'z-index: 9999; font-size: 14px;';
      
      // Header
      const header = document.createElement('div');
      header.style.cssText = 'font-weight: bold; margin-bottom: 10px; display: flex; justify-content: space-between;';
      header.innerHTML = '<div>WebSocket Controls</div>';
      
      // Close button for the panel
      const closeBtn = document.createElement('div');
      closeBtn.innerHTML = '✕';
      closeBtn.style.cssText = 'cursor: pointer; font-size: 16px;';
      closeBtn.onclick = () => panel.remove();
      header.appendChild(closeBtn);
      
      panel.appendChild(header);
      
      // Status display
      const status = document.createElement('div');
      status.id = 'ws-status';
      status.style.cssText = 'margin-bottom: 10px; padding: 5px; background: rgba(0, 0, 0, 0.3); border-radius: 3px;';
      panel.appendChild(status);
      
      // Update status display
      const updateStatus = () => {
        const statusText = this.getConnectionStatus();
        let statusColor = '#f44336'; // Red for disconnected
        
        if (statusText === 'Connected') {
          statusColor = '#4caf50'; // Green for connected
        } else if (statusText === 'Connecting...' || statusText === 'Closing...') {
          statusColor = '#ff9800'; // Orange for transitional states
        }
        
        status.innerHTML = `Status: <span style="color: ${statusColor};">${statusText}</span>`;
      };
      
      // Initial status update
      updateStatus();
      
      // Set interval to update status
      setInterval(updateStatus, 1000);
      
      // Button container
      const buttons = document.createElement('div');
      buttons.style.cssText = 'display: flex; gap: 5px; flex-wrap: wrap;';
      
      // Connect button
      const connectBtn = document.createElement('button');
      connectBtn.innerHTML = 'Connect';
      connectBtn.style.cssText = 'background: #2196f3; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;';
      connectBtn.onclick = () => this.connect();
      buttons.appendChild(connectBtn);
      
      // Disconnect button
      const disconnectBtn = document.createElement('button');
      disconnectBtn.innerHTML = 'Disconnect';
      disconnectBtn.style.cssText = 'background: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;';
      disconnectBtn.onclick = () => this.disconnect();
      buttons.appendChild(disconnectBtn);
      
      // Ping button
      const pingBtn = document.createElement('button');
      pingBtn.innerHTML = 'Send Ping';
      pingBtn.style.cssText = 'background: #4caf50; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;';
      pingBtn.onclick = () => this.ping();
      buttons.appendChild(pingBtn);
      
      // Task update button
      const taskBtn = document.createElement('button');
      taskBtn.innerHTML = 'Simulate Task Update';
      taskBtn.style.cssText = 'background: #9c27b0; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;';
      taskBtn.onclick = () => {
        this.send('simulate_task_update', {
          taskId: Math.floor(Math.random() * 1000),
          progress: Math.floor(Math.random() * 100),
          status: ["pending", "in_progress", "completed"][Math.floor(Math.random() * 3)],
        });
      };
      buttons.appendChild(taskBtn);
      
      panel.appendChild(buttons);
      document.body.appendChild(panel);
    }
  };
  
  // Initialize
  wsLogger.init();
  wsManager.createUI();
  
  // Connect automatically
  wsManager.connect();
  
  // Log success
  wsLogger.info('WebSocket test environment initialized');
  wsLogger.debug('Use the controls to interact with WebSocket connection');
  
  // Return the manager for console access
  return wsManager;
})();