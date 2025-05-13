/**
 * Fixed KY3P Form Service bulk update method
 * 
 * This is a replacement for the bulkUpdate method in the KY3PFormService class
 * to fix the demo auto-fill functionality.
 */

/**
 * Bulk update form responses
 * This is a direct implementation of the bulk update functionality 
 * that's called from the UniversalForm auto-fill mechanism
 * 
 * @param data Record of field keys to values
 * @param taskId Optional task ID override
 * @returns Promise resolving to success status
 */
public async bulkUpdate(data: Record<string, any>, taskId?: number): Promise<boolean> {
  if (!this.taskId && !taskId) {
    logger.warn('[KY3P Form Service] No task ID provided for bulk update, cannot update');
    return false;
  }
  
  const effectiveTaskId = taskId || this.taskId;
  
  try {
    logger.info(`[KY3P Form Service] Performing bulk update for task ${effectiveTaskId}`);
    
    // First update the local form data
    Object.entries(data).forEach(([key, value]) => {
      // Only update if not a metadata field (starting with _)
      if (!key.startsWith('_')) {
        // Update our local form data
        this.formData[key] = value;
      }
    });
    
    // Filter out metadata fields before sending to server
    const cleanData = { ...data };
    Object.keys(cleanData).forEach(key => {
      if (key.startsWith('_')) {
        delete cleanData[key];
      }
    });

    // Create a mapping from field keys to field IDs
    const allFields = await this.getFields();
    
    // Track fields found in the system versus received in the demo data
    let totalFieldsInDemoData = Object.keys(cleanData).length;
    let validFieldsFound = 0;
    
    // Convert the data format to what the server expects
    // The server expects an array of objects with fieldId and value
    const responsesArray = [];
    
    for (const [key, value] of Object.entries(cleanData)) {
      // Find the field by key
      const field = allFields.find(f => f.key === key);
      
      if (field && field.id) {
        // Ensure field ID is a number
        const fieldId = typeof field.id === 'string' ? parseInt(field.id, 10) : field.id;
        
        if (!isNaN(fieldId)) {
          responsesArray.push({
            fieldId: fieldId,
            value: value
          });
          validFieldsFound++;
        }
      }
    }
    
    logger.info(`[KY3P Form Service] Mapped ${validFieldsFound} out of ${totalFieldsInDemoData} fields for bulk update`);
    
    // Send to server with the proper format
    const response = await fetch(`/api/tasks/${effectiveTaskId}/ky3p-responses/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include session cookies
      body: JSON.stringify({
        responses: responsesArray // Using array format with fieldId and value
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[KY3P Form Service] Failed to perform bulk update: ${response.status}`, errorText);
      return false;
    }
    
    logger.info(`[KY3P Form Service] Bulk update successful for task ${effectiveTaskId}`);
    return true;
  } catch (error) {
    logger.error('[KY3P Form Service] Error during bulk update:', error);
    return false;
  }
}