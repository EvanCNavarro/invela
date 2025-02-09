import React from 'react';
import { Upload } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';

export interface FileUploadZoneProps {
  // Core props
  onFilesAccepted: (files: File[]) => void;
  acceptedFileTypes?: string[];
  maxFiles?: number;
  maxSize?: number;

  // Display props
  variant?: 'box' | 'row';
  className?: string;
  disabled?: boolean;

  // Custom content
  children?: React.ReactNode;
  customPrompt?: React.ReactNode;
  showAcceptedFormats?: boolean;
}

const DEFAULT_ACCEPTED_FORMATS = {
  'text/csv': ['.csv'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.oasis.opendocument.text': ['.odt'],
  'application/pdf': ['.pdf'],
  'application/rtf': ['.rtf'],
  'text/plain': ['.txt'],
  'application/vnd.ms-works': ['.wpd'],
  'application/wordperfect': ['.wpf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg']
};

export function FileUploadZone({
  onFilesAccepted,
  acceptedFileTypes = Object.values(DEFAULT_ACCEPTED_FORMATS).flat(),
  maxFiles = 10,
  maxSize = 5 * 1024 * 1024, // 5MB default
  variant = 'box',
  className,
  disabled = false,
  children,
  customPrompt,
  showAcceptedFormats = true,
}: FileUploadZoneProps) {
  const { toast } = useToast();
  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject
  } = useDropzone({
    accept: acceptedFileTypes.reduce((acc, type) => {
      const mimeType = Object.entries(DEFAULT_ACCEPTED_FORMATS)
        .find(([, extensions]) => extensions.includes(type))?.[0];
      if (mimeType) {
        acc[mimeType] = [type];
      }
      return acc;
    }, {} as Record<string, string[]>),
    maxFiles,
    maxSize,
    disabled,
    onDrop: (acceptedFiles) => {
      const toastRef = toast({
        title: "Uploading Files",
        description: (
          <div className="flex items-center gap-2">
            <LoadingSpinner size="sm" />
            <span>Processing files...</span>
          </div>
        ),
        duration: 0,
      });

      // Simulate upload delay
      setTimeout(() => {
        if (toastRef) {
          toastRef.dismiss();
          toast({
            title: "Upload Complete",
            description: `Successfully uploaded ${acceptedFiles.length} file${acceptedFiles.length !== 1 ? 's' : ''}.`,
            duration: 3000,
          });
        }
        onFilesAccepted(acceptedFiles);
      }, 2000);
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
      // Box variant
      'min-h-[200px] p-6 flex-col': variant === 'box',
      // Row variant
      'h-16 px-4': variant === 'row',
    },
    className
  );

  const formatFileTypes = () => {
    return acceptedFileTypes
      .map(type => type.toUpperCase())
      .join(', ');
  };

  return (
    <div
      {...getRootProps()}
      className={dropzoneClasses}
    >
      <input {...getInputProps()} />

      {children || (
        <>
          {variant === 'box' ? (
            // Box variant content
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
                    <p className="text-xs text-muted-foreground">
                      Accepted formats: {formatFileTypes()}
                    </p>
                  )}
                </>
              )}
            </div>
          ) : (
            // Row variant content
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-2 rounded-full transition-colors",
                isDragActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}>
                <Upload className="h-5 w-5" />
              </div>
              {customPrompt || (
                <div>
                  <p className="text-sm">
                    {isDragActive ? "Drop files here" : "Drag and drop files here, or click to select"}
                  </p>
                  {showAcceptedFormats && (
                    <p className="text-xs text-muted-foreground">
                      Accepted formats: {formatFileTypes()}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}