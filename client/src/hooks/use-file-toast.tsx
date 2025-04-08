import * as React from "react";
import { useToast } from "./use-toast";
import { useUnifiedToast } from "./use-unified-toast";
import { FileItem } from "../types/files";
import { ToastAction } from "../components/ui/toast";

type FileToastOptions = {
  autoStart?: boolean;
  onCancel?: () => void;
  onSuccess?: (file: FileItem) => void;
  onError?: (error: string) => void;
  successMessage?: string;
  errorMessage?: string;
};

interface FileUploadToastRef {
  id: string | undefined;
  uploadComplete: (file: FileItem) => void;
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
      onCancel,
      onSuccess,
      onError,
      errorMessage,
    } = options;
    
    let toastId: string | undefined;
    
    // Custom cancel handler
    const handleCancel = () => {
      if (onCancel) {
        onCancel();
      }
      
      // Call the error function to show error toast
      error("Upload cancelled");
      console.log("Upload cancelled");
    };
    
    // Function for upload completion
    const uploadComplete = (file: FileItem) => {
      // Dismiss the existing upload toast if it exists
      if (toastId) {
        dismiss();
      }
      
      // Create a new success toast
      const successToast = unifiedToast.fileUploadSuccess(file);
      
      if (onSuccess) {
        onSuccess(file);
      }
      
      return successToast;
    };
    
    // Function to show error toast
    const error = (customError?: string) => {
      const errorMsg = customError || errorMessage || "Upload failed";
      
      // Dismiss the existing upload toast if it exists
      if (toastId) {
        dismiss();
      }
      
      // Create a new error toast
      const errorToast = unifiedToast.fileUploadError(fileName, errorMsg);
      
      if (onError) {
        onError(errorMsg);
      }
      
      return errorToast;
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
        duration: 30000, // Long duration while uploading
        action: onCancel ? (
          <ToastAction altText="Cancel" onClick={handleCancel}>
            Cancel
          </ToastAction>
        ) : undefined,
      });
      
      toastId = initialToast.id;
    }
    
    return {
      id: toastId,
      uploadComplete,
      error,
      dismiss
    };
  };
  
  return {
    createFileUploadToast
  };
}