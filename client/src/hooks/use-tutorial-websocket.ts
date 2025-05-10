import { useState, useEffect } from 'react';

// Define interfaces for tutorial progress and status
interface TutorialProgress {
  tabName: string;
  currentStep: number;
  totalSteps: number;
  timestamp: string;
}

interface TutorialCompletion {
  tabName: string;
  completed: boolean;
  timestamp: string;
}

/**
 * Hook for receiving real-time tutorial updates via WebSocket
 * 
 * This hook subscribes to tutorial-related WebSocket messages and
 * provides real-time updates for tutorial progress and completion.
 * 
 * @param tabName - The name of the tab to subscribe to updates for
 * @returns Object containing tutorial update data
 */
export function useTutorialWebSocket(tabName: string) {
  const [tutorialProgress, setTutorialProgress] = useState<TutorialProgress | null>(null);
  const [tutorialCompleted, setTutorialCompleted] = useState<TutorialCompletion | null>(null);
  
  // Subscribe to WebSocket events
  useEffect(() => {
    console.log(`[TutorialWebSocket] Setting up WebSocket listener for ${tabName}`);
    
    // Define event handlers
    const handleTutorialProgress = (event: any) => {
      if (event.detail?.tabName === tabName) {
        console.log(`[TutorialWebSocket] Received progress update for ${tabName}:`, event.detail);
        setTutorialProgress(event.detail);
      }
    };
    
    const handleTutorialCompletion = (event: any) => {
      if (event.detail?.tabName === tabName) {
        console.log(`[TutorialWebSocket] Received completion update for ${tabName}:`, event.detail);
        setTutorialCompleted(event.detail);
      }
    };
    
    // Add event listeners
    window.addEventListener('tutorial_progress', handleTutorialProgress);
    window.addEventListener('tutorial_completed', handleTutorialCompletion);
    
    // Clean up
    return () => {
      window.removeEventListener('tutorial_progress', handleTutorialProgress);
      window.removeEventListener('tutorial_completed', handleTutorialCompletion);
      console.log(`[TutorialWebSocket] Cleaned up WebSocket listener for ${tabName}`);
    };
  }, [tabName]);
  
  return {
    tutorialProgress,
    tutorialCompleted
  };
}