/**
 * Enhanced utilities for updating form fields with demo data
 * 
 * This module provides enhanced functions for properly updating form fields
 * with demo data, ensuring that the values are correctly applied and displayed.
 * 
 * It supplements the regular form reset and update functions with additional
 * error handling and validation to ensure form data is properly applied.
 */

import getLogger from '@/utils/logger';

const logger = getLogger('updateDemoFormUtils');

/**
 * Apply form data values individually before resetting the form
 * 
 * This helps to ensure form data is properly registered and displayed
 * when using demo data auto-fill functionality.
 * 
 * @param formData The form data to apply
 * @param updateField Function to update individual fields
 * @param resetForm Function to reset the entire form
 * @param isLegacy Whether this is being called from a legacy endpoint (for logging)
 */
export async function applyFormData(
  formData: Record<string, any>,
  updateField: (fieldKey: string, value: any) => Promise<void>,
  resetForm: (data: Record<string, any>) => void,
  isLegacy: boolean = false
): Promise<void> {
  if (!formData || typeof formData !== 'object' || Object.keys(formData).length === 0) {
    logger.warn('Empty or invalid form data, nothing to apply');
    return;
  }

  const prefix = isLegacy ? 'Legacy' : 'Standard';
  logger.info(`${prefix} applying form data with ${Object.keys(formData).length} fields`);
  
  // First apply each field individually to ensure they're registered
  let updatedCount = 0;
  let errorCount = 0;
  
  for (const [fieldKey, value] of Object.entries(formData)) {
    try {
      if (value !== null && value !== undefined) {
        await updateField(fieldKey, value);
        console.log(`[${prefix}] Updated field ${fieldKey} with value:`, value);
        updatedCount++;
      }
    } catch (fieldError) {
      console.warn(`[${prefix}] Failed to update field ${fieldKey}:`, fieldError);
      errorCount++;
    }
  }
  
  logger.info(`${prefix} individual field updates completed:`, {
    total: Object.keys(formData).length,
    updated: updatedCount,
    errors: errorCount
  });
  
  // Then reset the entire form to ensure all values are applied
  resetForm(formData);
  logger.info(`${prefix} form reset completed with all values`);
  
  // Add a delay to allow UI to fully render
  await new Promise(resolve => setTimeout(resolve, 500));
  logger.info(`${prefix} delay complete, form should be updated`);
}

/**
 * Verify that form data was properly applied
 * 
 * This is useful for debugging form update issues
 * 
 * @param formData The form data that should be applied
 * @param form The form object to check
 * @returns Object containing verification results
 */
export function verifyFormData(
  formData: Record<string, any>,
  form: any
): { success: boolean; matchCount: number; mismatchCount: number; mismatches: string[] } {
  if (!formData || !form || !form.getValues) {
    return { 
      success: false, 
      matchCount: 0, 
      mismatchCount: 0, 
      mismatches: ['Form or form data not provided'] 
    };
  }
  
  const currentValues = form.getValues();
  const mismatches: string[] = [];
  let matchCount = 0;
  
  for (const [fieldKey, expectedValue] of Object.entries(formData)) {
    if (currentValues[fieldKey] !== expectedValue) {
      mismatches.push(fieldKey);
    } else {
      matchCount++;
    }
  }
  
  return {
    success: mismatches.length === 0,
    matchCount,
    mismatchCount: mismatches.length,
    mismatches
  };
}

/**
 * Fully apply demo data with verification
 * 
 * This function applies demo data, then verifies it was properly applied,
 * and if verification fails, tries again with a direct approach.
 * 
 * @param formData The demo form data to apply
 * @param updateField Function to update individual fields
 * @param resetForm Function to reset the entire form
 * @param form The form object for verification
 * @param isLegacy Whether this is being called from a legacy endpoint (for logging)
 * @returns Object containing success status and details
 */
export async function applyAndVerifyFormData(
  formData: Record<string, any>,
  updateField: (fieldKey: string, value: any) => Promise<void>,
  resetForm: (data: Record<string, any>) => void,
  form: any,
  isLegacy: boolean = false
): Promise<{ success: boolean; message: string }> {
  try {
    // Apply the form data
    await applyFormData(formData, updateField, resetForm, isLegacy);
    
    // Verify the form data was properly applied
    const verification = verifyFormData(formData, form);
    
    if (verification.success) {
      return {
        success: true,
        message: `Successfully applied all ${verification.matchCount} fields`
      };
    }
    
    // If verification failed, try a more direct approach
    logger.warn('Form data verification failed, trying direct approach', {
      mismatches: verification.mismatches,
      mismatchCount: verification.mismatchCount
    });
    
    // Try a more direct approach for each mismatched field
    for (const fieldKey of verification.mismatches) {
      try {
        const value = formData[fieldKey];
        if (value !== null && value !== undefined) {
          // Try setting the value directly on the form
          form.setValue(fieldKey, value);
          console.log(`Direct set field ${fieldKey} to:`, value);
        }
      } catch (fieldError) {
        console.warn(`Direct field update failed for ${fieldKey}:`, fieldError);
      }
    }
    
    // Verify again after direct approach
    const secondVerification = verifyFormData(formData, form);
    
    return {
      success: secondVerification.success,
      message: secondVerification.success
        ? `Successfully applied all fields after direct approach`
        : `Failed to apply ${secondVerification.mismatchCount} fields: ${secondVerification.mismatches.join(', ')}`
    };
    
  } catch (error) {
    return {
      success: false,
      message: `Error applying form data: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}