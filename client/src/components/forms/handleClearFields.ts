/**
 * Handle clearing all form fields
 * 
 * This function clears all form fields without affecting demo auto-fill functionality.
 * It's implemented as a completely separate module to avoid any interference.
 * 
 * UPDATED: Improved compatibility with all form types by using proper field key handling
 */
import { FormField, FormServiceInterface } from "@/services/formService";

/**
 * Get the correct field identifier based on form type
 * This is critical for cross-form-type compatibility
 */
function getFieldIdentifier(field: FormField): string {
  // Always prefer using the key property for standardization
  // This is the most reliable identifier across all form types
  if (field.key) {
    return field.key;
  }
  
  // Fallback 1: Try name property - some form types use this
  if (field.name) {
    return field.name;
  }
  
  // Fallback 2: Use id property converted to string (if number)
  if (field.id !== undefined) {
    return String(field.id);
  }
  
  // Fallback 3: Last resort - use field_key if it exists
  if (field.field_key) {
    return field.field_key;
  }
  
  // No valid identifier found - this will likely cause an error
  console.warn('[ClearFields] Field has no usable identifier:', field);
  return '';
}

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
    const formType = formService.constructor.name;
    console.log(`[ClearFields] Form service type: ${formType}`);
    
    // Clear each field individually
    for (const field of fields) {
      // Get standardized field identifier using our helper function
      const fieldId = getFieldIdentifier(field);
      
      // Skip system fields that shouldn't be cleared
      if (fieldId === 'agreement_confirmation') {
        console.log('[ClearFields] Skipping system field:', fieldId);
        continue;
      }
      
      // Skip empty or undefined field IDs
      if (!fieldId) {
        console.log('[ClearFields] Skipping field with no identifier', field);
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
        
        // Also try directly updating the form service with the same fieldId
        if (formService.updateFormData) {
          try {
            if (field.type === 'boolean') {
              formService.updateFormData(fieldId, false);
            } else if (field.type === 'number') {
              formService.updateFormData(fieldId, null);
            } else {
              formService.updateFormData(fieldId, '');
            }
          } catch (serviceError) {
            console.warn(`[ClearFields] Form service update failed for field ${fieldId}:`, serviceError);
            // Continue anyway since we already updated via the updateField callback
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