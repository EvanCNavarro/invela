import { useState, useEffect } from 'react';
import { createTutorialLogger } from '@/lib/tutorial-logger';

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
 * Hook for receiving real-time tutorial updates via WebSocket
 * 
 * This hook subscribes to WebSocket messages with type 'tutorial_updated'
 * and provides real-time updates for the current tab's tutorial state.
 * It works with the unified WebSocket implementation to keep the UI
 * synchronized with the server state.
 * 
 * @param tabName - The name of the tab to subscribe to updates for
 * @returns Object containing the latest tutorial update
 */
export function useTutorialWebSocket(tabName: string) {
  const [tutorialUpdate, setTutorialUpdate] = useState<TutorialUpdate | null>(null);
  
  // Normalize tab name for comparison using the shared function
  const normalizeTabName = (inputTabName: string): string => {
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
      
      // Company profile variations
      'company-profile-page': 'company-profile',
    };
    
    // Return the canonical version or the original cleaned name
    const canonicalName = tabMappings[cleanedTabName] || cleanedTabName;
    
    return canonicalName;
  };
  
  // Apply normalization
  const normalizedTabName = normalizeTabName(tabName);
  
  // Subscribe to WebSocket events
  useEffect(() => {
    logger.info(`Setting up WebSocket listener for ${normalizedTabName}`);
    
    /**
     * Handle tutorial update messages from WebSocket
     * 
     * This function processes 'tutorial_updated' messages from the unified
     * WebSocket implementation and updates the local state if the message
     * is relevant to the current tab.
     */
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        
        // Check if this is a tutorial update message
        if (message.type === 'tutorial_updated') {
          logger.info(`Received tutorial update message:`, message);
          
          // Normalize the message tab name for comparison
          const messageTabName = normalizeTabName(message.tabName || '');
          
          // Only process messages for this tab (using normalized names)
          if (messageTabName === normalizedTabName) {
            logger.info(`Processing update for ${normalizedTabName} (original message tab: ${message.tabName}):`, message);
            
            // Update local state with the message data
            setTutorialUpdate({
              tabName: normalizedTabName, // Use normalized name for consistency
              userId: message.userId,
              currentStep: message.currentStep,
              completed: message.completed,
              timestamp: message.timestamp,
              metadata: message.metadata
            });
          }
        }
      } catch (error) {
        logger.error(`Error processing WebSocket message:`, error);
      }
    };
    
    // Connect to the global WebSocket manager
    window.addEventListener('message', (event) => {
      // Check if this is a WebSocket message event from our bridge
      if (event.data?.source === 'websocket-bridge' && 
          event.data?.messageType === 'tutorial_updated') {
        logger.info(`Received bridged tutorial update:`, event.data);
        
        // Process the message if it's for our tab
        if (event.data.message?.tabName?.toLowerCase() === normalizedTabName) {
          setTutorialUpdate(event.data.message);
        }
      }
    });
    
    // Get the WebSocket instance if available
    const webSocket = (window as any).appWebSocket;
    
    // If we have direct access to the WebSocket, listen for messages
    if (webSocket && webSocket.addEventListener) {
      webSocket.addEventListener('message', handleWebSocketMessage);
      logger.info(`Attached listener to app WebSocket`);
    } else {
      logger.warn(`App WebSocket not available, using event bridge only`);
    }
    
    // Clean up
    return () => {
      if (webSocket && webSocket.removeEventListener) {
        webSocket.removeEventListener('message', handleWebSocketMessage);
      }
      logger.info(`Cleaned up WebSocket listener for ${normalizedTabName}`);
    };
  }, [normalizedTabName]);
  
  return {
    tutorialUpdate
  };
}