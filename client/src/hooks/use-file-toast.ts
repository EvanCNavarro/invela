import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedToast } from "@/hooks/use-unified-toast";
import { ToastAction } from "@/components/ui/toast";
import { FileItem } from "@/types/files";

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
    const fileName = 'name' in file ? file.name : file.name;
    const fileSize = 'size' in file ? file.size : 0;
    
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
    
    // Function to set progress
    const setProgress = (progress: number) => {
      if (!toastId && progress > 0) return;
      
      // If it's the first progress update and file is starting to upload
      if (progress === 0) {
        const progressToast = unifiedToast.fileUploadProgress(
          fileName,
          0,
          onCancel,
          showUploadAnother ? onUploadAnother : undefined
        );
        toastId = progressToast.id;
        return;
      }
      
      // If it's a progress update 
      if (progress > 0 && progress < 100) {
        const progressToast = unifiedToast.fileUploadProgress(
          fileName,
          progress,
          onCancel,
          showUploadAnother ? onUploadAnother : undefined
        );
        toastId = progressToast.id;
      }
      
      // If upload is complete, convert to success toast
      if (progress === 100) {
        setTimeout(() => {
          success({
            name: fileName,
            size: fileSize,
            type: ""
          });
        }, 1000);
      }
    };
    
    // Function to show success toast
    const success = (file: FileItem) => {
      if (toastId) {
        toast({
          id: toastId,
          open: false,
        });
      }
      
      const successToast = unifiedToast.fileUploadSuccess(file);
      if (onSuccess) {
        onSuccess(file);
      }
      return successToast;
    };
    
    // Function to show error toast
    const error = (customError?: string) => {
      if (toastId) {
        toast({
          id: toastId,
          open: false,
        });
      }
      
      const errorToast = unifiedToast.fileUploadError(fileName, customError || errorMessage);
      if (onError) {
        onError(customError || errorMessage || "Upload failed");
      }
      return errorToast;
    };
    
    // Function to dismiss toast
    const dismiss = () => {
      if (toastId) {
        toast({
          id: toastId,
          open: false,
        });
      }
    };
    
    // If autoStart is true, create the initial upload toast
    if (autoStart) {
      const initialToast = unifiedToast.fileUploadProgress(
        fileName,
        0,
        onCancel,
        showUploadAnother ? onUploadAnother : undefined
      );
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