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
      // First dismiss the existing upload toast if it exists
      if (toastId) {
        dismiss();
        
        // Small delay to ensure the first toast is dismissed before showing success
        setTimeout(() => {
          // Create a new success toast with standard duration
          const successToast = unifiedToast.fileUploadSuccess(file);
          
          if (onSuccess) {
            onSuccess(file);
          }
        }, 100);
        
        return { id: undefined };
      } else {
        // If no toast was active, just show success immediately
        const successToast = unifiedToast.fileUploadSuccess(file);
        
        if (onSuccess) {
          onSuccess(file);
        }
        
        return successToast;
      }
    };
    
    // Function to show error toast
    const error = (customError?: string) => {
      const errorMsg = customError || errorMessage || "Upload failed";
      
      // First dismiss the existing upload toast if it exists
      if (toastId) {
        dismiss();
        
        // Small delay to ensure the first toast is dismissed before showing error
        setTimeout(() => {
          // Create a new error toast with standard duration
          const errorToast = unifiedToast.fileUploadError(fileName, errorMsg);
          
          if (onError) {
            onError(errorMsg);
          }
        }, 100);
        
        return { id: undefined };
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
    
    // If autoStart is true, create the initial upload toast
    if (autoStart) {
      const initialToast = toast({
        variant: "file-upload",
        title: `Uploading '${fileName}'`,
        description: "Please wait while we upload your file.",
        duration: 10000, // Long enough for upload but will auto-dismiss
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