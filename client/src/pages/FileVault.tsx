import { useState, useMemo, useRef, useEffect } from "react";
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
  ArrowUpIcon,
  ArrowDownIcon,
  Trash2Icon,
  MinusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import React from 'react';

type FileStatus = 'uploading' | 'uploaded' | 'paused' | 'canceled' | 'deleted' | 'restored';

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

  // New suggested metrics
  // File lifecycle tracking
  expiryDate?: string;               // Optional expiration date for temporary files
  retentionPeriod?: number;          // How long to keep the file in days
  lastModifiedBy?: string;           // User who last modified the file
  modificationHistory?: string[];     // Array of modification timestamps

  // Security and compliance
  accessLevel?: 'public' | 'private' | 'restricted';  // File visibility level
  encryptionStatus?: boolean;        // Whether file is encrypted
  classificationType?: string;       // e.g., 'confidential', 'internal', 'public'
  complianceTags?: string[];        // e.g., ['GDPR', 'HIPAA', 'PCI']

  // Access patterns
  lastDownloadDate?: string;        // Date of last download
  uniqueViewers?: number;           // Number of unique users who viewed
  averageViewDuration?: number;     // Average time spent viewing (for viewable files)
  peakAccessTimes?: string[];      // Times of high access frequency

  // Storage optimization
  compressionRatio?: number;        // Compression effectiveness
  duplicateCount?: number;          // Number of duplicate copies
  storageLocation?: string;         // e.g., 'hot-storage', 'cold-storage'
  storageOptimizationFlag?: boolean; // Whether file needs optimization

  // Collaboration
  sharedWith?: string[];           // List of users with access
  collaboratorCount?: number;      // Number of users with access
  commentCount?: number;           // Number of comments/annotations
  lastCollaborationDate?: string;  // Last collaborative action date
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

interface UploadingFile extends Omit<FileItem, 'id'> {
  id: string;
  progress: number;
}

// Simplified status styles function
const getStatusStyles = (status: FileStatus) => {
  const baseStyles = "rounded-full px-2.5 py-1 text-xs font-medium";
  const statusMap = {
    uploaded: "bg-[#ECFDF3] text-[#027A48]",
    restored: "bg-[#ECFDF3] text-[#027A48]",
    uploading: "bg-[#FFF4ED] text-[#B93815]",
    paused: "bg-[#F2F4F7] text-[#344054]", // Improved contrast from #475467
    canceled: "bg-[#FFF1F3] text-[#C01048]",
    deleted: "bg-[#FFF1F3] text-[#C01048]"
  };
  return `${baseStyles} ${statusMap[status] || "text-muted-foreground"}`;
};

// File name cell with improved accessibility
const FileNameCell = React.memo(({ file }: { file: FileApiResponse | UploadingFile }) => {
  const nameRef = useRef<HTMLSpanElement>(null);
  const [isTextTruncated, setIsTextTruncated] = useState(false);

  useEffect(() => {
    if (nameRef.current) {
      setIsTextTruncated(nameRef.current.scrollWidth > nameRef.current.clientWidth);
    }
  }, []);

  return (
    <div className="flex items-center gap-2 min-w-0 max-w-[18.25rem]" role="cell">
      <div 
        className="w-6 h-6 rounded flex items-center justify-center bg-[hsl(230,96%,96%)] flex-shrink-0"
        aria-hidden="true"
      >
        <FileIcon className="w-3 h-3 text-primary" />
      </div>
      {isTextTruncated ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span 
                ref={nameRef} 
                className="truncate block min-w-0 flex-1"
                aria-label={`File name: ${file.name}`}
              >
                {file.name}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{file.name}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <span 
          ref={nameRef} 
          className="truncate block min-w-0 flex-1"
          aria-label={`File name: ${file.name}`}
        >
          {file.name}
        </span>
      )}
    </div>
  );
});

FileNameCell.displayName = 'FileNameCell';

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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

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

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Invalid JSON response:', text);
        throw new Error('Server returned an invalid response format');
      }

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to restore file');
      }

      return data;
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
      console.error('Restore error:', error);
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

  const toggleAllFiles = (files: (FileApiResponse | UploadingFile)[]) => {
    setSelectedFiles(prev => {
      if (prev.size === files.length) {
        return new Set();
      }
      return new Set(files.map(file => file.id));
    });
  };

  const onDrop = async (acceptedFiles: File[]) => {
    const newUploadingFiles = acceptedFiles.map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: 0
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    for (const file of acceptedFiles) {
      const uploadId = newUploadingFiles.find(f => f.name === file.name)?.id;
      const formData = new FormData();
      formData.append('file', file);

      const progressInterval = setInterval(() => {
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === uploadId
              ? { ...f, progress: Math.min((f.progress || 0) + 10, 100) }
              : f
          )
        );
      }, 500);

      try {
        await uploadMutation.mutateAsync(formData);
        setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
      } catch (error) {
        console.error('Upload error:', error);
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === uploadId ? { ...f, status: 'canceled' } : f
          )
        );
      } finally {
        clearInterval(progressInterval);
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

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) return <ArrowUpDownIcon className="h-4 w-4 text-muted-foreground" />;
    return sortConfig.order === 'asc' ?
      <ArrowUpIcon className="h-4 w-4 text-primary" /> :
      <ArrowDownIcon className="h-4 w-4 text-primary" />;
  };

  const allFiles = useMemo(() => {
    return [
      ...uploadingFiles,
      ...(files as FileApiResponse[])
    ];
  }, [files, uploadingFiles]);

  const filteredAndSortedFiles = useMemo(() => {
    let result = [...allFiles];

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
  }, [allFiles, statusFilter, sortConfig, searchQuery]);

  const paginatedFiles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedFiles.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedFiles, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedFiles.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
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
        for (const fileId of fileIds) {
          const response = await fetch(`/api/files/${fileId}/restore`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          const text = await response.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch (e) {
            console.error('Invalid JSON response:', text);
            throw new Error('Server returned an invalid response format');
          }

          if (!response.ok) {
            throw new Error(data?.message || `Failed to restore file ${fileId}`);
          }
        }

        queryClient.invalidateQueries({ queryKey: ['/api/files'] });
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
        description: error instanceof Error ? error.message : `Failed to ${action} selected files. Please try again.`,
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const canRestore = useMemo(() => {
    return Array.from(selectedFiles).some(fileId => {
      const file = allFiles.find(f => f.id === fileId);
      return file?.status === 'deleted';
    });
  }, [selectedFiles, allFiles]);

  return (
    <DashboardLayout>
      <TooltipProvider>
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-semibold mb-1">File Vault</h1>
              <p className="text-sm text-muted-foreground">
                Secure document storage for your company.
              </p>
            </div>
            <Button 
              onClick={handleUploadClick} 
              className="gap-2"
              aria-label="Upload new files"
            >
              <UploadIcon className="w-4 h-4" aria-hidden="true" />
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
                aria-hidden="true"
              />
            </Button>
          </div>

          <FileUpload onDrop={onDrop} className="bg-muted/50" />

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap w-full">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as FileStatus | 'all')}
                aria-label="Filter files by status"
              >
                <SelectTrigger className="w-[150px] bg-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="uploaded">Uploaded</SelectItem>
                  <SelectItem value="restored">Restored</SelectItem>
                  <SelectItem value="uploading">Uploading</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  className="pl-9 bg-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search files"
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

          <div>
            <div className="w-full border rounded-lg overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b hover:bg-transparent">
                      <TableHead className="w-8 min-w-8 max-w-8 bg-muted text-center">
                        <Checkbox
                          checked={selectedFiles.size === filteredAndSortedFiles.length && filteredAndSortedFiles.length > 0}
                          onCheckedChange={() => toggleAllFiles(filteredAndSortedFiles)}
                        />
                      </TableHead>
                      <TableHead className="w-[18.25rem] min-w-[18.25rem] max-w-[18.25rem] bg-muted overflow-hidden">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('name')}
                          className={cn(
                            "hover:bg-muted text-left pl-0 gap-1 transition-colors overflow-hidden",
                            sortConfig.field === 'name' && "text-primary"
                          )}
                        >
                          Name
                          {getSortIcon('name')}
                        </Button>
                      </TableHead>
                      <TableHead className="w-fit min-w-[8.5rem] hidden xl:table-cell bg-muted text-right">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('createdAt')}
                          className={cn(
                            "hover:bg-muted text-right pr-0 gap-1 transition-colors whitespace-nowrap",
                            sortConfig.field === 'createdAt' && "text-primary"
                          )}
                        >
                          Upload Date
                          {getSortIcon('createdAt')}
                        </Button>
                      </TableHead>
                      <TableHead className="w-[9rem] min-w-[9rem] hidden lg:table-cell bg-muted text-center">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('status')}
                          className={cn(
                            "hover:bg-muted justify-center gap-1 transition-colors",
                            sortConfig.field === 'status' && "text-primary"
                          )}
                        >
                          Status
                          {getSortIcon('status')}
                        </Button>
                      </TableHead>
                      <TableHead className="w-fit min-w-[5.5rem] hidden xl:table-cell bg-muted text-right">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('size')}
                          className={cn(
                            "hover:bg-muted text-right pr-0 gap-1 transition-colors",
                            sortConfig.field === 'size' && "text-primary"
                          )}
                        >
                          Size
                          {getSortIcon('size')}
                        </Button>
                      </TableHead>
                      <TableHead className="w-8 min-w-8 max-w-8 bg-muted text-center">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedFiles.map((file) => (
                      <TableRow
                        key={file.id}
                        className={cn(
                          "border-b transition-colors",
                          file.status === 'deleted' && "opacity-60",
                          selectedFiles.has(file.id) && "bg-muted/50"
                        )}
                      >
                        <TableCell className="text-center">
                          <Checkbox
                            checked={selectedFiles.has(file.id)}
                            onCheckedChange={() => toggleFileSelection(file.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <FileNameCell file={file} />
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-right">
                          {new Date(file.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-center">
                          <span className={getStatusStyles(file.status)}>
                            {file.status.charAt(0).toUpperCase() + file.status.slice(1)}
                          </span>
                          {'progress' in file && file.status === 'uploading' && (
                            <div className="flex items-center gap-2 mt-1">
                              <Progress value={file.progress} className="h-2" />
                              <span className="text-xs text-muted-foreground">
                                {Math.round(file.progress)}%
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-right">
                          {formatFileSize(file.size)}
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-muted/80 transition-colors rounded-full mx-auto"
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
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between px-4 py-3 bg-muted border-t">
                <div className="flex-1 text-sm text-muted-foreground">
                  {filteredAndSortedFiles.length > 0 && (
                    filteredAndSortedFiles.length <= 5 ? (
                      `Showing ${filteredAndSortedFiles.length} ${filteredAndSortedFiles.length === 1 ? 'file' : 'files'}`
                    ) : (
                      `Showing ${Math.min((currentPage - 1) * itemsPerPage + 1, filteredAndSortedFiles.length)}-${Math.min(currentPage * itemsPerPage, filteredAndSortedFiles.length)} of ${filteredAndSortedFiles.length} files`
                    )
                  )}
                </div>
                {filteredAndSortedFiles.length > 5 && (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      className="hidden sm:inline-flex"
                    >
                      <ChevronsLeftIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          const distance = Math.abs(page - currentPage);
                          return distance === 0 || distance === 1 || page === 1 || page === totalPages;
                        })
                        .map((page, index, array) => (
                          <React.Fragment key={page}>
                            {index > 0 && array[index - 1] !== page - 1 && (
                              <span className="text-muted-foreground">...</span>
                            )}
                            <Button
                              variant={currentPage === page ? "default" : "outline"}
                              size="icon"
                              onClick={() => handlePageChange(page)}
                              className="w-8 h-8"
                            >
                              {page}
                            </Button>
                          </React.Fragment>
                        ))}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRightIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                      className="hidden sm:inline-flex"
                    >
                      <ChevronsRightIcon className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Dialog open={!!selectedFileDetails} onOpenChange={() => setSelectedFileDetails(null)}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>File Details</DialogTitle>
              </DialogHeader>
              {selectedFileDetails && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>
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
                        <p className="text-sm font-medium text-muted-foreground">Type</p>
                        <p className="mt-1">{selectedFileDetails.type}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Status</p>
                        <p className="mt-1 capitalize">{selectedFileDetails.status}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Upload Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Upload Date</p>
                        <p className="mt-1">{new Date(selectedFileDetails.createdAt).toLocaleString()}</p>
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
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Access Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedFileDetails.downloadCount !== undefined && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Downloads</p>
                          <p className="mt-1">{selectedFileDetails.downloadCount}</p>                        </div>
                      )}
                      {selectedFileDetails.lastAccessed && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Last Accessed</p>
                          <p className="mt-1">{new Date(selectedFileDetails.lastAccessed).toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {(selectedFileDetails.version !== undefined || selectedFileDetails.checksum) && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground">Technical Details</h3>
                      <div className="grid grid-cols-2 gap-4">
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
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </DashboardLayout>  );
}