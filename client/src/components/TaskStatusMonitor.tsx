/**
 * TaskStatusMonitor Component
 * 
 * This component uses the WebSocketEventBridge to monitor task status changes
 * and update the UI accordingly. It provides a central place for handling
 * task-related WebSocket events and ensures consistent behavior across
 * different components that need to react to task status changes.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocketEventBridge } from '@/hooks/useWebSocketEventBridge';
import { toast } from '@/hooks/use-toast';
import getLogger from '@/utils/logger';

const logger = getLogger('TaskStatusMonitor');

interface TaskUpdate {
  taskId: number;
  progress: number;
  status: string;
  timestamp: string;
}

interface TaskStatusMonitorProps {
  children: React.ReactNode;
  onTaskUpdated?: (taskUpdate: TaskUpdate) => void;
  showToasts?: boolean;
  trackTasks?: number[];
}

/**
 * Component that monitors task status changes via WebSocket
 */
export function TaskStatusMonitor({
  children,
  onTaskUpdated,
  showToasts = false,
  trackTasks = [],
}: TaskStatusMonitorProps) {
  const { subscribe, isConnected } = useWebSocketEventBridge();
  const [lastUpdates, setLastUpdates] = useState<Record<number, TaskUpdate>>({});
  
  // Process task updates
  const handleTaskUpdate = useCallback((message: any) => {
    const payload = message.payload || message.data;
    if (!payload || !payload.taskId) return;
    
    const taskUpdate: TaskUpdate = {
      taskId: payload.taskId,
      progress: payload.progress,
      status: payload.status,
      timestamp: payload.timestamp || new Date().toISOString(),
    };
    
    // Check if we're only tracking specific tasks
    if (trackTasks.length > 0 && !trackTasks.includes(taskUpdate.taskId)) {
      logger.debug(`Ignoring update for untracked task ${taskUpdate.taskId}`);
      return;
    }
    
    // Check if this is a significant update (not just a timestamp change)
    const lastUpdate = lastUpdates[taskUpdate.taskId];
    const isSignificant = !lastUpdate || 
      lastUpdate.progress !== taskUpdate.progress || 
      lastUpdate.status !== taskUpdate.status;
    
    // Log the update
    if (isSignificant) {
      logger.info(`Task ${taskUpdate.taskId} updated:`, {
        taskId: taskUpdate.taskId,
        progress: taskUpdate.progress,
        status: taskUpdate.status,
        timestamp: taskUpdate.timestamp,
      });
    } else {
      logger.debug(`Received non-significant update for task ${taskUpdate.taskId}`);
    }
    
    // Update last updates
    setLastUpdates(prev => ({
      ...prev,
      [taskUpdate.taskId]: taskUpdate,
    }));
    
    // Call callback if provided
    if (onTaskUpdated) {
      onTaskUpdated(taskUpdate);
    }
    
    // Show toast if enabled and the update is significant
    if (showToasts && isSignificant) {
      // Only show toast for interesting status changes
      if (taskUpdate.status === 'submitted' || 
          taskUpdate.status === 'approved' || 
          taskUpdate.status === 'rejected' || 
          taskUpdate.progress === 100) {
        
        let toastTitle = '';
        let toastDescription = '';
        let variant: 'default' | 'destructive' | 'success' = 'default';
        
        if (taskUpdate.status === 'submitted' || taskUpdate.progress === 100) {
          toastTitle = 'Task Submitted';
          toastDescription = `Task #${taskUpdate.taskId} has been successfully submitted.`;
          variant = 'success';
        } else if (taskUpdate.status === 'approved') {
          toastTitle = 'Task Approved';
          toastDescription = `Task #${taskUpdate.taskId} has been approved.`;
          variant = 'success';
        } else if (taskUpdate.status === 'rejected') {
          toastTitle = 'Task Rejected';
          toastDescription = `Task #${taskUpdate.taskId} has been rejected.`;
          variant = 'destructive';
        }
        
        toast({
          title: toastTitle,
          description: toastDescription,
          variant,
        });
      }
    }
  }, [lastUpdates, onTaskUpdated, showToasts, trackTasks]);
  
  // Monitor company tabs updates
  const handleCompanyTabsUpdate = useCallback((message: any) => {
    const payload = message.payload || message.data;
    if (!payload) return;
    
    const { companyId, availableTabs } = payload;
    if (!companyId || !availableTabs) return;
    
    logger.info(`Company ${companyId} tabs updated:`, {
      companyId,
      availableTabs,
      timestamp: payload.timestamp || new Date().toISOString(),
    });
    
    // Check if the update includes File Vault access
    const hasFileVault = availableTabs.includes('file-vault');
    if (hasFileVault) {
      logger.info(`File Vault tab access changed`, {
        isLocked: false,
        previousState: false,
        timestamp: payload.timestamp || new Date().toISOString(),
      });
    }
  }, []);
  
  // Subscribe to WebSocket events
  useEffect(() => {
    if (!isConnected) return;
    
    // Subscribe to task updates
    const taskUnsubscribe = subscribe('task_updated', handleTaskUpdate);
    
    // Subscribe to company tabs updates
    const tabsUnsubscribe = subscribe('company_tabs_updated', handleCompanyTabsUpdate);
    
    logger.info('Successfully subscribed to WebSocket events');
    
    // Unsubscribe when component unmounts
    return () => {
      taskUnsubscribe();
      tabsUnsubscribe();
    };
  }, [isConnected, subscribe, handleTaskUpdate, handleCompanyTabsUpdate]);
  
  return <>{children}</>;
}

/**
 * Hook that returns the last task update for a specific task ID
 */
export function useTaskStatusMonitor(taskId: number) {
  const [taskUpdate, setTaskUpdate] = useState<TaskUpdate | null>(null);
  
  // Render a TaskStatusMonitor and capture its updates
  const handleTaskUpdated = useCallback((update: TaskUpdate) => {
    if (update.taskId === taskId) {
      setTaskUpdate(update);
    }
  }, [taskId]);
  
  // Return the task update (will be null until an update is received)
  return {
    taskUpdate,
    isUpdated: !!taskUpdate,
    progress: taskUpdate?.progress || 0,
    status: taskUpdate?.status || 'unknown',
    timestamp: taskUpdate?.timestamp || null,
  };
}
