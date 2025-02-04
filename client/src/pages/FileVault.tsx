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
  MinusIcon,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
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

type FileStatus = 'uploading' | 'completed' | 'paused' | 'canceled' | 'deleted' | 'restored';

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

interface FileApiResponse {
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

  const { data: files = [] } = useQuery<FileApiResponse[]>({
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
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload file",
        variant: "destructive",
        duration: 3000,
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
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete file",
        variant: "destructive",
        duration: 3000,
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await fetch(`/api/files/${fileId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to restore file');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      toast({
        title: "Success",
        description: "File restored successfully",
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to restore file. Please try again.",
        variant: "destructive",
        duration: 3000,
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

  const toggleAllFiles = (files: FileApiResponse[]) => {
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
    let result = [...(files as FileApiResponse[])];

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


  const getStatusStyles = (status: FileStatus) => {
    switch (status) {
      case 'completed':
      case 'restored':
        return "bg-[#ECFDF3] text-[#027A48] rounded-full px-2.5 py-1 text-xs font-medium";
      case 'uploading':
        return "bg-[#FFF4ED] text-[#B93815] rounded-full px-2.5 py-1 text-xs font-medium";
      case 'paused':
        return "bg-[#F2F4F7] text-[#475467] rounded-full px-2.5 py-1 text-xs font-medium";
      case 'canceled':
      case 'deleted':
        return "bg-[#FFF1F3] text-[#C01048] rounded-full px-2.5 py-1 text-xs font-medium";
      default:
        return "text-muted-foreground";
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleBulkAction = async (action: 'delete' | 'restore') => {
    try {
      const fileIds = Array.from(selectedFiles);

      if (action === 'delete') {
        await Promise.all(fileIds.map(fileId => deleteMutation.mutateAsync(fileId)));
      } else if (action === 'restore') {
        await Promise.all(fileIds.map(fileId => restoreMutation.mutateAsync(fileId)));
      }

      setSelectedFiles(new Set());
      toast({
        title: "Success",
        description: `Successfully ${action}d selected files`,
        duration: 3000,
      });
    } catch (error) {
      console.error(`Bulk ${action} error:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} selected files. Please try again.`,
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const canRestore = useMemo(() => {
    return Array.from(selectedFiles).some(fileId => {
      const file = (files as FileApiResponse[]).find(f => f.id === fileId);
      return file?.status === 'deleted';
    });
  }, [selectedFiles, files]);

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
          <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap w-full">
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as FileStatus | 'all')}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="uploading">Uploading</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
                <SelectItem value="restored">Restored</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={selectedFiles.size > 0 ? "default" : "outline"}
                  disabled={selectedFiles.size === 0}
                  className="min-w-[100px]"
                >
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canRestore ? (
                  <DropdownMenuItem onClick={() => handleBulkAction('restore')}>
                    <RefreshCcwIcon className="w-4 h-4 mr-2" />
                    Restore Selected
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => handleBulkAction('delete')}>
                    <Trash2Icon className="w-4 h-4 mr-2" />
                    Delete Selected
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="bg-background rounded-lg p-4 md:p-6 border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px]">
                    <Checkbox
                      checked={selectedFiles.size === filteredAndSortedFiles.length && filteredAndSortedFiles.length > 0}
                      data-state={selectedFiles.size > 0 && selectedFiles.size < filteredAndSortedFiles.length ? 'indeterminate' : selectedFiles.size === filteredAndSortedFiles.length ? 'checked' : 'unchecked'}
                      onCheckedChange={() => toggleAllFiles(filteredAndSortedFiles as FileApiResponse[])}
                      className={cn(
                        "transition-colors",
                        selectedFiles.size > 0 && selectedFiles.size < filteredAndSortedFiles.length &&
                        "data-[state=indeterminate]:bg-transparent data-[state=indeterminate]:border-primary"
                      )}
                    >
                      {selectedFiles.size > 0 && selectedFiles.size < filteredAndSortedFiles.length && (
                        <MinusIcon className="h-3 w-3 text-primary" />
                      )}
                    </Checkbox>
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
                      file.status === 'deleted' && "opacity-60",
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
                        <div className="w-6 h-6 rounded flex items-center justify-center bg-[hsl(230,96%,96%)]">
                          <FileIcon className="w-3 h-3 text-primary" />
                        </div>
                        <span className="truncate">{file.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{formatFileSize(file.size)}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span className={getStatusStyles(file.status)}>
                        {file.status.charAt(0).toUpperCase() + file.status.slice(1)}
                      </span>
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