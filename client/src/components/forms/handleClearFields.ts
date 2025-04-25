/**
 * Handle clearing all form fields
 * 
 * This function clears all form fields without affecting demo auto-fill functionality.
 * It's implemented as a completely separate module to avoid any interference.
 */
import { FormField, FormServiceInterface } from "@/services/formService";

/**
 * Clear all form fields while preserving critical system fields
 */
export async function handleClearFields(
  formService: FormServiceInterface,
  fields: FormField[],
  updateField: (fieldId: string, value: string | boolean | number | null) => void
) {
  try {
    console.log('[ClearFields] Starting to clear fields - found', fields.length, 'fields');
    
    // Get the current form data
    const currentData = formService.getFormData();
    console.log('[ClearFields] Current form data keys:', Object.keys(currentData).length);
    
    // Track successful field clears
    let clearedCount = 0;
    
    // Clear each field individually
    for (const field of fields) {
      // Field ID can be either id or key property depending on the form system
      const fieldId = field.id || field.key;
      
      // Skip system fields that shouldn't be cleared
      if (fieldId === 'agreement_confirmation') {
        console.log('[ClearFields] Skipping system field:', fieldId);
        continue;
      }
      
      // Skip empty or undefined field IDs
      if (!fieldId) {
        console.log('[ClearFields] Skipping field with no ID:', field);
        continue;
      }
      
      // Debug output for each field
      console.log(`[ClearFields] Clearing field ${fieldId} (${field.type})`);
      
      try {
        // Clear the field based on its type
        if (field.type === 'boolean') {
          updateField(fieldId, false);
        } else if (field.type === 'number') {
          updateField(fieldId, null);
        } else {
          updateField(fieldId, '');
        }
        
        // Also try directly updating the form service
        if (formService.updateFormData) {
          if (field.type === 'boolean') {
            formService.updateFormData(fieldId, false);
          } else if (field.type === 'number') {
            formService.updateFormData(fieldId, null);
          } else {
            formService.updateFormData(fieldId, '');
          }
        }
        
        clearedCount++;
      } catch (fieldError) {
        console.error(`[ClearFields] Error clearing field ${fieldId}:`, fieldError);
      }
    }
    
    console.log(`[ClearFields] Successfully cleared ${clearedCount}/${fields.length} form fields`);
    return clearedCount > 0;
  } catch (error) {
    console.error('[ClearFields] Error clearing fields:', error);
    return false;
  }
}