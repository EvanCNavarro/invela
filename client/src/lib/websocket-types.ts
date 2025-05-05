/**
 * WebSocket Event Type Definitions
 * 
 * This file contains standardized type definitions for all WebSocket events
 * used in the application. These types help ensure consistency between
 * the server broadcasting events and the client handling them.
 */

// Base WebSocket Event interface
export interface WebSocketEvent<T = any> {
  type: string;
  payload?: T;
  data?: T; // Backward compatibility with older event format
  timestamp?: string;
}

// Task-related events
export interface TaskUpdateEvent extends WebSocketEvent {
  type: 'task_update' | 'task_created' | 'task_deleted' | 'task_updated';
  payload: {
    taskId: number;
    id?: number;
    status?: string;
    progress?: number;
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

// Task count data type
export interface TaskCountData {
  count?: { total?: number };
  taskId?: number;
  companyId?: number;
  status?: string;
}

// Company tab events
export interface CompanyTabsUpdateEvent extends WebSocketEvent {
  type: 'company_tabs_update' | 'company_tabs_updated';
  payload: {
    companyId: number;
    availableTabs: string[];
  };
}

// Form submission events
export interface FormSubmittedEvent extends WebSocketEvent {
  type: 'form_submitted';
  payload: {
    companyId: number;
    taskId: number;
    formType: string;
    unlockedTabs?: string[];
  };
}

// Sidebar refresh events
export interface SidebarRefreshEvent extends WebSocketEvent {
  type: 'sidebar_refresh_tabs';
  payload: {
    companyId: number;
    forceRefresh: boolean;
  };
}

// Ping/pong events for connection health checks
export interface PingPongEvent extends WebSocketEvent {
  type: 'ping' | 'pong';
  connectionId?: string;
}

// Union type of all supported events
export type WebSocketEventTypes =
  | TaskUpdateEvent
  | CompanyTabsUpdateEvent
  | FormSubmittedEvent
  | SidebarRefreshEvent
  | PingPongEvent;
