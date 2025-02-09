import React from 'react';
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
  file: File | undefined;
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

export function FileUploadPreview({
  file,
  progress,
  onRemove,
  error,
  className,
  variant = 'default'
}: FileUploadPreviewProps) {
  const FileTypeIcon = getFileIcon(file?.type);
  const fileSize = file ? (file.size / 1024 / 1024).toFixed(2) : '0';

  const fileInfo = (
    <>
      <p className="text-sm font-medium truncate">{file?.name}</p>
      <p className="text-xs text-muted-foreground">
        {fileSize} MB
      </p>
    </>
  );

  return (
    <div className={cn(
      "relative flex items-center gap-3 p-3 rounded-lg border",
      error ? "border-destructive/50 bg-destructive/5" : "border-border",
      className
    )}>
      <FileTypeIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="truncate">
            {variant === 'compact' ? (
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{file?.name}</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{fileSize} MB</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ) : (
              fileInfo
            )}
          </div>

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
        </div>

        {typeof progress === 'number' && !error && (
          <div className="mt-2 space-y-1">
            <Progress value={progress} className="h-1" />
            <p className="text-xs text-muted-foreground">
              {progress}% uploaded
            </p>
          </div>
        )}

        {error && (
          <p className="mt-1 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}