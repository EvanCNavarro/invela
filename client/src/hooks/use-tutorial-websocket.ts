import { useState, useEffect, useCallback } from 'react';
import { createTutorialLogger } from '@/lib/tutorial-logger';
import { getWebSocketManager } from '@/lib/websocket-manager';

// Create a dedicated logger for the WebSocket component
const logger = createTutorialLogger('TutorialWebSocket');

// Define interfaces for tutorial updates
interface TutorialUpdate {
  tabName: string;
  userId: number;
  currentStep: number;
  completed: boolean;
  timestamp?: string;
  metadata?: Record<string, any>;
}

/**
 * Normalize tab name to canonical form for consistent comparisons
 * This utility is important for the websocket communication to work correctly
 * across different tab name variations.
 */
export function normalizeTabName(inputTabName: string): string {
  // First, convert to lowercase and trim to handle case variations
  const cleanedTabName = inputTabName.toLowerCase().trim();
  
  // Define canonical names for each tab
  // This mapping ensures all variations of a tab name resolve to a single canonical name
  const tabMappings: Record<string, string> = {
    // Network tab variations
    'network-view': 'network',
    'network-visualization': 'network',
    
    // Claims tab variations
    'claims-risk': 'claims',
    'claims-risk-analysis': 'claims',
    
    // File vault tab variations
    'file-manager': 'file-vault',
    'filevault': 'file-vault',  // Handle PascalCase version
    'file-vault-page': 'file-vault',
    
    // Dashboard variations
    'dashboard-page': 'dashboard',
    'home': 'dashboard',
    
    // Risk score configuration variations
    'risk-score-config': 'risk-score-configuration',
    'risk-score': 'risk-score-configuration',
  };
  
  // Return the canonical version or the original cleaned name
  return tabMappings[cleanedTabName] || cleanedTabName;
}

/**
 * Hook for receiving real-time tutorial updates via WebSocket
 * 
 * This hook subscribes to WebSocket messages with type 'tutorial_updated'
 * and provides real-time updates for the current tab's tutorial state.
 * It uses our robust WebSocketManager to maintain reliable connections.
 * 
 * @param tabName - The name of the tab to subscribe to updates for
 * @returns Object containing the latest tutorial update
 */
export function useTutorialWebSocket(tabName: string) {
  const [tutorialUpdate, setTutorialUpdate] = useState<TutorialUpdate | null>(null);
  const [wsConnectionState, setWsConnectionState] = useState<string>('initializing');
  
  // Apply normalization
  const normalizedTabName = normalizeTabName(tabName);
  
  // Process tutorial update messages
  const handleTutorialUpdate = useCallback((data: any) => {
    try {
      logger.info(`Received tutorial update message:`, data);
      
      // Normalize the message tab name for comparison
      const messageTabName = normalizeTabName(data.tabName || '');
      
      // Only process messages for this tab (using normalized names)
      if (messageTabName === normalizedTabName) {
        logger.info(`Processing update for ${normalizedTabName} (original message tab: ${data.tabName}):`, data);
        
        // Update local state with the message data
        setTutorialUpdate({
          tabName: normalizedTabName, // Use normalized name for consistency
          userId: data.userId,
          currentStep: data.currentStep,
          completed: data.completed,
          timestamp: data.timestamp,
          metadata: data.metadata
        });
      }
    } catch (error) {
      logger.error(`Error processing tutorial update:`, error);
    }
  }, [normalizedTabName]);
  
  // Handle connection state changes
  const handleConnectionState = useCallback((data: any) => {
    setWsConnectionState(data.state);
    logger.info(`WebSocket connection state changed: ${data.state}`);
  }, []);
  
  // Subscribe to WebSocket events
  useEffect(() => {
    logger.info(`Setting up WebSocket listener for ${normalizedTabName}`);
    
    // Get WebSocket manager (will initialize if not already created)
    const wsManager = getWebSocketManager();
    
    // Subscribe to tutorial update messages
    const unsubscribeTutorial = wsManager.subscribe('tutorial_updated', handleTutorialUpdate);
    
    // Subscribe to connection state changes
    const unsubscribeConnection = wsManager.subscribe('connection_state', handleConnectionState);
    
    // Also listen for bridged events from the legacy system
    const handleBridgedMessages = (event: MessageEvent) => {
      if (event.data?.source === 'websocket-bridge' && 
          event.data?.messageType === 'tutorial_updated') {
        
        const message = event.data.message;
        if (message?.tabName?.toLowerCase() === normalizedTabName) {
          logger.info(`Received bridged tutorial update:`, message);
          setTutorialUpdate(message);
        }
      }
    };
    
    // Listen for bridged events
    window.addEventListener('message', handleBridgedMessages);
    
    // Check connection state and connect if needed
    if (!wsManager.isConnected()) {
      wsManager.connect();
    }
    
    // Clean up subscriptions and listeners
    return () => {
      unsubscribeTutorial();
      unsubscribeConnection();
      window.removeEventListener('message', handleBridgedMessages);
      logger.info(`Cleaned up WebSocket listener for ${normalizedTabName}`);
    };
  }, [normalizedTabName, handleTutorialUpdate, handleConnectionState]);
  
  return {
    tutorialUpdate,
    wsConnectionState
  };
}