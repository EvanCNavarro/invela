/**
 * Unified Toast Message System
 * 
 * This file provides a standardized approach to displaying toast notifications
 * across all form types (KYB, KY3P, and Open Banking) with consistent styling,
 * formatting, and behavior.
 */

import { toast } from '@/hooks/use-toast';
import getLogger from '@/utils/logger';

const logger = getLogger('UnifiedToast');

// Standard toast variants
export type ToastVariant = 'default' | 'success' | 'info' | 'warning' | 'error' | 'destructive';

/**
 * Toast configuration for form operations
 */
export interface UnifiedToastOptions {
  /** Optional operation ID for tracking/debugging */
  operationId?: string;
  /** Skip showing toast for silent operations */
  skipToast?: boolean;
}

/**
 * Show a toast notification for form clearing operation
 */
export function showClearFieldsToast(status: 'loading' | 'success' | 'error', message?: string, options?: UnifiedToastOptions) {
  if (options?.skipToast) {
    logger.debug(`Skipping clear fields toast (${status})`, { operationId: options.operationId });
    return;
  }
  
  switch (status) {
    case 'loading':
      toast({
        title: 'Clear Fields',
        description: 'Clearing all form fields...',
        variant: 'info',
      });
      break;
    case 'success':
      toast({
        title: 'Fields Cleared',
        description: message || 'All form fields have been cleared successfully.',
        variant: 'success',
      });
      break;
    case 'error':
      toast({
        title: 'Clear Fields Failed',
        description: message || 'There was an error clearing the form fields.',
        variant: 'destructive',
      });
      break;
  }
}

/**
 * Show a toast notification for demo autofill operation
 */
export function showDemoAutoFillToast(status: 'loading' | 'progress' | 'success' | 'error', message?: string, options?: UnifiedToastOptions) {
  if (options?.skipToast) {
    logger.debug(`Skipping demo autofill toast (${status})`, { operationId: options.operationId });
    return;
  }
  
  switch (status) {
    case 'loading':
      toast({
        title: 'Demo Auto-Fill',
        description: message || 'Loading demo data...',
        variant: 'info',
      });
      break;
    case 'progress':
      toast({
        title: 'Demo Auto-Fill',
        description: message || 'Populating fields with demo data...',
        variant: 'info',
      });
      break;
    case 'success':
      toast({
        title: 'Demo Auto-Fill Complete',
        description: message || 'Successfully filled fields with demo data.',
        variant: 'success',
      });
      break;
    case 'error':
      toast({
        title: 'Demo Auto-Fill Error',
        description: message || 'There was an error applying demo data.',
        variant: 'destructive',
      });
      break;
  }
}

/**
 * Show a toast notification for form submission operation
 */
export function showFormSubmissionToast(status: 'loading' | 'success' | 'error', message?: string, options?: UnifiedToastOptions) {
  if (options?.skipToast) {
    logger.debug(`Skipping form submission toast (${status})`, { operationId: options.operationId });
    return;
  }
  
  switch (status) {
    case 'loading':
      toast({
        title: 'Submitting Form',
        description: message || 'Submitting your form data...',
        variant: 'info',
      });
      break;
    case 'success':
      toast({
        title: 'Form Submitted',
        description: message || 'Your form has been submitted successfully.',
        variant: 'success',
      });
      break;
    case 'error':
      toast({
        title: 'Submission Failed',
        description: message || 'There was an error submitting your form.',
        variant: 'destructive',
      });
      break;
  }
}

/**
 * Show a toast notification for form save/progress operation
 */
export function showSaveProgressToast(status: 'loading' | 'success' | 'error', message?: string, options?: UnifiedToastOptions) {
  if (options?.skipToast) {
    logger.debug(`Skipping save progress toast (${status})`, { operationId: options.operationId });
    return;
  }
  
  switch (status) {
    case 'loading':
      toast({
        title: 'Saving Progress',
        description: message || 'Saving your form progress...',
        variant: 'info',
      });
      break;
    case 'success':
      toast({
        title: 'Progress Saved',
        description: message || 'Your form progress has been saved.',
        variant: 'success',
      });
      break;
    case 'error':
      toast({
        title: 'Save Failed',
        description: message || 'There was an error saving your form progress.',
        variant: 'destructive',
      });
      break;
  }
}
