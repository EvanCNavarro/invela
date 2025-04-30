/**
 * Form Submission Events Hook
 * 
 * This hook provides access to form submission events from WebSocket.
 * It allows components to react to real-time form submission updates.
 */

import { useState, useEffect } from 'react';
import { useWebSocket } from './use-websocket';

export interface FormSubmissionEvent {
  taskId: number;
  formType: string;
  status: string;
  companyId: number;
  unlockedTabs?: string[];
  unlockedTasks?: number[];
  submissionDate?: string;
  fileName?: string;
  fileId?: number;
  timestamp?: string;
  error?: string;
}

/**
 * Hook to access form submission events from WebSocket
 * 
 * @param taskId Optional task ID to filter events for
 * @returns Form submission event data
 */
export function useFormSubmissionEvents(taskId?: number) {
  const { socket, lastMessage } = useWebSocket();
  const [submissionEvent, setSubmissionEvent] = useState<FormSubmissionEvent | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Handle connection status
  useEffect(() => {
    setIsConnected(socket?.readyState === WebSocket.OPEN);
  }, [socket]);

  // Process incoming WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    try {
      // Check if this is a form_submitted event
      if (lastMessage.type === 'form_submitted' && lastMessage.payload) {
        const eventData = lastMessage.payload as FormSubmissionEvent;
        
        // If taskId is provided, only process events for that task
        if (taskId !== undefined && eventData.taskId !== taskId) {
          return;
        }
        
        // Update state with submission event data
        setSubmissionEvent(eventData);
        
        // Log the event
        console.info(
          `[FormSubmission] Received submission event for task ${eventData.taskId} (${eventData.formType})`,
          eventData
        );
      }
    } catch (error) {
      console.error('[FormSubmission] Error processing WebSocket message:', error);
    }
  }, [lastMessage, taskId]);

  return {
    submissionEvent,
    isConnected,
    
    // Add a helper function to check if the event matches a specific task
    isForTask: (id: number) => submissionEvent?.taskId === id,
    
    // Add a helper to check for specific unlocked tabs
    hasUnlockedTab: (tabName: string) => 
      submissionEvent?.unlockedTabs?.includes(tabName) || false,
    
    // Reset the event state
    resetEvent: () => setSubmissionEvent(null)
  };
}

export default useFormSubmissionEvents;