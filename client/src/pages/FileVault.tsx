import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileIcon, UploadIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
}

export default function FileVault() {
  const [files, setFiles] = useState<FileItem[]>([]);
  
  const onDrop = (acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date(),
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">File Vault</h1>
        <p className="text-muted-foreground">
          Securely store and manage your company documents
        </p>
      </div>

      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
        )}
      >
        <input {...getInputProps()} />
        <UploadIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">
          {isDragActive
            ? "Drop your files here"
            : "Drag and drop files here, or click to select files"}
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[400px]">Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <FileIcon className="w-4 h-4" />
                    {file.name}
                  </div>
                </TableCell>
                <TableCell>{file.type || "Unknown"}</TableCell>
                <TableCell>{formatFileSize(file.size)}</TableCell>
                <TableCell>
                  {file.uploadedAt.toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setFiles(files.filter(f => f.id !== file.id));
                    }}
                  >
                    <Trash2Icon className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {files.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No files uploaded
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
