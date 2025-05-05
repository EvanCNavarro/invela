/**
 * Operation Tracker - Utility for tracking complex operations across multiple steps
 * 
 * This tracker provides detailed information about form operations, especially those
 * that involve multiple API calls (like form clearing with different fallback approaches).
 * It helps with identifying performance bottlenecks and troubleshooting issues.
 */

import createLogger from './logger';

export interface OperationStep {
  name: string;
  status: 'pending' | 'success' | 'failed';
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
  error?: any;
}

export interface Operation {
  id: string;
  name: string;
  type: string;
  taskId?: number; 
  formType?: string;
  startTime: number;
  endTime?: number;
  status: 'in_progress' | 'success' | 'failed';
  steps: OperationStep[];
  metadata: Record<string, any>;
  preserveProgress?: boolean;
}

class OperationTracker {
  private logger = createLogger('OperationTracker');
  private operations: Record<string, Operation> = {};
  private operationCounter = 0;
  
  /**
   * Start tracking a new operation
   */
  startOperation(name: string, type: string, metadata: Record<string, any> = {}): string {
    const timestamp = Date.now();
    const counter = ++this.operationCounter;
    const id = `op_${timestamp}_${counter}_${Math.random().toString(36).substring(2, 7)}`;
    
    const operation: Operation = {
      id,
      name,
      type,
      startTime: timestamp,
      status: 'in_progress',
      steps: [],
      metadata: {
        ...metadata,
        timestamp: new Date(timestamp).toISOString()
      },
      taskId: metadata.taskId,
      formType: metadata.formType,
      preserveProgress: metadata.preserveProgress
    };
    
    this.operations[id] = operation;
    
    this.logger.info(`Started operation: ${name} (${type})`, {
      operationId: id,
      type,
      taskId: metadata.taskId,
      formType: metadata.formType,
      preserveProgress: metadata.preserveProgress
    });
    
    return id;
  }
  
  /**
   * Start a new step within an operation
   */
  startStep(operationId: string, stepName: string, metadata: Record<string, any> = {}): void {
    const operation = this.operations[operationId];
    if (!operation) {
      this.logger.warn(`Attempted to start step for unknown operation: ${operationId}`);
      return;
    }
    
    const step: OperationStep = {
      name: stepName,
      status: 'pending',
      startTime: Date.now(),
      metadata
    };
    
    operation.steps.push(step);
    
    this.logger.debug(`Started step: ${stepName}`, {
      operationId,
      stepName,
      operationName: operation.name,
      operationType: operation.type,
      stepIndex: operation.steps.length - 1,
      ...metadata
    });
  }
  
  /**
   * Mark a step as complete (success or failure)
   */
  completeStep(
    operationId: string, 
    stepName: string, 
    status: 'success' | 'failed',
    metadata: Record<string, any> = {},
    error?: any
  ): void {
    const operation = this.operations[operationId];
    if (!operation) {
      this.logger.warn(`Attempted to complete step for unknown operation: ${operationId}`);
      return;
    }
    
    // Find the step by name (most recent one if multiple with same name)
    const stepIndex = [...operation.steps]
      .reverse()
      .findIndex(step => step.name === stepName && step.status === 'pending');
    
    if (stepIndex === -1) {
      this.logger.warn(`Attempted to complete unknown step: ${stepName}`, {
        operationId,
        operationName: operation.name,
        knownSteps: operation.steps.map(s => s.name)
      });
      return;
    }
    
    const actualIndex = operation.steps.length - 1 - stepIndex;
    const step = operation.steps[actualIndex];
    
    const endTime = Date.now();
    step.endTime = endTime;
    step.status = status;
    step.duration = endTime - step.startTime;
    
    if (metadata) {
      step.metadata = { ...step.metadata, ...metadata };
    }
    
    if (status === 'failed' && error) {
      step.error = error;
    }
    
    const logMethod = status === 'success' ? 'info' : 'warn';
    this.logger[logMethod](`Completed step: ${stepName} (${status})`, {
      operationId,
      stepName,
      status,
      duration: step.duration,
      operationName: operation.name,
      operationType: operation.type,
      ...(status === 'failed' ? { error } : {}),
      ...metadata
    });
  }
  
  /**
   * Complete an entire operation
   */
  completeOperation(
    operationId: string, 
    status: 'success' | 'failed', 
    metadata: Record<string, any> = {}
  ): Operation | null {
    const operation = this.operations[operationId];
    if (!operation) {
      this.logger.warn(`Attempted to complete unknown operation: ${operationId}`);
      return null;
    }
    
    const endTime = Date.now();
    operation.endTime = endTime;
    operation.status = status;
    
    // Calculate total duration
    const duration = endTime - operation.startTime;
    
    // Add metadata
    operation.metadata = {
      ...operation.metadata,
      ...metadata,
      duration,
      completedSteps: operation.steps.filter(s => s.status !== 'pending').length,
      totalSteps: operation.steps.length,
      failedSteps: operation.steps.filter(s => s.status === 'failed').length
    };
    
    const logLevel = status === 'success' ? 'info' : 'warn';
    this.logger[logLevel](`Completed operation: ${operation.name} (${status})`, {
      operationId,
      name: operation.name,
      type: operation.type,
      status,
      duration,
      taskId: operation.taskId,
      formType: operation.formType,
      preserveProgress: operation.preserveProgress,
      stepCount: operation.steps.length,
      failedSteps: operation.steps.filter(s => s.status === 'failed').length,
      ...metadata
    });
    
    // Return a copy of the completed operation
    return { ...operation };
  }
  
  /**
   * Get current operation details
   */
  getOperation(operationId: string): Operation | null {
    return this.operations[operationId] ? { ...this.operations[operationId] } : null;
  }
  
  /**
   * Get all completed operations
   */
  getCompletedOperations(): Operation[] {
    return Object.values(this.operations)
      .filter(op => op.status !== 'in_progress')
      .map(op => ({ ...op }));
  }
  
  /**
   * Get all operations of a specific type
   */
  getOperationsByType(type: string): Operation[] {
    return Object.values(this.operations)
      .filter(op => op.type === type)
      .map(op => ({ ...op }));
  }
  
  /**
   * Get operations for a specific task
   */
  getOperationsForTask(taskId: number): Operation[] {
    return Object.values(this.operations)
      .filter(op => op.taskId === taskId)
      .map(op => ({ ...op }));
  }
  
  /**
   * Check if an operation is currently in progress
   */
  isOperationInProgress(operationId: string): boolean {
    const operation = this.operations[operationId];
    return operation ? operation.status === 'in_progress' : false;
  }
  
  /**
   * Log operation statistics for analysis
   */
  logOperationStats(operationId: string): void {
    const operation = this.operations[operationId];
    if (!operation) {
      this.logger.warn(`Attempted to log stats for unknown operation: ${operationId}`);
      return;
    }
    
    if (operation.status === 'in_progress') {
      this.logger.warn('Operation is still in progress, stats may be incomplete');
    }
    
    // Calculate operation duration
    const duration = operation.endTime 
      ? operation.endTime - operation.startTime 
      : Date.now() - operation.startTime;
    
    // Calculate step statistics
    const stepStats = operation.steps.reduce((stats, step) => {
      if (!step.duration) return stats;
      
      if (!stats.shortest || step.duration < stats.shortest) {
        stats.shortest = step.duration;
        stats.shortestStep = step.name;
      }
      
      if (!stats.longest || step.duration > stats.longest) {
        stats.longest = step.duration;
        stats.longestStep = step.name;
      }
      
      stats.total += step.duration;
      stats.count++;
      
      return stats;
    }, { shortest: 0, shortestStep: '', longest: 0, longestStep: '', total: 0, count: 0 });
    
    const avgStepDuration = stepStats.count > 0 ? stepStats.total / stepStats.count : 0;
    
    this.logger.info('Operation statistics:', {
      operationId,
      name: operation.name,
      type: operation.type,
      status: operation.status,
      taskId: operation.taskId,
      formType: operation.formType,
      totalDuration: duration,
      stepCount: operation.steps.length,
      completedSteps: operation.steps.filter(s => s.status !== 'pending').length,
      successfulSteps: operation.steps.filter(s => s.status === 'success').length,
      failedSteps: operation.steps.filter(s => s.status === 'failed').length,
      averageStepDuration: avgStepDuration,
      shortestStep: stepStats.shortestStep,
      shortestStepDuration: stepStats.shortest,
      longestStep: stepStats.longestStep,
      longestStepDuration: stepStats.longest,
      preserveProgressEnabled: operation.preserveProgress
    });
  }
}

// Create a singleton instance
const operationTracker = new OperationTracker();

// Export as both default and named export
export default operationTracker;
export { operationTracker };
