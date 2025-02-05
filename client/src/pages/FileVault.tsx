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
  Download,
  Loader2
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

// Update the column priorities to include version
const columnPriorities = {
  fileName: 0,      // Always visible
  size: 1,         // First to show
  uploadDate: 2,    // Second to show
  uploadTime: 3,    // Third to show
  status: 4,        // Fourth to show
  version: 5,       // Fifth to show (new priority)
  actions: 0,       // Always visible
  textPreview: 6,   // Sixth to show
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

const TableSkeleton = () => (
  <>
    {Array.from({ length: 5 }).map((_, index) => (
      <TableRow key={index} className="animate-pulse">
        <TableCell className="w-[40px]">
          <div className="h-4 w-4 bg-muted rounded" />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-muted rounded" />
            <div className="h-4 w-32 bg-muted rounded" />
          </div>
        </TableCell>
        <TableCell>
          <div className="h-4 w-16 bg-muted rounded ml-auto" />
        </TableCell>
        <TableCell>
          <div className="h-4 w-24 bg-muted rounded ml-auto" />
        </TableCell>
        <TableCell>
          <div className="h-4 w-20 bg-muted rounded ml-auto" />
        </TableCell>
        <TableCell>
          <div className="h-6 w-20 bg-muted rounded mx-auto" />
        </TableCell>
        <TableCell>
          <div className="h-8 w-8 bg-muted rounded mx-auto" />
        </TableCell>
      </TableRow>
    ))}
  </>
);


// Add the timestamp formatting function
const formatTimestampForFilename = () => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
};

// Update the getVisibleColumns function to include version and handle sidebar states better
const getVisibleColumns = (breakpoint: number, isSidebarCollapsed: boolean) => {
  const sidebarWidth = isSidebarCollapsed ? 64 : 256; // Account for both states
  const availableSpace = Math.max(0, breakpoint - sidebarWidth - 48); // 48px for padding

  // Always show priority 0 columns
  const visibleColumns = new Set(['fileName', 'actions']);

  // Add columns based on available space
  if (availableSpace > 500) visibleColumns.add('size');
  if (availableSpace > 700) visibleColumns.add('status');
  if (availableSpace > 900) visibleColumns.add('uploadDate');
  if (availableSpace > 1100) visibleColumns.add('version');
  if (availableSpace > 1300) visibleColumns.add('uploadTime');

  return visibleColumns;
};

// Move FileConflictModal component definition above the FileVault component
const FileConflictModal = ({
  conflicts,
  onResolve,
  onCancel
}: {
  conflicts: { file: File; existingFile: FileItem }[];
  onResolve: (overrideAll: boolean) => void;
  onCancel: () => void;
}) => {
  return (
    <Dialog open={conflicts.length > 0} onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>File Conflict Detected</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            The following files already exist:
          </p>
          <div className="max-h-[200px] overflow-y-auto space-y-2">
            {conflicts.map(({ file, existingFile }) => (
              <div key={file.name} className="flex items-center gap-2 text-sm">
                <FileIcon className="w-4 h-4" />
                <span>{file.name}</span>
                <span className="text-muted-foreground ml-auto">
                  Current version: v{existingFile.version?.toFixed(1) || '1.0'}
                </span>
              </div>
            ))}
          </div>
          <p className="text-sm font-medium">
            Do you want to override these files with new versions?
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onCancel()}>
            Cancel
          </Button>
          <Button onClick={() => onResolve(true)}>
            Override All
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [conflictFiles, setConflictFiles] = useState<{ file: File; existingFile: FileItem }[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);

  // Get visible columns using the previously defined function
  const visibleColumns = getVisibleColumns(breakpoint, isSidebarCollapsed);

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
          <DropdownMenuItem onClick={() => downloadMutation.mutate(file.id)}>
            <Download className="w-4 h-4 mr-2" />
            Download
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

  const { data: files = [], isLoading } = useQuery<FileApiResponse[]>({
    queryKey: ['/api/files']
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

  const downloadMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const file = files.find(f => f.id === fileId);
      if (file) {
        showDownloadToast(file.name);
      }

      const response = await fetch(`/api/files/${fileId}/download`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Download failed' }));
        throw new Error(errorData.message || 'Failed to download file');
      }

      const contentType = response.headers.get('content-type');
      if (!contentType) {
        throw new Error('No content type specified');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const contentDisposition = response.headers.get('content-disposition');
      const filenameMatch = contentDisposition && contentDisposition.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : files.find(f => f.id === fileId)?.name || 'download';

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Complete",
        description: `${filename} has been downloaded successfully.`,
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to download file",
        variant: "destructive",
        duration: 3000,
      });
    },
  });

  const bulkDownloadMutation = useMutation({
    mutationFn: async (fileIds: string[]) => {
      const selectedFileNames = files
        .filter(f => fileIds.includes(f.id))
        .map(f => f.name)
        .join(", ");

      showDownloadToast(`${fileIds.length} files`);

      const response = await fetch('/api/files/download-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileIds }),
      });

      if (!response.ok) {
        throw new Error('Bulk download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invela_download_${formatTimestampForFilename()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Complete",
        description: `${fileIds.length} files have been downloaded successfully.`,
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to download files",
        variant: "destructive",
        duration: 3000,
      });
    },
  });

  const showDownloadToast = (fileName: string) => {
    toast({
      title: "Downloading File",
      description: (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Downloading {fileName}...</span>
        </div>
      ),
      duration: 2000,
    });
  };


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
    // Check for duplicate files
    const duplicates = acceptedFiles.filter(file =>
      files.some(existingFile => existingFile.name === file.name)
    );

    if (duplicates.length > 0) {
      const conflicts = duplicates.map(file => ({
        file,
        existingFile: files.find(ef => ef.name === file.name)!
      }));
      setConflictFiles(conflicts);
      setShowConflictModal(true);
      return;
    }

    await uploadFiles(acceptedFiles);
  };

  // Update the uploadFiles function to handle FileStatus type correctly
  const uploadFiles = async (filesToUpload: File[], override: boolean = false) => {
    const newUploadingFiles: UploadingFile[] = filesToUpload.map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading' as FileStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      uploadTime: new Date().toISOString(),
      progress: 0,
      version: 1.0
    }));

    // If overriding, update existing files' status to uploading
    if (override) {
      setUploadingFiles(prev => {
        const existingFiles = prev.filter(f => !filesToUpload.some(newFile => newFile.name === f.name));
        return [...existingFiles, ...newUploadingFiles];
      });

      // Update the files in the query cache to show uploading status for existing files
      queryClient.setQueryData(['/api/files'], (oldFiles: FileApiResponse[] = []) => {
        return oldFiles.map(file => {
          const isBeingOverridden = filesToUpload.some(newFile => newFile.name === file.name);
          if (isBeingOverridden) {
            return {
              ...file,
              status: 'uploading' as FileStatus,
            };
          }
          return file;
        });
      });
    } else {
      setUploadingFiles(prev => [...prev, ...newUploadingFiles]);
    }

    // Show upload progress toast
    toast({
      title: "Uploading Files",
      description: (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Uploading {filesToUpload.length} file(s)...</span>
        </div>
      ),
      duration: 2000,
    });

    for (const file of filesToUpload) {
      const uploadId = newUploadingFiles.find(f => f.name === file.name)?.id;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('override', String(override));

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

        // Update the query cache with the new file information
        queryClient.setQueryData(['/api/files'], (oldFiles: FileApiResponse[] = []) => {
          if (override) {
            // If overriding, update the existing file with new information
            return oldFiles.map(existingFile => {
              if (existingFile.name === file.name) {
                return {
                  ...uploadedFile,
                  uploadTime: new Date(uploadedFile.uploadTimeMs!).toISOString(),
                  version: (existingFile.version || 1) + 1,
                  status: 'uploaded' as FileStatus,
                };
              }
              return existingFile;
            });
          } else {
            // If not overriding, add as new file
            const newFile = {
              ...uploadedFile,
              uploadTime: new Date(uploadedFile.uploadTimeMs!).toISOString(),
              version: 1.0,
              status: 'uploaded' as FileStatus,
            };
            return [...oldFiles, newFile];
          }
        });
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
                  <DropdownMenuItem
                    onClick={() => bulkDownloadMutation.mutate(Array.from(selectedFiles))}
                    disabled={selectedFiles.size === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Selected
                  </DropdownMenuItem>
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
              <div className="relative">
                <div className="w-full overflow-x-auto">
                  <Table className="w-full table-fixed">
                    <TableHeader className="sticky top-0 z-30 bg-muted">
                      <TableRow className="hover:bg-transparent">
                        <TableCell className="w-[5%] px-4 sticky left-0 z-40 bg-muted">
                          <Checkbox
                            checked={selectedFiles.size === paginatedFiles.length && paginatedFiles.length > 0}
                            onCheckedChange={() => toggleAllFiles(paginatedFiles)}
                            aria-label="Select all files"
                          />
                        </TableCell>
                        <TableCell className="w-[30%] sticky left-[5%] z-20 bg-muted">
                          <button
                            className="flex items-center gap-2"
                            onClick={() => handleSort('name')}
                          >
                            Name
                            {getSortIcon('name')}
                          </button>
                        </TableCell>
                        {visibleColumns.has('size') && (
                          <TableCell className="w-[10%] text-right">
                            <button
                              className="flex items-center gap-2 ml-auto"
                              onClick={() => handleSort('size')}
                            >
                              Size
                              {getSortIcon('size')}
                            </button>
                          </TableCell>
                        )}
                        {visibleColumns.has('uploadDate') && (
                          <TableCell className="w-[15%] text-right">
                            <button
                              className="flex items-center gap-2 ml-auto"
                              onClick={() => handleSort('createdAt')}
                            >
                              Upload Date
                              {getSortIcon('createdAt')}
                            </button>
                          </TableCell>
                        )}
                        {visibleColumns.has('uploadTime') && (
                          <TableCell className="w-[10%] text-right">
                            Time
                          </TableCell>
                        )}
                        {visibleColumns.has('version') && (
                          <TableCell className="w-[10%] text-center">
                            Version
                          </TableCell>
                        )}
                        {visibleColumns.has('status') && (
                          <TableCell className="w-[12%] text-center">
                            <button
                              className="flex items-center gap-2 justify-center w-full"
                              onClick={() => handleSort('status')}
                            >
                              Status
                              {getSortIcon('status')}
                            </button>
                          </TableCell>
                        )}
                        <TableCell className="w-[8%] text-center sticky right-0 z-20 bg-muted">
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableSkeleton />
                      ) : paginatedFiles.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={Object.keys(visibleColumns).length + 2}
                            className="h-32 text-center"
                          >
                            <span className="text-gray-600">
                              No files found
                            </span>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedFiles.map((file) => (
                          <TableRow key={file.id}>
                            <TableCell className="w-[5%] px-4">
                              <Checkbox
                                checked={selectedFiles.has(file.id)}
                                onCheckedChange={() => toggleFileSelection(file.id)}
                                aria-label={`Select ${file.name}`}
                              />
                            </TableCell>
                            <TableCell className="w-[30%]">
                              <FileNameCell file={file} />
                            </TableCell>
                            {visibleColumns.has('size') && (
                              <TableCell className="w-[10%] text-right">
                                {formatFileSize(file.size)}
                              </TableCell>
                            )}
                            {visibleColumns.has('uploadDate') && (
                              <TableCell className="w-[15%] text-right">
                                {new Date(file.createdAt).toLocaleDateString()}
                              </TableCell>
                            )}
                            {visibleColumns.has('version') && (
                              <TableCell className="w-[10%] text-center">
                                v{file.version?.toFixed(1)}
                              </TableCell>
                            )}
                            {visibleColumns.has('status') && (
                              <TableCell className="w-[12%]">
                                <div className="flex justify-center">
                                  <span className={getStatusStyles(file.status)}>
                                    {file.status.charAt(0).toUpperCase() + file.status.slice(1)}
                                  </span>
                                </div>
                              </TableCell>
                            )}
                            <TableCell className="w-[8%]">
                              <FileActions file={file} onDelete={handleDelete} />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination footer - make it sticky */}
                {filteredAndSortedFiles.length > 0 && (
                  <div className="sticky bottom-0 left-0 right-0 bg-muted border-t px-4 py-3 flex items-center justify-between">
                    <div className="flex-1 text-sm text-muted-foreground">
                      {filteredAndSortedFiles.length <= itemsPerPage
                        ? `Showing ${filteredAndSortedFiles.length} ${filteredAndSortedFiles.length === 1 ? 'file' : 'files'}`
                        : `Showing ${Math.min((currentPage - 1) * itemsPerPage + 1, filteredAndSortedFiles.length)}-${Math.min(currentPage * itemsPerPage, filteredAndSortedFiles.length)} of ${filteredAndSortedFiles.length} files`
                      }
                    </div>

                    {filteredAndSortedFiles.length > itemsPerPage && (
                      <div className="flex items-center gap-2">
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
                        <span className="text-sm font-medium">{currentPage}</span>
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
                )}
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
                        </div>
                        {selectedFileDetails.lastAccessed && (
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
        {/* Add the FileConflictModal here */}
        <FileConflictModal
          conflicts={conflictFiles}
          onResolve={(override) => {
            const filesToUpload = conflictFiles.map(({ file }) => file);
            setShowConflictModal(false);
            setConflictFiles([]);
            uploadFiles(filesToUpload, override);
          }}
          onCancel={() => {
            setShowConflictModal(false);
            setConflictFiles([]);
          }}
        />
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