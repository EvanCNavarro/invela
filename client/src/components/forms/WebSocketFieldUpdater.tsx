import React, { useEffect, useRef, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { useWebSocket } from '@/hooks/use-websocket';
import { FormBatchUpdater } from '@/utils/form-optimization';
import getLogger from '@/utils/logger';

// Create a logger for this component
const logger = getLogger('WebSocketFieldUpdater', { 
  levels: { debug: true, info: true, warn: true, error: true } 
});

interface WebSocketFieldUpdaterProps {
  taskId: number;
  updateField?: (fieldKey: string, value: any) => Promise<void>;
  enabled?: boolean;
}

/**
 * Component that subscribes to WebSocket field_update messages and updates form fields
 * 
 * This component listens for field_update messages from the WebSocket server and 
 * updates form fields accordingly. It's designed to be used with the UniversalForm 
 * component to support real-time field updates during demo auto-fill.
 * 
 * @param taskId The ID of the task being edited
 * @param updateField A function to update form fields
 * @param enabled Whether WebSocket field updates are enabled
 */
export default function WebSocketFieldUpdater({ 
  taskId, 
  updateField,
  enabled = true 
}: WebSocketFieldUpdaterProps) {
  // Track field updates in progress
  const [updatesInProgress, setUpdatesInProgress] = useState(false);
  const [messagesReceived, setMessagesReceived] = useState(0);
  const lastUpdateTimestamp = useRef<number>(0);
  
  // Connect to WebSocket
  const { socket, connected, messages } = useWebSocket();
  
  // Create batched update processor
  const processBatchedUpdates = async () => {
    if (!updateField) return;
    
    try {
      // Get all pending updates
      const pendingUpdates = FormBatchUpdater.getPendingUpdates();
      const updateCount = FormBatchUpdater.getQueueSize();
      
      if (updateCount > 0) {
        logger.info(`Processing ${updateCount} batched field updates`);
        
        // Process all updates
        for (const [fieldKey, value] of Object.entries(pendingUpdates)) {
          await updateField(fieldKey, value);
        }
        
        // Clear processed updates
        FormBatchUpdater.clearUpdates();
        
        // Only show toast for larger batches to avoid notification fatigue
        if (updateCount >= 5) {
          toast({
            title: "Fields updated",
            description: `${updateCount} fields have been updated`,
            variant: "default",
            duration: 1500
          });
        }
      }
    } catch (err) {
      logger.error('Error processing batched updates:', err);
      FormBatchUpdater.clearUpdates();
      toast({
        title: "Update Error",
        description: "Failed to update some fields. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUpdatesInProgress(false);
    }
  };
  
  // Process WebSocket messages
  useEffect(() => {
    if (!enabled || !updateField || !socket || !connected) return;
    
    // Only process messages that have arrived since the component mounted
    const processMessages = async () => {
      // Find field_update messages for this task
      const relevantMessages = messages.filter((msg) => {
        // Find field_update messages for this specific task
        return (
          (msg.type === 'field_update' || msg.type === 'form_field_update') && 
          (msg.payload?.taskId === taskId || msg.data?.taskId === taskId)
        );
      });
      
      if (relevantMessages.length > 0) {
        const newMessagesCount = relevantMessages.length - messagesReceived;
        
        if (newMessagesCount > 0) {
          logger.debug(`Found ${newMessagesCount} new field_update messages for task ${taskId}`);
          setMessagesReceived(relevantMessages.length);
          
          // Process each new message
          for (const msg of relevantMessages.slice(-newMessagesCount)) {
            // Extract field information, handling both payload and data formats
            const fieldInfo = msg.payload || msg.data;
            
            if (fieldInfo) {
              const { fieldKey, value } = fieldInfo;
              
              if (fieldKey) {
                // Add to batch processor
                FormBatchUpdater.addUpdate(fieldKey, value);
                
                // Track last update time
                lastUpdateTimestamp.current = Date.now();
                
                // Set updates in progress
                if (!updatesInProgress) {
                  setUpdatesInProgress(true);
                }
              }
            }
          }
          
          // Process batched updates
          if (FormBatchUpdater.getQueueSize() > 0) {
            await processBatchedUpdates();
          }
        }
      }
    };
    
    processMessages();
  }, [enabled, messages, updateField, taskId, connected, socket, updatesInProgress, messagesReceived]);
  
  // Process demo-autofill-complete messages
  useEffect(() => {
    if (!enabled || !socket || !connected) return;
    
    const processCompletionMessage = async () => {
      // Find completion messages for this task
      const completionMessage = messages.find((msg) => {
        return (
          msg.type === 'demo_autofill_complete' && 
          (msg.payload?.taskId === taskId || msg.data?.taskId === taskId)
        );
      });
      
      if (completionMessage) {
        // Process any remaining updates
        if (FormBatchUpdater.getQueueSize() > 0) {
          await processBatchedUpdates();
        }
        
        // Notify user
        toast({
          title: "Demo Auto-Fill Complete",
          description: "All fields have been filled with sample data",
          variant: "success"
        });
      }
    };
    
    processCompletionMessage();
  }, [enabled, messages, connected, socket, taskId]);
  
  // Process any pending updates when component unmounts
  useEffect(() => {
    return () => {
      if (FormBatchUpdater.getQueueSize() > 0) {
        processBatchedUpdates();
      }
    };
  }, []);
  
  // No visible UI - this is a background component
  return null;
}