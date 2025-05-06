/**
 * Form Submission Tracker
 * 
 * This utility provides tracking for form submissions through the entire workflow,
 * logging events to help diagnose submission failures.
 * 
 * It tracks:
 * - Each step in the submission process
 * - Timing information
 * - Errors that occur
 * - Status of related operations (file creation, tab updates)
 */

import getLogger from './logger';

const logger = getLogger('SubmissionTracker');

type SubmissionEvent = {
  step: string;
  timestamp: string;
  metadata?: Record<string, any>;
  isError?: boolean;
};

type SubmissionSession = {
  taskId: number;
  taskType: string;
  startTime: string;
  events: SubmissionEvent[];
  isActive: boolean;
  endTime?: string;
  status?: 'success' | 'failed' | 'in_progress';
  errorCode?: number;
};

class SubmissionTracker {
  private currentSession: SubmissionSession | null = null;
  private sessionHistory: SubmissionSession[] = [];
  private maxHistoryLength = 10; // Keep the last 10 submissions

  /**
   * Start tracking a new submission
   */
  startTracking(taskId: number, taskType: string): void {
    // If there's already an active session, end it first
    if (this.currentSession && this.currentSession.isActive) {
      this.stopTracking(999, 'New session started before previous completed');
    }

    // Create new session
    this.currentSession = {
      taskId,
      taskType,
      startTime: new Date().toISOString(),
      events: [],
      isActive: true,
      status: 'in_progress',
    };

    logger.info(`Started tracking submission for task ${taskId} (${taskType})`);
    this.trackEvent('Submission tracking started');
  }

  /**
   * Track an event during submission
   */
  trackEvent(step: string, metadata?: Record<string, any>, isError = false): void {
    if (!this.currentSession) {
      logger.warn(`Attempted to track event "${step}" but no active session exists`);
      return;
    }

    const event: SubmissionEvent = {
      step,
      timestamp: new Date().toISOString(),
      metadata,
      isError,
    };

    this.currentSession.events.push(event);

    if (isError) {
      logger.warn(`Submission error: ${step}`, metadata);
    } else {
      logger.info(`Submission event: ${step}`, metadata);
    }
  }

  /**
   * Stop tracking and record outcome
   */
  stopTracking(errorCode = 0, errorMessage?: string): void {
    if (!this.currentSession) {
      logger.warn('Attempted to stop tracking but no active session exists');
      return;
    }

    this.currentSession.isActive = false;
    this.currentSession.endTime = new Date().toISOString();

    if (errorCode > 0) {
      this.currentSession.status = 'failed';
      this.currentSession.errorCode = errorCode;
      
      // Add error event if provided
      if (errorMessage) {
        this.trackEvent(`Submission failed: ${errorMessage}`, { errorCode }, true);
      } else {
        this.trackEvent('Submission failed', { errorCode }, true);
      }
      
      logger.error(`Submission for task ${this.currentSession.taskId} failed with code ${errorCode}`);
    } else {
      this.currentSession.status = 'success';
      this.trackEvent('Submission completed successfully');
      logger.info(`Submission for task ${this.currentSession.taskId} completed successfully`);
    }

    // Add to history
    this.sessionHistory.unshift({ ...this.currentSession });
    
    // Trim history if needed
    if (this.sessionHistory.length > this.maxHistoryLength) {
      this.sessionHistory.pop();
    }

    // Clear current session
    this.currentSession = null;
  }

  /**
   * Get the current active session details
   */
  getCurrentSession(): SubmissionSession | null {
    return this.currentSession;
  }

  /**
   * Get a specific historical session by task ID
   */
  getSessionByTaskId(taskId: number): SubmissionSession | null {
    return this.sessionHistory.find(session => session.taskId === taskId) || null;
  }

  /**
   * Get all historical sessions
   */
  getSessionHistory(): SubmissionSession[] {
    return [...this.sessionHistory];
  }

  /**
   * Clear submission tracking history
   */
  clearHistory(): void {
    this.sessionHistory = [];
    logger.info('Submission history cleared');
  }

  /**
   * Cancel the current tracking session without recording an outcome
   */
  cancelTracking(): void {
    if (!this.currentSession) {
      return;
    }

    logger.info(`Cancelled tracking for task ${this.currentSession.taskId}`);
    this.currentSession = null;
  }

  /**
   * Check if there's an active submission in progress
   */
  isSubmissionInProgress(): boolean {
    return this.currentSession !== null && this.currentSession.isActive;
  }

  /**
   * Generate a diagnostic report for a specific submission
   */
  generateSubmissionReport(taskId: number): string {
    // Find the session for this task
    const session = this.getSessionByTaskId(taskId) || this.currentSession;
    
    if (!session || session.taskId !== taskId) {
      return `No submission data found for task ${taskId}`;
    }

    // Calculate duration if the session has ended
    let duration = 'N/A';
    if (session.endTime) {
      const start = new Date(session.startTime).getTime();
      const end = new Date(session.endTime).getTime();
      duration = `${((end - start) / 1000).toFixed(2)}s`;
    }

    // Format the report
    let report = `Submission Report for Task ${taskId} (${session.taskType})\n`;
    report += `Status: ${session.status || 'Unknown'}\n`;
    report += `Started: ${new Date(session.startTime).toLocaleString()}\n`;
    
    if (session.endTime) {
      report += `Ended: ${new Date(session.endTime).toLocaleString()}\n`;
    }
    
    report += `Duration: ${duration}\n`;
    report += `Events: ${session.events.length}\n\n`;

    // Add events
    session.events.forEach((event, index) => {
      const time = new Date(event.timestamp).toLocaleTimeString();
      const prefix = event.isError ? '❌' : '✓';
      report += `${index + 1}. ${prefix} ${time} - ${event.step}\n`;
      
      // Add metadata if any
      if (event.metadata && Object.keys(event.metadata).length > 0) {
        const metadata = JSON.stringify(event.metadata, null, 2);
        report += `   ${metadata.replace(/\n/g, '\n   ')}\n`;
      }
    });

    return report;
  }
}

// Create a singleton instance
const submissionTracker = new SubmissionTracker();

// Export the singleton
export default submissionTracker;
