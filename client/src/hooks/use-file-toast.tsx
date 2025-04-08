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

type ToastReturnType = {
  id: string;
  update: (props: any) => void;
  dismiss: () => void;
};

// Progress bar component displayed in the toast
const ProgressBar: React.FC<{
  progress: number;
  onCancel?: () => void;
  onUploadAnother?: () => void;
}> = ({ progress, onCancel, onUploadAnother }) => {
  return (
    <div className="w-full file-upload-progress-container">
      <div className="text-sm mb-2 text-gray-600">Please wait while we upload your file.</div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2 progress-bar-container">
        <div 
          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-700 ease-in-out progress-bar-inner" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className="flex justify-between items-center mt-1">
        <div className="text-sm font-medium text-gray-700 progress-percentage">{progress}%</div>
        {progress < 100 && onCancel && (
          <button 
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-900 cancel-button"
          >
            Cancel
          </button>
        )}
        {progress === 100 && onUploadAnother && (
          <button 
            onClick={onUploadAnother}
            className="text-sm text-indigo-600 hover:text-indigo-700 upload-another-button"
          >
            Upload another
          </button>
        )}
      </div>
    </div>
  );
};

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
      
      // If this is the first progress update, create the toast
      if (!toastId) {
        const progressToast = toast({
          variant: "file-upload",
          title: `Uploading '${fileName}'`,
          description: (
            <ProgressBar 
              progress={progress} 
              onCancel={handleCancel}
              onUploadAnother={progress === 100 ? onUploadAnother : undefined}
            />
          ),
          duration: 30000,
          action: progress < 100 && onCancel ? (
            <ToastAction altText="Cancel" onClick={handleCancel}>
              Cancel
            </ToastAction>
          ) : showUploadAnother && progress === 100 ? (
            <ToastAction altText="Upload Another" onClick={onUploadAnother}>
              Upload another
            </ToastAction>
          ) : undefined,
        });
        
        toastId = progressToast.id;
        return;
      }
      
      // Otherwise, update the existing toast with new progress
      if (toastId && progress < 100) {
        // Find the existing toast and use the update method
        const existingToasts = window.document.querySelectorAll('[data-toast-id]');
        const toastElement = Array.from(existingToasts).find(
          el => el.getAttribute('data-toast-id') === toastId
        );
        
        if (toastElement) {
          // If we found the toast in the DOM, update it directly
          const progressBarElement = toastElement.querySelector('.progress-bar-inner');
          const percentTextElement = toastElement.querySelector('.progress-percentage');
          
          if (progressBarElement) {
            (progressBarElement as HTMLElement).style.width = `${progress}%`;
          }
          
          if (percentTextElement) {
            percentTextElement.textContent = `${progress}%`;
          }
        } else {
          // Fallback to creating a new toast with the same ID
          toast({
            id: toastId,
            variant: "file-upload",
            title: `Uploading '${fileName}'`,
            description: (
              <ProgressBar 
                progress={progress} 
                onCancel={handleCancel}
                onUploadAnother={progress === 100 ? onUploadAnother : undefined}
              />
            ),
            duration: 30000,
            action: progress < 100 && onCancel ? (
              <ToastAction altText="Cancel" onClick={handleCancel}>
                Cancel
              </ToastAction>
            ) : showUploadAnother && progress === 100 ? (
              <ToastAction altText="Upload Another" onClick={onUploadAnother}>
                Upload another
              </ToastAction>
            ) : undefined,
          } as any);
        }
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
        // Update the existing toast to show success
        toast({
          id: toastId,
          variant: "success",
          title: "File uploaded successfully",
          description: `${file.name} has been uploaded.`,
          action: showUploadAnother && onUploadAnother ? (
            <ToastAction altText="Upload Another" onClick={onUploadAnother}>
              Upload another
            </ToastAction>
          ) : undefined,
        } as any);
        
        if (onSuccess) {
          onSuccess(file);
        }
        
        return { id: toastId, update: () => {}, dismiss: () => {} };
      }
      
      // If no existing toast, create a new success toast
      const successToast = unifiedToast.fileUploadSuccess(file);
      if (onSuccess) {
        onSuccess(file);
      }
      return successToast;
    };
    
    // Function to show error toast
    const error = (customError?: string) => {
      const errorMsg = customError || errorMessage || "Upload failed";
      
      if (toastId) {
        // Update the existing toast to show error
        toast({
          id: toastId,
          variant: "error",
          title: "Upload failed",
          description: `Failed to upload ${fileName}. ${errorMsg}`,
        } as any);
        
        if (onError) {
          onError(errorMsg);
        }
        
        return { id: toastId, update: () => {}, dismiss: () => {} };
      }
      
      // If no existing toast, create a new error toast
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
      }
    };
    
    // If autoStart is true, create the initial upload toast
    if (autoStart) {
      const initialToast = toast({
        variant: "file-upload",
        title: `Uploading '${fileName}'`,
        description: (
          <ProgressBar 
            progress={0} 
            onCancel={handleCancel}
          />
        ),
        duration: 30000,
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