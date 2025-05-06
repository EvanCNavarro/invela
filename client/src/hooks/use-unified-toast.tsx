import React, { useState, useEffect } from "react";
import { useToast, toast as baseToast, Toast } from "@/hooks/use-toast";
import type { ToastProps } from "@/components/ui/toast";
import { FileItem } from "@/types/files";
import { ToastAction } from "@/components/ui/toast";

// Standard duration for all toasts
const STANDARD_DURATION = 3000;

export function useUnifiedToast() {
  const { toast } = useToast();
  
  // Success Toasts
  const success = (title: string, description?: string) => {
    return toast({
      variant: "success",
      title,
      description,
      duration: STANDARD_DURATION,
    });
  };

  // Info Toasts  
  const info = (title: string, description?: string) => {
    return toast({
      variant: "info",
      title,
      description,
      duration: STANDARD_DURATION,
    });
  };

  // Warning Toasts
  const warning = (title: string, description?: string) => {
    return toast({
      variant: "warning",
      title,
      description,
      duration: STANDARD_DURATION,
    });
  };

  // Error Toasts
  const error = (title: string, description?: string) => {
    return toast({
      variant: "error",
      title,
      description,
      duration: STANDARD_DURATION,
    });
  };

  // File Upload Toasts
  const fileUploadStarted = (fileName: string) => {
    return toast({
      variant: "file-upload",
      title: `Uploading '${fileName}'`,
      description: "Please wait while we upload your file...",
      duration: Infinity, // Keep open until explicitly closed
    });
  };
  
  const fileUploadSuccess = (file: FileItem | string) => {
    const fileName = typeof file === 'string' ? file : file.name;
    return toast({
      variant: "success",
      title: "File uploaded successfully",
      description: `${fileName} has been uploaded.`,
      duration: STANDARD_DURATION,
    });
  };
  
  const fileUploadError = (fileName: string, error?: string) => {
    return toast({
      variant: "error",
      title: "Upload failed",
      description: `Failed to upload ${fileName}. ${error || "Please try again."}`,
      duration: STANDARD_DURATION,
    });
  };

  // Progress bar no longer needed

  // Simple File Upload Toast (no progress or cancel)
  const fileUploadProgress = (
    fileName: string
  ) => {
    // Create a toast without progress indication
    const toastRef = toast({
      variant: "file-upload",
      title: `Uploading '${fileName}'`,
      description: "Please wait while we upload your file...",
      duration: Infinity, // Stay open until explicitly closed
    });
    
    return toastRef;
  };

  // Clipboard Toasts
  const clipboardCopy = (text: string) => {
    return toast({
      variant: "clipboard",
      title: "Copied to clipboard",
      description: text ? (text.length > 50 ? "Content copied to clipboard." : `"${text}" copied to clipboard.`) : "Content copied to clipboard.",
      duration: STANDARD_DURATION,
    });
  };

  return {
    success,
    info,
    warning,
    error,
    fileUploadStarted,
    fileUploadSuccess,
    fileUploadError,
    fileUploadProgress,
    clipboardCopy,
  };
}

// Standalone progress bar no longer needed

// Export standalone functions for use without the hook
export const unifiedToast = {
  // Enhanced success toast with support for both string and object params
  success: (titleOrOptions: string | { title: string; description?: string; id?: string }) => {
    if (typeof titleOrOptions === 'string') {
      return baseToast({
        variant: "success",
        title: titleOrOptions,
        duration: STANDARD_DURATION,
      });
    } else {
      return baseToast({
        variant: "success",
        title: titleOrOptions.title,
        description: titleOrOptions.description,
        duration: STANDARD_DURATION,
        id: titleOrOptions.id,
      });
    }
  },
  
  // Info toast
  info: (title: string, description?: string) => {
    return baseToast({
      variant: "info",
      title,
      description,
      duration: STANDARD_DURATION,
    });
  },
  
  // Warning toast
  warning: (title: string, description?: string) => {
    return baseToast({
      variant: "warning",
      title,
      description,
      duration: STANDARD_DURATION,
    });
  },
  
  // Enhanced error toast with support for both string and object params
  error: (titleOrOptions: string | { title: string; description?: string; id?: string }) => {
    if (typeof titleOrOptions === 'string') {
      return baseToast({
        variant: "error",
        title: titleOrOptions,
        duration: STANDARD_DURATION,
      });
    } else {
      return baseToast({
        variant: "error",
        title: titleOrOptions.title,
        description: titleOrOptions.description,
        duration: STANDARD_DURATION,
        id: titleOrOptions.id,
      });
    }
  },
  
  // No longer used - removed
  
  fileUploadSuccess: (file: FileItem | string) => {
    const fileName = typeof file === 'string' ? file : file.name;
    console.log('[UnifiedToast] Creating success toast for file:', fileName);
    
    // Create success toast with explicit duration and force auto-dismiss
    const toastRef = baseToast({
      variant: "success",
      title: "File uploaded successfully",
      description: `${fileName} has been uploaded.`,
      duration: STANDARD_DURATION, // Standard duration (3000ms)
    });
    
    // Ensure the toast gets dismissed automatically after the standard duration
    // This is a failsafe for bulk uploads
    setTimeout(() => {
      if (toastRef && toastRef.dismiss) {
        toastRef.dismiss();
        console.log('[UnifiedToast] Force dismissed success toast for:', fileName);
      }
    }, STANDARD_DURATION + 500); // Add a small buffer (500ms) to ensure the toast has time to show
    
    return toastRef;
  },
  
  fileUploadError: (fileName: string, error?: string) => {
    return baseToast({
      variant: "error",
      title: "Upload failed",
      description: `Failed to upload ${fileName}. ${error || "Please try again."}`,
      duration: STANDARD_DURATION,
    });
  },
  
  clipboardCopy: (text: string) => {
    return baseToast({
      variant: "clipboard",
      title: "Copied to clipboard",
      description: text ? (text.length > 50 ? "Content copied to clipboard." : `"${text}" copied to clipboard.`) : "Content copied to clipboard.",
      duration: STANDARD_DURATION,
    });
  },
  
  // Simple file upload toast
  fileUploadProgress: (
    fileName: string
  ) => {
    return baseToast({
      variant: "file-upload",
      title: `Uploading '${fileName}'`,
      description: "Please wait while we upload your file...",
      duration: Infinity, // Stay open until explicitly closed
    });
  },
  
  // Method with ID support
  uploadProgress: (options: {
    id?: string;
    fileName: string;
  }) => {
    const { id, fileName } = options;
    
    return baseToast({
      id,
      variant: "file-upload",
      title: `Uploading '${fileName}'`,
      description: "Please wait while we upload your file...",
      duration: Infinity, // Stay open until explicitly closed
    });
  }
};

// Toast status types
export type ToastStatus = 'loading' | 'success' | 'error';
export type DemoAutoFillStatus = 'loading' | 'progress' | 'success' | 'error';

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
export function showClearFieldsToast(status: ToastStatus, message?: string, options?: UnifiedToastOptions) {
  if (options?.skipToast) {
    console.debug(`Skipping clear fields toast (${status})`, { operationId: options.operationId });
    return;
  }
  
  switch (status) {
    case 'loading':
      baseToast({
        title: 'Clear Fields',
        description: message || 'Clearing all form fields...',
        variant: 'info',
      });
      break;
    case 'success':
      baseToast({
        title: 'Fields Cleared',
        description: message || 'All form fields have been cleared successfully.',
        variant: 'success',
      });
      break;
    case 'error':
      baseToast({
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
export function showDemoAutoFillToast(status: DemoAutoFillStatus, message?: string, options?: UnifiedToastOptions) {
  if (options?.skipToast) {
    console.debug(`Skipping demo autofill toast (${status})`, { operationId: options.operationId });
    return;
  }
  
  switch (status) {
    case 'loading':
      baseToast({
        title: 'Demo Auto-Fill',
        description: message || 'Loading demo data...',
        variant: 'info',
      });
      break;
    case 'progress':
      baseToast({
        title: 'Demo Auto-Fill',
        description: message || 'Populating fields with demo data...',
        variant: 'info',
      });
      break;
    case 'success':
      baseToast({
        title: 'Demo Auto-Fill Complete',
        description: message || 'Successfully filled fields with demo data.',
        variant: 'success',
      });
      break;
    case 'error':
      baseToast({
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
export function showFormSubmissionToast(status: ToastStatus, message?: string, options?: UnifiedToastOptions) {
  if (options?.skipToast) {
    console.debug(`Skipping form submission toast (${status})`, { operationId: options.operationId });
    return;
  }
  
  switch (status) {
    case 'loading':
      baseToast({
        title: 'Submitting Form',
        description: message || 'Submitting your form data...',
        variant: 'info',
      });
      break;
    case 'success':
      baseToast({
        title: 'Form Submitted',
        description: message || 'Your form has been submitted successfully.',
        variant: 'success',
      });
      break;
    case 'error':
      baseToast({
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
export function showSaveProgressToast(status: ToastStatus, message?: string, options?: UnifiedToastOptions) {
  if (options?.skipToast) {
    console.debug(`Skipping save progress toast (${status})`, { operationId: options.operationId });
    return;
  }
  
  switch (status) {
    case 'loading':
      baseToast({
        title: 'Saving Progress',
        description: message || 'Saving your form progress...',
        variant: 'info',
      });
      break;
    case 'success':
      baseToast({
        title: 'Progress Saved',
        description: message || 'Your form progress has been saved.',
        variant: 'success',
      });
      break;
    case 'error':
      baseToast({
        title: 'Save Failed',
        description: message || 'There was an error saving your form progress.',
        variant: 'destructive',
      });
      break;
  }
}