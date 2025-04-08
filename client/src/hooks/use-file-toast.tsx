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
  showUploadAnother?: boolean;
  onUploadAnother?: () => void;
};

interface FileUploadToastRef {
  id: string | undefined;
  setProgress: (progress: number) => void;
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
    const fileSize = file.size;
    
    const {
      autoStart = true,
      onCancel,
      onSuccess,
      onError,
      successMessage,
      errorMessage,
      showUploadAnother = false,
      onUploadAnother,
    } = options;
    
    let toastId: string | undefined;
    let currentProgress = 0;
    
    // Custom cancel handler that converts upload toast to error toast
    const handleCancel = () => {
      if (onCancel) {
        onCancel();
      }
      
      // Call the error function to show error toast
      error("Upload cancelled");
      console.log("Upload cancelled");
    };
    
    // Function to set progress
    const setProgress = (progress: number) => {
      if (progress < 0 || progress > 100) return;
      
      // Save current progress
      currentProgress = progress;
      
      // If this is the first progress update, create the toast
      if (!toastId) {
        // Create the initial uploading toast
        const progressToast = toast({
          variant: "file-upload",
          title: `Uploading '${fileName}'`,
          description: `Please wait while we upload your file. ${progress}%`,
          duration: 30000, // Long duration while uploading
          action: onCancel ? (
            <ToastAction altText="Cancel" onClick={handleCancel}>
              Cancel
            </ToastAction>
          ) : undefined,
        });
        
        toastId = progressToast.id;
        return;
      }
      
      // Update the toast description with new progress
      if (toastId && progress < 100) {
        toast({
          id: toastId,
          description: `Please wait while we upload your file. ${progress}%`,
        } as any);
      }
      
      // If upload is complete, dismiss this toast and show success
      if (progress === 100) {
        setTimeout(() => {
          // Dismiss the progress toast
          dismiss();
          
          // Show success toast
          success({
            name: fileName,
            size: fileSize,
            type: ""
          });
        }, 500);
      }
    };
    
    // Function to show success toast
    const success = (file: FileItem) => {
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
        description: `Please wait while we upload your file. 0%`,
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
      setProgress,
      success,
      error,
      dismiss
    };
  };
  
  return {
    createFileUploadToast
  };
}