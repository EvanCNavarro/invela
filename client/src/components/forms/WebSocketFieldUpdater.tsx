/**
 * WebSocketFieldUpdater Component
 * 
 * This component listens for WebSocket field_update messages and updates form fields accordingly.
 * It's designed to work with the BatchUpdateManager to handle field updates during demo auto-fill.
 */

import { useEffect, useRef } from 'react';
import { useWebSocketContext } from '@/providers/websocket-provider';
import { FormBatchUpdater } from '@/utils/form-optimization';
import getLogger from '@/utils/logger';

const logger = getLogger('WebSocketFieldUpdater');

interface WebSocketFieldUpdaterProps {
  taskId: number;
  updateField?: (fieldKey: string, value: any) => Promise<void>;
  enabled?: boolean;
}

/**
 * Component that subscribes to WebSocket field_update messages and updates form fields
 */
export function WebSocketFieldUpdater({ 
  taskId, 
  updateField,
  enabled = true 
}: WebSocketFieldUpdaterProps) {
  const { subscribe, isConnected } = useWebSocketContext();
  const fieldsProcessed = useRef<number>(0);
  
  // Subscribe to field_update WebSocket messages
  useEffect(() => {
    if (!enabled || !isConnected || !taskId) {
      return;
    }
    
    logger.info(`WebSocketFieldUpdater initialized for task ${taskId}`);
    
    // Subscribe to field_update messages
    const unsubscribe = subscribe('field_update', (data) => {
      // Only process updates for this task
      if (data.taskId !== taskId) {
        return;
      }
      
      fieldsProcessed.current += 1;
      logger.info(`Received field_update for task ${taskId}, field: ${data.fieldKey} (${fieldsProcessed.current} total)`);
      
      // Add the update to the batch manager
      FormBatchUpdater.addUpdate(data.fieldKey, data.value);
      
      // If updateField is provided, also call it directly
      if (updateField) {
        updateField(data.fieldKey, data.value)
          .catch(error => {
            logger.error(`Error updating field ${data.fieldKey}:`, error);
          });
      }
    });
    
    // Also subscribe to demo_autofill_complete messages
    const unsubscribeComplete = subscribe('demo_autofill_complete', (data) => {
      if (data.taskId !== taskId) {
        return;
      }
      
      logger.info(`Demo auto-fill complete for task ${taskId}, processed ${fieldsProcessed.current} fields`);
      
      // Force processing of any remaining updates in the batch
      const processedFields = FormBatchUpdater.processQueue();
      logger.info(`Processed remaining batch with ${Object.keys(processedFields).length} fields`);
      
      // Reset counter
      fieldsProcessed.current = 0;
    });
    
    // Cleanup function
    return () => {
      unsubscribe();
      unsubscribeComplete();
      logger.info(`WebSocketFieldUpdater unsubscribed for task ${taskId}`);
    };
  }, [taskId, updateField, subscribe, isConnected, enabled]);
  
  // No visible UI - this is a behavior component
  return null;
}

export default WebSocketFieldUpdater;