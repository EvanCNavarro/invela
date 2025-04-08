import React, { useState, useEffect } from "react";
import { useToast, toast as baseToast } from "@/hooks/use-toast";
import { FileItem } from "@/types/files";
import { ToastAction } from "@/components/ui/toast";

// Standard duration for all toasts
const STANDARD_DURATION = 4000;

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
      description: "Please wait while we upload your file.",
      duration: STANDARD_DURATION * 2, // Longer duration for uploads
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

  // Simple File Upload Toast (no progress)
  const fileUploadProgress = (
    fileName: string, 
    onCancel?: () => void
  ) => {
    // Create a toast without progress indication
    const toastRef = toast({
      variant: "file-upload",
      title: `Uploading '${fileName}'`,
      description: "Please wait while we upload your file.",
      duration: 30000, // Stay open until complete or timeout
      action: onCancel ? (
        <ToastAction altText="Cancel" onClick={onCancel}>
          Cancel
        </ToastAction>
      ) : undefined,
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
  
  fileUploadStarted: (fileName: string) => {
    return baseToast({
      variant: "file-upload",
      title: `Uploading '${fileName}'`,
      description: "Please wait while we upload your file.",
      duration: STANDARD_DURATION * 2,
    });
  },
  
  fileUploadSuccess: (file: FileItem | string) => {
    const fileName = typeof file === 'string' ? file : file.name;
    return baseToast({
      variant: "success",
      title: "File uploaded successfully",
      description: `${fileName} has been uploaded.`,
      duration: STANDARD_DURATION,
    });
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
    fileName: string, 
    onCancel?: () => void
  ) => {
    return baseToast({
      variant: "file-upload",
      title: `Uploading '${fileName}'`,
      description: "Please wait while we upload your file.",
      duration: 30000, // Stay open until complete or timeout
      action: onCancel ? (
        <ToastAction altText="Cancel" onClick={onCancel}>
          Cancel
        </ToastAction>
      ) : undefined,
    });
  },
  
  // Method with ID support
  uploadProgress: (options: {
    id?: string;
    fileName: string;
    onCancel?: () => void;
  }) => {
    const { id, fileName, onCancel } = options;
    
    return baseToast({
      id,
      variant: "file-upload",
      title: `Uploading '${fileName}'`,
      description: "Please wait while we upload your file.",
      duration: 30000, // Stay open until complete or timeout
      action: onCancel ? (
        <ToastAction altText="Cancel" onClick={onCancel}>
          Cancel
        </ToastAction>
      ) : undefined,
    });
  }
};