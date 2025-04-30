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
export function useFormSubmissionEvents(options: UseFormSubmissionEventsOptions = {}) {
  const { taskId, formType, onSuccess, onError, onInProgress } = options;
  const { lastMessage } = useWebSocket();
  const [lastEvent, setLastEvent] = useState<FormSubmissionEvent | null>(null);
  const [eventHistory, setEventHistory] = useState<FormSubmissionEvent[]>([]);
  
  // Process incoming WebSocket messages
  const processMessage = useCallback((message: any) => {
    console.log('[FormSubmissionEvents] Processing message:', message);
    
    // Check for both legacy 'form_submission_update' and new 'form_submitted' event types
    if (message?.type !== 'form_submission_update' && message?.type !== 'form_submitted') {
      console.log('[FormSubmissionEvents] Ignoring non-form submission message of type:', message?.type);
      return;
    }
    
    // Access payload properly (could be in data or payload property)
    const event = message.payload || message.data as FormSubmissionEvent;
    
    console.log('[FormSubmissionEvents] Processing form submission event:', {
      messageType: message.type,
      eventTaskId: event.taskId,
      expectedTaskId: taskId,
      eventFormType: event.formType,
      expectedFormType: formType,
      status: event.status
    });
    
    // Filter events if taskId or formType is specified
    if (taskId && event.taskId !== taskId) {
      console.log('[FormSubmissionEvents] Ignoring event for different task ID');
      return;
    }
    
    if (formType && event.formType !== formType) {
      console.log('[FormSubmissionEvents] Ignoring event for different form type');
      return;
    }
    
    // Add event to history
    setEventHistory(prev => [...prev, event]);
    setLastEvent(event);
    
    console.log(`[FormSubmissionEvents] Handling ${event.status} event for task ${event.taskId}, form type ${event.formType}`);
    
    // Call appropriate callback based on status
    if (event.status === 'success' && onSuccess) {
      console.log('[FormSubmissionEvents] Calling onSuccess handler');
      onSuccess(event);
    } else if (event.status === 'error' && onError) {
      console.log('[FormSubmissionEvents] Calling onError handler');
      onError(event);
    } else if (event.status === 'in_progress' && onInProgress) {
      console.log('[FormSubmissionEvents] Calling onInProgress handler');
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