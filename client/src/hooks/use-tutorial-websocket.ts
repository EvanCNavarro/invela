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
  
  // Normalize tab name for comparison
  const normalizedTabName = tabName.toLowerCase().trim();
  
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
        if (message.type === 'tutorial_updated' || message.type === 'tutorial_update') {
          logger.info(`Received tutorial update message:`, message);
          
          // Extract data from the message based on format
          // The new format uses message.data, older format had properties directly on message
          const updateData = message.data || message;
          
          // Only process messages for this tab
          if (updateData.tabName?.toLowerCase() === normalizedTabName) {
            logger.info(`Processing update for ${normalizedTabName}:`, updateData);
            
            // Update local state with the message data
            setTutorialUpdate({
              tabName: updateData.tabName,
              userId: updateData.userId,
              currentStep: updateData.currentStep,
              completed: updateData.completed,
              timestamp: message.timestamp,
              metadata: updateData.metadata
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
          (event.data?.messageType === 'tutorial_updated' || event.data?.messageType === 'tutorial_update')) {
        logger.info(`Received bridged tutorial update:`, event.data);
        
        // Extract data based on message format
        const bridgeData = event.data.message || {};
        const updateData = bridgeData.data || bridgeData;
        
        // Process the message if it's for our tab
        if (updateData.tabName?.toLowerCase() === normalizedTabName) {
          logger.info(`Processing bridged update for ${normalizedTabName}:`, updateData);
          setTutorialUpdate({
            tabName: updateData.tabName,
            userId: updateData.userId,
            currentStep: updateData.currentStep,
            completed: updateData.completed,
            timestamp: bridgeData.timestamp || new Date().toISOString(),
            metadata: updateData.metadata
          });
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