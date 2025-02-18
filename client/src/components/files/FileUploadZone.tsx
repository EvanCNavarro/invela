import React, { forwardRef } from 'react';
import { Upload, Info } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface FileUploadZoneProps extends React.HTMLAttributes<HTMLDivElement> {
  onFilesAccepted: (files: File[]) => void;
  acceptedFormats?: string;
  maxFiles?: number;
  maxSize?: number;
  variant?: 'box' | 'row';
  disabled?: boolean;
  children?: React.ReactNode;
  customPrompt?: React.ReactNode;
  showAcceptedFormats?: boolean;
}

// Helper function to convert format string to accept object
const getAcceptFromFormats = (formats?: string) => {
  if (!formats) return undefined;

  const formatMap: Record<string, string[]> = {
    '.csv': ['text/csv'],
    '.doc': ['application/msword'],
    '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    '.odt': ['application/vnd.oasis.opendocument.text'],
    '.pdf': ['application/pdf'],
    '.rtf': ['application/rtf'],
    '.txt': ['text/plain'],
    '.wpd': ['application/vnd.ms-works'],
    '.wpf': ['application/wordperfect'],
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.png': ['image/png'],
    '.gif': ['image/gif'],
    '.webp': ['image/webp'],
    '.svg': ['image/svg+xml']
  };

  const accept: Record<string, string[]> = {};
  const formatList = formats.split(',').map(f => f.trim().toLowerCase());

  formatList.forEach(format => {
    const mimeTypes = formatMap[format];
    if (mimeTypes) {
      mimeTypes.forEach(mime => {
        if (!accept[mime]) {
          accept[mime] = [format];
        } else {
          accept[mime].push(format);
        }
      });
    }
  });

  return accept;
};

export const FileUploadZone = forwardRef<HTMLDivElement, FileUploadZoneProps>(({
  onFilesAccepted,
  acceptedFormats,
  maxFiles = 10,
  maxSize = 5 * 1024 * 1024,
  variant = 'box',
  className,
  disabled = false,
  children,
  customPrompt,
  showAcceptedFormats = true,
  ...props
}, ref) => {
  const { toast } = useToast();

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject
  } = useDropzone({
    accept: getAcceptFromFormats(acceptedFormats),
    maxFiles,
    maxSize,
    disabled,
    onDrop: (acceptedFiles) => {
      // Show uploading toast
      toast({
        title: "Uploading Files",
        description: (
          <div className="flex items-center gap-2">
            <LoadingSpinner size="sm" />
            <span>Processing {acceptedFiles.length} file{acceptedFiles.length !== 1 ? 's' : ''}...</span>
          </div>
        ),
        duration: 2000,
      });

      // Process files
      onFilesAccepted(acceptedFiles);
    },
  });

  const dropzoneClasses = cn(
    'transition-colors duration-200 ease-in-out',
    'border-2 border-dashed rounded-lg',
    'flex items-center justify-center',
    'cursor-pointer',
    {
      'hover:border-primary/50 hover:bg-primary/5': !disabled,
      'border-primary/30 bg-primary/10': isDragActive && !isDragReject,
      'border-destructive/30 bg-destructive/10': isDragReject,
      'border-muted-foreground/25': !isDragActive && !isDragReject,
      'opacity-50 cursor-not-allowed': disabled,
      'min-h-[200px] p-6 flex-col': variant === 'box',
      'h-16 px-4': variant === 'row',
    },
    className
  );

  const formatFileTypes = () => {
    if (!acceptedFormats) return '';
    const types = acceptedFormats
      .split(',')
      .map(type => type.trim().toUpperCase())
      .join(', ');

    // Split into groups of 6 for better readability with less wrapping
    const typeArray = types.split(', ');
    const groups = [];
    for (let i = 0; i < typeArray.length; i += 6) {
      groups.push(typeArray.slice(i, i + 6).join(', '));
    }
    return groups.join(',\n');
  };

  const acceptedFormatsText = (
    <p className="text-xs text-muted-foreground max-w-[280px] w-full whitespace-pre-line">
      Accepted formats: {formatFileTypes()}
    </p>
  );

  const acceptedFormatsTooltip = (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Info className="h-4 w-4 text-muted-foreground hover:text-primary" />
        </TooltipTrigger>
        <TooltipContent className="max-w-[280px] w-full whitespace-pre-line">
          <p className="text-xs">Accepted formats: {formatFileTypes()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div
      {...getRootProps()}
      ref={ref}
      className={dropzoneClasses}
      {...props}
    >
      <input {...getInputProps()} />

      {children || (
        <>
          {variant === 'box' ? (
            <div className="flex flex-col items-center gap-2 text-center">
              <div className={cn(
                "p-3 rounded-full transition-colors",
                isDragActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}>
                <Upload className="h-10 w-10" />
              </div>
              {customPrompt || (
                <>
                  <p className="text-sm font-medium">
                    {isDragActive ? "Drop files here" : "Drag and drop files here, or click to select"}
                  </p>
                  {showAcceptedFormats && acceptedFormatsText}
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-2 rounded-full transition-colors",
                isDragActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}>
                <Upload className="h-5 w-5" />
              </div>
              {customPrompt || (
                <div className="flex items-center gap-2">
                  <p className="text-sm">
                    {isDragActive ? "Drop files here" : "Drag and drop files here, or click to select"}
                  </p>
                  {showAcceptedFormats && acceptedFormatsTooltip}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
});

FileUploadZone.displayName = 'FileUploadZone';