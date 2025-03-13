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

// Define accepted MIME types and their corresponding extensions
const ACCEPTED_FILE_TYPES = {
  'text/csv': ['.csv'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.oasis.opendocument.text': ['.odt'],
  'application/pdf': ['.pdf'],
  'application/rtf': ['.rtf'],
  'text/plain': ['.txt'],
  'application/vnd.ms-works': ['.wpd'],
  'application/x-wpwin': ['.wpf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg']
};

const getAcceptFromFormats = (formats?: string) => {
  if (!formats) return undefined;

  const accept: Record<string, string[]> = {};
  const formatList = formats.split(',').map(f => f.trim().toLowerCase());

  // Map file extensions to MIME types
  formatList.forEach(format => {
    // Find matching MIME type for the extension
    Object.entries(ACCEPTED_FILE_TYPES).forEach(([mimeType, extensions]) => {
      if (extensions.includes(format)) {
        if (!accept[mimeType]) {
          accept[mimeType] = [];
        }
        accept[mimeType].push(format);
      }
    });
  });

  return accept;
};

export const FileUploadZone = forwardRef<HTMLDivElement, FileUploadZoneProps>(({
  onFilesAccepted,
  acceptedFormats,
  maxFiles = 10,
  maxSize = 5 * 1024 * 1024, // 5MB
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
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        const errors = rejectedFiles.map(file => {
          const errorMessages = file.errors.map(error => {
            switch (error.code) {
              case 'file-too-large':
                return `${file.file.name} is too large. Max size is ${formatFileSize(maxSize)}`;
              case 'file-invalid-type':
                return `${file.file.name} has an invalid file type. Accepted formats: ${acceptedFormats}`;
              default:
                return `${file.file.name}: ${error.message}`;
            }
          });
          return errorMessages.join(', ');
        });

        toast({
          title: "File upload error",
          description: errors.join('\n'),
          variant: "destructive",
          duration: 5000,
        });
        return;
      }

      if (acceptedFiles.length > 0) {
        console.log('[FileUploadZone] Accepted files:', acceptedFiles.map(f => ({ 
          name: f.name, 
          type: f.type, 
          size: f.size 
        })));
        onFilesAccepted(acceptedFiles);
      }
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
                  {showAcceptedFormats && (
                    <p className="text-sm text-muted-foreground">
                      Accepted formats: {acceptedFormats}
                    </p>
                  )}
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
                  {showAcceptedFormats && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Accepted formats: {acceptedFormats}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
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

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};