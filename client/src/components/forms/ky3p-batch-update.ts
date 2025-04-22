/**
 * KY3P Batch Update Implementation
 * 
 * This module provides a standardized implementation for batch updating KY3P form fields
 * using the same pattern as KYB forms - updating fields in small batches instead of bulk.
 */

import getLogger from '@/utils/logger';

const logger = getLogger('KY3P-BatchUpdate', {
  levels: { debug: true, info: true, warn: true, error: true }
});

/**
 * Perform a batched update for KY3P responses
 * 
 * This function updates fields in batches for KY3P tasks, similar to
 * how KYB forms handle updates. This approach is more reliable and
 * avoids issues with bulk updates.
 * 
 * @param taskId The task ID
 * @param responseData The response data (key-value pairs with field keys)
 * @returns true if successful, false otherwise
 */
export async function batchUpdateKy3pResponses(
  taskId: number,
  responseData: Record<string, any>
): Promise<boolean> {
  if (!taskId) {
    logger.error('[KY3P Batch Update] No task ID provided');
    return false;
  }
  
  try {
    // Clean up the data to remove any problematic fields
    const cleanData = { ...responseData };
    // Remove any fields that start with underscore (metadata)
    Object.keys(cleanData).forEach(key => {
      if (key.startsWith('_')) {
        delete cleanData[key];
      }
    });
    
    const fieldEntries = Object.entries(cleanData).filter(
      ([_, fieldValue]) => fieldValue !== null && fieldValue !== undefined && fieldValue !== ''
    );
    
    logger.info(`[KY3P Batch Update] Performing batched update for task ${taskId} with ${fieldEntries.length} fields`);
    
    // First try to use the KYB batch-update endpoint directly
    // This mirrors the pattern used for KYB forms but with the ky3p prefix
    try {
      logger.info(`[KY3P Batch Update] Attempting to use KY3P batch-update endpoint`);
      
      const response = await fetch(`/api/ky3p/batch-update/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          responses: cleanData
        })
      });
      
      if (response.ok) {
        logger.info(`[KY3P Batch Update] Batch update successful using ky3p endpoint`);
        
        // Update task progress to 100%
        await updateTaskProgress(taskId);
        
        // Broadcast update via WebSocket for real-time UI updates
        await broadcastTaskUpdate(taskId);
        
        return true;
      }
      
      const errorText = await response.text();
      logger.warn(`[KY3P Batch Update] KY3P batch-update endpoint failed: ${response.status} ${errorText}`);
      
      // Fallback to KYB endpoint if KY3P endpoint fails
      logger.info(`[KY3P Batch Update] Falling back to KYB batch-update endpoint`);
      
      const kybResponse = await fetch(`/api/kyb/batch-update/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          responses: cleanData
        })
      });
      
      if (kybResponse.ok) {
        logger.info(`[KY3P Batch Update] Batch update successful using KYB endpoint fallback`);
        
        // Update task progress to 100%
        await updateTaskProgress(taskId);
        
        // Broadcast update via WebSocket for real-time UI updates
        await broadcastTaskUpdate(taskId);
        
        return true;
      }
      
      const kybErrorText = await kybResponse.text();
      logger.warn(`[KY3P Batch Update] KYB batch-update endpoint failed: ${kybResponse.status} ${kybErrorText}`);
    } catch (batchUpdateError) {
      logger.error(`[KY3P Batch Update] Error with batch update endpoints:`, batchUpdateError);
    }
    
    // If both batch endpoints fail, fall back to individual field updates
    logger.info(`[KY3P Batch Update] Falling back to individual field updates`);
    
    // Apply server-side updates in batches
    const batchSize = 5;
    let fieldsUpdated = 0;
    let batchCount = 0;
    
    for (let i = 0; i < fieldEntries.length; i += batchSize) {
      const batch = fieldEntries.slice(i, i + batchSize);
      batchCount++;
      
      // Process each batch in parallel for speed, but with controlled timing
      await Promise.all(batch.map(async ([fieldKey, fieldValue]) => {
        try {
          // Use individual field update endpoint for each field
          const response = await fetch(`/api/tasks/${taskId}/ky3p-responses/${fieldKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
              value: fieldValue
            })
          });
          
          if (response.ok) {
            fieldsUpdated++;
          } else {
            const errorText = await response.text();
            logger.warn(`[KY3P Batch Update] Failed to update field ${fieldKey}: ${response.status} ${errorText}`);
            
            // Fallback to KYB endpoint if KY3P endpoint fails
            logger.info(`[KY3P Batch Update] Trying KYB endpoint fallback for field ${fieldKey}`);
            const kybResponse = await fetch(`/api/kyb/responses/${taskId}/${fieldKey}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              credentials: 'include',
              body: JSON.stringify({
                value: fieldValue
              })
            });
            
            if (kybResponse.ok) {
              fieldsUpdated++;
              logger.info(`[KY3P Batch Update] KYB endpoint fallback successful for field ${fieldKey}`);
            } else {
              const kybErrorText = await kybResponse.text();
              logger.error(`[KY3P Batch Update] KYB endpoint fallback failed for field ${fieldKey}: ${kybResponse.status} ${kybErrorText}`);
            }
          }
        } catch (fieldError) {
          logger.error(`[KY3P Batch Update] Error updating field ${fieldKey}:`, fieldError);
        }
      }));
      
      // Add a delay between batches to avoid overwhelming the server
      logger.info(`[KY3P Batch Update] Batch ${batchCount} complete (${i + batch.length}/${fieldEntries.length} fields processed)`);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    logger.info(`[KY3P Batch Update] Batched update complete: ${fieldsUpdated} out of ${fieldEntries.length} fields updated`);
    
    // Only consider success if at least some fields were updated
    if (fieldsUpdated > 0) {
      // Update task progress to 100%
      await updateTaskProgress(taskId);
      
      // Broadcast update via WebSocket for real-time UI updates
      await broadcastTaskUpdate(taskId);
      
      return true;
    }
    
    logger.error(`[KY3P Batch Update] All update methods failed, no fields were updated`);
    return false;
  } catch (error) {
    logger.error('[KY3P Batch Update] Error during batched update:', error);
    return false;
  }
}

/**
 * Update task progress to 100%
 */
async function updateTaskProgress(taskId: number): Promise<void> {
  try {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        progress: 100,
        status: 'in_progress'
      })
    });
  } catch (progressError) {
    logger.warn(`[KY3P Batch Update] Failed to update progress, but data was saved:`, progressError);
  }
}

/**
 * Broadcast task update via WebSocket
 */
async function broadcastTaskUpdate(taskId: number): Promise<void> {
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
    logger.warn(`[KY3P Batch Update] Failed to broadcast update, but data was saved:`, broadcastError);
  }
}