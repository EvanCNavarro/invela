/**
 * Notification Provider
 * 
 * This component manages a queue-based notification system for
 * consistent toast messages and alerts across the application.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { toast } from '@/hooks/use-toast';
import { Check, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type NotificationVariant = 'success' | 'error' | 'info' | 'warning';

type Notification = {
  id: string;
  title: string;
  description?: string;
  variant: NotificationVariant;
  duration?: number;
  priority: number; // Higher number = higher priority
  action?: {
    label: string;
    onClick: () => void;
  };
};

type NotificationContextValue = {
  showNotification: (notification: Omit<Notification, 'id'>) => string;
  dismissNotification: (id: string) => void;
  getActiveNotifications: () => Notification[];
  clearAll: () => void;
};

type NotifyFunctions = {
  success: (title: string, description?: string, options?: Partial<Notification>) => string;
  error: (title: string, description?: string, options?: Partial<Notification>) => string;
  info: (title: string, description?: string, options?: Partial<Notification>) => string;
  warning: (title: string, description?: string, options?: Partial<Notification>) => string;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

/**
 * Provider component that manages notification display
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeNotification, setActiveNotification] = useState<Notification | null>(null);
  
  /**
   * Add a notification to the queue
   */
  const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const notificationWithId = { ...notification, id } as Notification;
    
    setNotifications(prev => {
      // Add the new notification and sort by priority (highest first)
      return [...prev, notificationWithId].sort((a, b) => b.priority - a.priority);
    });
    
    return id;
  }, []);
  
  /**
   * Remove a notification from the queue
   */
  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
    
    if (activeNotification?.id === id) {
      setActiveNotification(null);
    }
  }, [activeNotification]);
  
  /**
   * Get all active notifications
   */
  const getActiveNotifications = useCallback(() => {
    return [...notifications];
  }, [notifications]);
  
  /**
   * Clear all notifications
   */
  const clearAll = useCallback(() => {
    setNotifications([]);
    setActiveNotification(null);
  }, []);
  
  /**
   * Process the notification queue
   */
  useEffect(() => {
    if (!activeNotification && notifications.length > 0) {
      // Get the highest priority notification
      const nextNotification = notifications[0];
      setActiveNotification(nextNotification);
      
      // Display the toast
      toast({
        title: nextNotification.title,
        description: nextNotification.description,
        variant: nextNotification.variant,
        duration: nextNotification.duration || 5000,
        action: nextNotification.action ? {
          label: nextNotification.action.label,
          onClick: () => {
            nextNotification.action?.onClick();
            dismissNotification(nextNotification.id);
          }
        } : undefined,
      });
      
      // Remove from queue after display
      setNotifications(prev => prev.filter(n => n.id !== nextNotification.id));
      
      // Clear active notification after duration
      const timer = setTimeout(() => {
        setActiveNotification(null);
      }, nextNotification.duration || 5000);
      
      return () => clearTimeout(timer);
    }
  }, [activeNotification, notifications, dismissNotification, toast]);
  
  // Create context value
  const contextValue: NotificationContextValue = {
    showNotification,
    dismissNotification,
    getActiveNotifications,
    clearAll,
  };
  
  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to use the notification context
 */
export function useNotification() {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  
  return context;
}

/**
 * Helper to show notifications without using the hook
 */
export const notify: NotifyFunctions = {
  success: (title, description, options = {}) => {
    return toast({
      title,
      description,
      variant: 'default',
      duration: options.duration || 5000,
      action: options.action,
    });
  },
  
  error: (title, description, options = {}) => {
    return toast({
      title,
      description,
      variant: 'destructive',
      duration: options.duration || 7000, // Errors stay longer
      action: options.action,
    });
  },
  
  info: (title, description, options = {}) => {
    return toast({
      title,
      description,
      variant: 'default',
      duration: options.duration || 5000,
      action: options.action,
    });
  },
  
  warning: (title, description, options = {}) => {
    return toast({
      title,
      description,
      variant: 'destructive',
      duration: options.duration || 6000,
      action: options.action,
    });
  },
};
