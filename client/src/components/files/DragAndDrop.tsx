import { useDropzone } from "react-dropzone";
import { UploadIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DragAndDropProps {
  onDrop: (acceptedFiles: File[]) => void;
  className?: string;
  accept?: Record<string, string[]>;
  maxSize?: number;
  maxFiles?: number;
  disabled?: boolean;
  children?: React.ReactNode;
  customIcon?: React.ReactNode;
  description?: string;
  acceptedFormatsText?: string;
}

export function DragAndDrop({
  onDrop,
  className,
  accept,
  maxSize,
  maxFiles = 0,
  disabled = false,
  children,
  customIcon,
  description = "Drag and drop files here, or click to select files",
  acceptedFormatsText,
}: DragAndDropProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles,
    disabled,
    multiple: maxFiles !== 1,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors bg-white",
        isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      <input {...getInputProps()} aria-label="File upload input" />
      {children || (
        <>
          <div
            className="w-12 h-12 mx-auto mb-4 rounded-full bg-[hsl(228,89%,96%)] flex items-center justify-center"
            aria-hidden="true"
          >
            {customIcon || <UploadIcon className="w-6 h-6 text-primary" />}
          </div>
          <p className="text-muted-foreground mb-2 text-base">
            {isDragActive ? "Drop your files here" : description}
          </p>
          {acceptedFormatsText && (
            <p className="text-sm text-muted-foreground/80">
              {acceptedFormatsText}
            </p>
          )}
        </>
      )}
    </div>
  );
}
