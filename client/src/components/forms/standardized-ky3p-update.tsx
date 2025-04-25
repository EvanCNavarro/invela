/**
 * Standardized KY3P update component 
 * 
 * This implementation uses the standardized field key approach that matches KYB,
 * eliminating the conversion from string keys to numeric IDs
 */

// Create a simple logger implementation
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

// Initialize logger
const logger = new Logger('StandardizedKY3PUpdate');

/**
 * Handles bulk update of KY3P form data using string-based field keys
 * which is compatible with the standardized form system
 * 
 * @param taskId The task ID to update
 * @param formData The form data with field keys and values
 * @returns Success or failure status
 */
export async function standardizedBulkUpdate(taskId: number, formData: Record<string, any>): Promise<boolean> {
  try {
    logger.info(`Starting standardized bulk update for task ${taskId}`);
    
    // If formData is empty, we're doing a demo auto-fill
    const isAutoFill = Object.keys(formData).length === 0;
    
    if (isAutoFill) {
      // Special handling for demo auto-fill - just call the demo endpoint
      // and don't try to further process or update the data
      logger.info(`Executing demo auto-fill for task ${taskId}`);
      
      try {
        // Use POST method as the server route is configured for POST
        const demoResponse = await fetch(`/api/ky3p/demo-autofill/${taskId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({}) // Empty body for POST request
        });
        
        if (!demoResponse.ok) {
          throw new Error(`Failed to execute demo auto-fill: ${demoResponse.statusText}`);
        }
        
        const result = await demoResponse.json();
        logger.info(`Demo auto-fill successful:`, result);
        
        // Don't try to process the metadata as form fields
        // The demo-autofill endpoint already saved the data to the database
        // We just need to return success=true so the form knows to reload
        return true;
      } catch (error) {
        logger.error('Error executing demo auto-fill:', error);
        return false;
      }
    }
    
    // This part only executes for regular updates, not demo auto-fill
    // Step 1: Filter out empty values and metadata
    const cleanData: Record<string, any> = {};
    let validCount = 0;
    
    for (const [key, value] of Object.entries(formData)) {
      // Skip metadata fields (that start with _) and empty values
      if (key.startsWith('_') || key === 'taskId' || value === undefined || value === null || value === '') {
        continue;
      }
      
      cleanData[key] = value;
      validCount++;
    }
    
    logger.info(`Prepared ${validCount} responses for standardized bulk update`);
    
    if (validCount === 0) {
      logger.warn('No valid responses found for bulk update');
      return false;
    }
    
    // Step 2: Make the API call with the standardized format
    logger.info(`Using standardized batch-update endpoint for task ${taskId}`);
    
    // First let's log exactly what we're sending
    logger.info(`Request payload sample:`, 
      JSON.stringify({
        responses: Object.fromEntries(
          Object.entries(cleanData).slice(0, 3)
        )
      })
    );
    
    const response = await fetch(`/api/ky3p/batch-update/${taskId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        responses: cleanData // Send data with string field keys
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Failed to perform standardized bulk update: ${response.status}`, errorText);
      throw new Error(`Failed to update form data: ${errorText}`);
    }
    
    const result = await response.json();
    logger.info(`KY3P standardized bulk update successful:`, result);
    
    return true;
    
  } catch (error) {
    logger.error('Error during standardized KY3P bulk update:', error);
    return false;
  }
}