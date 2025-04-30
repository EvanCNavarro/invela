/**
 * Hook for WebSocket-based form submission events
 * 
 * This hook listens for form submission events via WebSocket and provides
 * a way to react to form submission status updates.
 */

import { useEffect, useState } from 'react';
import { useWebSocket } from './use-websocket';
import type { WebSocketMessage } from '../providers/websocket-provider';

export interface FormSubmissionEvent {
  taskId: number;
  formType: string;
  status: 'success' | 'error';
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
  onError?: (event: FormSubmissionEvent) => void
) {
  const [lastEvent, setLastEvent] = useState<FormSubmissionEvent | null>(null);
  const { connectionState, lastMessage } = useWebSocket();
  
  // Monitor WebSocket messages for form submission events
  useEffect(() => {
    // Return early if no message or if it's not a form submission update
    if (!lastMessage || lastMessage.type !== 'form_submission_update') {
      return;
    }
    
    const data = lastMessage.payload;
    
    // Check if this event is for our task/form
    if (taskId && data.taskId === taskId && formType && data.formType === formType) {
      console.log('[FormSubmission] Received event for current form:', data);
      setLastEvent(data);
      
      if (data.status === 'success' && onSuccess) {
        onSuccess(data);
      }
      
      if (data.status === 'error' && onError) {
        onError(data);
      }
    }
  }, [lastMessage, taskId, formType, onSuccess, onError]);
  
  return {
    connected: connectionState === 'connected',
    lastEvent,
  };
}

export default useFormSubmissionEvents;