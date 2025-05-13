/**
 * WebSocketLogger - Enhanced logging utility for WebSocket operations
 * 
 * This specialized logger adds rich context to WebSocket operations, helping
 * track and debug real-time communications, especially for form operations.
 */

import createLogger from './logger';

interface WebSocketMessage {
  type: string;
  payload?: any;
  data?: any;
  timestamp?: string;
  [key: string]: any;
}

interface WebSocketLogMetadata {
  connectionId?: string;
  operationId?: string;
  messageId?: string;
  messageType?: string;
  taskId?: number;
  formType?: string;
  preserveProgress?: boolean;
  timestamp?: string;
  duration?: number;
  [key: string]: any;
}

class WebSocketLogger {
  private logger = createLogger('WebSocket');
  private connectionId: string | null = null;
  private operationIdCounter = 0;
  private startTimes: Record<string, number> = {};
  
  /**
   * Set the connection ID for this logger instance
   */
  setConnectionId(id: string): void {
    this.connectionId = id;
    this.logger.info(`Connection established with ID: ${id}`);
  }
  
  /**
   * Generate a unique operation ID for tracking operations across multiple calls
   */
  generateOperationId(prefix = 'ws_op'): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const counter = ++this.operationIdCounter;
    return `${prefix}_${timestamp}_${counter}_${randomSuffix}`;
  }
  
  /**
   * Start timing an operation for performance tracking
   */
  startTiming(operationId: string): void {
    this.startTimes[operationId] = Date.now();
  }
  
  /**
   * End timing an operation and get the duration
   */
  endTiming(operationId: string): number {
    if (!this.startTimes[operationId]) {
      return 0;
    }
    
    const duration = Date.now() - this.startTimes[operationId];
    delete this.startTimes[operationId];
    return duration;
  }
  
  /**
   * Log a WebSocket message being sent
   */
  logSend(message: WebSocketMessage, metadata: WebSocketLogMetadata = {}): void {
    const operationId = metadata.operationId || this.generateOperationId('ws_send');
    
    const enhancedMetadata = {
      ...metadata,
      connectionId: this.connectionId || metadata.connectionId,
      operationId,
      direction: 'outgoing',
      messageType: message.type,
      timestamp: new Date().toISOString(),
      messageSize: JSON.stringify(message).length
    };
    
    this.startTiming(operationId);
    
    this.logger.info(`Sending message of type: ${message.type}`, enhancedMetadata);
    this.logger.debug('Outgoing message details:', message, enhancedMetadata);
  }
  
  /**
   * Log a WebSocket message being received
   */
  logReceive(message: WebSocketMessage, metadata: WebSocketLogMetadata = {}): void {
    const operationId = metadata.operationId || this.generateOperationId('ws_recv');
    
    // Extract task ID from various message formats
    let taskId = metadata.taskId;
    if (!taskId && message) {
      if (message.taskId) {
        taskId = message.taskId;
      } else if (message.payload?.id) {
        taskId = message.payload.id;
      } else if (message.data?.id) {
        taskId = message.data.id;
      } else if (message.payload?.taskId) {
        taskId = message.payload.taskId;
      } else if (message.data?.taskId) {
        taskId = message.data.taskId;
      }
    }
    
    const enhancedMetadata = {
      ...metadata,
      connectionId: this.connectionId || metadata.connectionId,
      operationId,
      direction: 'incoming',
      messageType: message.type,
      taskId,
      timestamp: new Date().toISOString(),
      messageSize: JSON.stringify(message).length
    };
    
    // Analyze message structure to help debug format issues
    if (message.type === 'task_update') {
      const messageStructure = {
        hasPayload: !!message.payload,
        hasNestedPayload: !!message.payload?.payload,
        hasData: !!message.data,
        hasNestedData: !!message.data?.data,
        payloadTaskId: message.payload?.id || message.payload?.taskId,
        dataTaskId: message.data?.id || message.data?.taskId,
      };
      
      this.logger.debug('WebSocket message structure analysis:', messageStructure);
    }
    
    this.logger.info(`Received message of type: ${message.type}`, enhancedMetadata);
    this.logger.debug('Incoming message details:', message, enhancedMetadata);
  }
  
  /**
   * Log progress preservation operations
   */
  logProgressPreservation(taskId: number, operation: 'preserve' | 'reset', metadata: WebSocketLogMetadata = {}): void {
    const operationId = metadata.operationId || this.generateOperationId('progress_op');
    
    const enhancedMetadata = {
      ...metadata,
      connectionId: this.connectionId,
      operationId,
      taskId,
      operation,
      timestamp: new Date().toISOString(),
    };
    
    if (operation === 'preserve') {
      this.logger.info(`Preserving progress for task ${taskId}`, enhancedMetadata);
    } else {
      this.logger.info(`Resetting progress for task ${taskId}`, enhancedMetadata);
    }
  }
  
  /**
   * Log form operation (clear, update, etc.)
   */
  logFormOperation(operation: string, formType: string, taskId: number, metadata: WebSocketLogMetadata = {}): void {
    const operationId = metadata.operationId || this.generateOperationId('form_op');
    
    const enhancedMetadata = {
      ...metadata,
      connectionId: this.connectionId,
      operationId,
      taskId,
      formType,
      operation,
      timestamp: new Date().toISOString(),
    };
    
    this.startTiming(operationId);
    
    this.logger.info(`Form operation: ${operation} on ${formType} form for task ${taskId}`, enhancedMetadata);
  }
  
  /**
   * Log completion of form operation with results
   */
  logFormOperationComplete(operationId: string, success: boolean, result: any, metadata: WebSocketLogMetadata = {}): void {
    const duration = this.endTiming(operationId);
    
    const enhancedMetadata = {
      ...metadata,
      connectionId: this.connectionId,
      operationId,
      duration,
      success,
      timestamp: new Date().toISOString(),
    };
    
    if (success) {
      this.logger.info(`Form operation completed successfully in ${duration}ms`, enhancedMetadata);
    } else {
      this.logger.error(`Form operation failed after ${duration}ms`, enhancedMetadata);
    }
    
    this.logger.debug('Operation result:', result, enhancedMetadata);
  }
  
  /**
   * Log WebSocket connection errors
   */
  logConnectionError(error: Error, metadata: WebSocketLogMetadata = {}): void {
    const operationId = metadata.operationId || this.generateOperationId('ws_error');
    
    const enhancedMetadata = {
      ...metadata,
      connectionId: this.connectionId,
      operationId,
      errorName: error.name,
      errorMessage: error.message,
      timestamp: new Date().toISOString(),
    };
    
    this.logger.error('WebSocket connection error:', error, enhancedMetadata);
  }
  
  /**
   * Log general WebSocket status updates
   */
  logStatus(status: string, metadata: WebSocketLogMetadata = {}): void {
    const enhancedMetadata = {
      ...metadata,
      connectionId: this.connectionId,
      timestamp: new Date().toISOString(),
    };
    
    this.logger.info(`WebSocket status: ${status}`, enhancedMetadata);
  }
}

// Create a singleton instance
const wsLogger = new WebSocketLogger();

// Export as both default and named export
export default wsLogger;
export { wsLogger };
