/**
 * Hook for WebSocket-based form submission events
 * 
 * This hook listens for form submission events via WebSocket and provides
 * a way to react to form submission status updates.
 */

import { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';

export interface FormSubmissionEvent {
  taskId: number;
  formType: string;
  status: 'success' | 'error' | 'in_progress';
  companyId: number;
  submissionDate?: string;
  unlockedTabs?: string[];
  unlockedTasks?: number[];
  fileName?: string;
  fileId?: number;
  error?: string;
}

export function useFormSubmissionEvents(
  taskId: number | undefined,
  formType: string | undefined,
  onSuccess?: (event: FormSubmissionEvent) => void,
  onError?: (event: FormSubmissionEvent) => void,
  onInProgress?: (event: FormSubmissionEvent) => void
) {
  const [lastEvent, setLastEvent] = useState<FormSubmissionEvent | null>(null);
  const { connectionState, lastMessage } = useWebSocket();
  const connected = connectionState === 'connected';
  
  // Monitor WebSocket messages for form submission events
  useEffect(() => {
    // Return early if no message or if it's not a form submission update
    if (!lastMessage || lastMessage.type !== 'form_submitted') {
      return;
    }
    
    const data = lastMessage.payload;
    
    // Return if payload is missing
    if (!data) {
      console.error('[FormSubmission] Received form_submitted message without payload');
      return;
    }
    
    // Check if this event is for our task/form
    if (taskId && data.taskId === taskId && formType && data.formType === formType) {
      console.log('[FormSubmission] Received event for current form:', data);
      
      // Convert the payload to our expected FormSubmissionEvent type
      const formEvent: FormSubmissionEvent = {
        taskId: data.taskId,
        formType: data.formType,
        status: data.status as 'success' | 'error' | 'in_progress',
        companyId: data.companyId,
        submissionDate: data.timestamp,
        unlockedTabs: data.unlockedTabs,
        unlockedTasks: data.unlockedTasks,
        fileName: data.fileName,
        fileId: data.fileId,
        error: data.details
      };
      
      setLastEvent(formEvent);
      
      if (formEvent.status === 'success' && onSuccess) {
        onSuccess(formEvent);
      }
      
      if (formEvent.status === 'error' && onError) {
        onError(formEvent);
      }
      
      if (formEvent.status === 'in_progress' && onInProgress) {
        onInProgress(formEvent);
      }
    }
  }, [lastMessage, taskId, formType, onSuccess, onError, onInProgress]);
  
  return {
    connected,
    lastEvent,
  };
}

export default useFormSubmissionEvents;