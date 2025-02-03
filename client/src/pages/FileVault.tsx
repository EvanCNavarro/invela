import { useState, useMemo } from "react";
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
import { FileUpload } from "@/components/ui/file-upload";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type FileStatus = 'uploading' | 'completed' | 'paused' | 'canceled' | 'deleted';

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  status: FileStatus;
  createdAt: string;
  updatedAt: string;
}

type SortField = 'name' | 'size' | 'createdAt' | 'status';
type SortOrder = 'asc' | 'desc';

export default function FileVault() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<FileStatus | 'all'>('all');
  const [sortConfig, setSortConfig] = useState<{ field: SortField; order: SortOrder }>({
    field: 'createdAt',
    order: 'desc'
  });
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const { data: files = [] } = useQuery<FileItem[]>({
    queryKey: ['/api/files'],
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const fileId = crypto.randomUUID();

      // Start with 0 progress
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const currentProgress = prev[fileId] || 0;
          if (currentProgress >= 100) {
            clearInterval(progressInterval);
            return prev;
          }
          return { ...prev, [fileId]: Math.min(currentProgress + 10, 100) };
        });
      }, 500);

      try {
        const response = await apiRequest('/api/files', {
          method: 'POST',
          body: formData,
        });

        clearInterval(progressInterval);
        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));

        return response;
      } catch (error) {
        clearInterval(progressInterval);
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await apiRequest(`/api/files/${fileId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
    },
  });

  const onDrop = async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      await uploadMutation.mutateAsync(formData);
    }
  };

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

    if (statusFilter !== 'all') {
      result = result.filter(file => file.status === statusFilter);
    }

    result.sort((a, b) => {
      const modifier = sortConfig.order === 'asc' ? 1 : -1;
      switch (sortConfig.field) {
        case 'name':
          return modifier * a.name.localeCompare(b.name);
        case 'size':
          return modifier * (a.size - b.size);
        case 'createdAt':
          return modifier * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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
      default:
        return null; // Handle unknown status
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">File Vault</h1>
        <p className="text-muted-foreground">
          Securely store and manage your company documents
        </p>
      </div>

      <FileUpload onDrop={onDrop} />

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
                  onClick={() => handleSort('createdAt')}
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
                    <div className="w-8 h-8 rounded flex items-center justify-center bg-[hsl(230,96%,96%)]">
                      <FileIcon className="w-4 h-4 text-primary" />
                    </div>
                    {file.name}
                  </div>
                </TableCell>
                <TableCell>{file.type || "Unknown"}</TableCell>
                <TableCell>{formatFileSize(file.size)}</TableCell>
                <TableCell>
                  {new Date(file.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {getStatusIcon(file.status)}
                    <span className="capitalize min-w-[80px]">{file.status}</span>
                    {file.status === 'uploading' && uploadProgress[file.id] !== undefined && (
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress 
                          value={uploadProgress[file.id]} 
                          className="h-2 bg-primary/20"
                        />
                        <span className="text-sm text-muted-foreground min-w-[40px]">
                          {uploadProgress[file.id]}%
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(file.id)}
                    disabled={file.status === 'deleted'}
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