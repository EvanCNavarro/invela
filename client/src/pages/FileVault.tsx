import * as React from "react";
import { useState, useRef, useMemo, useEffect } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { FileUploadZone } from "@/components/files/FileUploadZone";
import { DragDropProvider } from "@/components/files/DragDropProvider";
import {
  FileIcon,
  UploadIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import type { FileStatus, FileItem } from "@/types/files";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchBar } from "@/components/ui/search-bar";
import { FileTable, type SortField, type SortOrder } from "@/components/files/FileTable";

const ACCEPTED_FORMATS = ".CSV, .DOC, .DOCX, .ODT, .PDF, .RTF, .TXT, .WPD, .WPF, .JPG, .JPEG, .PNG, .GIF, .WEBP, .SVG";

export const FileVault: React.FC = () => {
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
  const [uploadingFiles, setUploadingFiles] = useState<FileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { data: files = [], isLoading } = useQuery<FileItem[]>({
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

      return data.map((file: any) => ({
        id: file.id.toString(),
        name: file.name,
        size: file.size || 0,
        status: file.status || 'uploaded',
        createdAt: file.created_at || file.createdAt || new Date().toISOString(),
        type: file.type || 'application/octet-stream'
      }));
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

    result = result.sort((a, b) => {
      const modifier = sortConfig.order === 'asc' ? 1 : -1;
      switch (sortConfig.field) {
        case 'name':
          return modifier * a.name.localeCompare(b.name);
        case 'size':
          return modifier * ((a.size || 0) - (b.size || 0));
        case 'createdAt':
          return modifier * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        case 'status':
          return modifier * a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    console.log('[FileVault Debug] After filtering:', {
      resultCount: result.length,
      result
    });
    return result;
  }, [allFiles, searchQuery, statusFilter, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortConfig]);

  const paginatedFiles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const result = filteredFiles.slice(startIndex, endIndex);

    console.log('[FileVault Debug] Pagination calculated:', {
      page: currentPage,
      startIndex,
      endIndex,
      totalItems: filteredFiles.length,
      pageItems: result.length
    });

    return result;
  }, [filteredFiles, currentPage, itemsPerPage]);

  useEffect(() => {
    setSelectedFiles(new Set());
  }, [currentPage]);

  const totalPages = Math.ceil(filteredFiles.length / itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const formatFileSize = (size: number): string => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      try {
        const res = await fetch('/api/files', {
          method: 'POST',
          headers: {
            'Accept': 'application/json'
          },
          body: formData
        });

        const contentType = res.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          console.error('[FileVault Debug] Invalid content type:', {
            received: contentType,
            expected: 'application/json'
          });
          throw new Error('Invalid server response type. Please try again.');
        }

        if (!res.ok) {
          try {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Upload failed');
          } catch (parseError) {
            console.error('[FileVault Debug] Error response parsing failed:', parseError);
            throw new Error(`Upload failed: ${res.statusText}`);
          }
        }

        const data = await res.json();
        return data;
      } catch (error) {
        console.error('[FileVault Debug] Upload mutation error:', {
          error,
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
    }
  });

  const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const tempId = generateUniqueId();
    const uploadingFile: FileItem = {
      id: tempId,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      createdAt: new Date().toISOString()
    };

    setUploadingFiles(prev => [...prev, uploadingFile]);

    try {
      await uploadMutation.mutateAsync(formData);
      setUploadingFiles(prev => prev.filter(f => f.id !== tempId));
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });

      toast({
        title: "Success",
        description: `${file.name} uploaded successfully`,
        duration: 3000,
      });
    } catch (error) {
      console.error('[FileVault Debug] Upload error:', {
        error,
        fileName: file.name,
        tempId
      });

      setUploadingFiles(prev =>
        prev.map(f =>
          f.id === tempId
            ? { ...f, status: 'error' as FileStatus }
            : f
        )
      );

      toast({
        title: "Upload Error",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (isUploading || !files.length) return;

    console.log('[FileVault Debug] Starting file upload:', {
      fileCount: files.length,
      files: files.map(f => ({ name: f.name, size: f.size, type: f.type }))
    });

    setIsUploading(true);
    try {
      for (const file of files) {
        await uploadFile(file);
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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

  const downloadMutation = useMutation({
    mutationFn: async (fileId: string) => {
      window.open(`/api/files/${fileId}/download`, '_blank');
    }
  });

  const handleSort = (field: SortField) => {
    setSortConfig(current => ({
      field,
      order: current.field === field && current.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectAll = (items: FileItem[]) => {
    setSelectedFiles(current =>
      current.size === items.length ? new Set() : new Set(items.map(item => item.id))
    );
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault(); 
    if (fileInputRef.current && !isUploading) {
      fileInputRef.current.click();
    }
  };

  return (
    <DashboardLayout>
      {!user ? (
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
                onClick={handleButtonClick}
                className="gap-2"
                disabled={isUploading}
              >
                <UploadIcon className="h-4 w-4" />
                Upload Files
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <DragDropProvider onFilesAccepted={handleFileUpload}>
              <FileUploadZone
                acceptedFormats={ACCEPTED_FORMATS}
                disabled={isUploading}
              />
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
                <FileTable
                  data={paginatedFiles}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  selectedItems={selectedFiles}
                  onSelectItem={(id) => {
                    setSelectedFiles(current => {
                      const newSet = new Set(current);
                      if (newSet.has(id)) {
                        newSet.delete(id);
                      } else {
                        newSet.add(id);
                      }
                      return newSet;
                    });
                  }}
                  onSelectAll={handleSelectAll}
                  formatFileSize={formatFileSize}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onDownload={(id) => downloadMutation.mutate(id)}
                  isLoading={isLoading}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                {filteredFiles.length > 0 ? (
                  `Showing ${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(currentPage * itemsPerPage, filteredFiles.length)} of ${filteredFiles.length} files`
                ) : (
                  'No files to display'
                )}
              </div>

              {totalPages >= 1 && ( 
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
              )}
            </div>
          </div>
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        accept={ACCEPTED_FORMATS}
        onChange={(e) => {
          if (e.target.files?.length) {
            handleFileUpload(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />
    </DashboardLayout>
  );
};

export default FileVault;