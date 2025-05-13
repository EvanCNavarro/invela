import { useToast } from "@/hooks/use-toast";
import { useUnifiedToast } from "@/hooks/use-unified-toast";
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

type ToastReturnType = {
  id: string;
  update: (props: any) => void;
  dismiss: () => void;
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
          description: `Please wait while we upload your file. ${progress}%`,
          duration: 30000,
        });
        
        toastId = progressToast.id;
        return;
      }
      
      // Otherwise, update the existing toast with new progress
      if (toastId && progress < 100) {
        toast({
          id: toastId,
          variant: "file-upload",
          title: `Uploading '${fileName}'`,
          description: `Please wait while we upload your file. ${progress}%`,
          duration: 30000,
        } as any);
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
        description: `Please wait while we upload your file. 0%`,
        duration: 30000,
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