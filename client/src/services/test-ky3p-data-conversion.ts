/**
 * Test for KY3P Data Conversion
 * 
 * This code sample demonstrates the correct approach for converting
 * field keys to field IDs for the KY3P bulk update endpoint.
 * 
 * Copy and integrate this into the UniversalForm.tsx file to fix 
 * the demo auto-fill functionality.
 */

import getLogger from '@/utils/logger';

const logger = getLogger('KY3PDataConversion');

/**
 * Sample of the KY3P field structure
 */
interface KY3PField {
  id: number;
  field_key: string;
  field_type: string;
  display_name: string;
  // other fields...
}

/**
 * Sample demo data response
 */
interface DemoData {
  [key: string]: any;
}

/**
 * Convert field keys to field IDs for the bulk update endpoint
 */
function convertFieldKeysToIds(
  fields: KY3PField[],
  demoData: DemoData
): { fieldId: number; value: any }[] {
  // Create a mapping from field keys to field IDs
  const fieldKeyToIdMap = new Map<string, number>();
  for (const field of fields) {
    fieldKeyToIdMap.set(field.field_key, field.id);
  }
  
  // Convert to array format with fieldId property
  const responsesArray: { fieldId: number; value: any }[] = [];
  let validCount = 0;
  let invalidCount = 0;
  
  for (const [key, value] of Object.entries(demoData)) {
    const fieldId = fieldKeyToIdMap.get(key);
    
    if (fieldId !== undefined) {
      const numericFieldId = Number(fieldId);
      
      if (!isNaN(numericFieldId)) {
        responsesArray.push({
          fieldId: numericFieldId,
          value
        });
        validCount++;
      } else {
        logger.warn(`Invalid field ID for key ${key}: ${fieldId}`);
        invalidCount++;
      }
    } else {
      logger.warn(`Field key not found: ${key}`);
      invalidCount++;
    }
  }
  
  logger.info(`Converted ${validCount} fields to array format (${invalidCount} invalid/not found)`);
  return responsesArray;
}

/**
 * Sample implementation for the bulk update method
 */
async function bulkUpdate(
  demoData: DemoData,
  taskId: number,
  allFields: KY3PField[]
): Promise<boolean> {
  try {
    logger.info(`Performing bulk update for task ${taskId}`);
    
    // Convert field keys to field IDs
    const responsesArray = convertFieldKeysToIds(allFields, demoData);
    
    logger.info(`Converted ${responsesArray.length} fields to array format`);
    
    // Make API call with the correct format
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
      return false;
    }
    
    logger.info(`Bulk update successful for task ${taskId}`);
    return true;
  } catch (error) {
    logger.error('Error during bulk update:', error);
    return false;
  }
}

// This is for demonstration only - not executed
export {
  convertFieldKeysToIds,
  bulkUpdate
};