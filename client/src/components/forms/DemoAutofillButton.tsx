import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { KY3PFormService } from '@/services/ky3p-form-service';
import getLogger from '@/utils/logger';
import { useWebSocket } from '@/hooks/use-websocket';

const logger = getLogger('DemoAutofillButton', { 
  levels: { debug: true, info: true, warn: true, error: true } 
});

interface DemoAutofillButtonProps {
  taskId: number;
  taskType: string;
  onSuccess?: () => void;
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link";
  className?: string;
}

/**
 * DemoAutofillButton component for the KY3P form
 * 
 * This button triggers the demo data autofill functionality,
 * populating all form fields with predefined demo values.
 */
export const DemoAutofillButton: React.FC<DemoAutofillButtonProps> = ({
  taskId,
  taskType,
  onSuccess,
  variant = "outline",
  className = "",
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  // Build WebSocket URL
  const getWebSocketUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  };
  
  // Initialize WebSocket connection with our hook
  const { 
    isConnected,
    sendMessage,
    addMessageHandler
  } = useWebSocket(getWebSocketUrl(), {
    autoReconnect: true,
    reconnectInterval: 5000,
    onConnect: () => {
      logger.info('WebSocket connection established for DemoAutofillButton');
    },
    onDisconnect: () => {
      logger.info('WebSocket connection closed for DemoAutofillButton');
    },
    onError: (error) => {
      logger.error('WebSocket error:', error);
    }
  });
  
  // Register message handler for task updates
  useEffect(() => {
    // If this component unmounts, this cleanup function will remove the handler
    return addMessageHandler('task_updated', (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // If this is a task update for our current task, trigger a refresh
        if (data.payload?.taskId === taskId) {
          logger.info('Received task_updated for current task, refreshing UI');
          if (onSuccess) {
            onSuccess();
          }
        }
      } catch (error) {
        logger.warn('Error processing task_updated message:', error);
      }
    });
  }, [addMessageHandler, taskId, onSuccess]);

  const handleDemoAutofill = async () => {
    if (!taskId) {
      toast({
        title: "Error",
        description: "Task ID is missing",
        variant: "destructive",
      });
      return;
    }
    
    // Create a new instance of KY3PFormService
    const formService = new KY3PFormService(undefined, taskId);

    setIsLoading(true);
    
    try {
      logger.info('Starting demo autofill for task:', taskId);
      
      // Use the individual field update method from KY3PFormService
      const result = await formService.bulkUpdateResponses(taskId);
      
      if (result.success) {
        logger.info('Demo autofill successful:', result);
        
        // Show success toast
        toast({
          title: "Demo Data Loaded",
          description: `${result.updatedCount} fields have been populated with demo data.`,
          variant: "default",
        });
        
        // Force a refresh of the tasks to update progress
        try {
          const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'GET',
            credentials: 'include',
          });
          
          if (response.ok) {
            logger.info('Successfully refreshed task data');
          }
        } catch (refreshError) {
          logger.warn('Failed to refresh task data:', refreshError);
        }
        
        // Force a UI cache invalidation by refreshing tasks
        try {
          const refreshResponse = await fetch('/api/tasks', {
            method: 'GET',
            credentials: 'include',
          });
          
          if (refreshResponse.ok) {
            logger.info('Successfully refreshed tasks list');
          }
        } catch (listRefreshError) {
          logger.warn('Failed to refresh tasks list:', listRefreshError);
        }
        
        // Broadcast a WebSocket event to update the UI for all clients
        try {
          const updateEvent = {
            type: 'task_updated',
            payload: {
              taskId: taskId,
              timestamp: new Date().toISOString()
            }
          };
          
          // Use our WebSocket hook to send the message
          if (isConnected) {
            sendMessage(updateEvent);
            logger.info('Sent WebSocket update event');
          } else {
            // Send via server API if websocket isn't connected
            fetch('/api/broadcast/task-update', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({
                taskId,
                type: 'task_updated',
                timestamp: new Date().toISOString()
              }),
            }).then(response => {
              if (response.ok) {
                logger.info('Sent broadcast via API');
              }
            }).catch(error => {
              logger.warn('Failed to send broadcast via API:', error);
            });
          }
        } catch (wsError) {
          logger.warn('Could not send WebSocket update:', wsError);
        }
        
        // Call the onSuccess callback if provided
        if (onSuccess) {
          logger.info('Calling onSuccess callback to refresh form');
          
          // Multiple UI refresh steps to ensure everything updates:
          
          // Step 1: Call the provided callback right away
          onSuccess();
          
          // Step 2: Small delay for initial UI refresh
          setTimeout(() => {
            // Dispatch a form:refresh event for components listening for it
            const refreshEvent = new CustomEvent('form:refresh', { 
              detail: { taskId, timestamp: new Date().toISOString() } 
            });
            window.dispatchEvent(refreshEvent);
            logger.info('Dispatched form:refresh event');
            
            // Force task query invalidation through a custom event
            const taskInvalidateEvent = new CustomEvent('task:invalidate', {
              detail: { taskId, timestamp: new Date().toISOString() }
            });
            window.dispatchEvent(taskInvalidateEvent);
            logger.info('Dispatched task:invalidate event');
          }, 500);
          
          // Step 3: Additional refresh after a longer delay
          setTimeout(() => {
            // Call onSuccess one more time to ensure UI is fully updated
            onSuccess();
            
            // Dispatch another refresh event with a different timestamp
            const finalRefreshEvent = new CustomEvent('form:refresh', { 
              detail: { taskId, timestamp: new Date().toISOString(), final: true } 
            });
            window.dispatchEvent(finalRefreshEvent);
            logger.info('Dispatched final form:refresh event after delay');
          }, 2000);
        }
      } else {
        logger.error('Demo autofill failed:', result.error);
        toast({
          title: "Auto-fill Failed",
          description: result.error || "Failed to load demo data. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error('Error during demo autofill:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while loading demo data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleDemoAutofill}
      disabled={isLoading}
      className={`flex items-center justify-center ${className}`}
    >
      <Wand2 className="mr-2 h-4 w-4" />
      {isLoading ? "Loading..." : "Demo Auto-Fill"}
    </Button>
  );
};