import { useState, useEffect } from 'react';
import { createTutorialLogger } from '@/lib/tutorial-logger';
import { useUnifiedWebSocket } from './use-unified-websocket';

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
  const { subscribe, unsubscribe, isConnected } = useUnifiedWebSocket();
  
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
  
  // Subscribe to WebSocket events using unified service
  useEffect(() => {
    // Check both connection status and service availability
    const serviceConnected = unifiedWebSocketService.isConnected();
    if (!isConnected && !serviceConnected) {
      logger.info(`App WebSocket not available, using event bridge only`);
      return;
    }

    logger.info(`Setting up WebSocket listener for ${normalizedTabName}`);
    
    /**
     * Handle tutorial update messages from unified WebSocket
     */
    const handleTutorialUpdate = (data: any) => {
      try {
        // Check if this is a tutorial update message
        if (data.type === 'tutorial_updated') {
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
        }
      } catch (error) {
        logger.error(`Error processing WebSocket message:`, error);
      }
    };
    
    // Subscribe to tutorial updates using unified WebSocket service
    const unsubscribeHandler = subscribe('tutorial_updated', handleTutorialUpdate);
    
    // Clean up subscription
    return () => {
      if (unsubscribeHandler) {
        unsubscribe('tutorial_updated', handleTutorialUpdate);
      }
      logger.info(`Cleaned up WebSocket listener for ${normalizedTabName}`);
    };
  }, [normalizedTabName, isConnected, subscribe, unsubscribe]);
  
  return {
    tutorialUpdate
  };
}