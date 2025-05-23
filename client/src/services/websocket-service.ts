/**
 * ========================================
 * WebSocket Service - Real-Time Communication Hub
 * ========================================
 * 
 * Enterprise-grade WebSocket service providing comprehensive real-time communication
 * capabilities across the risk assessment platform. Manages bidirectional messaging,
 * connection lifecycle, authentication, and specialized hooks for different use cases.
 * 
 * Key Features:
 * - Authenticated WebSocket connections with automatic reconnection
 * - Real-time tutorial progress synchronization across browser tabs
 * - Task update notifications and workflow coordination
 * - Comprehensive error handling and connection state management
 * - Type-safe message routing and event handling
 * 
 * Communication Patterns:
 * - Tutorial Progress: Cross-tab tutorial state synchronization
 * - Task Updates: Real-time workflow status updates
 * - Notifications: System-wide alert and message broadcasting
 * - Authentication: Secure connection establishment and maintenance
 * - Health Monitoring: Connection heartbeat and status tracking
 * 
 * @module services/websocket-service
 * @version 1.0.0
 * @since 2025-05-23
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// Types for WebSocket messages
export type MessageType = 
  | 'ping'
  | 'pong'
  | 'authenticate'
  | 'authenticated'
  | 'notification'
  | 'tutorial_progress'
  | 'tutorial_completed'
  | 'task_updated'
  | 'error';

export interface WebSocketMessage {
  type: MessageType;
  timestamp: string;
  [key: string]: any;
}

export interface NotificationMessage extends WebSocketMessage {
  type: 'notification';
  title: string;
  message: string;
  variant?: 'default' | 'destructive' | 'success';
  metadata?: Record<string, any>;
}

export interface TutorialProgressMessage extends WebSocketMessage {
  type: 'tutorial_progress';
  tabName: string;
  progress: {
    currentStep: number;
    totalSteps: number;
  };
}

export interface TutorialCompletedMessage extends WebSocketMessage {
  type: 'tutorial_completed';
  tabName: string;
}

// Main WebSocket service class
class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second delay
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private connectionId: string | null = null;
  
  // Connection status
  private _isConnected = false;
  private _isAuthenticated = false;
  
  // Ping interval to keep connection alive
  private pingInterval: NodeJS.Timeout | null = null;
  
  /**
   * Initialize and connect to the WebSocket server
   */
  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return;
    }
    
    try {
      // Determine the WebSocket URL based on the current protocol
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log(`[WebSocket] Connecting to WebSocket: ${wsUrl}`);
      this.socket = new WebSocket(wsUrl);
      
      // Setup event handlers
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.scheduleReconnect();
    }
  }
  
  /**
   * Disconnect from the WebSocket server
   */
  disconnect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    this._isConnected = false;
    this._isAuthenticated = false;
    this.connectionId = null;
  }
  
  /**
   * Handle WebSocket open event
   */
  private handleOpen(event: Event) {
    console.log('[WebSocket] Connection established');
    this._isConnected = true;
    this.reconnectAttempts = 0;
    
    // Start ping interval
    this.startPingInterval();
    
    // Authenticate after connection
    this.authenticate();
    
    // Notify listeners
    this.notifyListeners('connection', { connected: true });
  }
  
  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      console.log('[WebSocket] Received message:', data);
      
      // Set connection ID if received
      if (data.type === 'connection_established' && data.clientId) {
        this.connectionId = data.clientId;
        console.log(`[WebSocket] Connection established with ID: ${this.connectionId}`);
      }
      
      // Handle authentication confirmation
      if (data.type === 'authenticated') {
        this._isAuthenticated = true;
        console.log('[WebSocket] Authentication successful');
      }
      
      // Notify message type specific listeners
      if (data.type) {
        this.notifyListeners(data.type, data);
      }
      
      // Always notify generic message listeners
      this.notifyListeners('message', data);
      
    } catch (error) {
      console.error('[WebSocket] Error parsing message:', error, event.data);
    }
  }
  
  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent) {
    console.log(`[WebSocket] Connection closed: ${event.code} ${event.reason}`);
    this._isConnected = false;
    this._isAuthenticated = false;
    
    // Clear ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    // Schedule reconnection
    this.scheduleReconnect();
    
    // Notify listeners
    this.notifyListeners('connection', { connected: false });
  }
  
  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event) {
    console.error('[WebSocket] Connection error:', event);
    // The onclose handler will be called after this
  }
  
  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WebSocket] Maximum reconnection attempts reached');
      return;
    }
    
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts);
    this.reconnectAttempts++;
    
    console.log(`[WebSocket] Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (!this._isConnected) {
        console.log('[WebSocket] Connection attempt initiated');
        this.connect();
      }
    }, delay);
  }
  
  /**
   * Start ping interval to keep connection alive
   */
  private startPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    this.pingInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.sendMessage({
          type: 'ping',
          timestamp: new Date().toISOString(),
          connectionId: this.connectionId
        });
      }
    }, 30000); // Send ping every 30 seconds
  }
  
  /**
   * Authenticate with the WebSocket server
   * If userId and companyId are provided, they will be included in the authentication message
   */
  authenticate(userId?: string | number, companyId?: string | number) {
    // Fetch current user data for authentication if not provided
    if (!userId) {
      const currentUserDataStr = localStorage.getItem('currentUser');
      if (currentUserDataStr) {
        try {
          const userData = JSON.parse(currentUserDataStr);
          userId = userData.id;
          companyId = userData.companyId;
        } catch (e) {
          console.error('[WebSocket] Error parsing user data from localStorage', e);
        }
      }
    }
    
    console.log('[WebSocket] Sending authentication message', {
      userId,
      companyId,
      connectionId: this.connectionId
    });
    
    this.sendMessage({
      type: 'authenticate',
      userId: userId?.toString(),
      companyId: companyId?.toString(),
      connectionId: this.connectionId,
      hasUserData: !!userId,
      hasCompanyData: !!companyId,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Send a message to the WebSocket server
   */
  sendMessage(message: any) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      this.socket.send(messageStr);
      return true;
    }
    return false;
  }
  
  /**
   * Add an event listener
   */
  addEventListener(type: string, callback: (data: any) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)?.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }
  
  /**
   * Remove an event listener
   */
  removeEventListener(type: string, callback: (data: any) => void) {
    this.listeners.get(type)?.delete(callback);
  }
  
  /**
   * Notify listeners of an event
   */
  private notifyListeners(type: string, data: any) {
    this.listeners.get(type)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[WebSocket] Error in ${type} listener:`, error);
      }
    });
  }
  
  /**
   * Check if connected to the WebSocket server
   */
  get isConnected() {
    return this._isConnected;
  }
  
  /**
   * Check if authenticated with the WebSocket server
   */
  get isAuthenticated() {
    return this._isAuthenticated;
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();

// React hook for WebSocket connection
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(websocketService.isConnected);
  const [isAuthenticated, setIsAuthenticated] = useState(websocketService.isAuthenticated);
  
  useEffect(() => {
    // Connect on mount
    websocketService.connect();
    
    // Track connection status
    const connectionListener = (data: { connected: boolean }) => {
      setIsConnected(data.connected);
    };
    
    // Track authentication status
    const authListener = () => {
      setIsAuthenticated(websocketService.isAuthenticated);
    };
    
    // Add event listeners
    const removeConnectionListener = websocketService.addEventListener('connection', connectionListener);
    const removeAuthListener = websocketService.addEventListener('authenticated', authListener);
    
    // Cleanup on unmount
    return () => {
      removeConnectionListener();
      removeAuthListener();
    };
  }, []);
  
  // Method to send a message
  const sendMessage = useCallback((message: any) => {
    return websocketService.sendMessage(message);
  }, []);
  
  // Method to add event listener
  const addEventListener = useCallback((type: string, callback: (data: any) => void) => {
    return websocketService.addEventListener(type, callback);
  }, []);
  
  return {
    isConnected,
    isAuthenticated,
    sendMessage,
    addEventListener
  };
}

// React hook for tutorial WebSocket messages
export function useTutorialWebSocket(tabName: string) {
  const { isConnected, addEventListener } = useWebSocket();
  const [tutorialProgress, setTutorialProgress] = useState<{ currentStep: number, totalSteps: number } | null>(null);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  
  useEffect(() => {
    if (!isConnected) return;
    
    // Listen for tutorial progress updates
    const removeProgressListener = addEventListener('tutorial_progress', (data: TutorialProgressMessage) => {
      if (data.tabName === tabName) {
        console.log('[WebSocket] Received tutorial progress update:', data);
        setTutorialProgress(data.progress);
      }
    });
    
    // Listen for tutorial completion
    const removeCompletedListener = addEventListener('tutorial_completed', (data: TutorialCompletedMessage) => {
      if (data.tabName === tabName) {
        console.log('[WebSocket] Received tutorial completion notification:', data);
        setTutorialCompleted(true);
      }
    });
    
    // Cleanup listeners
    return () => {
      removeProgressListener();
      removeCompletedListener();
    };
  }, [isConnected, tabName, addEventListener]);
  
  return {
    tutorialProgress,
    tutorialCompleted
  };
}

export default websocketService;