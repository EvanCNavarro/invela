/**
 * KY3P Batch Update Helper
 * 
 * This module provides utilities to help convert between different response formats
 * for the KY3P form service, making it compatible with the UniversalForm component.
 */

import getLogger from '@/utils/logger';

const logger = getLogger('KY3P-Batch-Update');

/**
 * Convert and send KY3P responses in the format expected by the server
 * This is a compatibility function that helps the KY3P form service work with
 * the same object format used by the KYB form service
 */
export async function batchUpdateKy3pResponses(
  taskId: number, 
  responses: Record<string, any>
): Promise<boolean> {
  try {
    logger.info(`Converting and sending ${Object.keys(responses).length} responses for task ${taskId}`);
    
    // Fetch all KY3P fields to map field keys to field IDs
    const fieldsResponse = await fetch('/api/ky3p-fields', {
      credentials: 'include'
    });
    
    if (!fieldsResponse.ok) {
      logger.error(`Failed to fetch KY3P fields: ${fieldsResponse.status}`);
      return false;
    }
    
    const fields = await fieldsResponse.json();
    logger.info(`Retrieved ${fields.length} KY3P fields for mapping`);
    
    // Create a mapping from field key to field ID
    const fieldKeyToIdMap = new Map(
      fields.map((field: any) => [field.field_key, field.id])
    );
    
    // Convert object format to array format
    const responseArray = Object.entries(responses)
      .filter(([key, value]) => {
        // Skip metadata fields and empty values
        if (key.startsWith('_') || value === null || value === undefined || value === '') {
          return false;
        }
        
        // Only include fields that exist in our KY3P schema
        const fieldId = fieldKeyToIdMap.get(key);
        return fieldId !== undefined;
      })
      .map(([key, value]) => {
        const fieldId = fieldKeyToIdMap.get(key);
        return {
          fieldId,
          value
        };
      });
    
    logger.info(`Converted ${responseArray.length} responses to array format`);
    
    // If we don't have any valid responses, return early
    if (responseArray.length === 0) {
      logger.warn('No valid responses found after mapping - nothing to save');
      return true;
    }
    
    // Send the batch update to the server
    const response = await fetch(`/api/tasks/${taskId}/ky3p-responses/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        responses: responseArray
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Failed to update KY3P responses: ${response.status}`, errorText);
      return false;
    }
    
    logger.info(`Successfully updated ${responseArray.length} KY3P responses`);
    return true;
  } catch (error) {
    logger.error('Error in batchUpdateKy3pResponses:', error);
    return false;
  }
}