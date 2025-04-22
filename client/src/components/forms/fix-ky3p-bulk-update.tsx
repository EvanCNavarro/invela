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
    // First, get all the KY3P fields to build a field key to ID mapping
    logger.info(`Fetching KY3P fields for task ${taskId} to build field mapping`);
    const fieldsResponse = await fetch(`/api/ky3p/fields`, {
      credentials: 'include'
    });
    
    if (!fieldsResponse.ok) {
      throw new Error(`Failed to fetch KY3P fields: ${fieldsResponse.statusText}`);
    }
    
    const fields = await fieldsResponse.json();
    logger.info(`Retrieved ${fields.length} KY3P field definitions`);
    
    // Build a mapping from field_key (string) to field ID (number)
    const fieldKeyToIdMap = new Map(
      fields.map((field: any) => [field.field_key, field.id])
    );
    
    // Filter out empty values
    const validResponses: Record<string, any> = {};
    for (const [key, value] of Object.entries(formData)) {
      if (value !== undefined && value !== null && value !== '') {
        validResponses[key] = value;
      }
    }
    
    // Convert to array format with numeric fieldId property
    const responsesArray = [];
    for (const [key, value] of Object.entries(validResponses)) {
      const fieldId = fieldKeyToIdMap.get(key);
      
      if (fieldId !== undefined) {
        // Ensure field ID is a number
        const numericFieldId = typeof fieldId === 'string' ? parseInt(fieldId, 10) : fieldId;
        
        if (!isNaN(numericFieldId)) {
          responsesArray.push({
            fieldId: numericFieldId, // Numeric field ID is required by the API
            value: value
          });
        }
      }
    }
    
    logger.info(`Prepared ${responsesArray.length} responses for bulk update`);
    
    if (responsesArray.length === 0) {
      logger.warn('No valid responses found for bulk update');
      return false;
    }
    
    // Make the API call with the properly formatted data
    const response = await fetch(`/api/tasks/${taskId}/ky3p-responses/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        responses: responsesArray // Using array format with explicit fieldId property
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Failed to perform bulk update: ${response.status}`, errorText);
      throw new Error(`Failed to update form data: ${errorText}`);
    }
    
    logger.info(`KY3P bulk update successful for ${responsesArray.length} fields`);
    return true;
    
  } catch (error) {
    logger.error('Error during KY3P bulk update:', error);
    return false;
  }
}