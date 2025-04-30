/**
 * Submission Tracker
 * 
 * This utility helps track form submission events and timing for performance monitoring.
 * It logs events with timestamps to help measure and optimize the submission process.
 */

import getLogger from './logger';

// Add global gtag type for TypeScript
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

// Create a dedicated logger instance for submission tracking
const logger = getLogger('SubmissionTracker', {
  levels: { debug: true, info: true, warn: true, error: true }
});

class SubmissionTracker {
  private taskId: string | number = '';
  private taskType: string = '';
  private events: Array<{ event: string; timestamp: string; data?: any }> = [];
  private isTracking: boolean = false;
  
  /**
   * Check if the tracker is currently active
   */
  get isActive(): boolean {
    return this.isTracking;
  }
  private startTime: number = 0;

  /**
   * Start tracking a submission
   */
  startTracking(taskId: string | number, taskType: string): void {
    this.taskId = taskId;
    this.taskType = taskType;
    this.isTracking = true;
    this.startTime = Date.now();
    this.events = [];
    
    logger.info(`Started tracking submission for ${taskType} task ${taskId}`);
    this.trackEvent('Tracking started');
  }

  /**
   * Track a submission event with optional data
   */
  trackEvent(event: string, data?: any): void {
    if (!this.isTracking) {
      logger.warn('Attempted to track event when not tracking');
      return;
    }
    
    const timestamp = new Date().toISOString();
    const elapsedMs = Date.now() - this.startTime;
    
    this.events.push({ event, timestamp, data });
    
    logger.info(`[+${elapsedMs}ms] ${event}`, data);
  }

  /**
   * Stop tracking and report submission results
   */
  stopTracking(success: boolean): void {
    if (!this.isTracking) {
      return;
    }
    
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    
    this.trackEvent(success ? 'Submission completed successfully' : 'Submission failed');
    
    logger.info(`Submission ${success ? 'completed' : 'failed'} in ${totalDuration}ms`, {
      taskId: this.taskId,
      taskType: this.taskType,
      eventCount: this.events.length,
      totalDuration
    });
    
    // Send telemetry if needed
    if (typeof window !== 'undefined' && window.gtag) {
      try {
        window.gtag('event', 'form_submission', {
          event_category: 'forms',
          event_label: this.taskType,
          value: success ? 1 : 0,
          metric_duration: totalDuration
        });
      } catch (e) {
        // Ignore telemetry errors
      }
    }
    
    this.isTracking = false;
  }

  /**
   * Get all tracked events
   */
  getEvents() {
    return [...this.events];
  }
}

// Create singleton instance
const submissionTracker = new SubmissionTracker();

export default submissionTracker;