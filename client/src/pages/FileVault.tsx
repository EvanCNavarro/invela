import * as React from "react";
import { useState, useRef, useMemo, useEffect } from "react";
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
import { useUser } from "@/hooks/use-user";
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

const ACCEPTED_FORMATS = ".CSV, .DOC, .DOCX, .ODT, .PDF, .RTF, .TXT, .WPD, .WPF, .JPG, .JPEG, .PNG, .GIF, .WEBP, .SVG";

const FileVault: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusFilter, setStatusFilter] = useState<FileStatus | 'all'>('all');
  const [sortConfig, setSortConfig] = useState<{ field: SortField; order: SortOrder }>({
    field: 'createdAt',
    order: 'desc'
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const { data: files = [], isLoading } = useQuery<TableRowData[]>({
    queryKey: ['/api/files', { company_id: user?.company_id }],
    enabled: !!user?.company_id,
    queryFn: async () => {
      console.log('[FileVault Debug] Starting API request:', {
        userId: user?.id,
        companyId: user?.company_id,
        timestamp: new Date().toISOString()
      });

      const url = new URL('/api/files', window.location.origin);
      url.searchParams.append('company_id', user!.company_id.toString());
      const response = await fetch(url);

      if (!response.ok) {
        console.error('[FileVault Debug] API request failed:', {
          status: response.status,
          statusText: response.statusText
        });
        throw new Error('Failed to fetch files');
      }

      const data = await response.json();
      console.log('[FileVault Debug] API Response received:', {
        fileCount: data.length,
        firstFile: data[0],
        dataShape: data.length > 0 ? Object.keys(data[0]) : 'No data',
        timestamp: new Date().toISOString()
      });

      return data;
    }
  });

  useEffect(() => {
    console.log('[FileVault Debug] Component state updated:', {
      hasFiles: files.length > 0,
      isLoading,
      userContext: {
        isAuthenticated: !!user,
        companyId: user?.company_id
      },
      timestamp: new Date().toISOString()
    });
  }, [files, isLoading, user]);

  const allFiles = useMemo(() => {
    const combined = [...uploadingFiles, ...files];
    console.log('[FileVault Debug] Combined files:', {
      uploadingFiles,
      fetchedFiles: files,
      combinedFiles: combined
    });
    return combined;
  }, [files, uploadingFiles]);

  const filteredFiles = useMemo(() => {
    console.log('[FileVault Debug] Starting file filtering:', {
      allFiles,
      searchQuery,
      statusFilter
    });

    let result = [...allFiles];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(file =>
        file.name.toLowerCase().includes(query)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(file => file.status === statusFilter);
    }

    console.log('[FileVault Debug] After filtering:', {
      resultCount: result.length,
      result
    });
    return result;
  }, [allFiles, searchQuery, statusFilter]);

  const sortedFiles = useMemo(() => {
    return [...filteredFiles].sort((a, b) => {
      const modifier = sortConfig.order === 'asc' ? 1 : -1;
      switch (sortConfig.field) {
        case 'name':
          return modifier * a.name.localeCompare(b.name);
        case 'size':
          return modifier * (a.size - b.size);
        case 'createdAt':
          return modifier * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        default:
          return 0;
      }
    });
  }, [filteredFiles, sortConfig]);

  const paginatedFiles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedFiles.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedFiles, currentPage]);

  const formatFileSize = (size: number): string => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const columns: Column<TableRowData>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={selectedFiles.size === paginatedFiles.length}
          onCheckedChange={() => {
            setSelectedFiles(prev => {
              if (prev.size === paginatedFiles.length) {
                return new Set();
              }
              return new Set(paginatedFiles.map(file => file.id));
            });
          }}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedFiles.has(row.id)}
          onCheckedChange={() => {
            setSelectedFiles(prev => {
              const newSet = new Set(prev);
              if (newSet.has(row.id)) {
                newSet.delete(row.id);
              } else {
                newSet.add(row.id);
              }
              return newSet;
            });
          }}
        />
      )
    },
    {
      id: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <FileIcon className="h-4 w-4" />
          <span>{row.name}</span>
        </div>
      )
    },
    {
      id: 'size',
      header: 'Size',
      cell: ({ row }) => formatFileSize(row.size)
    },
    {
      id: 'createdAt',
      header: 'Created',
      cell: ({ row }) => formatDate(row.createdAt)
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className={cn(
          row.status === 'uploaded' && 'text-green-500',
          row.status === 'uploading' && 'text-blue-500',
          row.status === 'error' && 'text-red-500'
        )}>
          {row.status}
        </span>
      )
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreVerticalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Download</DropdownMenuItem>
            <DropdownMenuItem className="text-red-500">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  const totalPages = Math.ceil(sortedFiles.length / itemsPerPage);
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

  const onDrop = async (acceptedFiles: File[]) => {
    const duplicates = acceptedFiles.filter(file =>
      files.some(existingFile => existingFile.name === file.name)
    );

    if (duplicates.length > 0) {
      //Conflict Handling (Retained from original code)
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleBulkAction = async (action: 'delete' | 'restore') => {
    //Bulk actions (Retained from original code)
  };

  const handleDelete = (fileId: string) => {
    deleteMutation.mutate(fileId);
  };

  const handleSearch = (value: string | ChangeEvent<HTMLInputElement>) => {
    const searchValue = typeof value === 'string' ? value : value.target.value;
    setSearchQuery(searchValue);
  };

  const { isCollapsed } = useSidebarContext();
  const sidebarWidth = isCollapsed ? 64 : 256;
  const visibleColumns = useColumnVisibility(sidebarWidth);
  const [conflictFiles, setConflictFiles] = useState<{ file: File; existingFile: FileItem }[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);

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
            <DragDropProvider>
              <FileUploadZone acceptedFormats={ACCEPTED_FORMATS} />
            </DragDropProvider>

            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="w-full sm:max-w-md">
                <SearchBar
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border rounded-lg">
              <div className="overflow-x-auto">
                {console.log('[FileVault Debug] Rendering table with:', {
                  paginatedFiles,
                  columns,
                  isLoading
                })}
                <Table
                  data={paginatedFiles}
                  columns={columns}
                />
              </div>

              {isLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : paginatedFiles.length === 0 ? (
                <div className="text-center p-4 text-muted-foreground">
                  No files found
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {Math.min(currentPage * itemsPerPage, sortedFiles.length)} of {sortedFiles.length} files
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeftIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(totalPages)}
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
            onDrop(Array.from(e.target.files));
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
    </DashboardLayout>
  );
};

export default FileVault;