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

interface TaskDownloadMenuProps {
  onDownload: (format: 'csv' | 'txt' | 'json') => Promise<void>;
  taskType?: string;
  disabled?: boolean;
}

export const TaskDownloadMenu: React.FC<TaskDownloadMenuProps> = ({
  onDownload,
  taskType = 'form',
  disabled = false
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentFormat, setCurrentFormat] = useState<'csv' | 'txt' | 'json' | null>(null);
  const { toast } = useToast();

  const handleDownload = async (format: 'csv' | 'txt' | 'json') => {
    if (isDownloading) return;
    
    try {
      setIsDownloading(true);
      setCurrentFormat(format);
      
      // Log the download attempt
      console.log(`[TaskDownloadMenu] Starting ${format.toUpperCase()} download for ${taskType}`);
      
      // Wait for the download to complete
      await onDownload(format);
      
      // Show success toast
      toast({
        title: "Download Started",
        description: `Your ${format.toUpperCase()} file is being downloaded.`,
        variant: "default",
      });
    } catch (error) {
      console.error('[TaskDownloadMenu] Download error:', error);
      
      // Show an error toast with more specific information
      toast({
        title: "Download Failed",
        description: error instanceof Error ? 
          `Error: ${error.message}` : 
          "Could not download the file. Please try again later.",
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
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};