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
    
    // Step 1: Get demo data if formData is empty
    let dataToSubmit = formData;
    if (Object.keys(formData).length === 0) {
      logger.info(`Form data is empty, fetching demo data from API`);
      try {
        // Use POST instead of GET as the server route is configured for POST
        const demoResponse = await fetch(`/api/ky3p/demo-autofill/${taskId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({}) // Empty body for POST request
        });
        
        if (!demoResponse.ok) {
          throw new Error(`Failed to fetch demo data: ${demoResponse.statusText}`);
        }
        
        dataToSubmit = await demoResponse.json();
        logger.info(`Retrieved demo data with ${Object.keys(dataToSubmit).length} fields`);
      } catch (error) {
        logger.error('Error fetching demo data:', error);
        return false;
      }
    }
    
    // Step 2: Filter out empty values and metadata
    const cleanData: Record<string, any> = {};
    let validCount = 0;
    
    for (const [key, value] of Object.entries(dataToSubmit)) {
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
    
    // Step 3: Make the API call with the standardized format
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