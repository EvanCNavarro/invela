/**
 * Fixed KY3P Bulk Update Implementation
 * 
 * This module fixes the demo auto-fill functionality by correctly formatting
 * the bulk update request for KY3P forms.
 */

// Simple logger implementation
class Logger {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  info(message: string, ...args: any[]): void {
    console.info(`[${this.prefix}] ${message}`, ...args);
  }
  
  warn(message: string, ...args: any[]): void {
    console.warn(`[${this.prefix}] ${message}`, ...args);
  }
  
  error(message: string, ...args: any[]): void {
    console.error(`[${this.prefix}] ${message}`, ...args);
  }
}

const logger = new Logger('KY3P-BulkUpdate');

/**
 * Perform a bulk update for KY3P form using the proper field ID format
 * 
 * The issue was that we were sending "bulk" as the fieldIdRaw value, which
 * was causing the server to reject the request with "Invalid field ID format"
 * 
 * This function fixes that by sending a properly formatted array of responses
 * or by using the batch-update endpoint that accepts string field keys.
 * 
 * @param taskId The task ID
 * @param formData The form data to bulk update
 * @returns Promise<boolean> Success or failure status
 */
export async function fixedKy3pBulkUpdate(taskId: number, formData: Record<string, any>): Promise<boolean> {
  try {
    logger.info(`Running fixed KY3P bulk update for task ${taskId}`);
    
    // If formData is empty, we're performing a demo auto-fill
    if (Object.keys(formData).length === 0) {
      // Call the direct demo-autofill endpoint for the server to handle
      try {
        logger.info('Calling dedicated demo-autofill endpoint');
        
        const response = await fetch(`/api/ky3p/demo-autofill/${taskId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Demo auto-fill endpoint failed: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        logger.info('Demo auto-fill endpoint succeeded:', result);
        
        return true;
      } catch (demoError) {
        logger.error('Error calling demo-autofill endpoint:', demoError);
        return false;
      }
    }
    
    // For regular updates with explicit form data
    // Use the batch-update endpoint that accepts string field keys
    try {
      logger.info(`Using batch-update endpoint for task ${taskId} with ${Object.keys(formData).length} fields`);
      
      // Filter out metadata and empty values
      const cleanData: Record<string, any> = {};
      for (const [key, value] of Object.entries(formData)) {
        if (!key.startsWith('_') && value !== undefined && value !== null && value !== '') {
          cleanData[key] = value;
        }
      }
      
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
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Batch update failed: ${response.status}`, errorText);
        throw new Error(`Batch update failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      logger.info('Batch update succeeded:', result);
      
      return true;
    } catch (error) {
      logger.error('Error during fixed KY3P batch update:', error);
      return false;
    }
  } catch (error) {
    logger.error('Unexpected error in fixed KY3P bulk update:', error);
    return false;
  }
}