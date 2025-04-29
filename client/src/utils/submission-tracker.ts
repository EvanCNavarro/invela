/**
 * Submission Tracker Utility
 * 
 * A specialized utility for tracking form submission performance and flow
 * with timestamps for accurate timing measurements.
 */

type SubmissionEvent = {
  timestamp: string;
  event: string;
  details?: any;
  durationMs?: number;
};

let submissionEvents: SubmissionEvent[] = [];
let startTime: number | null = null;
let isTracking = false;

export const submissionTracker = {
  /**
   * Start tracking submission events for a specific task
   */
  startTracking: (taskId: number, formType: string) => {
    if (isTracking) {
      console.warn('Submission tracker already active, clearing previous events');
      submissionEvents = [];
    }
    
    startTime = Date.now();
    isTracking = true;
    
    submissionTracker.trackEvent('Start submission tracking', { taskId, formType });
    console.log(`[SubmissionTracker] Started tracking ${formType} submission for task ${taskId}`);
  },
  
  /**
   * Track a specific event during the submission process
   */
  trackEvent: (event: string, details?: any) => {
    if (!isTracking) return;
    
    const now = Date.now();
    const timestamp = new Date(now).toISOString();
    
    const eventData: SubmissionEvent = {
      timestamp,
      event,
      details,
    };
    
    if (startTime) {
      eventData.durationMs = now - startTime;
    }
    
    submissionEvents.push(eventData);
    console.log(`[SubmissionTracker] ${timestamp} | ${event}`, details);
  },
  
  /**
   * Stop tracking and print summary information
   */
  stopTracking: () => {
    if (!isTracking) return;
    
    submissionTracker.trackEvent('End submission tracking');
    
    const totalDuration = startTime ? Date.now() - startTime : 0;
    console.log('======== SUBMISSION TRACKING SUMMARY ========');
    console.log(`Total events: ${submissionEvents.length}`);
    console.log(`Total duration: ${totalDuration}ms`);
    
    // Print events table
    console.table(submissionEvents.map(event => ({
      Time: event.timestamp,
      Event: event.event,
      'Duration (ms)': event.durationMs,
    })));
    
    console.log('============================================');
    
    // Reset state
    isTracking = false;
    startTime = null;
    submissionEvents = [];
  },
  
  /**
   * Get all tracked events (for testing/debugging)
   */
  getEvents: () => [...submissionEvents],
};

export default submissionTracker;
