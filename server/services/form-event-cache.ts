/**
 * Form Event Cache Service
 *
 * This service caches recent form submission events to ensure they can be
 * re-sent to clients that reconnect after a WebSocket disconnection.
 * 
 * It provides a mechanism to store events temporarily and retrieve them
 * by task ID and form type, ensuring no form submission updates are lost
 * due to network issues.
 */

import { logger } from '../utils/logger';

// Define interface for cached form events
interface CachedFormEvent {
  taskId: number;
  formType: string;
  status: 'success' | 'error' | 'in_progress';
  timestamp: string;
  messageId: string;
  [key: string]: any; // Allow any additional properties
}

// In-memory cache for recent form events
// This is a simple implementation - for production systems with high reliability requirements,
// consider using Redis or another distributed cache
const eventCache: Map<string, CachedFormEvent[]> = new Map();

// Configuration
const MAX_EVENTS_PER_TASK = 10;  // Maximum number of events to store per task
const EVENT_TTL_MS = 15 * 60 * 1000; // Time to live for events (15 minutes)

/**
 * Generate a cache key for a task and form type
 */
function getCacheKey(taskId: number | string, formType: string): string {
  return `${taskId}_${formType}`;
}

/**
 * Add a form submission event to the cache
 * 
 * @param event The form submission event to cache
 * @returns void
 */
export function cacheFormEvent(event: CachedFormEvent): void {
  if (!event.taskId || !event.formType) {
    logger.warn('Cannot cache form event without taskId and formType', { event });
    return;
  }
  
  try {
    const key = getCacheKey(event.taskId, event.formType);
    
    // Make sure the event has a messageId for tracking
    if (!event.messageId) {
      event.messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Make sure the event has a timestamp
    if (!event.timestamp) {
      event.timestamp = new Date().toISOString();
    }
    
    // Get existing events for this task/form or initialize a new array
    const existingEvents = eventCache.get(key) || [];
    
    // Add the new event to the beginning of the array (newest first)
    existingEvents.unshift(event);
    
    // Trim the array to the maximum size
    if (existingEvents.length > MAX_EVENTS_PER_TASK) {
      existingEvents.length = MAX_EVENTS_PER_TASK;
    }
    
    // Update the cache
    eventCache.set(key, existingEvents);
    
    logger.debug('Cached form event', {
      taskId: event.taskId,
      formType: event.formType,
      status: event.status,
      cachedCount: existingEvents.length
    });
  } catch (error) {
    logger.error('Error caching form event', {
      error: error instanceof Error ? error.message : 'Unknown error',
      event
    });
  }
}

/**
 * Get recent form events for a task and form type
 * 
 * @param taskId The task ID
 * @param formType The form type
 * @returns Promise<CachedFormEvent[]> Array of cached events, newest first
 */
export async function getRecentFormEvents(
  taskId: number | string,
  formType: string
): Promise<CachedFormEvent[]> {
  try {
    const key = getCacheKey(taskId, formType);
    const events = eventCache.get(key) || [];
    
    logger.debug('Retrieved cached form events', {
      taskId,
      formType,
      eventCount: events.length
    });
    
    return events;
  } catch (error) {
    logger.error('Error retrieving cached form events', {
      error: error instanceof Error ? error.message : 'Unknown error',
      taskId,
      formType
    });
    return [];
  }
}

/**
 * Clean up expired events from the cache
 * This should be called periodically to prevent memory leaks
 */
export function cleanupExpiredEvents(): void {
  const now = Date.now();
  const cutoff = new Date(now - EVENT_TTL_MS).toISOString();
  
  try {
    let totalRemoved = 0;
    
    // For each cached task/form
    eventCache.forEach((events, key) => {
      // Filter out expired events
      const filteredEvents = events.filter(event => {
        return event.timestamp > cutoff;
      });
      
      const removedCount = events.length - filteredEvents.length;
      totalRemoved += removedCount;
      
      if (filteredEvents.length === 0) {
        // If no events remain, remove the key entirely
        eventCache.delete(key);
      } else if (removedCount > 0) {
        // Update the cache with the filtered events
        eventCache.set(key, filteredEvents);
      }
    });
    
    if (totalRemoved > 0) {
      logger.debug(`Cleaned up ${totalRemoved} expired form events`);
    }
  } catch (error) {
    logger.error('Error cleaning up expired form events', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// REMOVED: Automatic cleanup interval to eliminate polling mechanism
// Cleanup now triggered manually when needed or on specific events
// Original: const cleanupInterval = setInterval(cleanupExpiredEvents, 5 * 60 * 1000);

// Manual cleanup function available for event-driven cleanup
export function triggerManualCleanup() {
  cleanupExpiredEvents();
}

export default {
  cacheFormEvent,
  getRecentFormEvents,
  cleanupExpiredEvents,
  triggerManualCleanup
};
