/**
 * Tutorial WebSocket Hook - Real-time tutorial state synchronization
 * 
 * Provides React hook for receiving real-time tutorial updates via WebSocket
 * communication. Manages tutorial state synchronization across multiple browser
 * tabs and ensures consistent user onboarding experiences with automatic
 * progress tracking and completion notifications.
 * 
 * Features:
 * - Real-time tutorial progress synchronization
 * - Tab name normalization for consistent routing
 * - WebSocket event bridge integration
 * - Automatic cleanup and memory management
 */

// ========================================
// IMPORTS
// ========================================

// React hooks for state management and lifecycle
import { useState, useEffect } from 'react';

// Internal dependencies for logging and utilities
import { createTutorialLogger } from '@/lib/tutorial-logger';
import { normalizeTabName } from '@/utils/tutorial-utils';

// ========================================
// CONSTANTS
// ========================================

/**
 * Tutorial WebSocket logger instance for structured logging
 * Provides consistent logging format for tutorial WebSocket operations
 */
const TUTORIAL_WEBSOCKET_LOGGER = createTutorialLogger('TutorialWebSocket');

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Tutorial update interface for WebSocket message processing
 * Defines the structure of real-time tutorial state updates
 */
interface TutorialUpdate {
  tabName: string;
  userId: number;
  currentStep: number;
  completed: boolean;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

/**
 * WebSocket message event structure for tutorial updates
 * Provides type safety for WebSocket event handling
 */
interface WebSocketMessageEvent {
  data: string;
  type: string;
  source?: string;
  messageType?: string;
  message?: TutorialUpdate;
}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * React hook for real-time tutorial state synchronization via WebSocket
 * 
 * Manages WebSocket connections for tutorial progress tracking and provides
 * real-time updates when tutorial state changes occur. Integrates with the
 * unified WebSocket implementation and handles cross-tab synchronization
 * for consistent user onboarding experiences.
 * 
 * @param tabName - Target tab name for tutorial state monitoring
 * @returns Object containing current tutorial update state
 */
export function useTutorialWebSocket(tabName: string): { tutorialUpdate: TutorialUpdate | null } {
  const [tutorialUpdate, setTutorialUpdate] = useState<TutorialUpdate | null>(null);
  
  // Apply tab name normalization using shared utility
  const normalizedTabName = normalizeTabName(tabName);
  
  // WebSocket event subscription and cleanup management
  useEffect(() => {
    TUTORIAL_WEBSOCKET_LOGGER.info(`Setting up WebSocket listener for ${normalizedTabName}`);
    
    /**
     * Process incoming WebSocket messages for tutorial updates
     * 
     * Handles 'tutorial_updated' message types from the unified WebSocket
     * implementation and updates local state when messages match the current
     * tab context for real-time tutorial synchronization.
     * 
     * @param event - WebSocket message event containing tutorial data
     */
    const handleWebSocketMessage = (event: MessageEvent): void => {
      try {
        const message = JSON.parse(event.data);
        
        // Process only tutorial update messages
        if (message.type === 'tutorial_updated') {
          TUTORIAL_WEBSOCKET_LOGGER.info(`Received tutorial update message:`, message);
          
          // Normalize message tab name for accurate comparison
          const messageTabName = normalizeTabName(message.tabName || '');
          
          // Update state only for matching tab contexts
          if (messageTabName === normalizedTabName) {
            TUTORIAL_WEBSOCKET_LOGGER.info(`Processing update for ${normalizedTabName}:`, message);
            
            // Update local tutorial state with normalized data
            setTutorialUpdate({
              tabName: normalizedTabName,
              userId: message.userId,
              currentStep: message.currentStep,
              completed: message.completed,
              timestamp: message.timestamp,
              metadata: message.metadata
            });
          }
        }
      } catch (processingError: unknown) {
        const errorMessage = processingError instanceof Error ? processingError.message : String(processingError);
        TUTORIAL_WEBSOCKET_LOGGER.error(`WebSocket message processing failed: ${errorMessage}`);
      }
    };
    
    // Set up WebSocket event bridge for cross-tab communication
    const handleBridgedMessage = (event: MessageEvent): void => {
      if (event.data?.source === 'websocket-bridge' && 
          event.data?.messageType === 'tutorial_updated') {
        TUTORIAL_WEBSOCKET_LOGGER.info(`Received bridged tutorial update:`, event.data);
        
        // Process bridged messages for matching tab contexts
        if (event.data.message?.tabName?.toLowerCase() === normalizedTabName) {
          setTutorialUpdate(event.data.message);
        }
      }
    };
    
    window.addEventListener('message', handleBridgedMessage);
    
    // Access global WebSocket instance with type safety
    const globalWebSocket = (window as unknown as { appWebSocket?: WebSocket }).appWebSocket;
    
    // Attach direct WebSocket listener if available
    if (globalWebSocket?.addEventListener) {
      globalWebSocket.addEventListener('message', handleWebSocketMessage);
      TUTORIAL_WEBSOCKET_LOGGER.info(`Direct WebSocket listener attached`);
    } else {
      TUTORIAL_WEBSOCKET_LOGGER.info(`Using event bridge only - direct WebSocket unavailable`);
    }
    
    // Cleanup function for memory management
    return (): void => {
      window.removeEventListener('message', handleBridgedMessage);
      if (globalWebSocket?.removeEventListener) {
        globalWebSocket.removeEventListener('message', handleWebSocketMessage);
      }
      TUTORIAL_WEBSOCKET_LOGGER.info(`WebSocket listener cleanup completed for ${normalizedTabName}`);
    };
  }, [normalizedTabName]);
  
  return { tutorialUpdate };
}