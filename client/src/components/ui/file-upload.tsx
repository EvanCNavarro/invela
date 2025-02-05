import { useDropzone } from "react-dropzone";
import { UploadIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface FileUploadProps {
  onDrop: (acceptedFiles: File[]) => void;
  className?: string;
  disabled?: boolean;
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
  'application/wordperfect': ['.wpd'],
  'application/x-wpwin': ['.wpf'],
  // Add image support
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg']
};

export const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(
  ({ onDrop, className, disabled }, ref) => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
      onDrop,
      accept: ACCEPTED_FILE_TYPES,
      disabled,
      multiple: true
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
        tabIndex={0}
      >
        <input {...getInputProps({ ref })} aria-label="File upload input" />
        <div 
          className="w-12 h-12 mx-auto mb-4 rounded-full bg-[hsl(228,89%,96%)] flex items-center justify-center"
          aria-hidden="true"
        >
          <UploadIcon className="w-6 h-6 text-primary" />
        </div>
        <p 
          className="text-muted-foreground mb-2 text-base"
        >
          {isDragActive ? "Drop your files here" : "Drag and drop files here, or click to select files"}
        </p>
        <p className="text-sm text-muted-foreground/80">
          Accepted formats: CSV, DOC, DOCX, ODT, PDF, RTF, TXT, WPD, WPF, JPG, PNG, GIF, WEBP, SVG
        </p>
      </div>
    );
  }
);

FileUpload.displayName = "FileUpload";