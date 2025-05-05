/**
 * KY3P Progress Preservation Test Script
 * 
 * This script tests the KY3P clear endpoint with and without preserveProgress parameter
 * It also demonstrates the use of operation tracking to monitor the process
 * 
 * Usage: node test-ky3p-preserve-progress.js [taskId]
 */

const fetch = require('node-fetch');

// Simple logger
class Logger {
  constructor(module) {
    this.module = module;
    this.operationId = null;
  }
  
  setOperationId(id) {
    this.operationId = id;
  }
  
  formatMessage(level, message) {
    const prefix = this.operationId ? `[${this.module}][${this.operationId}]` : `[${this.module}]`;
    return `${prefix} ${message}`;
  }
  
  debug(message, ...data) {
    console.debug(`\x1b[90m${this.formatMessage('DEBUG', message)}\x1b[0m`, ...data);
  }
  
  info(message, ...data) {
    console.info(`\x1b[36m${this.formatMessage('INFO', message)}\x1b[0m`, ...data);
  }
  
  warn(message, ...data) {
    console.warn(`\x1b[33m${this.formatMessage('WARN', message)}\x1b[0m`, ...data);
  }
  
  error(message, ...data) {
    console.error(`\x1b[31m${this.formatMessage('ERROR', message)}\x1b[0m`, ...data);
  }
  
  success(message, ...data) {
    console.info(`\x1b[32m${this.formatMessage('SUCCESS', message)}\x1b[0m`, ...data);
  }
}

// Operation Tracker
class OperationTracker {
  constructor() {
    this.operations = {};
    this.operationCounter = 0;
    this.logger = new Logger('OperationTracker');
  }
  
  generateOperationId(prefix = 'op') {
    const timestamp = Date.now();
    const counter = ++this.operationCounter;
    const random = Math.random().toString(36).substring(2, 7);
    return `${prefix}_${timestamp}_${counter}_${random}`;
  }
  
  startOperation(name, type, metadata = {}) {
    const id = this.generateOperationId();
    const startTime = Date.now();
    
    this.operations[id] = {
      id,
      name,
      type,
      startTime,
      status: 'in_progress',
      steps: [],
      metadata: {
        ...metadata,
        startTime,
        timestamp: new Date(startTime).toISOString()
      },
      taskId: metadata.taskId,
      preserveProgress: metadata.preserveProgress
    };
    
    this.logger.info(`Started operation: ${name} (${type})`);
    return id;
  }
  
  startStep(operationId, stepName, metadata = {}) {
    if (!this.operations[operationId]) {
      this.logger.warn(`Attempted to start step for unknown operation: ${operationId}`);
      return;
    }
    
    const step = {
      name: stepName,
      status: 'pending',
      startTime: Date.now(),
      metadata
    };
    
    this.operations[operationId].steps.push(step);
    this.logger.debug(`Started step: ${stepName}`);
  }
  
  completeStep(operationId, stepName, status, metadata = {}, error = null) {
    if (!this.operations[operationId]) {
      this.logger.warn(`Attempted to complete step for unknown operation: ${operationId}`);
      return;
    }
    
    // Find the step (most recent with that name)
    const steps = this.operations[operationId].steps;
    let stepIndex = -1;
    
    for (let i = steps.length - 1; i >= 0; i--) {
      if (steps[i].name === stepName && steps[i].status === 'pending') {
        stepIndex = i;
        break;
      }
    }
    
    if (stepIndex === -1) {
      this.logger.warn(`Step not found: ${stepName}`);
      return;
    }
    
    const step = steps[stepIndex];
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
    
    if (status === 'success') {
      this.logger.debug(`Completed step: ${stepName} (${status})`);
    } else {
      this.logger.warn(`Step failed: ${stepName}`);
    }
  }
  
  completeOperation(operationId, status, metadata = {}) {
    if (!this.operations[operationId]) {
      this.logger.warn(`Attempted to complete unknown operation: ${operationId}`);
      return null;
    }
    
    const operation = this.operations[operationId];
    const endTime = Date.now();
    operation.endTime = endTime;
    operation.status = status;
    operation.duration = endTime - operation.startTime;
    
    // Add final metadata
    operation.metadata = {
      ...operation.metadata,
      ...metadata,
      endTime,
      duration: operation.duration,
      completedSteps: operation.steps.filter(s => s.status !== 'pending').length,
      totalSteps: operation.steps.length,
      successSteps: operation.steps.filter(s => s.status === 'success').length,
      failedSteps: operation.steps.filter(s => s.status === 'failed').length
    };
    
    if (status === 'success') {
      this.logger.info(`Completed operation: ${operation.name} successfully in ${operation.duration}ms`);
    } else {
      this.logger.error(`Operation failed: ${operation.name} after ${operation.duration}ms`);
    }
    
    return { ...operation };
  }
  
  getOperation(id) {
    return this.operations[id] ? { ...this.operations[id] } : null;
  }
  
  getAllOperations() {
    return Object.values(this.operations).map(op => ({ ...op }));
  }
  
  logOperationStats(operationId) {
    const operation = this.operations[operationId];
    if (!operation) {
      this.logger.warn(`Attempted to log stats for unknown operation: ${operationId}`);
      return;
    }
    
    const statusColor = operation.status === 'success' ? '\x1b[32m' : 
                        operation.status === 'failed' ? '\x1b[31m' : '\x1b[33m';
    
    console.log('\n----------------------------------------');
    console.log(`Operation: ${operation.name} (${operation.type})`);
    console.log(`Status: ${statusColor}${operation.status}\x1b[0m`);
    console.log(`Duration: ${operation.duration}ms`);
    console.log(`Steps: ${operation.steps.length} total, ` + 
                `${operation.steps.filter(s => s.status === 'success').length} success, ` + 
                `${operation.steps.filter(s => s.status === 'failed').length} failed`);
    console.log('----------------------------------------\n');
    
    // Log individual steps
    console.log('Steps:');
    operation.steps.forEach((step, i) => {
      const stepStatus = step.status === 'success' ? '\x1b[32m✓\x1b[0m' : 
                         step.status === 'failed' ? '\x1b[31m✗\x1b[0m' : '\x1b[33m⋯\x1b[0m';
      
      console.log(`${i + 1}. ${stepStatus} ${step.name} - ${step.duration || '?'}ms`);
    });
    
    console.log('\n');
  }
}

// Create instances
const logger = new Logger('KY3P-Test');
const operationTracker = new OperationTracker();

// Get task progress
async function getTaskProgress(taskId) {
  const operationId = operationTracker.startOperation('Get Task Progress', 'api_call', {
    taskId: parseInt(taskId)
  });
  
  logger.setOperationId(operationId);
  logger.info(`Getting current progress for task ${taskId}`);
  
  operationTracker.startStep(operationId, 'api_request');
  
  try {
    const response = await fetch(`http://localhost:3000/api/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    operationTracker.completeStep(operationId, 'api_request', 'success', {
      status: response.status
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Error getting task: ${response.status} - ${errorText}`);
      
      operationTracker.completeOperation(operationId, 'failed', {
        error: errorText,
        status: response.status
      });
      
      return null;
    }
    
    operationTracker.startStep(operationId, 'parse_response');
    
    const task = await response.json();
    
    operationTracker.completeStep(operationId, 'parse_response', 'success');
    
    logger.info(`Current task: ID=${task.id}, Type=${task.task_type}, Status=${task.status}, Progress=${task.progress}%`);
    
    operationTracker.completeOperation(operationId, 'success', {
      taskId: task.id,
      taskType: task.task_type,
      progress: task.progress,
      status: task.status
    });
    
    return task;
  } catch (error) {
    logger.error(`Error getting task progress: ${error}`);
    
    operationTracker.completeStep(operationId, 'api_request', 'failed', {}, error);
    operationTracker.completeOperation(operationId, 'failed', { error: String(error) });
    
    return null;
  } finally {
    logger.setOperationId(null);
  }
}

// Clear with progress preservation
async function clearWithPreserveProgress(taskId) {
  const operationId = operationTracker.startOperation('Clear With Preserve Progress', 'ky3p_clear', {
    taskId: parseInt(taskId),
    preserveProgress: true
  });
  
  logger.setOperationId(operationId);
  logger.info(`Testing progress preservation for KY3P task ${taskId}`);
  
  // Check initial task progress
  operationTracker.startStep(operationId, 'get_initial_progress');
  const initialTask = await getTaskProgress(taskId);
  
  if (!initialTask) {
    operationTracker.completeStep(operationId, 'get_initial_progress', 'failed');
    operationTracker.completeOperation(operationId, 'failed', { reason: 'Failed to get initial task' });
    logger.setOperationId(null);
    return;
  }
  
  operationTracker.completeStep(operationId, 'get_initial_progress', 'success', {
    initialProgress: initialTask.progress
  });
  
  logger.info(`Initial task progress: ${initialTask.progress}%`);
  
  if (initialTask.progress === 0) {
    logger.warn('Task already has 0% progress, this test may not show correct results');
  }
  
  // Call the KY3P clear endpoint with preserveProgress=true parameter
  logger.info('Calling KY3P clear endpoint with preserveProgress=true');
  
  operationTracker.startStep(operationId, 'clear_fields_request');
  
  try {
    const response = await fetch(`http://localhost:3000/api/ky3p/clear-fields/${taskId}?preserveProgress=true&opId=${operationId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Operation-ID': operationId
      },
      body: JSON.stringify({ 
        preserveProgress: true,
        operationId
      })
    });
    
    operationTracker.completeStep(operationId, 'clear_fields_request', 'success', {
      status: response.status
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Error clearing KY3P fields: ${response.status} - ${errorText}`);
      
      operationTracker.completeOperation(operationId, 'failed', {
        error: errorText,
        status: response.status
      });
      
      logger.setOperationId(null);
      return;
    }
    
    operationTracker.startStep(operationId, 'parse_clear_response');
    
    const result = await response.json();
    
    operationTracker.completeStep(operationId, 'parse_clear_response', 'success', {
      responseData: result
    });
    
    logger.info(`Clear operation result: ${JSON.stringify(result)}`);
    
    // Check task progress after clear
    operationTracker.startStep(operationId, 'verify_progress');
    
    setTimeout(async () => {
      const afterTask = await getTaskProgress(taskId);
      
      if (!afterTask) {
        operationTracker.completeStep(operationId, 'verify_progress', 'failed', {
          reason: 'Failed to get task after clear'
        });
        
        operationTracker.completeOperation(operationId, 'failed', {
          reason: 'Failed to verify progress'
        });
        
        logger.setOperationId(null);
        return;
      }
      
      logger.info(`Task progress after clear with preserveProgress: ${afterTask.progress}%`);
      
      // Verify that progress is still the same as before
      if (afterTask.progress === initialTask.progress) {
        logger.success(`✅ SUCCESS: Progress was correctly preserved at ${afterTask.progress}%!`);
        
        operationTracker.completeStep(operationId, 'verify_progress', 'success', {
          initialProgress: initialTask.progress,
          finalProgress: afterTask.progress,
          preserved: true
        });
        
        operationTracker.completeOperation(operationId, 'success', {
          initialProgress: initialTask.progress,
          finalProgress: afterTask.progress,
          preserveProgressWorked: true
        });
      } else {
        logger.error(`❌ FAILURE: Progress changed from ${initialTask.progress}% to ${afterTask.progress}%`);
        
        operationTracker.completeStep(operationId, 'verify_progress', 'failed', {
          initialProgress: initialTask.progress,
          finalProgress: afterTask.progress,
          preserved: false
        });
        
        operationTracker.completeOperation(operationId, 'failed', {
          initialProgress: initialTask.progress,
          finalProgress: afterTask.progress,
          preserveProgressWorked: false,
          reason: 'Progress was not preserved'
        });
      }
      
      logger.setOperationId(null);
      operationTracker.logOperationStats(operationId);
      
      // Run the next test
      setTimeout(() => {
        clearWithoutPreserveProgress(taskId);
      }, 2000);
    }, 1000); // Wait a bit for progress update to propagate
  } catch (error) {
    logger.error(`Error in test: ${error}`);
    
    operationTracker.completeStep(operationId, 'clear_fields_request', 'failed', {}, error);
    operationTracker.completeOperation(operationId, 'failed', {
      error: String(error)
    });
    
    logger.setOperationId(null);
  }
}

// Clear without progress preservation
async function clearWithoutPreserveProgress(taskId) {
  const operationId = operationTracker.startOperation('Clear Without Preserve Progress', 'ky3p_clear', {
    taskId: parseInt(taskId),
    preserveProgress: false
  });
  
  logger.setOperationId(operationId);
  logger.info(`Testing standard clear without progress preservation for KY3P task ${taskId}`);
  
  // Check initial task progress
  operationTracker.startStep(operationId, 'get_initial_progress');
  const initialTask = await getTaskProgress(taskId);
  
  if (!initialTask) {
    operationTracker.completeStep(operationId, 'get_initial_progress', 'failed');
    operationTracker.completeOperation(operationId, 'failed', { reason: 'Failed to get initial task' });
    logger.setOperationId(null);
    return;
  }
  
  operationTracker.completeStep(operationId, 'get_initial_progress', 'success', {
    initialProgress: initialTask.progress
  });
  
  logger.info(`Initial task progress: ${initialTask.progress}%`);
  
  // Call the KY3P clear endpoint without preserveProgress parameter
  logger.info('Calling KY3P clear endpoint without preserveProgress');
  
  operationTracker.startStep(operationId, 'clear_fields_request');
  
  try {
    const response = await fetch(`http://localhost:3000/api/ky3p/clear-fields/${taskId}?opId=${operationId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Operation-ID': operationId
      }
    });
    
    operationTracker.completeStep(operationId, 'clear_fields_request', 'success', {
      status: response.status
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Error clearing KY3P fields: ${response.status} - ${errorText}`);
      
      operationTracker.completeOperation(operationId, 'failed', {
        error: errorText,
        status: response.status
      });
      
      logger.setOperationId(null);
      return;
    }
    
    operationTracker.startStep(operationId, 'parse_clear_response');
    
    const result = await response.json();
    
    operationTracker.completeStep(operationId, 'parse_clear_response', 'success', {
      responseData: result
    });
    
    logger.info(`Clear operation result: ${JSON.stringify(result)}`);
    
    // Check task progress after clear
    operationTracker.startStep(operationId, 'verify_progress');
    
    setTimeout(async () => {
      const afterTask = await getTaskProgress(taskId);
      
      if (!afterTask) {
        operationTracker.completeStep(operationId, 'verify_progress', 'failed', {
          reason: 'Failed to get task after clear'
        });
        
        operationTracker.completeOperation(operationId, 'failed', {
          reason: 'Failed to verify progress'
        });
        
        logger.setOperationId(null);
        return;
      }
      
      logger.info(`Task progress after standard clear: ${afterTask.progress}%`);
      
      // Verify that progress is reset to 0%
      if (afterTask.progress === 0) {
        logger.success(`✅ SUCCESS: Progress was correctly reset to 0%`);
        
        operationTracker.completeStep(operationId, 'verify_progress', 'success', {
          initialProgress: initialTask.progress,
          finalProgress: afterTask.progress,
          reset: true
        });
        
        operationTracker.completeOperation(operationId, 'success', {
          initialProgress: initialTask.progress,
          finalProgress: afterTask.progress,
          resetWorked: true
        });
      } else {
        logger.error(`❌ FAILURE: Progress was not reset to 0%, current: ${afterTask.progress}%`);
        
        operationTracker.completeStep(operationId, 'verify_progress', 'failed', {
          initialProgress: initialTask.progress,
          finalProgress: afterTask.progress,
          reset: false
        });
        
        operationTracker.completeOperation(operationId, 'failed', {
          initialProgress: initialTask.progress,
          finalProgress: afterTask.progress,
          resetWorked: false,
          reason: 'Progress was not reset to 0%'
        });
      }
      
      logger.setOperationId(null);
      operationTracker.logOperationStats(operationId);
      
      console.log('\n\n=============================================');
      console.log('All tests completed!');
      console.log('=============================================\n');
    }, 1000); // Wait a bit for progress update to propagate
  } catch (error) {
    logger.error(`Error in test: ${error}`);
    
    operationTracker.completeStep(operationId, 'clear_fields_request', 'failed', {}, error);
    operationTracker.completeOperation(operationId, 'failed', {
      error: String(error)
    });
    
    logger.setOperationId(null);
  }
}

// Main function
async function main() {
  // Use task ID from command line args or default to 694
  const taskId = process.argv[2] || '694';
  
  console.log('\n=============================================');
  console.log(`KY3P Progress Preservation Test - Task ID: ${taskId}`);
  console.log('=============================================\n');
  
  // Start the test with progress preservation
  clearWithPreserveProgress(taskId);
}

// Run the test
main().catch(console.error);
