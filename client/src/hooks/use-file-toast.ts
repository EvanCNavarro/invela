import { useToast } from "@/hooks/use-toast";
import { FileItem } from "@/types/files";

export function useFileToast() {
  const { toast } = useToast();

  const showUploadSuccess = (file: FileItem) => {
    return toast({
      title: "File uploaded successfully",
      description: `${file.name} has been uploaded.`,
      duration: 3000,
    });
  };

  const showUploadError = (fileName: string, error?: string) => {
    return toast({
      title: "Upload failed",
      description: `Failed to upload ${fileName}. ${error || "Please try again."}`,
      variant: "destructive",
      duration: 5000,
    });
  };

  const showDeleteSuccess = (fileName: string) => {
    return toast({
      title: "File deleted",
      description: `${fileName} has been deleted.`,
      duration: 3000,
    });
  };

  const showDeleteError = (fileName: string) => {
    return toast({
      title: "Delete failed",
      description: `Failed to delete ${fileName}. Please try again.`,
      variant: "destructive",
      duration: 5000,
    });
  };

  const showRestoreSuccess = (fileName: string) => {
    return toast({
      title: "File restored",
      description: `${fileName} has been restored.`,
      duration: 3000,
    });
  };

  const showRestoreError = (fileName: string) => {
    return toast({
      title: "Restore failed",
      description: `Failed to restore ${fileName}. Please try again.`,
      variant: "destructive",
      duration: 5000,
    });
  };

  const showDownloadError = (fileName: string) => {
    return toast({
      title: "Download failed",
      description: `Failed to download ${fileName}. Please try again.`,
      variant: "destructive",
      duration: 5000,
    });
  };

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
