import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText, FileJson, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import FixMissingFileButton from './FixMissingFileButton';
import getLogger from '@/utils/logger';

const logger = getLogger('TaskDownloadMenu');

interface TaskDownloadMenuProps {
  onDownload: (format: 'csv' | 'txt' | 'json') => Promise<void>;
  taskType?: string;
  disabled?: boolean;
  fileId?: number;  // Add fileId prop to support direct file access
  taskId: number;  // Add taskId prop for file repair functionality
  onFileIdUpdate?: (fileId: number) => void; // Callback for when file is regenerated
}

export const TaskDownloadMenu: React.FC<TaskDownloadMenuProps> = ({
  onDownload,
  taskType = 'form',
  disabled = false,
  fileId,  // Now we will use this for checking if we need repair
  taskId,  // Task ID for repair functionality
  onFileIdUpdate // Callback for when file is regenerated
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentFormat, setCurrentFormat] = useState<'csv' | 'txt' | 'json' | null>(null);
  const { toast } = useToast();
  
  // Handle file regeneration
  const handleFileRegenerated = (newFileId: number) => {
    logger.info(`File regenerated successfully: ID ${newFileId} for task ${taskId}`);
    
    // Call the parent callback if provided
    if (onFileIdUpdate) {
      onFileIdUpdate(newFileId);
    }
  };

  const handleDownload = async (format: 'csv' | 'txt' | 'json') => {
    if (isDownloading) return;
    
    try {
      setIsDownloading(true);
      setCurrentFormat(format);
      
      // Log the download attempt
      console.log(`[TaskDownloadMenu] Starting ${format.toUpperCase()} download for ${taskType}`);
      
      // Wait for the download to complete
      await onDownload(format);
      
      // Show success toast with task type specific message and new file format
      const taskTypeDisplay = taskType === 'kyb' ? 'KYB Assessment' :
                             taskType === 'ky3p' ? 'S&P KY3P Assessment' :
                             taskType === 'open_banking' ? 'Open Banking Assessment' :
                             taskType === 'card' ? 'CARD Assessment' : 'Form';
                             
      // Create a unique ID for the toast so we can dismiss it programmatically
      const toastId = `download-${format}-${Date.now()}`;
      
      toast({
        id: toastId,
        title: "Download Started",
        description: `Your ${taskTypeDisplay} is being downloaded as ${format.toUpperCase()} file.`,
        variant: "default",
      });
      
      // Return the toast ID so task-page.tsx can dismiss it when download completes
      return toastId;
    } catch (error) {
      console.error('[TaskDownloadMenu] Download error:', error);
      
      // Show an error toast with more specific information
      toast({
        title: "Download Failed",
        description: error instanceof Error ? 
          `Error: ${error.message}` : 
          "File download failed. Please try again or contact support if the issue persists.",
        variant: "destructive",
      });
    } finally {
      // Reset state
      setIsDownloading(false);
      setCurrentFormat(null);
    }
  };

  // Format-specific loading indicators
  const isCSVLoading = isDownloading && currentFormat === 'csv';
  const isTXTLoading = isDownloading && currentFormat === 'txt';
  const isJSONLoading = isDownloading && currentFormat === 'json';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={disabled || isDownloading}
        >
          {isDownloading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Downloading...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => handleDownload('csv')} 
          disabled={isDownloading}
          className="flex items-center"
        >
          {isCSVLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="mr-2 h-4 w-4" />
          )}
          Download as CSV
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleDownload('txt')} 
          disabled={isDownloading}
          className="flex items-center"
        >
          {isTXTLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileText className="mr-2 h-4 w-4" />
          )}
          Download as TXT
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleDownload('json')} 
          disabled={isDownloading}
          className="flex items-center"
        >
          {isJSONLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileJson className="mr-2 h-4 w-4" />
          )}
          Download as JSON
        </DropdownMenuItem>
        
        {disabled && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="flex items-center text-amber-500">
              <AlertCircle className="mr-2 h-4 w-4" />
              No file available
            </DropdownMenuItem>
            
            {/* Add Fix Missing File option when file is missing */}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="p-0">
              <FixMissingFileButton 
                taskId={taskId}
                variant="ghost"
                className="w-full justify-start px-2 py-1.5 text-left"
                onFileRepaired={handleFileRegenerated}
              />
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};