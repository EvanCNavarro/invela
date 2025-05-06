/**
 * NotificationProvider
 * 
 * A context provider for managing application-wide notifications.
 * This component provides a queue-based approach to ensure all
 * notifications are displayed, even if multiple notifications
 * are triggered in quick succession.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast, ToastActionElement, useToast } from '@/hooks/use-toast';
import getLogger from '@/utils/logger';

const logger = getLogger('NotificationProvider');

// Define notification types
type NotificationVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info';

export interface Notification {
  id?: string;
  title: string;
  description?: string;
  variant?: NotificationVariant;
  action?: ToastActionElement;
  important?: boolean; // If true, will be shown even if there are many notifications
  timestamp?: Date;
  expiresAt?: Date;
}

interface NotificationContextType {
  addNotification: (notification: Notification) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  notifications: Notification[];
  errorCount: number;
}

// Create the context with default values
const NotificationContext = createContext<NotificationContextType>({
  addNotification: () => '',
  removeNotification: () => {},
  clearNotifications: () => {},
  notifications: [],
  errorCount: 0,
});

// Hook for using notifications
export const useNotification = () => useContext(NotificationContext);

// Props interface
interface NotificationProviderProps {
  children: React.ReactNode;
  maxQueueSize?: number;
  throttleMs?: number;
}

/**
 * NotificationProvider component
 */
export function NotificationProvider({
  children,
  maxQueueSize = 10,
  throttleMs = 500,
}: NotificationProviderProps) {
  // State for notification queue
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [errorCount, setErrorCount] = useState(0);
  const [processingQueue, setProcessingQueue] = useState(false);
  
  // Access to toast API
  const { toast: showToast } = useToast();
  
  // Generate unique ID for notifications
  const generateId = useCallback(() => {
    return `notification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }, []);
  
  // Add a notification to the queue
  const addNotification = useCallback((notification: Notification) => {
    const id = notification.id || generateId();
    const timestamp = notification.timestamp || new Date();
    const expiresAt = notification.expiresAt || new Date(timestamp.getTime() + 60000); // Default to 1 minute expiry
    
    const notificationWithId: Notification = {
      ...notification,
      id,
      timestamp,
      expiresAt,
    };
    
    logger.info(`Adding notification to queue: ${id}`, {
      title: notification.title,
      variant: notification.variant,
      timestamp: timestamp.toISOString(),
    });
    
    // Track error count
    if (notification.variant === 'destructive') {
      setErrorCount(prev => prev + 1);
    }
    
    // Add to queue
    setNotifications(prev => {
      // If queue is getting too big, remove some non-important notifications
      if (prev.length >= maxQueueSize) {
        // Remove the oldest non-important notifications
        const newQueue = [...prev];
        let removed = 0;
        for (let i = 0; i < newQueue.length && removed < 3; i++) {
          if (!newQueue[i].important) {
            newQueue.splice(i, 1);
            removed++;
            i--; // Adjust index after removal
          }
        }
        
        // If we can't remove any, just keep the newest ones
        if (removed === 0) {
          newQueue.splice(0, 3);
        }
        
        return [...newQueue, notificationWithId];
      }
      
      return [...prev, notificationWithId];
    });
    
    return id;
  }, [generateId, maxQueueSize]);
  
  // Remove a notification from the queue
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      if (notification && notification.variant === 'destructive') {
        setErrorCount(prevCount => Math.max(0, prevCount - 1));
      }
      
      return prev.filter(n => n.id !== id);
    });
  }, []);
  
  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setErrorCount(0);
  }, []);
  
  // Process the notification queue
  useEffect(() => {
    if (notifications.length === 0 || processingQueue) {
      return;
    }
    
    const processQueue = async () => {
      setProcessingQueue(true);
      
      const notification = notifications[0];
      
      // Show the notification
      if (notification) {
        logger.info(`Showing notification: ${notification.id}`, {
          title: notification.title,
          variant: notification.variant,
        });
        
        // Check if it's expired
        if (notification.expiresAt && notification.expiresAt < new Date()) {
          logger.info(`Notification ${notification.id} expired, skipping`);
        } else {
          // Show the toast
          showToast({
            title: notification.title,
            description: notification.description,
            variant: notification.variant as any,
            action: notification.action,
          });
        }
        
        // Remove the notification from the queue
        removeNotification(notification.id!);
      }
      
      // Wait a short time before processing the next notification
      await new Promise(resolve => setTimeout(resolve, throttleMs));
      setProcessingQueue(false);
    };
    
    processQueue();
  }, [notifications, processingQueue, removeNotification, showToast, throttleMs]);
  
  // Context value
  const contextValue = {
    addNotification,
    removeNotification,
    clearNotifications,
    notifications,
    errorCount,
  };
  
  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Shorthand function to show a notification
 */
export function showNotification(notification: Notification) {
  // If we're in a React component, use the hook
  try {
    const { addNotification } = useNotification();
    return addNotification(notification);
  } catch (error) {
    // If we're outside a React component (or provider not available), fall back to toast
    logger.warn('NotificationProvider not available, falling back to direct toast');
    toast({
      title: notification.title,
      description: notification.description,
      variant: notification.variant as any,
      action: notification.action,
    });
    return generateId();
  }
}

// Helper to generate IDs for notifications outside of React component
function generateId() {
  return `notification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Helper functions for common notification types
export const notify = {
  success: (title: string, description?: string) => showNotification({ title, description, variant: 'success' }),
  error: (title: string, description?: string) => showNotification({ title, description, variant: 'destructive', important: true }),
  warning: (title: string, description?: string) => showNotification({ title, description, variant: 'warning' }),
  info: (title: string, description?: string) => showNotification({ title, description, variant: 'info' }),
};
