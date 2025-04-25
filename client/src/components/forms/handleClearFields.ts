/**
 * Handle clearing all form fields
 * 
 * This function clears all form fields without affecting demo auto-fill functionality.
 * It's implemented as a completely separate module to avoid any interference.
 */
import { FormField, FormServiceInterface } from "@/services/form-service.interface";

/**
 * Clear all form fields while preserving critical system fields
 */
export async function handleClearFields(
  formService: FormServiceInterface,
  fields: FormField[],
  updateField: (fieldId: string, value: string | boolean | number | null) => void
) {
  try {
    // Clear each field individually
    for (const field of fields) {
      // Skip system fields that shouldn't be cleared
      if (field.id === 'agreement_confirmation') {
        continue;
      }
      
      // Clear the field based on its type
      if (field.type === 'boolean') {
        updateField(field.id, false);
      } else if (field.type === 'number') {
        updateField(field.id, null);
      } else {
        updateField(field.id, '');
      }
    }
    
    console.log('[ClearFields] Successfully cleared all form fields');
    return true;
  } catch (error) {
    console.error('[ClearFields] Error clearing fields:', error);
    return false;
  }
}