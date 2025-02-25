import { useToast } from "@/hooks/use-toast";
import { FileItem } from "@/types/files";
import { useCallback } from "react";

// Toast duration constants
const SUCCESS_DURATION = 3000;
const ERROR_DURATION = 5000;

// Toast variants that match the available options in the toast component
type ToastVariant = "default" | "destructive" | "success" | "warning" | "info";

/**
 * Hook for displaying consistent file-related toast notifications
 * with improved accessibility and error handling
 */
export function useFileToast() {
  const { toast } = useToast();

  /**
   * Creates a toast notification with consistent styling and accessibility
   */
  const createToast = useCallback((
    title: string, 
    description: string, 
    variant: ToastVariant = "default",
    duration: number = SUCCESS_DURATION
  ) => {
    return toast({
      title,
      description,
      variant,
      duration,
      // Improve accessibility
      role: variant === "destructive" ? "alert" : "status",
      "aria-live": variant === "destructive" ? "assertive" : "polite",
    });
  }, [toast]);

  // File upload success notification
  const showUploadSuccess = useCallback((file: FileItem) => {
    if (!file || !file.name) {
      console.warn("Invalid file data provided to showUploadSuccess");
      return null;
    }
    
    return createToast(
      "File uploaded successfully",
      `${file.name} has been uploaded.`,
      "success",
      SUCCESS_DURATION
    );
  }, [createToast]);

  // File upload error notification
  const showUploadError = useCallback((fileName: string, error?: string) => {
    if (!fileName) {
      console.warn("Invalid fileName provided to showUploadError");
      fileName = "File";
    }
    
    return createToast(
      "Upload failed",
      `Failed to upload ${fileName}. ${error || "Please try again."}`,
      "destructive",
      ERROR_DURATION
    );
  }, [createToast]);

  // File delete success notification
  const showDeleteSuccess = useCallback((fileName: string) => {
    if (!fileName) {
      console.warn("Invalid fileName provided to showDeleteSuccess");
      fileName = "File";
    }
    
    return createToast(
      "File deleted",
      `${fileName} has been deleted.`,
      "success",
      SUCCESS_DURATION
    );
  }, [createToast]);

  // File delete error notification
  const showDeleteError = useCallback((fileName: string) => {
    if (!fileName) {
      console.warn("Invalid fileName provided to showDeleteError");
      fileName = "File";
    }
    
    return createToast(
      "Delete failed",
      `Failed to delete ${fileName}. Please try again.`,
      "destructive",
      ERROR_DURATION
    );
  }, [createToast]);

  // File restore success notification
  const showRestoreSuccess = useCallback((fileName: string) => {
    if (!fileName) {
      console.warn("Invalid fileName provided to showRestoreSuccess");
      fileName = "File";
    }
    
    return createToast(
      "File restored",
      `${fileName} has been restored.`,
      "success",
      SUCCESS_DURATION
    );
  }, [createToast]);

  // File restore error notification
  const showRestoreError = useCallback((fileName: string) => {
    if (!fileName) {
      console.warn("Invalid fileName provided to showRestoreError");
      fileName = "File";
    }
    
    return createToast(
      "Restore failed",
      `Failed to restore ${fileName}. Please try again.`,
      "destructive",
      ERROR_DURATION
    );
  }, [createToast]);

  // File download error notification
  const showDownloadError = useCallback((fileName: string) => {
    if (!fileName) {
      console.warn("Invalid fileName provided to showDownloadError");
      fileName = "File";
    }
    
    return createToast(
      "Download failed",
      `Failed to download ${fileName}. Please try again.`,
      "destructive",
      ERROR_DURATION
    );
  }, [createToast]);

  return {
    showUploadSuccess,
    showUploadError,
    showDeleteSuccess,
    showDeleteError,
    showRestoreSuccess,
    showRestoreError,
    showDownloadError,
  };
}
