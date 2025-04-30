/**
 * Submission Tracker Utility
 * 
 * A specialized utility for tracking form submission performance and flow
 * with timestamps for accurate timing measurements. This helps diagnose
 * performance issues in the form submission process.
 * 
 * This tracker is task-type agnostic and works with all form types:
 * - KYB (Know Your Business)
 * - KY3P (Know Your Third Party)
 * - Open Banking
 * 
 * Usage:
 * 1. Call startTracking() at the beginning of the submission process
 * 2. Call trackEvent() for each important step in the process
 * 3. Call stopTracking() when submission is complete
 */

import getLogger from './logger';

// Create a dedicated logger for submission tracking
const logger = getLogger('SubmissionTracker', { 
  levels: { debug: true, info: true, warn: true, error: true } 
});

type SubmissionEvent = {
  timestamp: string;
  event: string;
  taskType?: string | null;
  taskId?: number | string | null;
  details?: any;
  durationMs?: number;
};

// Submission tracking state
let submissionEvents: SubmissionEvent[] = [];
let startTime: number | null = null;
let isTracking = false;
let currentTaskId: number | string | null = null;
let currentTaskType: string | null = null;

export const submissionTracker = {
  /**
   * Start tracking submission events for a specific task
   * 
   * @param taskId - The ID of the task being submitted
   * @param formType - The type of form being submitted (kyb, ky3p, open_banking, etc.)
   */
  startTracking: (taskId: number | string, formType: string) => {
    if (isTracking) {
      logger.warn('Submission tracker already active, clearing previous events', { 
        previousTaskId: currentTaskId,
        previousTaskType: currentTaskType,
        newTaskId: taskId,
        newTaskType: formType
      });
      submissionEvents = [];
    }
    
    // Store task information
    currentTaskId = taskId;
    currentTaskType = formType;
    
    // Initialize tracking
    startTime = Date.now();
    isTracking = true;
    
    // Log the start of tracking
    submissionTracker.trackEvent('Start submission tracking', { taskId, formType });
    logger.info(`Started tracking ${formType} submission for task ${taskId}`);
  },
  
  /**
   * Track a specific event during the submission process
   * 
   * @param event - The name/description of the event
   * @param details - Optional additional details about the event
   */
  trackEvent: (event: string, details?: any) => {
    if (!isTracking) {
      logger.warn(`Attempted to track event "${event}" but tracking is not active`);
      return;
    }
    
    const now = Date.now();
    const timestamp = new Date(now).toISOString();
    
    // Create event data with task context
    const eventData: SubmissionEvent = {
      timestamp,
      event,
      taskId: currentTaskId,  // currentTaskId is already typed as number | string | null
      taskType: currentTaskType,  // currentTaskType is already typed as string | null
      details,
    };
    
    // Calculate duration from start
    if (startTime) {
      eventData.durationMs = now - startTime;
    }
    
    // Store and log the event
    submissionEvents.push(eventData);
    logger.info(`${timestamp} | ${event} (${eventData.durationMs}ms)`, details);
  },
  
  /**
   * Stop tracking and print summary information
   * 
   * @param success - Whether the submission was successful (optional)
   */
  stopTracking: (success?: boolean | null) => {
    if (!isTracking) {
      logger.warn('Attempted to stop tracking but tracking is not active');
      return;
    }
    
    // Log end event with success status if provided
    // Handle both undefined and null for success status
    const finalEvent = success !== undefined && success !== null
      ? `End submission tracking (${success ? 'success' : 'failed'})`
      : 'End submission tracking';
      
    submissionTracker.trackEvent(finalEvent);
    
    // Calculate and log summary statistics
    const totalDuration = startTime ? Date.now() - startTime : 0;
    logger.info('======== SUBMISSION TRACKING SUMMARY ========');
    logger.info(`Task: ${currentTaskType} #${currentTaskId}`);
    logger.info(`Total events: ${submissionEvents.length}`);
    logger.info(`Total duration: ${totalDuration}ms`);
    
    // Log detailed events table
    console.table(submissionEvents.map(event => ({
      Time: event.timestamp,
      Event: event.event,
      'Duration (ms)': event.durationMs,
      'Details': JSON.stringify(event.details || {}).substring(0, 50)
    })));
    
    logger.info('============================================');
    
    // Reset state for future tracking
    isTracking = false;
    startTime = null;
    currentTaskId = null;  // Use null instead of undefined for consistency
    currentTaskType = null;  // Use null instead of undefined for consistency
    submissionEvents = [];
  },
  
  /**
   * Get all tracked events (for testing/debugging)
   * 
   * @returns A copy of the current events array
   */
  getEvents: () => [...submissionEvents],
  
  /**
   * Check if tracking is currently active
   * 
   * @returns Boolean indicating if tracking is active
   */
  isActive: () => isTracking,
  
  /**
   * Get current task information
   * 
   * @returns Object with current taskId and taskType
   */
  getCurrentTask: () => ({
    taskId: currentTaskId,
    taskType: currentTaskType
  })
};

export default submissionTracker;
