import React, { useEffect } from 'react';
import { X, File as FileIcon, Image as ImageIcon, FileText, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FileUploadPreviewProps {
  file: File;
  progress?: number;
  onRemove?: () => void;
  error?: string;
  className?: string;
  variant?: 'default' | 'compact';
}

const getFileIcon = (type: string | undefined) => {
  if (!type) return FileIcon;
  if (type.startsWith('image/')) return ImageIcon;
  if (type.startsWith('text/')) return FileText;
  return FileIcon;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export function FileUploadPreview({
  file,
  progress,
  onRemove,
  error,
  className,
  variant = 'default'
}: FileUploadPreviewProps) {
  const FileTypeIcon = getFileIcon(file?.type);
  const fileSize = formatFileSize(file?.size || 0);

  useEffect(() => {
    // Debug logging
    console.log('File Upload Preview - File Details:', {
      name: file?.name,
      type: file?.type,
      size: fileSize,
      lastModified: new Date(file?.lastModified || 0).toLocaleString(),
    });
  }, [file]);

  return (
    <div className={cn(
      "relative px-4 py-3 rounded-lg bg-muted/30",
      error ? "border-destructive/50 bg-destructive/5" : "",
      className
    )}>
      <div className="flex items-start gap-3">
        {/* Left section: Icon and file details */}
        <div className="flex gap-3 flex-1 min-w-0">
          <FileTypeIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{file?.name}</p>
              {variant === 'compact' ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{fileSize}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <p className="text-xs text-muted-foreground">{fileSize}</p>
              )}
            </div>
          </div>
        </div>

        {/* Right section: Remove button and progress */}
        <div className="flex flex-col items-end gap-2">
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          {typeof progress === 'number' && (
            <p className="text-xs text-muted-foreground">
              {progress.toFixed(2)}%
            </p>
          )}
        </div>
      </div>

      {/* Bottom section: Progress bar */}
      {typeof progress === 'number' && !error && (
        <div className="mt-2">
          <Progress 
            value={progress} 
            className="h-1 bg-primary/20" 
          />
        </div>
      )}

      {error && (
        <p className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}