/**
 * Client-Side WebSocket Usage Example
 * 
 * This file demonstrates how to connect to the WebSocket server
 * from the browser and handle various message types.
 * 
 * Include this script in your browser application and initialize 
 * with createWebSocketClient().
 */

/**
 * Creates and returns a WebSocket client instance
 * 
 * @returns {Object} WebSocket client interface
 */
function createWebSocketClient() {
  // State variables
  let socket = null;
  let isConnected = false;
  let isAuthenticated = false;
  let reconnectAttempts = 0;
  let maxReconnectAttempts = 5;
  let reconnectDelay = 1000; // Start with 1 second, will increase with backoff
  let connectionId = null;
  let messageHandlers = new Map();
  let userId = null;
  let companyId = null;
  
  /**
   * Initialize the connection to the WebSocket server
   */
  function connect() {
    // Determine the WebSocket URL based on the current location
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log(`[WebSocket] Connecting to WebSocket:`, wsUrl);
    
    // Create a new WebSocket connection
    socket = new WebSocket(wsUrl);
    
    // Set up event handlers
    socket.onopen = handleOpen;
    socket.onmessage = handleMessage;
    socket.onclose = handleClose;
    socket.onerror = handleError;
  }
  
  /**
   * Handle WebSocket connection open event
   */
  function handleOpen() {
    console.log('[WebSocket] WebSocket connection established');
    isConnected = true;
    reconnectAttempts = 0;
    
    // Trigger any onConnect listeners
    triggerEvent('connect');
  }
  
  /**
   * Handle incoming WebSocket messages
   */
  function handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      
      console.log(`[WebSocket] Received message:`, message);
      
      // Handle connection established message
      if (message.type === 'connection_established') {
        console.log(`[WebSocket] Server connection confirmed:`, message.message);
        connectionId = message.clientId;
        
        // Authenticate if we have user data
        if (userId && companyId) {
          authenticate();
        }
      }
      
      // Handle authentication confirmation
      if (message.type === 'authenticated') {
        console.log(`[WebSocket] Authentication successful:`, message.message);
        isAuthenticated = true;
        triggerEvent('authenticated');
      }
      
      // Handle task updates
      if (message.type === 'task_update') {
        const taskData = message.payload;
        console.log(`[WebSocket] Task update received: Task #${taskData.taskId} - Status: ${taskData.status}, Progress: ${taskData.progress}%`);
        triggerEvent('task_update', taskData);
      }
      
      // Handle form submission completed
      if (message.type === 'form_submission_completed') {
        const submissionData = message.payload;
        console.log(`[WebSocket] Form submission completed: Task #${submissionData.taskId} - Type: ${submissionData.formType}`);
        triggerEvent('form_submission_completed', submissionData);
      }
      
      // Handle company tabs updated
      if (message.type === 'company_tabs_updated') {
        const tabsData = message.payload;
        console.log(`[WebSocket] Company tabs updated: Company #${tabsData.companyId} - Tabs: ${tabsData.availableTabs.join(', ')}`);
        triggerEvent('company_tabs_updated', tabsData);
      }
      
      // Handle pong response
      if (message.type === 'pong') {
        console.log(`[WebSocket] Pong received`);
        triggerEvent('pong');
      }
      
    } catch (error) {
      console.error('[WebSocket] Error parsing message:', error);
    }
  }
  
  /**
   * Handle WebSocket connection close event
   */
  function handleClose(event) {
    console.log(`[WebSocket] WebSocket connection closed:`, event.code, event.reason);
    isConnected = false;
    isAuthenticated = false;
    
    // Trigger any onDisconnect listeners
    triggerEvent('disconnect', { code: event.code, reason: event.reason });
    
    // Attempt to reconnect if not a normal closure
    if (event.code !== 1000) {
      scheduleReconnect();
    }
  }
  
  /**
   * Handle WebSocket error event
   */
  function handleError(event) {
    console.error('[WebSocket] WebSocket error:', event);
    triggerEvent('error', event);
  }
  
  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  function scheduleReconnect() {
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.error(`[WebSocket] Maximum reconnection attempts (${maxReconnectAttempts}) reached`);
      triggerEvent('max_reconnect_attempts');
      return;
    }
    
    reconnectAttempts++;
    const delay = Math.min(30000, reconnectDelay * Math.pow(1.5, reconnectAttempts - 1));
    
    console.log(`[WebSocket] Scheduling reconnection attempt in ${delay/1000} seconds...`);
    
    setTimeout(() => {
      console.log(`[WebSocket] Attempting to reconnect (attempt ${reconnectAttempts})...`);
      connect();
    }, delay);
  }
  
  /**
   * Send authentication information to the server
   */
  function authenticate() {
    if (!isConnected) {
      console.warn('[WebSocket] Cannot authenticate: not connected');
      return;
    }
    
    const authMessage = {
      type: 'authenticate',
      userId: userId,
      companyId: companyId,
      clientId: connectionId,
      timestamp: new Date().toISOString()
    };
    
    console.log(`[WebSocket] Sending authentication message`, authMessage);
    socket.send(JSON.stringify(authMessage));
  }
  
  /**
   * Set user and company information for authentication
   */
  function setUserInfo(newUserId, newCompanyId) {
    userId = newUserId;
    companyId = newCompanyId;
    
    // If already connected, authenticate with the new info
    if (isConnected && !isAuthenticated && userId && companyId) {
      authenticate();
    }
  }
  
  /**
   * Send a ping message to keep the connection alive
   */
  function sendPing() {
    if (!isConnected) {
      console.warn('[WebSocket] Cannot send ping: not connected');
      return;
    }
    
    const pingMessage = {
      type: 'ping',
      timestamp: new Date().toISOString(),
      connectionId: connectionId
    };
    
    socket.send(JSON.stringify(pingMessage));
  }
  
  /**
   * Send a task update message to the server
   */
  function sendTaskUpdate(taskId, status, progress = null) {
    if (!isConnected || !isAuthenticated) {
      console.warn('[WebSocket] Cannot send task update: not connected or not authenticated');
      return;
    }
    
    const updateMessage = {
      type: 'update_task',
      taskId: taskId,
      status: status,
      progress: progress,
      timestamp: new Date().toISOString()
    };
    
    socket.send(JSON.stringify(updateMessage));
  }
  
  /**
   * Register an event handler
   */
  function on(eventName, handler) {
    if (!messageHandlers.has(eventName)) {
      messageHandlers.set(eventName, []);
    }
    
    messageHandlers.get(eventName).push(handler);
  }
  
  /**
   * Remove an event handler
   */
  function off(eventName, handler) {
    if (!messageHandlers.has(eventName)) {
      return;
    }
    
    const handlers = messageHandlers.get(eventName);
    const index = handlers.indexOf(handler);
    
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }
  
  /**
   * Trigger event handlers for a specific event
   */
  function triggerEvent(eventName, data = null) {
    if (!messageHandlers.has(eventName)) {
      return;
    }
    
    const handlers = messageHandlers.get(eventName);
    
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (error) {
        console.error(`[WebSocket] Error in ${eventName} handler:`, error);
      }
    }
  }
  
  /**
   * Disconnect from the WebSocket server
   */
  function disconnect() {
    if (!socket) {
      return;
    }
    
    console.log('[WebSocket] Disconnecting from WebSocket server');
    
    // Only send close event if the connection is open
    if (socket.readyState === WebSocket.OPEN) {
      socket.close(1000, 'Client requested disconnect');
    }
    
    isConnected = false;
    isAuthenticated = false;
  }
  
  /**
   * Check if the WebSocket connection is currently active
   */
  function isActive() {
    return isConnected && isAuthenticated;
  }
  
  // Start the heartbeat to keep the connection alive
  const heartbeatInterval = setInterval(() => {
    if (isConnected) {
      sendPing();
    }
  }, 30000); // Send ping every 30 seconds
  
  // Public API
  return {
    connect,
    disconnect,
    setUserInfo,
    sendTaskUpdate,
    on,
    off,
    isActive
  };
}

// Usage example:
if (typeof window !== 'undefined') {
  // Only execute in a browser environment
  const wsClient = createWebSocketClient();
  
  // Listen for connection
  wsClient.on('connect', () => {
    console.log('WebSocket connected!');
    
    // Set user info once connected (if available)
    const currentUser = getCurrentUserData();
    if (currentUser) {
      wsClient.setUserInfo(currentUser.id, currentUser.companyId);
    }
  });
  
  // Listen for task updates
  wsClient.on('task_update', (taskData) => {
    console.log('Task update received:', taskData);
    // Update UI with task status and progress
  });
  
  // Listen for form submission completed
  wsClient.on('form_submission_completed', (data) => {
    console.log('Form submission completed:', data);
    // Show success message and update available tabs
  });
  
  // Connect to the WebSocket server
  wsClient.connect();
  
  // Helper function to get current user data
  function getCurrentUserData() {
    // In a real implementation, you would get this from your app's state
    // This is just a placeholder example
    return {
      id: 321,
      companyId: 278
    };
  }
  
  // Make the client globally available
  window.wsClient = wsClient;
}