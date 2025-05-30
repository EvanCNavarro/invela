/**
 * WebSocket Event Deduplication Utility
 * 
 * Shared utility for preventing duplicate processing of WebSocket messages
 * across multiple component instances. This eliminates code duplication
 * between FormFieldsListener and FormSubmissionListener components.
 * 
 * Uses global state tracking to ensure the same message is never processed
 * twice, even when multiple components are listening for the same events.
 */

import getLogger from '@/utils/logger';

const logger = getLogger('WebSocketDeduplication');

// Global state interface for tracking processed messages
interface GlobalEventTracker {
  processedEventIds: Set<string>;
  activeListeners: number;
}

// Initialize global tracking state
if (typeof window !== 'undefined' && !(window as any).__WEBSOCKET_EVENT_TRACKER) {
  (window as any).__WEBSOCKET_EVENT_TRACKER = {
    processedEventIds: new Set<string>(),
    activeListeners: 0
  };
}

/**
 * Gets the global event tracker instance
 */
function getGlobalTracker(): GlobalEventTracker | null {
  if (typeof window === 'undefined') return null;
  return (window as any).__WEBSOCKET_EVENT_TRACKER;
}

/**
 * Generates a unique message ID for deduplication
 */
export function generateMessageId(prefix: string, taskId: number, action: string, timestamp?: string): string {
  return `${prefix}_${action}_${taskId}_${timestamp || Date.now()}`;
}

/**
 * Checks if a message has already been processed
 */
export function isMessageProcessed(messageId: string): boolean {
  const tracker = getGlobalTracker();
  if (!tracker) return false;
  
  return tracker.processedEventIds.has(messageId);
}

/**
 * Marks a message as processed to prevent duplicate handling
 */
export function markMessageProcessed(messageId: string): void {
  const tracker = getGlobalTracker();
  if (!tracker) return;
  
  tracker.processedEventIds.add(messageId);
  
  // Prevent the set from growing too large - keep only the most recent 50 entries
  if (tracker.processedEventIds.size > 100) {
    const values = Array.from(tracker.processedEventIds);
    tracker.processedEventIds = new Set(values.slice(-50));
    logger.debug('Cleaned up processed message IDs cache');
  }
}

/**
 * Processes a WebSocket message with automatic deduplication
 * Returns true if the message should be processed, false if it's a duplicate
 */
export function processMessageWithDeduplication(
  messageId: string,
  taskId: number,
  expectedTaskId: number,
  formType?: string,
  expectedFormType?: string
): boolean {
  // Check if message is for the correct task
  if (taskId !== expectedTaskId) {
    return false;
  }
  
  // Check if message is for the correct form type (if specified)
  if (formType && expectedFormType && formType !== expectedFormType) {
    return false;
  }
  
  // Check for duplicate processing
  if (isMessageProcessed(messageId)) {
    logger.debug(`Skipping already processed message: ${messageId}`);
    return false;
  }
  
  // Mark as processed and allow processing
  markMessageProcessed(messageId);
  return true;
}

/**
 * Increments the active listener count
 */
export function incrementActiveListeners(): void {
  const tracker = getGlobalTracker();
  if (tracker) {
    tracker.activeListeners++;
  }
}

/**
 * Decrements the active listener count
 */
export function decrementActiveListeners(): void {
  const tracker = getGlobalTracker();
  if (tracker) {
    tracker.activeListeners = Math.max(0, tracker.activeListeners - 1);
  }
}

/**
 * Gets the current number of active listeners
 */
export function getActiveListenerCount(): number {
  const tracker = getGlobalTracker();
  return tracker?.activeListeners || 0;
}

/**
 * Clears all processed message IDs (useful for testing or cleanup)
 */
export function clearProcessedMessages(): void {
  const tracker = getGlobalTracker();
  if (tracker) {
    tracker.processedEventIds.clear();
    logger.debug('Cleared all processed message IDs');
  }
}