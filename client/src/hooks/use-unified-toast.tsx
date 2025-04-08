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

  // Advanced File Upload Toast with Progress
  const fileUploadProgress = (
    fileName: string, 
    progress: number, 
    onCancel?: () => void, 
    onUploadAnother?: () => void
  ) => {
    const toastRef = toast({
      variant: "file-upload",
      title: `Uploading '${fileName}'`,
      description: (
        <div className="w-full">
          <div className="text-sm mb-2">Please wait while we upload your file.</div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center">
            <div className="text-right text-sm font-medium">{progress}%</div>
            <div className="flex gap-2">
              {progress < 100 && onCancel && (
                <button 
                  onClick={onCancel}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      ),
      action: progress === 100 && onUploadAnother ? (
        <ToastAction altText="Upload another" onClick={onUploadAnother}>
          Upload another
        </ToastAction>
      ) : undefined,
      duration: progress === 100 ? STANDARD_DURATION : 30000, // Stay open until complete or timeout
    });
    
    // If upload is complete, convert to success toast
    if (progress === 100) {
      setTimeout(() => {
        toastRef.dismiss();
        fileUploadSuccess(fileName);
      }, 1500);
    }
    
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

// Export standalone functions for use without the hook
export const unifiedToast = {
  success: (title: string, description?: string) => {
    return baseToast({
      variant: "success",
      title,
      description,
      duration: STANDARD_DURATION,
    });
  },
  
  info: (title: string, description?: string) => {
    return baseToast({
      variant: "info",
      title,
      description,
      duration: STANDARD_DURATION,
    });
  },
  
  warning: (title: string, description?: string) => {
    return baseToast({
      variant: "warning",
      title,
      description,
      duration: STANDARD_DURATION,
    });
  },
  
  error: (title: string, description?: string) => {
    return baseToast({
      variant: "error",
      title,
      description,
      duration: STANDARD_DURATION,
    });
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
};