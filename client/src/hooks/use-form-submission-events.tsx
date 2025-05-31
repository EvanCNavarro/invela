/**
 * Form Submission Events Hook
 * 
 * This hook provides a way to listen for form submission events via WebSocket.
 * It's used to receive real-time updates about form submissions.
 * 
 * Enhanced with global message deduplication to prevent duplicate event processing
 * when used alongside FormSubmissionListener components.
 */

import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './use-websocket';

// Define a simplified version of FormSubmissionEvent that matches the one in FormSubmissionListener
// This avoids circular dependencies while ensuring type compatibility
export interface FormSubmissionEvent {
  taskId: number;
  formType: string;
  status: 'success' | 'error' | 'in_progress';
  companyId?: number | null;
  submissionDate: string;
  timestamp: string;
  fileName?: string | null;
  fileId?: number | string | null;
  unlockedTabs?: string[] | null;
  error?: string | null;
  message?: string | null;
  completedActions?: any[] | null;
}

// Access the global state from FormSubmissionListener for deduplication
// This is defined as an external API so we can properly share state
const GLOBAL_FORM_SUBMISSION_STATE = (window as any).__FORM_SUBMISSION_GLOBAL_STATE || {
  // Create fallback in case the component hasn't been loaded yet
  processedMessages: new Set<string>(),
};

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
    console.debug('Processing message:', message);
    
    // Check for form-related events including task update events which carry form submission status
    if (message?.type !== 'form_submission_update' && 
        message?.type !== 'form_submitted' &&
        message?.type !== 'task_update' &&
        message?.type !== 'task_updated') {
      console.debug(`Ignoring non-form submission message of type: ${message?.type}`);
      return;
    }
    
    // Message deduplication: check if we've already processed this message globally
    const messageId = message.messageId || (message.payload?.messageId) || 
                    `${message.type}_${message.taskId || message.payload?.taskId || message.data?.taskId}_${message.timestamp || message.payload?.timestamp || message.data?.timestamp}`;
    
    // Skip if we've already processed this message (globally across all components)
    if (messageId && GLOBAL_FORM_SUBMISSION_STATE.processedMessages.has(messageId)) {
      console.debug(`Skipping duplicate message: ${messageId} (globally)`);
      return;
    }
    
    // Add to global processed messages set
    if (messageId) {
      // Add to global set to prevent any other component from processing this same message
      GLOBAL_FORM_SUBMISSION_STATE.processedMessages.add(messageId);
      
      // Limit size of global processed messages set to avoid memory leaks
      if (GLOBAL_FORM_SUBMISSION_STATE.processedMessages.size > 500) {
        // Keep only the most recent 250 messages
        const messagesToKeep = Array.from(GLOBAL_FORM_SUBMISSION_STATE.processedMessages).slice(-250);
        GLOBAL_FORM_SUBMISSION_STATE.processedMessages = new Set(messagesToKeep);
      }
    }
    
    // Access payload properly (could be in data or payload property)
    const payload = message.payload || message.data || message;
    
    // Ensure we have a properly formatted event with all required fields
    const event: FormSubmissionEvent = {
      taskId: payload.taskId,
      formType: payload.formType || formType, // Fall back to specified formType if missing from event
      status: payload.status as 'success' | 'error' | 'in_progress',
      companyId: payload.companyId || null,
      submissionDate: payload.submissionDate || payload.timestamp || new Date().toISOString(),
      timestamp: payload.timestamp || new Date().toISOString(),
      fileName: payload.fileName || null,
      fileId: payload.fileId || null,
      unlockedTabs: payload.unlockedTabs || null,
      error: payload.error || null,
      message: payload.message || null,
      completedActions: payload.completedActions || null
    };
    
    console.debug('Processing form submission event:', {
      messageType: message.type,
      eventTaskId: event.taskId,
      expectedTaskId: taskId,
      eventFormType: event.formType,
      expectedFormType: formType,
      status: event.status
    });
    
    // Filter events if taskId or formType is specified
    if (taskId && event.taskId !== taskId) {
      console.debug('Ignoring event for different task ID');
      return;
    }
    
    if (formType && event.formType !== formType) {
      console.debug('Ignoring event for different form type');
      return;
    }
    
    // Add event to history
    setEventHistory(prev => [...prev, event]);
    setLastEvent(event);
    
    console.info(`Handling ${event.status} event for task ${event.taskId}, form type ${event.formType}`);
    
    // Call appropriate callback based on status
    if (event.status === 'success' && onSuccess) {
      console.debug('Calling onSuccess handler');
      onSuccess(event);
    } else if (event.status === 'error' && onError) {
      console.debug('Calling onError handler');
      onError(event);
    } else if (event.status === 'in_progress' && onInProgress) {
      console.debug('Calling onInProgress handler');
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
    connected: true, // For compatibility with some components that expect this property
  };
}