/**
 * Enhanced KY3P Form Service
 * 
 * This service extends the KY3P form service but overrides the bulkUpdate method
 * to use the standardized batch update approach with string-based field keys,
 * making it consistent with KYB and Open Banking form services.
 * 
 * It solves the "Invalid field ID format" error that occurs when the KY3P form
 * tries to use fieldIdRaw: "bulk" in the request.
 */

import { ky3pFormService as KY3PFormService } from '@/services/ky3p-form-service-final';
import getLogger from '@/utils/logger';

// Initialize logger with specific prefix for tracking
const logger = getLogger('EnhancedKY3P');

/**
 * Enhanced KY3P Form Service that uses standardized batch update approach
 */
export class EnhancedKY3PFormService extends KY3PFormService {
  /**
   * Override the bulkUpdate method to use the standardized approach
   * 
   * Instead of using fieldIdRaw: "bulk", this method formats the data as
   * a record of field keys to values and sends it to the batch-update endpoint.
   * 
   * @param taskId Task ID
   * @param formData Form data as Record<string, any>
   * @returns Promise<boolean> Success/failure status
   */
  override async bulkUpdate(taskId: number, formData: Record<string, any>): Promise<boolean> {
    logger.info(`EnhancedKY3P.bulkUpdate called for task ${taskId} with ${Object.keys(formData).length} fields`);
    
    try {
      // Skip metadata fields (starting with _)
      const cleanData = { ...formData };
      Object.keys(cleanData).forEach(key => {
        if (key.startsWith('_') || key === 'taskId') {
          delete cleanData[key];
        }
      });
      
      // Log the data being sent (for debugging)
      logger.info(`Sending standardized batch update for task ${taskId}`, {
        fieldCount: Object.keys(cleanData).length,
        sampleFields: Object.keys(cleanData).slice(0, 5),
        endpoint: `/api/ky3p/batch-update/${taskId}`
      });
      
      // Use the batch-update endpoint which accepts string-based field keys
      const response = await fetch(`/api/ky3p/batch-update/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          responses: cleanData
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Batch update failed with status ${response.status}: ${errorText}`);
        
        // Try the demo autofill endpoint as a fallback if we're dealing with the special case
        // where the request has fieldIdRaw="bulk" which is a key indicator of KY3P demo autofill
        if (formData.fieldIdRaw === 'bulk') {
          logger.info('Detected fieldIdRaw="bulk" pattern, falling back to demo-autofill endpoint');
          
          const demoResponse = await fetch(`/api/ky3p/demo-autofill/${taskId}`, {
            method: 'GET',
            credentials: 'include',
          });
          
          if (demoResponse.ok) {
            logger.info('Successfully used demo-autofill fallback');
            return true;
          } else {
            logger.error(`Demo autofill fallback failed: ${await demoResponse.text()}`);
          }
        }
        
        return false;
      }
      
      logger.info(`Successfully updated form data for task ${taskId}`);
      return true;
    } catch (error) {
      logger.error('Error in bulkUpdate:', error);
      return false;
    }
  }
  
  /**
   * Override clearFields method to use standardized batch update
   * 
   * This ensures that field clearing works consistently with our new approach
   * 
   * @param taskId Task ID
   * @returns Promise<boolean> Success/failure status
   */
  async clearFields(taskId: number): Promise<boolean> {
    logger.info(`EnhancedKY3P.clearFields called for task ${taskId}`);
    
    try {
      // Use the dedicated clear-fields endpoint
      const response = await fetch(`/api/ky3p/clear-fields/${taskId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Failed to clear fields: ${errorText}`);
        return false;
      }
      
      logger.info(`Successfully cleared fields for task ${taskId}`);
      return true;
    } catch (error) {
      logger.error('Error clearing fields:', error);
      return false;
    }
  }
}