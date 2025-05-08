/**
 * Direct WebSocket Usage Example
 * 
 * This script demonstrates how to connect to and use the enhanced WebSocket service
 * in a browser environment.
 */

/**
 * WebSocket Connection Handler
 * 
 * This class provides a consistent API for interacting with WebSockets
 * with automatic reconnection and event handling.
 */
class WebSocketHandler {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second delay
    this.listeners = new Map();
    this.clientId = null;
    this.lastPingTime = null;
    this.pingInterval = null;
    
    // Bind methods to this
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.reconnect = this.reconnect.bind(this);
    this.startPingInterval = this.startPingInterval.bind(this);
    this.stopPingInterval = this.stopPingInterval.bind(this);
    this.ping = this.ping.bind(this);
  }
  
  /**
   * Connect to the WebSocket server
   */
  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      console.log('[WebSocketHandler] Socket already connected or connecting');
      return;
    }
    
    try {
      // Create a WebSocket connection using the current protocol and host
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log(`[WebSocketHandler] Connecting to WebSocket: ${wsUrl}`);
      
      this.socket = new WebSocket(wsUrl);
      
      // Set up event handlers
      this.socket.onopen = (event) => {
        console.log('[WebSocketHandler] WebSocket connection established');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Start ping interval to keep connection alive
        this.startPingInterval();
        
        // Trigger any onOpen listeners
        this._triggerEvent('onOpen', event);
      };
      
      this.socket.onmessage = (event) => {
        this.handleMessage(event);
      };
      
      this.socket.onclose = (event) => {
        console.log('[WebSocketHandler] WebSocket connection closed', event);
        this.isConnected = false;
        this.stopPingInterval();
        
        // Trigger any onClose listeners
        this._triggerEvent('onClose', event);
        
        // Attempt to reconnect if necessary
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnect();
        } else {
          console.error('[WebSocketHandler] Maximum reconnect attempts reached');
        }
      };
      
      this.socket.onerror = (error) => {
        console.error('[WebSocketHandler] WebSocket error', error);
        
        // Trigger any onError listeners
        this._triggerEvent('onError', error);
      };
    } catch (error) {
      console.error('[WebSocketHandler] Error creating WebSocket connection', error);
    }
  }
  
  /**
   * Disconnect from the WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.stopPingInterval();
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
      console.log('[WebSocketHandler] WebSocket disconnected');
    }
  }
  
  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      console.log('[WebSocketHandler] Received message:', message);
      
      // Handle connection established message
      if (message.type === 'connection_established') {
        this.clientId = message.clientId;
        console.log('[WebSocketHandler] Client ID assigned:', this.clientId);
        
        // Authenticate after connection is established
        this.authenticate();
      }
      
      // Handle pong response
      if (message.type === 'pong') {
        this.lastPingTime = new Date();
        console.log('[WebSocketHandler] Pong received, connection alive');
      }
      
      // Handle form submission completed
      if (message.type === 'form_submission_completed') {
        console.log('[WebSocketHandler] Form submission completed:', message);
        // You could trigger a UI update here
      }
      
      // Handle task updates
      if (message.type === 'task_updated') {
        console.log('[WebSocketHandler] Task updated:', message);
        // You could update task state in your app here
      }
      
      // Trigger event for this message type
      this._triggerEvent(message.type, message);
      
      // Trigger general message event
      this._triggerEvent('message', message);
    } catch (error) {
      console.error('[WebSocketHandler] Error handling message', error, event.data);
    }
  }
  
  /**
   * Send a message to the WebSocket server
   */
  sendMessage(type, data = {}) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('[WebSocketHandler] Cannot send message, socket not open');
      return false;
    }
    
    try {
      const message = JSON.stringify({
        type,
        timestamp: new Date().toISOString(),
        ...data
      });
      
      this.socket.send(message);
      return true;
    } catch (error) {
      console.error('[WebSocketHandler] Error sending message', error);
      return false;
    }
  }
  
  /**
   * Send an authentication message
   */
  authenticate() {
    // In a real app, you would include user credentials
    return this.sendMessage('authenticate', {
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Send a ping to keep the connection alive
   */
  ping() {
    return this.sendMessage('ping');
  }
  
  /**
   * Attempt to reconnect to the WebSocket server
   */
  reconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    
    console.log(`[WebSocketHandler] Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      console.log(`[WebSocketHandler] Attempting to reconnect (attempt ${this.reconnectAttempts})`);
      this.connect();
    }, delay);
  }
  
  /**
   * Start the ping interval to keep the connection alive
   */
  startPingInterval() {
    this.stopPingInterval();
    
    this.pingInterval = setInterval(() => {
      if (this.isConnected) {
        this.ping();
      }
    }, 20000); // Ping every 20 seconds
  }
  
  /**
   * Stop the ping interval
   */
  stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
  
  /**
   * Add an event listener
   */
  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    this.listeners.get(event).push(callback);
  }
  
  /**
   * Remove an event listener
   */
  removeEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      return;
    }
    
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }
  
  /**
   * Trigger an event
   */
  _triggerEvent(event, data) {
    if (!this.listeners.has(event)) {
      return;
    }
    
    const callbacks = this.listeners.get(event);
    
    for (const callback of callbacks) {
      try {
        callback(data);
      } catch (error) {
        console.error(`[WebSocketHandler] Error in event listener for ${event}`, error);
      }
    }
  }
}

// Create WebSocket handler instance
const wsHandler = new WebSocketHandler();

// Example: Connect to WebSocket server
wsHandler.connect();

// Example: Listen for form submission events
wsHandler.addEventListener('form_submission_completed', (message) => {
  // Example: Show a notification when a form is submitted
  console.log('Form submitted!', message);
  alert(`Form ${message.formType} for task ${message.taskId} was submitted successfully!`);
});

// Example: Listen for task updates
wsHandler.addEventListener('task_updated', (message) => {
  // Example: Update task status in UI
  console.log('Task updated!', message);
  // Example: Update UI with new task status
  document.querySelectorAll(`[data-task-id="${message.id}"]`).forEach(element => {
    element.dataset.status = message.status;
    element.querySelector('.task-status').textContent = message.status;
    element.querySelector('.task-progress').textContent = `${message.progress}%`;
  });
});

// Export the handler for use in other parts of the application
window.wsHandler = wsHandler;

// Simple UI for testing
function createWebSocketTestUI() {
  // Create a floating UI for testing WebSocket
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.backgroundColor = '#f0f0f0';
  container.style.padding = '10px';
  container.style.borderRadius = '5px';
  container.style.boxShadow = '0 0 10px rgba(0,0,0,0.1)';
  container.style.zIndex = '9999';
  container.style.maxWidth = '300px';
  
  const title = document.createElement('h3');
  title.textContent = 'WebSocket Tester';
  title.style.margin = '0 0 10px 0';
  container.appendChild(title);
  
  const statusIndicator = document.createElement('div');
  statusIndicator.id = 'ws-status';
  statusIndicator.style.display = 'inline-block';
  statusIndicator.style.width = '12px';
  statusIndicator.style.height = '12px';
  statusIndicator.style.borderRadius = '50%';
  statusIndicator.style.backgroundColor = '#ccc';
  statusIndicator.style.marginRight = '5px';
  container.appendChild(statusIndicator);
  
  const statusText = document.createElement('span');
  statusText.id = 'ws-status-text';
  statusText.textContent = 'Disconnected';
  container.appendChild(statusText);
  
  container.appendChild(document.createElement('br'));
  container.appendChild(document.createElement('br'));
  
  const connectButton = document.createElement('button');
  connectButton.textContent = 'Connect';
  connectButton.onclick = () => {
    wsHandler.connect();
  };
  container.appendChild(connectButton);
  
  const disconnectButton = document.createElement('button');
  disconnectButton.textContent = 'Disconnect';
  disconnectButton.style.marginLeft = '5px';
  disconnectButton.onclick = () => {
    wsHandler.disconnect();
  };
  container.appendChild(disconnectButton);
  
  container.appendChild(document.createElement('br'));
  container.appendChild(document.createElement('br'));
  
  const pingButton = document.createElement('button');
  pingButton.textContent = 'Send Ping';
  pingButton.onclick = () => {
    wsHandler.ping();
  };
  container.appendChild(pingButton);
  
  container.appendChild(document.createElement('br'));
  container.appendChild(document.createElement('br'));
  
  const logContainer = document.createElement('div');
  logContainer.id = 'ws-log';
  logContainer.style.maxHeight = '200px';
  logContainer.style.overflowY = 'auto';
  logContainer.style.border = '1px solid #ccc';
  logContainer.style.padding = '5px';
  logContainer.style.fontSize = '12px';
  container.appendChild(logContainer);
  
  document.body.appendChild(container);
  
  // Update status when connection changes
  wsHandler.addEventListener('onOpen', () => {
    statusIndicator.style.backgroundColor = '#00c853';
    statusText.textContent = 'Connected';
    logMessage('Connected to WebSocket server');
  });
  
  wsHandler.addEventListener('onClose', () => {
    statusIndicator.style.backgroundColor = '#ff3d00';
    statusText.textContent = 'Disconnected';
    logMessage('Disconnected from WebSocket server');
  });
  
  wsHandler.addEventListener('message', (message) => {
    logMessage(`Received: ${message.type}`);
  });
  
  function logMessage(message) {
    const logItem = document.createElement('div');
    logItem.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
    logContainer.appendChild(logItem);
    
    // Keep the log scrolled to the bottom
    logContainer.scrollTop = logContainer.scrollHeight;
    
    // Limit log items
    while (logContainer.children.length > 50) {
      logContainer.removeChild(logContainer.firstChild);
    }
  }
}

// Create test UI when the page is loaded
if (document.readyState === 'complete') {
  createWebSocketTestUI();
} else {
  window.addEventListener('load', createWebSocketTestUI);
}

// Export for debugging
console.log('WebSocket handler initialized and available at window.wsHandler');