import { useState, useEffect } from 'react';
import { websocketService } from '@/services/websocket-service';

// Define tutorial progress update message format
export interface TutorialProgressUpdate {
  tabName: string;
  currentStep: number;
  completed: boolean;
  userId: number;
  timestamp: string;
}

/**
 * Hook to subscribe to WebSocket updates for tutorial progress
 * 
 * This hook listens for tutorial progress updates via WebSocket
 * and provides that data to components
 * 
 * @param {string} tabName - The name of the tab to subscribe to updates for
 */
export function useTutorialWebSocket(tabName: string) {
  const [tutorialProgress, setTutorialProgress] = useState<TutorialProgressUpdate | null>(null);
  const [tutorialCompleted, setTutorialCompleted] = useState<boolean>(false);
  
  // Get WebSocket service instance
  const { socket, isConnected, subscribe, unsubscribe } = websocketService;
  
  useEffect(() => {
    if (!isConnected || !tabName) return;
    
    // Handle tutorial progress update message
    const handleTutorialUpdate = (message: any) => {
      console.log(`[Tutorial WebSocket] Received update for ${tabName}:`, message);
      
      if (message.type === 'tutorial_progress_update' && message.data?.tabName === tabName) {
        setTutorialProgress(message.data);
        
        if (message.data.completed) {
          setTutorialCompleted(true);
        }
      }
    };
    
    // Subscribe to tutorial update messages for this tab
    subscribe('tutorial_progress_update', handleTutorialUpdate);
    
    // Cleanup subscription when component unmounts
    return () => {
      unsubscribe('tutorial_progress_update', handleTutorialUpdate);
    };
  }, [isConnected, tabName, subscribe, unsubscribe]);
  
  return {
    tutorialProgress,
    tutorialCompleted,
    isConnected
  };
}