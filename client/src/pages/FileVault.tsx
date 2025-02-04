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
  ShieldIcon,
  BarChart2Icon,
  ClockIcon,
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
import Spinner from "@/components/ui/spinner";


type FileStatus = 'uploading' | 'uploaded' | 'paused' | 'canceled' | 'deleted' | 'restored';

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  status: FileStatus;
  createdAt: string;
  updatedAt: string;
  uploadTime: string;  // New field for upload time
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
  uploadTime: string;  // Added to match FileItem
  uploader?: string;
  uploadTimeMs?: number;
  downloadCount?: number;
  lastAccessed?: string;
  version?: number;
  checksum?: string;
  // Add other optional fields...
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
    <div className="flex items-center gap-2 min-w-0 max-w-[14rem]" role="cell">
      <div
        className="w-6 h-6 rounded flex items-center justify-center bg-[hsl(230,96%,96%)] flex-shrink-0"
        aria-hidden="true"
      >
        <FileIcon className="w-3 h-3 text-primary" />
      </div>
      <span
        ref={nameRef}
        className="truncate block min-w-0 flex-1"
        aria-label={`File name: ${file.name}`}
      >
        {file.name}
      </span>
      {isTextTruncated && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="sr-only">Show full file name</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{file.name}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
});

FileNameCell.displayName = 'FileNameCell';

// Update the column priorities to match the new order
const columnPriorities = {
  fileName: 0,      // Always visible
  size: 1,         // First to show
  uploadDate: 2,    // Second to show
  uploadTime: 3,    // Third to show
  status: 4,        // Fourth to show
  actions: 0,       // Always visible
  textPreview: 5,   // Last to show
} as const;

// Add useBreakpoint hook for responsive design
const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return window.innerWidth;
  });

  useEffect(() => {
    const handleResize = () => {
      setBreakpoint(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
};

// Update the timezone formatting helper
const formatTimeWithZone = (date: Date) => {
  // Format time with timezone abbreviation
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timeZoneName: 'short' // Shows 'ET', 'CT', 'PT', etc.
  }).format(date);
};

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
  const breakpoint = useBreakpoint();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Added state for sidebar collapse

  // Move FileActions component inside to access state
  const FileActions = ({ file, onDelete }: { file: FileItem, onDelete: (fileId: string) => void }) => {
    return (
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
              onClick={() => onDelete(file.id)}
            >
              <Trash2Icon className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Update getVisibleColumns for better space usage
  const getVisibleColumns = () => {
    const minWidth = 480; // Even smaller threshold
    const columnWidth = 60; // More compact
    const sidebarWidth = isSidebarCollapsed ? 64 : 256;
    const availableSpace = Math.max(0, breakpoint - minWidth - sidebarWidth);
    const maxColumns = Math.floor(availableSpace / columnWidth);

    // Always show priority 0 columns
    const visibleColumns = new Set(['fileName', 'actions']);

    // Add columns based on priority until we run out of space
    const priorityOrder = ['size', 'uploadDate', 'uploadTime', 'status'];

    for (let i = 0; i < Math.min(maxColumns, priorityOrder.length); i++) {
      visibleColumns.add(priorityOrder[i]);
    }

    return visibleColumns;
  };

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
      uploadTime: new Date().toISOString(), //Added for new field
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
        const uploadedFile = await uploadMutation.mutateAsync(formData);
        setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
        // Update uploadTime in the state after successful upload
        queryClient.setQueryData(['/api/files'], oldFiles => {
          return [...oldFiles, {...uploadedFile, uploadTime: new Date(uploadedFile.uploadTimeMs!).toISOString()}]
        })
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

  const handleDelete = (fileId: string) => {
    deleteMutation.mutate(fileId);
  };

  // Update the visibility logic in the component
  const visibleColumns = getVisibleColumns();

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
                    Bulk Actions
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
              <div className="relative w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[2rem] min-w-[2rem] bg-muted text-center sticky left-0 z-20">
                        <Checkbox
                          checked={selectedFiles.size === filteredAndSortedFiles.length && filteredAndSortedFiles.length > 0}
                          onCheckedChange={() => toggleAllFiles(filteredAndSortedFiles)}
                        />
                      </TableHead>
                      <TableHead className="w-[14rem] min-w-[14rem] bg-muted sticky left-[2rem] z-20">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('name')}
                          className="flex items-center gap-1 whitespace-nowrap"
                        >
                          Name {getSortIcon('name')}
                        </Button>
                      </TableHead>
                      {visibleColumns.has('size') && (
                        <TableHead className="w-[8rem] min-w-[8rem] bg-muted text-right">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('size')}
                            className="flex items-center gap-1 ml-auto whitespace-nowrap"
                          >
                            Size {getSortIcon('size')}
                          </Button>
                        </TableHead>
                      )}
                      {visibleColumns.has('uploadDate') && (
                        <TableHead className="w-[10rem] min-w-[10rem] bg-muted text-right">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('createdAt')}
                            className="flex items-center gap-1 ml-auto whitespace-nowrap"
                          >
                            Upload Date {getSortIcon('createdAt')}
                          </Button>
                        </TableHead>
                      )}
                      {visibleColumns.has('uploadTime') && (
                        <TableHead className="w-[8rem] min-w-[8rem] bg-muted text-right">
                          <span className="whitespace-nowrap">Time</span>
                        </TableHead>
                      )}
                      {visibleColumns.has('status') && (
                        <TableHead className="w-[8rem] min-w-[8rem] bg-muted text-center">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('status')}
                            className="flex items-center gap-1 mx-auto whitespace-nowrap"
                          >
                            Status {getSortIcon('status')}
                          </Button>
                        </TableHead>
                      )}
                      <TableHead className="w-[4rem] min-w-[4rem] bg-muted text-center sticky right-0 z-20">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedFiles.map((file) => (
                      <TableRow key={file.id} className="bg-white hover:bg-muted/50 transition-colors">
                        <TableCell className="text-center sticky left-0 z-20 bg-inherit">
                          <Checkbox
                            checked={selectedFiles.has(file.id)}
                            onCheckedChange={() => toggleFileSelection(file.id)}
                          />
                        </TableCell>
                        <TableCell className="sticky left-[2rem] z-20 bg-inherit">
                          <FileNameCell file={file} />
                        </TableCell>
                        {visibleColumns.has('size') && (
                          <TableCell className="text-right bg-inherit">
                            {formatFileSize(file.size)}
                          </TableCell>
                        )}
                        {visibleColumns.has('uploadDate') && (
                          <TableCell className="text-right bg-inherit">
                            {new Date(file.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </TableCell>
                        )}
                        {visibleColumns.has('uploadTime') && (
                          <TableCell className="text-right bg-inherit">
                            {formatTimeWithZone(new Date(file.uploadTime))}
                          </TableCell>
                        )}
                        {visibleColumns.has('status') && (
                          <TableCell className="text-center bg-inherit">
                            <span className={getStatusStyles(file.status)}>
                              {file.status.charAt(0).toUpperCase() + file.status.slice(1)}
                            </span>
                          </TableCell>
                        )}
                        <TableCell className="text-center sticky right-0 z-20 bg-inherit">
                          <FileActions file={file} onDelete={handleDelete} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

            </div>

          </div>

          <div>
            <Dialog open={!!selectedFileDetails} onOpenChange={() => setSelectedFileDetails(null)}>
              <DialogContent
                className="max-w-2xl w-full p-6 gap-6"
              >
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold">File Details</DialogTitle>
                </DialogHeader>
                {selectedFileDetails && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* File Overview */}
                    <div className="p-4 rounded-lg bg-muted/30 border border-border">
                      <div className="flex items-center gap-2 mb-4">
                        <FileIcon className="w-4 h-4 text-foreground" />
                        <h3 className="text-sm font-medium">File Overview</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Name</p>
                          <p className="mt-1 truncate">{selectedFileDetails.name}</p>
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

                    {/* Timeline */}
                    <div className="p-4 rounded-lg bg-muted/30 border border-border">
                      <div className="flex items-center gap-2 mb-4">
                        <ClockIcon className="w-4 h-4 text-green-600" />
                        <h3 className="text-sm font-medium text-green-600">Timeline</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Created</p>
                          <p className="mt-1">{new Date(selectedFileDetails.createdAt).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Upload Time</p>
                          <p className="mt-1">{formatTimeWithZone(new Date(selectedFileDetails.uploadTime))}</p>
                        </div>                        {selectedFileDetails.lastAccessed && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Last Accessed</p>
                            <p className="mt-1">{new Date(selectedFileDetails.lastAccessed).toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Security & Access */}
                    <div className="p-4 rounded-lg bg-muted/30 border border-border">
                      <div className="flex items-center gap-2 mb-4">
                        <ShieldIcon className="w-4 h-4 text-amber-600" />
                        <h3 className="text-sm font-medium text-amber-600">Security & Access</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Access Level</p>
                          <p className="mt-1 capitalize">{selectedFileDetails.accessLevel || 'private'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Classification</p>
                          <p className="mt-1 capitalize">{selectedFileDetails.classificationType || 'internal'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Encryption</p>
                          <p className="mt-1">{selectedFileDetails.encryptionStatus ? 'Encrypted' : 'Not Encrypted'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Storage</p>
                          <p className="mt-1 capitalize">{selectedFileDetails.storageLocation?.replace('-', ' ') || 'hot storage'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Activity & Usage */}
                    <div className="p-4 rounded-lg bg-muted/30 border border-border">
                      <div className="flex items-center gap-2 mb-4">
                        <BarChart2Icon className="w-4 h-4 text-blue-600" />
                        <h3 className="text-sm font-medium text-blue-600">Activity & Usage</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Downloads</p>
                          <p className="mt-1">{selectedFileDetails.downloadCount || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Unique Views</p>
                          <p className="mt-1">{selectedFileDetails.uniqueViewers || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Version</p>
                          <p className="mt-1">v{selectedFileDetails.version || '1.0'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Retention</p>
                          <p className="mt-1">{selectedFileDetails.retentionPeriod || 365} days</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}

// New component for file preview
const FilePreview = ({ fileId }: { fileId: string }) => {
  const { data: previewData } = useQuery({
    queryKey: [`/api/files/${fileId}/preview`],
    enabled: !!fileId,
  });

  if (!previewData) {
    return <div className="text-sm text-muted-foreground">Loading preview...</div>;
  }

  return (
    <pre className="text-sm whitespace-pre-wrap">
      {previewData.preview}
    </pre>
  );
};