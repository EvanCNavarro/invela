import { useDropzone } from "react-dropzone";
import { UploadIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onDrop: (acceptedFiles: File[]) => void;
  className?: string;
}

const ACCEPTED_FILE_TYPES = {
  'text/csv': '.csv',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.oasis.opendocument.text': '.odt',
  'application/pdf': '.pdf',
  'application/rtf': '.rtf',
  'text/plain': '.txt',
  'application/wordperfect': '.wpd',
  'application/x-wpwin': '.wpf'
};

export function FileUpload({ onDrop, className }: FileUploadProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: ACCEPTED_FILE_TYPES
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
      <UploadIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
      <p className="text-muted-foreground mb-2">
        {isDragActive ? "Drop your files here" : "Drag and drop files here, or click to select files"}
      </p>
      <p className="text-sm text-muted-foreground">
        Accepted file types: CSV, DOC, DOCX, ODT, PDF, RTF, TXT, WPD, WPF
      </p>
    </div>
  );
}
