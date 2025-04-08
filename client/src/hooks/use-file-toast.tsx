import * as React from "react";
import { useToast } from "./use-toast";
import { useUnifiedToast } from "./use-unified-toast";
import { FileItem } from "../types/files";

type FileToastOptions = {
  autoStart?: boolean;
  onSuccess?: (file: FileItem) => void;
  onError?: (error: string) => void;
  successMessage?: string;
  errorMessage?: string;
};

interface FileUploadToastRef {
  id: string | undefined;
  success: (file: FileItem) => void;
  error: (errorMessage?: string) => void;
  dismiss: () => void;
}

export function useFileToast() {
  const { toast } = useToast();
  const unifiedToast = useUnifiedToast();
  
  const createFileUploadToast = (
    file: File | FileItem, 
    options: FileToastOptions = {}
  ): FileUploadToastRef => {
    const fileName = file.name;
    
    const {
      autoStart = true,
      onSuccess,
      onError,
      errorMessage,
    } = options;
    
    let toastId: string | undefined;
    
    // Function for upload completion
    const success = (file: FileItem) => {
      console.log('[FileToast] Success called, toastId:', toastId);
      
      // First dismiss the existing upload toast if it exists
      if (toastId) {
        // Forcefully dismiss the current toast
        console.log('[FileToast] Dismissing upload toast with ID:', toastId);
        toast({
          id: toastId,
          open: false,
        } as any);
        
        // Small delay to ensure the previous toast is gone
        setTimeout(() => {
          // Show success toast after dismissing
          console.log('[FileToast] Showing success toast after upload toast dismissed');
          const successToast = unifiedToast.fileUploadSuccess(file);
          
          if (onSuccess) {
            onSuccess(file);
          }
        }, 100);
      } else {
        // If no toast was active, just show success immediately
        console.log('[FileToast] No upload toast found, showing success immediately');
        const successToast = unifiedToast.fileUploadSuccess(file);
        
        if (onSuccess) {
          onSuccess(file);
        }
        
        return successToast;
      }
      
      // Clear the toast ID immediately
      toastId = undefined;
    };
    
    // Function to show error toast
    const error = (customError?: string) => {
      const errorMsg = customError || errorMessage || "Upload failed";
      
      // First dismiss the existing upload toast if it exists
      if (toastId) {
        // Dismiss the current toast completely
        toast({
          id: toastId,
          open: false,
        } as any);
        
        // Clear the toast ID immediately
        toastId = undefined;
        
        // Show error toast immediately after dismissing
        const errorToast = unifiedToast.fileUploadError(fileName, errorMsg);
        
        if (onError) {
          onError(errorMsg);
        }
        
        return errorToast;
      } else {
        // If no toast was active, just show error immediately
        const errorToast = unifiedToast.fileUploadError(fileName, errorMsg);
        
        if (onError) {
          onError(errorMsg);
        }
        
        return errorToast;
      }
    };
    
    // Function to dismiss toast
    const dismiss = () => {
      if (toastId) {
        toast({
          id: toastId,
          open: false,
        } as any);
        
        // Reset the toast ID after dismissing
        toastId = undefined;
      }
    };
    
    // If autoStart is true, create the initial upload toast - with no auto-dismiss
    if (autoStart) {
      const initialToast = toast({
        variant: "file-upload",
        title: `Uploading '${fileName}'`,
        description: "Please wait while we upload your file...",
        duration: Infinity, // No auto-dismiss, will stay until explicitly closed
      });
      
      toastId = initialToast.id;
    }
    
    return {
      id: toastId,
      success,
      error,
      dismiss
    };
  };
  
  return {
    createFileUploadToast
  };
}