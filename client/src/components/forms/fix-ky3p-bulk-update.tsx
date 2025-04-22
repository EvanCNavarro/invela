/**
 * Fixed version of KY3P demo auto-fill bulk update functionality
 * 
 * This implementation properly converts the field keys to numeric IDs 
 * in the format expected by the server API
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
const logger = new Logger('KY3P-BulkUpdate');

/**
 * Handles conversion of field data to the correct format for KY3P bulk updates
 * 
 * @param taskId The task ID to update
 * @param formData The form data with field keys and values
 * @returns Success or failure status
 */
export async function bulkUpdateKy3pResponses(taskId: number, formData: Record<string, any>): Promise<boolean> {
  try {
    logger.info(`Starting bulk update for task ${taskId}`);
    
    // Step 1: Get demo data if formData is empty
    let demoData = formData;
    if (Object.keys(formData).length === 0) {
      logger.info(`Form data is empty, fetching demo data from API`);
      try {
        const demoResponse = await fetch(`/api/ky3p/demo-autofill/${taskId}`, {
          credentials: 'include'
        });
        
        if (!demoResponse.ok) {
          throw new Error(`Failed to fetch demo data: ${demoResponse.statusText}`);
        }
        
        demoData = await demoResponse.json();
        logger.info(`Retrieved demo data with ${Object.keys(demoData).length} fields`);
      } catch (error) {
        logger.error('Error fetching demo data:', error);
        return false;
      }
    }
    
    // Step 2: Get all KY3P fields to build field key to ID mapping
    logger.info(`Fetching KY3P fields to build field mapping`);
    const fieldsResponse = await fetch(`/api/ky3p/fields`, {
      credentials: 'include'
    });
    
    if (!fieldsResponse.ok) {
      throw new Error(`Failed to fetch KY3P fields: ${fieldsResponse.statusText}`);
    }
    
    const fields = await fieldsResponse.json();
    logger.info(`Retrieved ${fields.length} KY3P field definitions`);
    
    // Step 3: Build mapping from field_key (string) to field ID (number)
    const fieldKeyToIdMap = new Map();
    for (const field of fields) {
      // Ensure we're using field_key, not key
      const fieldKey = field.field_key;
      const fieldId = field.id;
      
      if (fieldKey && fieldId) {
        fieldKeyToIdMap.set(fieldKey, fieldId);
      }
    }
    
    logger.info(`Built field key to ID map with ${fieldKeyToIdMap.size} entries`);
    
    // Step 4: Filter out empty values and prepare responses array
    const responsesArray = [];
    let validCount = 0;
    let invalidCount = 0;
    
    for (const [key, value] of Object.entries(demoData)) {
      if (value === undefined || value === null || value === '') {
        continue;
      }
      
      const fieldId = fieldKeyToIdMap.get(key);
      
      if (fieldId !== undefined) {
        // Ensure field ID is a number
        const numericFieldId = typeof fieldId === 'string' ? parseInt(fieldId, 10) : fieldId;
        
        if (!isNaN(numericFieldId)) {
          responsesArray.push({
            fieldId: numericFieldId, // Numeric field ID is required by the API
            value: value
          });
          validCount++;
        } else {
          logger.warn(`Invalid field ID for key ${key}: ${fieldId}`);
          invalidCount++;
        }
      } else {
        logger.warn(`Field key not found in mapping: ${key}`);
        invalidCount++;
      }
    }
    
    logger.info(`Prepared ${validCount} responses for bulk update (${invalidCount} invalid/not found)`);
    
    if (responsesArray.length === 0) {
      logger.warn('No valid responses found for bulk update');
      return false;
    }
    
    // Step 5: Log the exact request body for debugging
    const requestBody = {
      responses: responsesArray
    };
    
    logger.info(`Request body preview:`, JSON.stringify(requestBody).substring(0, 200) + '...');
    
    // Step 6: Make the API call with the properly formatted data
    const response = await fetch(`/api/tasks/${taskId}/ky3p-responses/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Failed to perform bulk update: ${response.status}`, errorText);
      throw new Error(`Failed to update form data: ${errorText}`);
    }
    
    const result = await response.json();
    logger.info(`KY3P bulk update successful:`, result);
    
    return true;
    
  } catch (error) {
    logger.error('Error during KY3P bulk update:', error);
    return false;
  }
}