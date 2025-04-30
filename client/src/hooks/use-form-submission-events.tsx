/**
 * Form Submission Events Hook
 * 
 * This hook provides a way to listen for form submission events via WebSocket.
 * It's used to receive real-time updates about form submissions.
 */

import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './use-websocket';

export interface FormSubmissionEvent {
  taskId: number;
  formType: string;
  status: 'success' | 'error' | 'in_progress';
  companyId?: number;
  submissionDate?: string;
  unlockedTabs?: string[];
  fileName?: string;
  fileId?: number;
  error?: string;
}

interface UseFormSubmissionEventsOptions {
  taskId?: number;
  formType?: string;
  onSuccess?: (event: FormSubmissionEvent) => void;
  onError?: (event: FormSubmissionEvent) => void;
  onInProgress?: (event: FormSubmissionEvent) => void;
}

/**
 * Hook to subscribe to form submission events
 * 
 * @param options Configuration options for the hook
 * @returns Object with the last event and event history
 */
export function useFormSubmissionEvents({
  taskId,
  formType,
  onSuccess,
  onError,
  onInProgress,
}: UseFormSubmissionEventsOptions = {}) {
  const { lastMessage } = useWebSocket();
  const [lastEvent, setLastEvent] = useState<FormSubmissionEvent | null>(null);
  const [eventHistory, setEventHistory] = useState<FormSubmissionEvent[]>([]);
  
  // Process incoming WebSocket messages
  const processMessage = useCallback((message: any) => {
    // Only process form_submission_update events
    if (message?.type !== 'form_submission_update') {
      return;
    }
    
    const event = message.payload as FormSubmissionEvent;
    
    // Filter events if taskId or formType is specified
    if (taskId && event.taskId !== taskId) {
      return;
    }
    
    if (formType && event.formType !== formType) {
      return;
    }
    
    // Add event to history
    setEventHistory(prev => [...prev, event]);
    setLastEvent(event);
    
    // Call appropriate callback based on status
    if (event.status === 'success' && onSuccess) {
      onSuccess(event);
    } else if (event.status === 'error' && onError) {
      onError(event);
    } else if (event.status === 'in_progress' && onInProgress) {
      onInProgress(event);
    }
  }, [taskId, formType, onSuccess, onError, onInProgress]);
  
  // Process new messages as they come in
  useEffect(() => {
    if (lastMessage) {
      processMessage(lastMessage);
    }
  }, [lastMessage, processMessage]);
  
  return {
    lastEvent,
    eventHistory,
    clearHistory: () => setEventHistory([]),
  };
}