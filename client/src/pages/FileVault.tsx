import * as React from "react";
import { useState, useRef, useMemo } from "react";
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
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useColumnVisibility } from "@/hooks/use-column-visibility";
import { useSidebarContext } from "@/hooks/use-sidebar";
import { useUser } from "@/hooks/use-user"; // Add this import
import type { Column } from "@/components/ui/table";
import type { FileStatus, FileItem, TableRowData, SortField, SortOrder, UploadingFile } from "@/types/files";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchBar } from "@/components/ui/search-bar";
import { Table } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import crypto from 'crypto';
import {ChangeEvent} from 'react';

interface FileTableColumn extends Column<TableRowData> {}

const ACCEPTED_FORMATS = ".CSV, .DOC, .DOCX, .ODT, .PDF, .RTF, .TXT, .WPD, .WPF, .JPG, .JPEG, .PNG, .GIF, .WEBP, .SVG";

const FileVault: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser(); // Get the authenticated user
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
  const [searchResults, setSearchResults] = useState<Array<any>>([]);

  // Update the useQuery implementation to include company_id from user context
  const { data: files = [], isLoading, error } = useQuery<TableRowData[]>({
    queryKey: ['/api/files', { company_id: user?.company_id }],
    enabled: !!user?.company_id, // Only run query when we have company_id
    select: (data) => {
      console.log('[FileVault] Raw API response:', data);
      return data.map(file => {
        console.log('[FileVault] Processing file:', {
          id: file.id,
          name: file.name,
          size: file.size,
          path: file.path
        });
        return {
          ...file,
          status: file.status || 'uploaded',
          size: typeof file.size === 'number' ? file.size : 
                (file.path ? Buffer.from(file.path).length : 0)
        };
      });
    }
  });

  // Log any query errors
  React.useEffect(() => {
    if (error) {
      console.error('[FileVault] Query error:', error);
      toast({
        title: "Error loading files",
        description: "There was a problem loading your files. Please try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch('/api/files', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Upload failed');
      }
      const data = await res.json();
      return data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        throw new Error('File deletion failed');
      }
    }
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
    console.log('[FileVault] Starting file filtering with:', {
      totalFiles: allFiles.length,
      searchQuery,
      statusFilter,
      sortConfig
    });

    let result = [...allFiles];

    if (searchQuery && searchResults.length > 0) {
      const matchedIds = new Set(searchResults.map(result => result.item.id));
      result = result.filter(file => matchedIds.has(file.id));
      console.log('[FileVault] After search filtering:', {
        matchedIds: Array.from(matchedIds),
        remainingFiles: result.length
      });
    } else if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(file =>
        file.name.toLowerCase().includes(query) ||
        file.status.toLowerCase().includes(query)
      );
      console.log('[FileVault] After text search:', {
        query,
        remainingFiles: result.length
      });
    }

    if (statusFilter !== 'all') {
      result = result.filter(file => file.status === statusFilter);
      console.log('[FileVault] After status filtering:', {
        statusFilter,
        remainingFiles: result.length
      });
    }

    result.sort((a, b) => {
      const modifier = sortConfig.order === 'asc' ? 1 : -1;
      console.log('[FileVault] Sorting files:', {
        field: sortConfig.field,
        order: sortConfig.order,
        fileA: a.name,
        fileB: b.name
      });

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

    console.log('[FileVault] Final filtered and sorted files:', {
      totalFiles: result.length,
      firstFile: result[0],
      lastFile: result[result.length - 1]
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

  const handleSearch = (value: string | ChangeEvent<HTMLInputElement>) => {
    const searchValue = typeof value === 'string' ? value : value.target.value;
    setSearchQuery(searchValue);
    console.log('[FileVault] Search updated:', { searchValue });
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

  const formatFileSize = (size: number): string => {
    if (size < 1024) {
      return `${size} bytes`;
    } else if (size < 1048576) {
      return `${(size / 1024).toFixed(1)} KB`;
    } else {
      return `${(size / 1048576).toFixed(1)} MB`;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getStatusStyles = (status: FileStatus): string => {
    switch (status) {
      case 'uploaded':
        return 'text-green-500';
      case 'uploading':
        return 'text-blue-500';
      case 'paused':
        return 'text-yellow-500';
      case 'deleted':
        return 'text-red-500';
      case 'canceled':
        return 'text-gray-500';
      default:
        return '';
    }
  };


  const FileNameCell: React.FC<{ file: TableRowData }> = ({ file }) => (
    <div className="flex items-center gap-2">
      <FileIcon className="h-4 w-4" />
      <span>{file.name}</span>
    </div>
  );

  const FileActions: React.FC<{ file: TableRowData; onDelete: (fileId: string) => void }> = ({ file, onDelete }) => {
    const handleAction = (action: string) => {
      if (action === 'delete') {
        onDelete(file.id);
      } else if (action === 'viewDetails') {
        setSelectedFileDetails(file);
      }
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreVerticalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleAction('viewDetails')}>
            View Details
          </DropdownMenuItem>
          {file.status !== 'deleted' && (
            <DropdownMenuItem onClick={() => handleAction('delete')}>
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
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
      header: 'Name',
      cell: ({ row }) => <FileNameCell file={row} />,
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

  const handleRenameFile = (fileId: string, newName: string) => {
    //This function is not used anywhere in the component, so we can safely remove it.
  };

  return (
    <DashboardLayout>
      {!user ? (
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-muted-foreground">Loading user data...</p>
        </div>
      ) : (
        <div className="space-y-6">
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
              onFilesAccepted={handleFileUpload}
              maxFiles={10}
              maxSize={50 * 1024 * 1024}
            >
              <FileUploadZone
                onFilesAccepted={handleFileUpload}
                acceptedFormats={ACCEPTED_FORMATS}
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

            <div className="w-full">
              <div className="overflow-x-auto">
                <Table
                  data={paginatedFiles}
                  columns={visibleColumns}
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
      )}
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
        <Dialog open>
          <DialogHeader>
            <DialogTitle>File Upload Conflict</DialogTitle>
            <DialogDescription>
              Some files already exist. Do you want to override them?
            </DialogDescription>
          </DialogHeader>
          <DialogContent className="grid gap-4 grid-cols-2">
            {conflictFiles.map((conflict, index) => (
              <div key={index} className="flex items-center gap-2">
                <FileTextIcon className="h-4 w-4" />
                <span>{conflict.file.name}</span>
              </div>
            ))}
          </DialogContent>
          <div className="flex justify-end gap-2">
            <Button onClick={() => { setShowConflictModal(false); setConflictFiles([]) }} variant="outline">Cancel</Button>
            <Button onClick={() => { setShowConflictModal(false); uploadFiles(conflictFiles.map(c => c.file), true); setConflictFiles([]) }}>Override All</Button>
          </div>
        </Dialog>
      )}

      {selectedFileDetails && (
        <Dialog open>
          <DialogHeader>
            <DialogTitle>{selectedFileDetails.name}</DialogTitle>
          </DialogHeader>
          <DialogContent>
            <div className="flex flex-col">
              <div className="mb-2">Name: {selectedFileDetails.name}</div>
              <div className="mb-2">Size: {formatFileSize(selectedFileDetails.size)}</div>
              <div className="mb-2">Created: {formatDate(selectedFileDetails.createdAt)}</div>
              <div className="mb-2">Status: {selectedFileDetails.status}</div>
              <div>Version: {selectedFileDetails.version}</div>
            </div>
          </DialogContent>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setSelectedFileDetails(null)} >Close</Button>
          </div>
        </Dialog>
      )}
    </DashboardLayout>
  );
};

export default FileVault;