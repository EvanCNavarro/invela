import { useState, useMemo, useRef } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
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
  RefreshCcwIcon,
  FileTextIcon,
  MoreVerticalIcon,
  SearchIcon,
  ArrowUpDownIcon,
  Trash2Icon,
  CheckCircle2Icon,
  AlertCircleIcon,
  ClockIcon,
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FileStatus = 'uploading' | 'completed' | 'paused' | 'canceled' | 'deleted';

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  status: FileStatus;
  createdAt: string;
  updatedAt: string;
  uploader?: string;
  uploadTimeMs?: number;
  downloadCount?: number;
  lastAccessed?: string;
  version?: number;
  checksum?: string;
}

type SortField = 'name' | 'size' | 'createdAt' | 'status';
type SortOrder = 'asc' | 'desc';

export default function FileVault() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusFilter, setStatusFilter] = useState<FileStatus | 'all'>('all');
  const [sortConfig, setSortConfig] = useState<{ field: SortField; order: SortOrder }>({
    field: 'createdAt',
    order: 'desc'
  });
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedFileDetails, setSelectedFileDetails] = useState<FileItem | null>(null);

  const { data: files = [] } = useQuery({
    queryKey: ['/api/files'],
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const startTime = performance.now();
      const response = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const result = await response.json();
      result.uploadTimeMs = performance.now() - startTime;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete file",
        variant: "destructive",
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (fileId: string) => {
      try {
        const response = await fetch(`/api/files/${fileId}/restore`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(error);
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return response.json();
        }

        return { success: true };
      } catch (error) {
        console.error('Restore error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      toast({
        title: "Success",
        description: "File restored successfully",
      });
    },
    onError: (error: Error) => {
      console.error('Restore error:', error);
      toast({
        title: "Error",
        description: "Failed to restore file. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const toggleAllFiles = (files: FileItem[]) => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(file => file.id)));
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append('file', file);

      const uploadId = crypto.randomUUID();
      setUploadProgress(prev => ({ ...prev, [uploadId]: 0 }));

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const currentProgress = prev[uploadId] || 0;
          if (currentProgress >= 100) {
            clearInterval(progressInterval);
            return prev;
          }
          return { ...prev, [uploadId]: Math.min(currentProgress + 10, 100) };
        });
      }, 500);

      try {
        await uploadMutation.mutateAsync(formData);
      } catch (error) {
        console.error('Upload error:', error);
      } finally {
        clearInterval(progressInterval);
        setUploadProgress(prev => ({ ...prev, [uploadId]: 100 }));
      }
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
    let result = [...(files as FileItem[])];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(file =>
        file.name.toLowerCase().includes(query) ||
        file.status.toLowerCase().includes(query)
      );
    }

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
  }, [files, statusFilter, sortConfig, searchQuery]);

  const getStatusIcon = (status: FileStatus) => {
    switch (status) {
      case 'uploading':
        return <ClockIcon className="w-4 h-4 text-primary animate-spin" />;
      case 'completed':
        return <CheckCircle2Icon className="w-4 h-4 text-success" />;
      case 'paused':
        return <AlertCircleIcon className="w-4 h-4 text-warning" />;
      case 'canceled':
        return <AlertCircleIcon className="w-4 h-4 text-danger" />;
      case 'deleted':
        return <Trash2Icon className="w-4 h-4 text-danger" />;
      default:
        return null;
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold mb-1">File Vault</h1>
            <p className="text-sm text-muted-foreground">
              Secure document storage for your company.
            </p>
          </div>
          <Button onClick={handleUploadClick} className="gap-2">
            <UploadIcon className="w-4 h-4" />
            Upload
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  onDrop(Array.from(e.target.files));
                }
              }}
              multiple
            />
          </Button>
        </div>

        <FileUpload onDrop={onDrop} className="bg-muted/50" />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-72">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

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

        <div className="bg-background rounded-lg p-4 md:p-6 border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px]">
                    <Checkbox
                      checked={selectedFiles.size === filteredAndSortedFiles.length && filteredAndSortedFiles.length > 0}
                      indeterminate={selectedFiles.size > 0 && selectedFiles.size < filteredAndSortedFiles.length}
                      onCheckedChange={() => toggleAllFiles(filteredAndSortedFiles)}
                    />
                  </TableHead>
                  <TableHead className="min-w-[200px] lg:w-[400px] text-left">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('name')}
                      className="hover:bg-muted/50 text-left pl-0 gap-1 transition-colors"
                    >
                      Name
                      <ArrowUpDownIcon className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell text-left">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('size')}
                      className="hover:bg-muted/50 text-left pl-0 gap-1 transition-colors"
                    >
                      Size
                      <ArrowUpDownIcon className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell text-left">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('createdAt')}
                      className="hover:bg-muted/50 text-left pl-0 gap-1 transition-colors whitespace-nowrap"
                    >
                      Upload Date
                      <ArrowUpDownIcon className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-left">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('status')}
                      className="hover:bg-muted/50 text-left pl-0 gap-1 transition-colors"
                    >
                      Status
                      <ArrowUpDownIcon className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[60px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedFiles.map((file) => (
                  <TableRow
                    key={file.id}
                    className={cn(
                      file.status === 'deleted' && "opacity-50",
                      selectedFiles.has(file.id) && "bg-muted/50"
                    )}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedFiles.has(file.id)}
                        onCheckedChange={() => toggleFileSelection(file.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded flex items-center justify-center bg-[hsl(230,96%,96%)]">
                          <FileIcon className="w-4 h-4 text-primary" />
                        </div>
                        <span className="truncate">{file.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{formatFileSize(file.size)}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getStatusIcon(file.status)}
                        <span className="capitalize min-w-[80px]">{file.status}</span>
                        {file.status === 'uploading' && uploadProgress[file.id] !== undefined && (
                          <div className="hidden sm:flex items-center gap-2 min-w-[120px]">
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
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="hover:bg-muted/80 transition-colors rounded-full"
                          >
                            <MoreVerticalIcon className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedFileDetails(file)}>
                            <FileTextIcon className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {file.status === 'deleted' ? (
                            <DropdownMenuItem onClick={() => restoreMutation.mutate(file.id)}>
                              <RefreshCcwIcon className="w-4 h-4 mr-2" />
                              Restore
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteMutation.mutate(file.id)}
                            >
                              <Trash2Icon className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
      </div>

      <Dialog open={!!selectedFileDetails} onOpenChange={() => setSelectedFileDetails(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>File Details</DialogTitle>
          </DialogHeader>
          {selectedFileDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">File Name</p>
                  <p className="mt-1">{selectedFileDetails.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Size</p>
                  <p className="mt-1">{formatFileSize(selectedFileDetails.size)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Upload Date</p>
                  <p className="mt-1">{new Date(selectedFileDetails.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <p className="mt-1 capitalize">{selectedFileDetails.status}</p>
                </div>
                {selectedFileDetails.uploader && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Uploaded By</p>
                    <p className="mt-1">{selectedFileDetails.uploader}</p>
                  </div>
                )}
                {selectedFileDetails.uploadTimeMs && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Upload Time</p>
                    <p className="mt-1">{(selectedFileDetails.uploadTimeMs / 1000).toFixed(2)}s</p>
                  </div>
                )}
                {selectedFileDetails.downloadCount !== undefined && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Downloads</p>
                    <p className="mt-1">{selectedFileDetails.downloadCount}</p>
                  </div>
                )}
                {selectedFileDetails.lastAccessed && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Accessed</p>
                    <p className="mt-1">{new Date(selectedFileDetails.lastAccessed).toLocaleString()}</p>
                  </div>
                )}
                {selectedFileDetails.version !== undefined && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Version</p>
                    <p className="mt-1">{selectedFileDetails.version}</p>
                  </div>
                )}
                {selectedFileDetails.checksum && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Checksum</p>
                    <p className="mt-1 font-mono text-xs break-all">{selectedFileDetails.checksum}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}