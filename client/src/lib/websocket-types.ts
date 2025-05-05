/**
 * WebSocket Event Type Definitions
 * 
 * This file contains standardized interfaces for all WebSocket events
 * used in the application, ensuring consistent typing across the codebase.
 * 
 * The event types follow a pattern with a single-level 'payload' property
 * to simplify event handling and provide backward compatibility with
 * older code that might expect 'data' instead of 'payload'.
 */

// Base WebSocket event interface
export interface WebSocketEvent {
  type: string;
  payload: Record<string, any>;
  data?: Record<string, any>; // For backward compatibility
  timestamp?: string;
}

// Task count updates
export interface TaskCountData {
  count?: { total?: number };
  taskId?: number;
  companyId?: number;
  status?: string;
}

// Task update event
export interface TaskUpdateEvent extends WebSocketEvent {
  type: 'task_update' | 'task_status_update' | 'task_test_notification';
  payload: {
    id: number;
    status: string;
    progress: number;
    metadata?: {
      locked?: boolean;
      prerequisite_completed?: boolean;
      prerequisite_completed_at?: string;
      dependencyUnlockOperation?: boolean;
      previousProgress?: number;
      previousStatus?: string;
      isKy3pTask?: boolean;
      lastProgressUpdate?: string;
    };
    timestamp?: string;
  };
}

// Task created event
export interface TaskCreatedEvent extends WebSocketEvent {
  type: 'task_created';
  payload: TaskCountData;
}

// Task deleted event
export interface TaskDeletedEvent extends WebSocketEvent {
  type: 'task_deleted';
  payload: TaskCountData;
}

// Company tabs update event
export interface CompanyTabsUpdateEvent extends WebSocketEvent {
  type: 'company_tabs_update' | 'company_tabs_updated';
  payload: {
    companyId: number;
    availableTabs: string[];
  };
}

// Sidebar tabs refresh event
export interface SidebarRefreshEvent extends WebSocketEvent {
  type: 'sidebar_refresh_tabs';
  payload: {
    companyId: number;
    forceRefresh: boolean;
  };
}

// Form submitted event
export interface FormSubmittedEvent extends WebSocketEvent {
  type: 'form_submitted';
  payload: {
    companyId: number;
    taskId: number;
    formType: string;
    unlockedTabs?: string[];
    status?: string;
    progress?: number;
  };
}

// Form field update event
export interface FormFieldUpdateEvent extends WebSocketEvent {
  type: 'form_field_update';
  payload: {
    companyId: number;
    taskId: number;
    formType: string;
    fieldId: string | number;
    fieldKey?: string;
    value: any;
    status?: string;
  };
}

// System notification event
export interface SystemNotificationEvent extends WebSocketEvent {
  type: 'system_notification';
  payload: {
    message: string;
    level: 'info' | 'warning' | 'error' | 'success';
    timestamp: string;
    id?: string;
  };
}

// User activity event
export interface UserActivityEvent extends WebSocketEvent {
  type: 'user_activity';
  payload: {
    userId: number;
    action: string;
    resource?: string;
    resourceId?: number | string;
    timestamp: string;
  };
}

// Connection status event
export interface ConnectionStatusEvent extends WebSocketEvent {
  type: 'connection_status';
  payload: {
    status: 'connected' | 'disconnected' | 'reconnecting';
    connectionId?: string;
    timestamp: string;
  };
}

// Helper type for determining event type from string
export type WebSocketEventMap = {
  'task_update': TaskUpdateEvent;
  'task_status_update': TaskUpdateEvent;
  'task_test_notification': TaskUpdateEvent;
  'task_created': TaskCreatedEvent;
  'task_deleted': TaskDeletedEvent;
  'company_tabs_update': CompanyTabsUpdateEvent;
  'company_tabs_updated': CompanyTabsUpdateEvent;
  'sidebar_refresh_tabs': SidebarRefreshEvent;
  'form_submitted': FormSubmittedEvent;
  'form_field_update': FormFieldUpdateEvent;
  'system_notification': SystemNotificationEvent;
  'user_activity': UserActivityEvent;
  'connection_status': ConnectionStatusEvent;
};

// Helper type to get payload type from event type
export type PayloadFromEventType<T extends keyof WebSocketEventMap> = 
  WebSocketEventMap[T]['payload'];
