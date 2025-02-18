import React, { useState, useMemo, useRef, useEffect } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { FileUploadZone } from "@/components/files/FileUploadZone";
import { DragDropProvider } from "@/components/files/DragDropProvider";
import { cn } from "@/lib/utils";
import {
  FileIcon,
  UploadIcon,
  Download,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  Loader2,
  RefreshCcwIcon,
  FileTextIcon,
  Trash2Icon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowUpDownIcon,
  MoreVerticalIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SearchBar } from "@/components/ui/search-bar";
import { Table, TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import type { Column } from "@/components/ui/table";
import type { FileStatus, FileItem, TableRowData, SortField, SortOrder, UploadingFile } from "@/types/files";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useColumnVisibility } from "@/hooks/use-column-visibility";
import { useSidebarContext } from "@/hooks/use-sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Type definitions
type FileTableColumn = Column<TableRowData>;

// Utility functions
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getStatusStyles = (status: FileStatus) => {
  const baseStyles = "rounded-full px-2.5 py-1 text-xs font-medium";
  const statusMap = {
    uploaded: "bg-[#ECFDF3] text-[#027A48]",
    restored: "bg-[#ECFDF3] text-[#027A48]",
    uploading: "bg-[#FFF4ED] text-[#B93815]",
    paused: "bg-[#F2F4F7] text-[#344054]",
    canceled: "bg-[#FFF1F3] text-[#C01048]",
    deleted: "bg-[#FFF1F3] text-[#C01048]"
  };
  return `${baseStyles} ${statusMap[status] || "text-muted-foreground"}`;
};

const FileNameCell = React.memo(({ file }: { file: TableRowData }) => {
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

const formatTimeWithZone = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timeZoneName: 'short'
  }).format(date);
};

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

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const FileDetails = ({ file, onClose }: { file: FileItem; onClose: () => void }) => {

  const { data: freshFileData } = useQuery({
    queryKey: ['/api/files', file.id],
    queryFn: async () => {
      const response = await fetch(`/api/files/${file.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch file details');
      }
      return response.json();
    },
  });

  const currentFile = freshFileData || file;

  const downloadMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await fetch(`/api/files/${fileId}/download`);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentFile.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
    },
    onError: (error) => {
    }
  });


  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">File Details</DialogTitle>
          <DialogDescription>
            Detailed information about {currentFile.name}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted/30 rounded-md p-4 space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">File Information</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium truncate ml-2 max-w-[200px]">{currentFile.name}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Size</span>
                <span className="font-medium">{formatFileSize(currentFile.size)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{currentFile.type || 'Unknown'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">v{currentFile.version?.toFixed(1) || '1.0'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className={getStatusStyles(currentFile.status)}>
                  {currentFile.status.charAt(0).toUpperCase() + currentFile.status.slice(1)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-muted/30 rounded-md p-4 space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">Upload Information</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Upload Date</span>
                <span className="font-medium">{formatDate(currentFile.createdAt)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Last Modified</span>
                <span className="font-medium">{formatDate(currentFile.updatedAt)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Downloads</span>
                <span className="font-medium">{currentFile.downloadCount || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="default"
            onClick={() => {
              downloadMutation.mutate(currentFile.id);
              onClose();
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const FileVault: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusFilter, setStatusFilter] = useState<FileStatus | 'all'>('all');
  const [sortConfig, setSortConfig] = useState<{ field: SortField; order: SortOrder }>({
    field: 'createdAt',
    order: 'desc'
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedFileDetails, setSelectedFileDetails] = useState<FileItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const { isCollapsed } = useSidebarContext();
  const sidebarWidth = isCollapsed ? 64 : 256;
  const visibleColumns = useColumnVisibility(sidebarWidth);
  const [conflictFiles, setConflictFiles] = useState<{ file: File; existingFile: FileItem }[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const FileActions = ({ file, onDelete }: { file: FileItem, onDelete: (fileId: string) => void }) => {
    const downloadMutation = useMutation({
      mutationFn: async (fileId: string) => {
        const response = await fetch(`/api/files/${fileId}/download`);
        if (!response.ok) throw new Error('Download failed');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      },
      onSuccess: () => {
      },
      onError: (error) => {
      }
    });
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

  const { data: files = [], isLoading } = useQuery<TableRowData[]>({
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
      const response = await fetch(`/api/files/${fileId}/download`);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = files.find(f => f.id === fileId)?.name || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: (_, fileId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      queryClient.invalidateQueries({ queryKey: [`/api/files/${fileId}`] });
    },
    onError: (error, fileId) => {
      const fileName = files.find(f => f.id === fileId)?.name || 'file';
    }
  });

  const bulkDownloadMutation = useMutation({
    mutationFn: async (fileIds: string[]) => {
      if (fileIds.length === 0) {
        throw new Error('No files selected for download');
      }

      const toastId = toast({
        title: "Preparing Download",
        description: (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Preparing {fileIds.length} files for download...</span>
          </div>
        ),
      });

      try {
        const response = await fetch('/api/files/download-bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileIds }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Bulk download failed');
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

        if (toastId) {
          toast.update(toastId, {
            title: "Download Complete",
            description: `${fileIds.length} files have been downloaded successfully.`,
            duration: 3000,
          });
        }

        return true;
      } catch (error) {
        if (toastId) {
          toast.update(toastId, {
            title: "Error",
            description: error instanceof Error ? error.message : "Failed to download files",
            variant: "destructive",
            duration: 3000,
          });
        }
        console.error('Bulk download error:', error);
        throw error;
      }
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

  const toggleAllFiles = (files: TableRowData[]) => {
    setSelectedFiles(prev => {
      if (prev.size === files.length) {
        return new Set();
      }
      return new Set(files.map(file => file.id));
    });
  };

  const onDrop = async (acceptedFiles: File[]) => {
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

  const uploadFiles = async (filesToUpload: File[], override: boolean = false) => {
    for (const file of filesToUpload) {
      const formData = new FormData();
      formData.append('file', file);

      const existingFile = files.find(f => f.name === file.name);
      if (existingFile) {
        formData.append('override', 'true');
      }

      const tempId = crypto.randomUUID();
      const uploadingFile: UploadingFile = {
        id: tempId,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading',
        createdAt: existingFile?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        uploadTime: new Date().toISOString(),
        progress: 0,
        version: existingFile?.version || 1.0
      };

      if (existingFile) {
        queryClient.setQueryData(['/api/files'], (oldFiles: TableRowData[] = []) => {
          return oldFiles.filter(f => f.name !== file.name);
        });
      }

      setUploadingFiles(prev => [...prev.filter(f => f.name !== file.name), uploadingFile]);

      try {
        toast({
          title: "Uploading File",
          description: (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Uploading {file.name}...</span>
            </div>
          ),
          duration: 2000,
        });

        const uploadedFile = await uploadMutation.mutateAsync(formData);

        setUploadingFiles(prev => prev.filter(f => f.id !== tempId));

        queryClient.setQueryData(['/api/files'], (oldFiles: TableRowData[] = []) => {
          const filteredFiles = oldFiles.filter(f => f.name !== file.name);
          const newFile = {
            ...uploadedFile,
            uploadTime: new Date(uploadedFile.uploadTimeMs!).toISOString(),
            version: existingFile ? existingFile.version + 1.0 : 1.0,
            status: 'uploaded' as FileStatus,
          };
          return [...filteredFiles, newFile];
        });

        toast({
          title: "Success",
          description: `${file.name} uploaded successfully`,
          duration: 3000,
        });
      } catch (error) {
        console.error('Upload error:', error);
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === tempId ? { ...f, status: 'canceled' } : f
          )
        );

        if (existingFile) {
          queryClient.setQueryData(['/api/files'], (oldFiles: TableRowData[] = []) => {
            return [...oldFiles.filter(f => f.name !== file.name), existingFile];
          });
        }

        toast({
          title: "Upload Error",
          description: error instanceof Error ? error.message : "Failed to upload file",
          variant: "destructive",
          duration: 3000,
        });
      }
    }
  };

  const handleSort = (field: string, direction: 'asc' | 'desc') => {
    setSortConfig({ field: field as SortField, order: direction });
  };

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) return <ArrowUpDownIcon className="h-4 w-4 text-muted-foreground" />;
    return sortConfig.order === 'asc' ?
      <ArrowUpIcon className="h-4 w-4 text-primary" /> :
      <ArrowDownIcon className="h-4 w-4text-primary" />
  };

  const allFiles = useMemo(() => {
    return [
      ...uploadingFiles,
      ...(files as TableRowData[])
    ];
  }, [files, uploadingFiles]);

  const filteredAndSortedFiles = useMemo(() => {
    let result = [...allFiles];

    if (searchQuery && searchResults.length > 0) {
      const matchedIds = new Set(searchResults.map(result => result.item.id));
      result = result.filter(file => matchedIds.has(file.id));
    } else if (searchQuery) {
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
  }, [allFiles, statusFilter, sortConfig, searchQuery, searchResults]);

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
        description: error instanceof Error ? error.message : `Failed to ${action}d selected files. Please try again.`,
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

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const highlightMatch = (text: string, matches: any[]) => {
    if (!matches || matches.length === 0) return text;
    let highlightedText = text;
    matches.forEach(match => {
      const startIndex = match.indices[0][0];
      const endIndex = match.indices[0][1];
      highlightedText = highlightedText.substring(0, startIndex) +
        `<mark>${highlightedText.substring(startIndex, endIndex)}</mark>` +
        highlightedText.substring(endIndex);
    });
    return highlightedText;
  };

  const columns: FileTableColumn[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllSelected()}
          onCheckedChange={(value) => toggleAllFiles(paginatedFiles)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedFiles.has(row.id)}
          onCheckedChange={() => toggleFileSelection(row.id)}
          aria-label="Select row"
        />
      ),
    },
    {
      id: 'name',
      header: 'Name',      cell: ({ row }) => <FileNameCell file={row} />,
      sortable: true
    },
    {
      id: 'size',
      header: 'Size',
      cell: ({ row }) => formatFileSize(row.size),
      sortable: true
    },
    {
      id: 'createdAt',
      header: 'Created',
      cell: ({ row }) => formatDate(row.createdAt),
      sortable: true
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className={getStatusStyles(row.status)}>
          {row.status}
        </span>
      ),
      sortable: true
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <FileActions file={row} onDelete={handleDelete} />
      )
    }
  ];

  const handleFileUpload = (files: File[]) => {
    onDrop(files);
  };

  const toast = useToast();
  const { isCollapsed } = useSidebarContext();
  const sidebarWidth = isCollapsed ? 64 : 256;
  const visibleColumns = useColumnVisibility(sidebarWidth);

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <PageHeader
            title="File Vault"
            description="Securely store and manage your company's files"
          />
          <div className="flex items-center gap-2">
            <Button
              onClick={handleUploadClick}
              className="gap-2"
            >
              <UploadIcon className="h-4 w-4" />
              Upload Files
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <DragDropProvider
            onDrop={handleFileUpload}
            maxFiles={10}
            maxSize={50 * 1024 * 1024}
          >
            <FileUploadZone
              onDrop={handleFileUpload}
              acceptedFormats=".CSV, .DOC, .DOCX, .ODT, .PDF, .RTF, .TXT, .WPD, .WPF, .JPG, .JPEG, .PNG, .GIF, .WEBP, .SVG"
            />
          </DragDropProvider>

          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="w-full sm:max-w-md">
              <SearchBar
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search files..."
                className="w-full"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={statusFilter}
                onValueChange={(value: FileStatus | 'all') => setStatusFilter(value)}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="uploaded">Uploaded</SelectItem>
                  <SelectItem value="uploading">Uploading</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table
                data={paginatedFiles as TableRowData[]}
                columns={columns}
                onSort={handleSort}
                sortConfig={sortConfig}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground order-2 sm:order-1">
              Showing {Math.min(currentPage * itemsPerPage, filteredAndSortedFiles.length)} of{' '}
              {filteredAndSortedFiles.length} files
            </div>

            <div className="flex items-center gap-2 order-1 sm:order-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
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

              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>

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
              >
                <ChevronsRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={(e) => {
          if (e.target.files) {
            handleFileUpload(Array.from(e.target.files));
          }
        }}
      />

      {showConflictModal && (
        <FileConflictModal
          conflicts={conflictFiles}
          onResolve={(overrideAll) => {
            setShowConflictModal(false);
            if (overrideAll) {
              uploadFiles(conflictFiles.map(c => c.file), true);
            }
            setConflictFiles([]);
          }}
          onCancel={() => {
            setShowConflictModal(false);
            setConflictFiles([]);
          }}
        />
      )}

      {selectedFileDetails && (
        <FileDetails
          file={selectedFileDetails}
          onClose={() => setSelectedFileDetails(null)}
        />
      )}
    </DashboardLayout>
  );
};

export default FileVault;