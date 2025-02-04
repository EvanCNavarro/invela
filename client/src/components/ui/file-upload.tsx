import { useDropzone } from "react-dropzone";
import { UploadIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onDrop: (acceptedFiles: File[]) => void;
  className?: string;
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
  'application/x-wpwin': ['.wpf']
};

export function FileUpload({ onDrop, className }: FileUploadProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: Object.keys(ACCEPTED_FILE_TYPES).map(key => ACCEPTED_FILE_TYPES[key].join(',')).join(',')
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
        isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
        className
      )}
    >
      <input {...getInputProps()} />
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[hsl(228,89%,96%)] flex items-center justify-center">
        <UploadIcon className="w-6 h-6 text-primary" />
      </div>
      <p className="text-muted-foreground mb-2">
        {isDragActive ? "Drop your files here" : "Drag and drop files here, or click to select files"}
      </p>
      <p className="text-sm text-muted-foreground/80">
        Accepted formats: CSV, DOC, DOCX, ODT, PDF, RTF, TXT, WPD, WPF
      </p>
    </div>
  );
}