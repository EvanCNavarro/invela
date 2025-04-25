/**
 * Enhanced utilities for updating form fields with demo data
 * 
 * This module provides enhanced functions for properly updating form fields
 * with demo data, ensuring that the values are correctly applied and displayed.
 * 
 * It supplements the regular form reset and update functions with additional
 * error handling and validation to ensure form data is properly applied.
 */

import { FormServiceInterface } from '../../services/formService';

// Flag to indicate demo auto-fill is in progress - prevents auto-save race conditions
let demoAutoFillInProgress = false;

/**
 * Check if demo auto-fill is currently in progress
 * Used by auto-save mechanism to prevent race conditions
 */
export function isDemoAutoFillInProgress(): boolean {
  return demoAutoFillInProgress;
}

/**
 * Set the demo auto-fill in progress flag
 * @param inProgress True if demo auto-fill is starting, false when complete
 */
export function setDemoAutoFillInProgress(inProgress: boolean): void {
  demoAutoFillInProgress = inProgress;
  console.log(`[Demo Auto-Fill] In progress flag set to: ${inProgress}`);
}

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
  try {
    console.log(`[Demo Auto-Fill] Applying form data with ${Object.keys(formData).length} fields${isLegacy ? ' (legacy mode)' : ''}`);
    
    // Set the flag to indicate we're in the middle of a demo auto-fill
    // This will prevent the auto-save mechanism from triggering during updates
    setDemoAutoFillInProgress(true);
    
    // First pass: Update fields individually to ensure they're registered
    for (const [key, value] of Object.entries(formData)) {
      try {
        await updateField(key, value);
      } catch (fieldError) {
        console.error(`[Demo Auto-Fill] Error updating field ${key}:`, fieldError);
      }
    }
    
    // Second pass: Reset the entire form to ensure UI state is in sync
    resetForm(formData);
    
    console.log('[Demo Auto-Fill] Form data applied successfully');
    
    // Add a delay before turning off the flag to ensure all form operations complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Now that all updates are done, clear the flag
    setDemoAutoFillInProgress(false);
  } catch (error) {
    console.error('[Demo Auto-Fill] Error applying form data:', error);
    // Fallback to direct reset if individual updates fail
    resetForm(formData);
    
    // Make sure we clear the flag even if there's an error
    setDemoAutoFillInProgress(false);
  }
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
): { success: boolean; matches: number; mismatches: number; details: any[] } {
  try {
    if (!form || typeof form.getValues !== 'function') {
      return { 
        success: false, 
        matches: 0, 
        mismatches: 0,
        details: [{ error: 'Invalid form object' }] 
      };
    }
    
    // Get current form values
    const currentValues = form.getValues();
    const verificationDetails: any[] = [];
    let matches = 0;
    let mismatches = 0;
    
    // Compare each expected field value with actual value
    for (const [key, expectedValue] of Object.entries(formData)) {
      const actualValue = currentValues[key];
      const isMatch = 
        (expectedValue === actualValue) || 
        (expectedValue === null && actualValue === '') ||
        (expectedValue === '' && actualValue === null) ||
        (expectedValue === undefined && actualValue === '') ||
        (expectedValue === '' && actualValue === undefined) ||
        (JSON.stringify(expectedValue) === JSON.stringify(actualValue));
      
      if (isMatch) {
        matches++;
      } else {
        mismatches++;
        verificationDetails.push({
          field: key,
          expected: expectedValue,
          actual: actualValue,
          match: false
        });
      }
    }
    
    return {
      success: mismatches === 0,
      matches,
      mismatches,
      details: verificationDetails
    };
  } catch (error) {
    console.error('[Demo Auto-Fill] Error verifying form data:', error);
    return { 
      success: false, 
      matches: 0, 
      mismatches: 0, 
      details: [{ error: String(error) }] 
    };
  }
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
): Promise<{ success: boolean; details: any }> {
  try {
    // Set the flag to indicate we're in the middle of a demo auto-fill
    setDemoAutoFillInProgress(true);
    console.log('[Demo Auto-Fill] Starting applyAndVerifyFormData, demoAutoFillInProgress set to true');
    
    // First attempt: Standard approach
    await applyFormData(formData, updateField, resetForm, isLegacy);
    
    // Verify the data was applied correctly
    const verification = verifyFormData(formData, form);
    
    // If we have mismatches, try a more aggressive approach
    if (!verification.success) {
      console.warn(
        `[Demo Auto-Fill] First application attempt had ${verification.mismatches} mismatches. Trying direct approach...`
      );
      
      // Direct approach: Force form reset first, then apply fields individually
      resetForm(formData);
      
      // Apply fields individually, with a slight delay to ensure form state updates
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Update each field individually
      for (const [key, value] of Object.entries(formData)) {
        try {
          await updateField(key, value);
        } catch (fieldError) {
          console.error(`[Demo Auto-Fill] Error updating field ${key} (retry):`, fieldError);
        }
      }
      
      // Final form reset to ensure consistent state
      resetForm(formData);
      
      // Re-verify
      const secondVerification = verifyFormData(formData, form);
      
      // Add a substantial delay before clearing the flag to ensure UI updates are complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Clear the flag
      setDemoAutoFillInProgress(false);
      console.log('[Demo Auto-Fill] Completed second attempt, demoAutoFillInProgress set to false');
      
      return {
        success: secondVerification.success,
        details: {
          firstAttempt: verification,
          secondAttempt: secondVerification
        }
      };
    }
    
    // Add a delay before clearing the flag to ensure UI updates are complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Clear the flag
    setDemoAutoFillInProgress(false);
    console.log('[Demo Auto-Fill] Completed first attempt successfully, demoAutoFillInProgress set to false');
    
    return {
      success: verification.success,
      details: { verification }
    };
  } catch (error) {
    console.error('[Demo Auto-Fill] Error in applyAndVerifyFormData:', error);
    
    // Last resort fallback
    try {
      resetForm(formData);
    } catch (resetError) {
      console.error('[Demo Auto-Fill] Error in fallback resetForm:', resetError);
    }
    
    // Make sure we clear the flag even if there's an error
    setDemoAutoFillInProgress(false);
    console.log('[Demo Auto-Fill] Error occurred, demoAutoFillInProgress set to false');
    
    return {
      success: false,
      details: { error: String(error) }
    };
  }
}