import { useState, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  FileIcon, 
  UploadIcon, 
  Trash2Icon,
  CheckCircleIcon,
  PauseIcon,
  XCircleIcon,
  ArrowUpDownIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type FileStatus = 'uploading' | 'completed' | 'paused' | 'canceled' | 'deleted';

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  status: FileStatus;
  progress: number;
}

type SortField = 'name' | 'size' | 'uploadedAt' | 'status';
type SortOrder = 'asc' | 'desc';

export default function FileVault() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<FileStatus | 'all'>('all');
  const [sortConfig, setSortConfig] = useState<{ field: SortField; order: SortOrder }>({
    field: 'uploadedAt',
    order: 'desc'
  });

  const onDrop = (acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date(),
      status: 'uploading' as FileStatus,
      progress: 0,
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Simulate file upload progress for each file
    newFiles.forEach(file => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setFiles(prev => 
            prev.map(f => 
              f.id === file.id 
                ? { ...f, status: 'completed' as FileStatus, progress: 100 }
                : f
            )
          );
        } else {
          setFiles(prev => 
            prev.map(f => 
              f.id === file.id 
                ? { ...f, progress: Math.round(progress) }
                : f
            )
          );
        }
      }, 500);
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredAndSortedFiles = useMemo(() => {
    let result = [...files];

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(file => file.status === statusFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      const modifier = sortConfig.order === 'asc' ? 1 : -1;
      switch (sortConfig.field) {
        case 'name':
          return modifier * a.name.localeCompare(b.name);
        case 'size':
          return modifier * (a.size - b.size);
        case 'uploadedAt':
          return modifier * (a.uploadedAt.getTime() - b.uploadedAt.getTime());
        case 'status':
          return modifier * a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return result;
  }, [files, statusFilter, sortConfig]);

  const getStatusIcon = (status: FileStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'uploading':
        return <UploadIcon className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'paused':
        return <PauseIcon className="w-4 h-4 text-yellow-500" />;
      case 'canceled':
      case 'deleted':
        return <XCircleIcon className="w-4 h-4 text-red-500" />;
    }
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

      <div className="flex justify-end mb-4">
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as FileStatus | 'all')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="uploading">Uploading</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[400px]">
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('name')}
                  className="hover:bg-transparent"
                >
                  Name
                  <ArrowUpDownIcon className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('size')}
                  className="hover:bg-transparent"
                >
                  Size
                  <ArrowUpDownIcon className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('uploadedAt')}
                  className="hover:bg-transparent"
                >
                  Upload Date
                  <ArrowUpDownIcon className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('status')}
                  className="hover:bg-transparent"
                >
                  Status
                  <ArrowUpDownIcon className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedFiles.map((file) => (
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
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(file.status)}
                    <span className="capitalize">{file.status}</span>
                    {file.status === 'uploading' && (
                      <Progress value={file.progress} className="w-[60px]" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setFiles(files.map(f => 
                        f.id === file.id 
                          ? { ...f, status: 'deleted' }
                          : f
                      ));
                    }}
                  >
                    <Trash2Icon className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredAndSortedFiles.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No files {statusFilter !== 'all' ? `with status "${statusFilter}"` : 'uploaded'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}