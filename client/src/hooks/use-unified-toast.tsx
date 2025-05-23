/**
 * ========================================
 * Unified Toast Hook - Enterprise Notification System
 * ========================================
 * 
 * Advanced unified toast notification system providing consistent user feedback
 * across all enterprise platform interactions. Manages specialized toast types,
 * file operations, and action-based notifications with professional UX patterns.
 * 
 * Key Features:
 * - Unified toast API with consistent styling and timing
 * - Specialized file operation notifications with progress tracking
 * - Action-based toasts with interactive elements
 * - Success, error, info, and warning toast variants
 * - File upload/download progress indicators
 * 
 * Notification Management:
 * - Standardized toast durations for optimal user experience
 * - File operation status tracking with detailed feedback
 * - Action button integration for interactive notifications
 * - Toast queue management for non-intrusive messaging
 * - Enterprise-grade notification consistency across platform
 * 
 * @module hooks/use-unified-toast
 * @version 1.0.0
 * @since 2025-05-23
 */

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

/**
 * Interface for toast options when using object format
 */
interface ToastOptions {
  /** Title text for the toast */
  title: string;
  /** Optional description or message body for the toast */
  description?: string;
  /** Optional unique ID to prevent duplicate toasts */
  id?: string;
  /** Optional custom duration in milliseconds */
  duration?: number;
}

/**
 * Type for parameters that can be either a string title or a toast options object
 */
type ToastParameter = string | ToastOptions;

// Export standalone functions for use without the hook
export const unifiedToast = {
  /**
   * Display a success toast notification
   * @param titleOrOptions - Either a string title or an options object
   * @returns Toast reference
   */
  success: (titleOrOptions: ToastParameter) => {
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
        duration: titleOrOptions.duration || STANDARD_DURATION,
        id: titleOrOptions.id,
      });
    }
  },
  
  /**
   * Display an info toast notification
   * @param titleOrOptions - Either a string title or an options object
   * @returns Toast reference
   */
  info: (titleOrOptions: ToastParameter) => {
    if (typeof titleOrOptions === 'string') {
      return baseToast({
        variant: "info",
        title: titleOrOptions,
        duration: STANDARD_DURATION,
      });
    } else {
      return baseToast({
        variant: "info",
        title: titleOrOptions.title,
        description: titleOrOptions.description,
        duration: titleOrOptions.duration || STANDARD_DURATION,
        id: titleOrOptions.id,
      });
    }
  },
  
  /**
   * Display a warning toast notification
   * @param titleOrOptions - Either a string title or an options object
   * @returns Toast reference
   */
  warning: (titleOrOptions: ToastParameter) => {
    if (typeof titleOrOptions === 'string') {
      return baseToast({
        variant: "warning",
        title: titleOrOptions,
        duration: STANDARD_DURATION,
      });
    } else {
      return baseToast({
        variant: "warning",
        title: titleOrOptions.title,
        description: titleOrOptions.description,
        duration: titleOrOptions.duration || STANDARD_DURATION,
        id: titleOrOptions.id,
      });
    }
  },
  
  /**
   * Display an error toast notification
   * @param titleOrOptions - Either a string title or an options object
   * @returns Toast reference
   */
  error: (titleOrOptions: ToastParameter) => {
    if (typeof titleOrOptions === 'string') {
      return baseToast({
        variant: "error",
        title: titleOrOptions,
        duration: STANDARD_DURATION * 1.5, // Longer duration for errors
      });
    } else {
      return baseToast({
        variant: "error",
        title: titleOrOptions.title,
        description: titleOrOptions.description,
        duration: titleOrOptions.duration || STANDARD_DURATION * 1.5, // Longer duration for errors
        id: titleOrOptions.id,
      });
    }
  },
  
  // No longer used - removed
  
  /**
   * Display a file upload success toast notification
   * @param fileOrOptions - Either a FileItem object, filename string, or options object
   * @returns Toast reference
   */
  fileUploadSuccess: (fileOrOptions: FileItem | string | { 
    fileName: string; 
    title?: string; 
    id?: string; 
    duration?: number;
    forceAutoDismiss?: boolean;
  }) => {
    // Extract file name based on the parameter type
    let fileName: string;
    let title = "File uploaded successfully";
    let id: string | undefined = undefined;
    let duration = STANDARD_DURATION;
    let forceAutoDismiss = true;
    
    if (typeof fileOrOptions === 'string') {
      fileName = fileOrOptions;
    } else if ('name' in fileOrOptions) {
      // It's a FileItem
      fileName = fileOrOptions.name;
    } else {
      // It's an options object
      fileName = fileOrOptions.fileName;
      title = fileOrOptions.title || title;
      id = fileOrOptions.id;
      duration = fileOrOptions.duration || duration;
      forceAutoDismiss = fileOrOptions.forceAutoDismiss !== false; // Default to true
    }
    
    console.log('[UnifiedToast] Creating success toast for file:', fileName);
    
    // Create success toast with explicit duration
    const toastRef = baseToast({
      variant: "success",
      title,
      description: `${fileName} has been uploaded.`,
      duration,
      id
    });
    
    // Ensure the toast gets dismissed automatically after the standard duration
    // This is a failsafe for bulk uploads
    if (forceAutoDismiss) {
      setTimeout(() => {
        if (toastRef && toastRef.dismiss) {
          toastRef.dismiss();
          console.log('[UnifiedToast] Force dismissed success toast for:', fileName);
        }
      }, duration + 500); // Add a small buffer (500ms) to ensure the toast has time to show
    }
    
    return toastRef;
  },
  
  /**
   * Display a file upload error toast notification
   * @param fileNameOrOptions - Either a filename string or options object
   * @param error - Optional error message (deprecated: use options.description instead)
   * @returns Toast reference
   */
  fileUploadError: (fileNameOrOptions: string | { fileName: string; error?: string; id?: string; duration?: number }, error?: string) => {
    if (typeof fileNameOrOptions === 'string') {
      return baseToast({
        variant: "error",
        title: "Upload failed",
        description: `Failed to upload ${fileNameOrOptions}. ${error || "Please try again."}`,
        duration: STANDARD_DURATION,
      });
    } else {
      const { fileName, error: errorMsg, id, duration } = fileNameOrOptions;
      return baseToast({
        variant: "error",
        title: "Upload failed",
        description: `Failed to upload ${fileName}. ${errorMsg || "Please try again."}`,
        duration: duration || STANDARD_DURATION,
        id
      });
    }
  },
  
  /**
   * Display a clipboard copy confirmation toast notification
   * @param textOrOptions - Either a text string or options object
   * @returns Toast reference
   */
  clipboardCopy: (textOrOptions: string | { text: string; title?: string; id?: string; duration?: number }) => {
    if (typeof textOrOptions === 'string') {
      const text = textOrOptions;
      return baseToast({
        variant: "clipboard",
        title: "Copied to clipboard",
        description: text ? (text.length > 50 ? "Content copied to clipboard." : `"${text}" copied to clipboard.`) : "Content copied to clipboard.",
        duration: STANDARD_DURATION,
      });
    } else {
      const { text, title = "Copied to clipboard", id, duration } = textOrOptions;
      return baseToast({
        variant: "clipboard",
        title,
        description: text ? (text.length > 50 ? "Content copied to clipboard." : `"${text}" copied to clipboard.`) : "Content copied to clipboard.",
        duration: duration || STANDARD_DURATION,
        id
      });
    }
  },
  
  /**
   * Display file upload progress toast notification
   * @param fileNameOrOptions - Either a filename string or options object
   * @returns Toast reference
   */
  fileUploadProgress: (fileNameOrOptions: string | { fileName: string; description?: string; id?: string }) => {
    if (typeof fileNameOrOptions === 'string') {
      return baseToast({
        variant: "file-upload",
        title: `Uploading '${fileNameOrOptions}'`,
        description: "Please wait while we upload your file...",
        duration: Infinity, // Stay open until explicitly closed
      });
    } else {
      const { fileName, description = "Please wait while we upload your file...", id } = fileNameOrOptions;
      return baseToast({
        variant: "file-upload",
        title: `Uploading '${fileName}'`,
        description,
        duration: Infinity, // Stay open until explicitly closed
        id
      });
    }
  },
  
  /**
   * @deprecated Use fileUploadProgress with object parameter instead
   * Display file upload progress toast notification (with ID support)
   * @param options - Upload options object
   * @returns Toast reference
   */
  uploadProgress: (options: {
    id?: string;
    fileName: string;
    description?: string;
  }) => {
    // Simply delegate to the main fileUploadProgress method for consistency
    return unifiedToast.fileUploadProgress(options);
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
  /** Task ID for context awareness */
  taskId?: number;
  /** Task type for context awareness */
  taskType?: string;
  /** Time taken for operation in milliseconds */
  durationMs?: number;
  /** Flag indicating if the operation was debounced */
  wasDebounced?: boolean;
}

/**
 * Show a toast notification for form clearing operation
 */
export function showClearFieldsToast(status: ToastStatus, message?: string, options?: UnifiedToastOptions) {
  if (options?.skipToast) {
    console.debug(`Skipping clear fields toast (${status})`, { 
      operationId: options.operationId,
      taskId: options.taskId,
      taskType: options.taskType
    });
    return;
  }
  
  // Generate enhanced description that includes context when available
  let description = message;
  if (!description) {
    // If no specific message was provided, create a context-aware one
    let contextMessage = '';
    
    if (options?.taskType) {
      const formattedTaskType = options.taskType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      contextMessage = `${formattedTaskType} form`;
      
      if (options.taskId) {
        contextMessage += ` (ID: ${options.taskId})`;
      }
    }
    
    // Add duration info if available
    const durationText = options?.durationMs ? ` in ${(options.durationMs / 1000).toFixed(1)}s` : '';
    
    // Add "was debounced" note if applicable
    const debouncedText = options?.wasDebounced ? ' (debounced)' : '';
    
    switch (status) {
      case 'loading':
        description = contextMessage 
          ? `Clearing all fields in ${contextMessage}...`
          : 'Clearing all form fields...';
        break;
      case 'success':
        description = contextMessage 
          ? `All fields in ${contextMessage} have been cleared successfully${durationText}${debouncedText}.`
          : `All form fields have been cleared successfully${durationText}${debouncedText}.`;
        break;
      case 'error':
        description = contextMessage 
          ? `There was an error clearing fields in ${contextMessage}.`
          : 'There was an error clearing the form fields.';
        break;
    }
  }
  
  // Use operation ID as toast ID if available for deduplication
  const toastId = options?.operationId || undefined;
  
  switch (status) {
    case 'loading':
      baseToast({
        id: toastId,
        title: 'Clear Fields',
        description,
        variant: 'info',
      });
      break;
    case 'success':
      baseToast({
        id: toastId,
        title: 'Fields Cleared',
        description,
        variant: 'success',
      });
      break;
    case 'error':
      baseToast({
        id: toastId,
        title: 'Clear Fields Failed',
        description,
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
    console.debug(`Skipping demo autofill toast (${status})`, { 
      operationId: options.operationId,
      taskId: options.taskId,
      taskType: options.taskType
    });
    return;
  }
  
  // Generate enhanced description that includes context when available
  let description = message;
  if (!description) {
    // If no specific message was provided, create a context-aware one
    let contextMessage = '';
    
    if (options?.taskType) {
      const formattedTaskType = options.taskType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      contextMessage = `${formattedTaskType} form`;
      
      if (options.taskId) {
        contextMessage += ` (ID: ${options.taskId})`;
      }
    }
    
    // Add duration info if available
    const durationText = options?.durationMs ? ` in ${(options.durationMs / 1000).toFixed(1)}s` : '';
    
    switch (status) {
      case 'loading':
        description = contextMessage 
          ? `Loading demo data for ${contextMessage}...`
          : 'Loading demo data...';
        break;
      case 'progress':
        description = contextMessage 
          ? `Populating ${contextMessage} with demo data...`
          : 'Populating fields with demo data...';
        break;
      case 'success':
        description = contextMessage 
          ? `Successfully filled ${contextMessage} with demo data${durationText}.`
          : `Successfully filled fields with demo data${durationText}.`;
        break;
      case 'error':
        description = contextMessage 
          ? `There was an error applying demo data to ${contextMessage}.`
          : 'There was an error applying demo data.';
        break;
    }
  }
  
  // Use operation ID as toast ID if available for deduplication
  const toastId = options?.operationId || undefined;
  
  switch (status) {
    case 'loading':
      baseToast({
        id: toastId,
        title: 'Demo Auto-Fill',
        description,
        variant: 'info',
      });
      break;
    case 'progress':
      baseToast({
        id: toastId,
        title: 'Demo Auto-Fill',
        description,
        variant: 'info',
      });
      break;
    case 'success':
      baseToast({
        id: toastId,
        title: 'Demo Auto-Fill Complete',
        description,
        variant: 'success',
      });
      break;
    case 'error':
      baseToast({
        id: toastId,
        title: 'Demo Auto-Fill Error',
        description,
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
    console.debug(`Skipping form submission toast (${status})`, { 
      operationId: options.operationId,
      taskId: options.taskId,
      taskType: options.taskType
    });
    return;
  }
  
  // Generate enhanced description that includes context when available
  let description = message;
  if (!description) {
    // If no specific message was provided, create a context-aware one
    let contextMessage = '';
    
    if (options?.taskType) {
      const formattedTaskType = options.taskType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      contextMessage = `${formattedTaskType} form`;
      
      if (options.taskId) {
        contextMessage += ` (ID: ${options.taskId})`;
      }
    }
    
    // Add duration info if available
    const durationText = options?.durationMs ? ` in ${(options.durationMs / 1000).toFixed(1)}s` : '';
    
    switch (status) {
      case 'loading':
        description = contextMessage 
          ? `Submitting ${contextMessage}...`
          : 'Submitting your form data...';
        break;
      case 'success':
        description = contextMessage 
          ? `Successfully submitted ${contextMessage}${durationText}.`
          : `Your form has been submitted successfully${durationText}.`;
        break;
      case 'error':
        description = contextMessage 
          ? `There was an error submitting ${contextMessage}.`
          : 'There was an error submitting your form.';
        break;
    }
  }
  
  // Use operation ID as toast ID if available for deduplication
  const toastId = options?.operationId || undefined;
  
  switch (status) {
    case 'loading':
      baseToast({
        id: toastId,
        title: 'Submitting Form',
        description,
        variant: 'info',
      });
      break;
    case 'success':
      baseToast({
        id: toastId,
        title: 'Form Submitted',
        description,
        variant: 'success',
      });
      break;
    case 'error':
      baseToast({
        id: toastId,
        title: 'Submission Failed',
        description,
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
    console.debug(`Skipping save progress toast (${status})`, { 
      operationId: options.operationId,
      taskId: options.taskId,
      taskType: options.taskType
    });
    return;
  }
  
  // Generate enhanced description that includes context when available
  let description = message;
  if (!description) {
    // If no specific message was provided, create a context-aware one
    let contextMessage = '';
    
    if (options?.taskType) {
      const formattedTaskType = options.taskType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      contextMessage = `${formattedTaskType} form`;
      
      if (options.taskId) {
        contextMessage += ` (ID: ${options.taskId})`;
      }
    }
    
    // Add duration info if available
    const durationText = options?.durationMs ? ` in ${(options.durationMs / 1000).toFixed(1)}s` : '';
    
    switch (status) {
      case 'loading':
        description = contextMessage 
          ? `Saving progress for ${contextMessage}...`
          : 'Saving your form progress...';
        break;
      case 'success':
        description = contextMessage 
          ? `Progress for ${contextMessage} has been saved${durationText}.`
          : `Your form progress has been saved${durationText}.`;
        break;
      case 'error':
        description = contextMessage 
          ? `There was an error saving progress for ${contextMessage}.`
          : 'There was an error saving your form progress.';
        break;
    }
  }
  
  // Use operation ID as toast ID if available for deduplication
  const toastId = options?.operationId || undefined;
  
  switch (status) {
    case 'loading':
      baseToast({
        id: toastId,
        title: 'Saving Progress',
        description,
        variant: 'info',
      });
      break;
    case 'success':
      baseToast({
        id: toastId,
        title: 'Progress Saved',
        description,
        variant: 'success',
      });
      break;
    case 'error':
      baseToast({
        id: toastId,
        title: 'Save Failed',
        description,
        variant: 'destructive',
      });
      break;
  }
}