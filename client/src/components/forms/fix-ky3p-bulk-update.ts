/**
 * KY3P Bulk Update Fix
 * 
 * This module provides a fixed implementation of the KY3P bulk update functionality
 * that works consistently with the existing KYB implementation.
 */

import getLogger from '@/utils/logger';

const logger = getLogger('KY3P-BulkUpdate', {
  levels: { debug: true, info: true, warn: true, error: true }
});

/**
 * Perform a bulk update for KY3P responses
 * 
 * This function implements the bulk update operation for KY3P by directly
 * using the KYB endpoint which is known to work properly.
 * 
 * IMPORTANT: We pass the data EXACTLY as is - no conversion from field keys to IDs.
 * This is critical because the KYB endpoint expects field keys, not IDs.
 * 
 * @param taskId The task ID
 * @param responseData The response data (key-value pairs with field keys, not IDs)
 * @returns true if successful, false otherwise
 */
export async function bulkUpdateKy3pResponses(
  taskId: number,
  responseData: Record<string, any>
): Promise<boolean> {
  if (!taskId) {
    logger.error('[KY3P Bulk Update] No task ID provided');
    return false;
  }
  
  try {
    logger.info(`[KY3P Bulk Update] Performing bulk update for task ${taskId} with ${Object.keys(responseData).length} fields`);
    
    // Clean up the data to remove any potential problematic fields
    const cleanData = { ...responseData };
    // Remove any fields that start with underscore (metadata)
    Object.keys(cleanData).forEach(key => {
      if (key.startsWith('_')) {
        delete cleanData[key];
      }
    });
    
    // CRITICAL: We use the KYB bulk-update endpoint directly WITHOUT converting keys to IDs
    const response = await fetch(`/api/kyb/bulk-update/${taskId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        responses: cleanData
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[KY3P Bulk Update] Failed: ${response.status} ${errorText}`);
      return false;
    }
    
    // Update task progress to 100%
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          progress: 100
        })
      });
    } catch (progressError) {
      logger.warn(`[KY3P Bulk Update] Failed to update progress, but data was saved:`, progressError);
      // Continue even if progress update fails - the data was already saved
    }
    
    // Broadcast update via server API for real-time UI updates
    try {
      await fetch('/api/broadcast/task-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          taskId,
          type: 'task_updated',
          timestamp: new Date().toISOString()
        })
      });
    } catch (broadcastError) {
      logger.warn(`[KY3P Bulk Update] Failed to broadcast update, but data was saved:`, broadcastError);
      // Continue even if broadcast fails - the data was already saved
    }
    
    logger.info('[KY3P Bulk Update] Successfully completed bulk update');
    return true;
  } catch (error) {
    logger.error('[KY3P Bulk Update] Error during bulk update:', error);
    return false;
  }
}