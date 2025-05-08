/**
 * WebSocket Context Manager
 * 
 * This utility manages contextual state for WebSocket operations, allowing us to:
 * - Temporarily suppress broadcasts during bulk operations
 * - Track operation state across asynchronous boundaries
 * - Provide operation context to different parts of the application
 * 
 * Used primarily to fix race conditions in bulk operations like Clear Fields
 * by ensuring the client doesn't receive conflicting WebSocket messages.
 */
import { AsyncLocalStorage } from 'async_hooks';
import { logger } from './logger';

// Define types for our context store
type WebSocketContextStore = Map<string, any>;
type OperationType = 'clear_fields' | 'bulk_update' | 'import_data';

// Create a module-specific logger
const contextLogger = logger.child({ module: 'WebSocketContext' });

// Create async local storage to maintain context across async operations
export const webSocketAsyncStorage = new AsyncLocalStorage<WebSocketContextStore>();

// List of all form types the system supports - ensures compatibility with future form types
export type FormType = 'kyb' | 'ky3p' | 'open_banking' | 'card' | string;

/**
 * WebSocket Context API for managing broadcast suppression and operation tracking
 */
export const WebSocketContext = {
  /**
   * Get a value from the current WebSocket context
   * 
   * @param key - The context key to retrieve
   * @returns The value stored under that key, or undefined if not found
   */
  get(key: string): any {
    const store = webSocketAsyncStorage.getStore();
    return store ? store.get(key) : undefined;
  },
  
  /**
   * Set a value in the current WebSocket context
   * 
   * @param key - The context key to set
   * @param value - The value to store
   */
  set(key: string, value: any): void {
    const store = webSocketAsyncStorage.getStore();
    if (store) {
      store.set(key, value);
      contextLogger.debug(`Set WebSocket context: ${key} = ${JSON.stringify(value)}`);
    } else {
      contextLogger.warn(`Attempted to set ${key} but no context store available`);
    }
  },
  
  /**
   * Run a function with a new WebSocket context
   * 
   * @param fn - The function to run with a new context
   * @returns The result of the function
   */
  run<T>(fn: () => T): T {
    return webSocketAsyncStorage.run(new Map<string, any>(), fn);
  },
  
  /**
   * Start a bulk operation, suppressing individual field broadcasts
   * 
   * @param operationType - The type of operation being performed
   * @param taskId - The task ID being operated on
   * @param formType - The form type being operated on
   * @param duration - How long the operation should suppress broadcasts (ms)
   */
  startOperation(operationType: OperationType, taskId: number, formType: FormType, duration = 5000): void {
    this.set('currentOperation', {
      type: operationType,
      taskId,
      formType,
      startedAt: Date.now(),
      expiresAt: Date.now() + duration
    });
    this.set('suppressBroadcasts', true);
    
    contextLogger.info(`Started ${operationType} operation for task ${taskId} (${formType}), expires in ${duration}ms`);
  },
  
  /**
   * End the current bulk operation, resuming normal broadcasts
   */
  endOperation(): void {
    const op = this.get('currentOperation');
    if (op) {
      contextLogger.info(`Ended ${op.type} operation for task ${op.taskId}`);
    }
    
    this.set('suppressBroadcasts', false);
    this.set('currentOperation', null);
  },
  
  /**
   * Check if broadcasts should be suppressed based on context
   * 
   * @returns True if broadcasts should be suppressed, false otherwise
   */
  shouldSuppressBroadcasts(): boolean {
    // Get the suppress flag directly
    const suppress = this.get('suppressBroadcasts');
    
    // If explicitly set, respect that value
    if (suppress !== undefined) {
      return !!suppress;
    }
    
    // Check if there's an active operation that should suppress broadcasts
    const op = this.get('currentOperation');
    if (op && op.expiresAt > Date.now()) {
      return true;
    }
    
    // Default to allowing broadcasts
    return false;
  },
  
  /**
   * Get information about the current operation
   * 
   * @returns Information about the current operation, or null if none
   */
  getCurrentOperation(): {
    type: OperationType;
    taskId: number;
    formType: FormType;
    startedAt: number;
    expiresAt: number;
  } | null {
    return this.get('currentOperation') || null;
  }
};