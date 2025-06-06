import * as React from "react";
import { useState, useRef, useMemo, useEffect } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { FileUploadZone } from "@/components/files/FileUploadZone";
import { DragDropProvider } from "@/components/files/DragDropProvider";
import { TutorialManager } from "@/components/tutorial/TutorialManager";
import Fuse from 'fuse.js';
import {
  FileIcon,
  UploadIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedToast } from "@/hooks/use-unified-toast";
import { useFileToast } from "@/hooks/use-file-toast";
import { useUser } from "@/hooks/useUser";
import type { FileStatus, FileItem } from "@/types/files";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchBar } from "@/components/ui/search-bar";
import { FileTable, type SortField, type SortOrder } from "@/components/files/FileTable";

const ACCEPTED_FORMATS = ".CSV, .DOC, .DOCX, .ODT, .PDF, .RTF, .TXT, .JPG, .PNG, .SVG";

export const FileVault: React.FC = () => {
  const { toast } = useToast();
  const unifiedToast = useUnifiedToast();
  const { createFileUploadToast } = useFileToast();
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

  const { data: filesResponse, isLoading, refetch } = useQuery<{
    data: FileItem[],
    pagination: {
      page: number,
      pageSize: number,
      totalItems: number,
      totalPages: number
    }
  }>({
    queryKey: ['/api/files', { company_id: user?.company_id, page: currentPage, pageSize: itemsPerPage }],
    enabled: !!user?.company_id,
    queryFn: async ({ queryKey }) => {
      // Extract params from query key for consistency
      const params = queryKey[1] as { company_id?: number, page: number, pageSize: number };
      
      console.log('[FileVault Debug] Starting API request:', {
        userId: user?.id,
        companyId: params.company_id,
        page: params.page,
        pageSize: params.pageSize,
        timestamp: new Date().toISOString()
      });

      const url = new URL('/api/files', window.location.origin);
      if (params.company_id) {
        url.searchParams.append('company_id', params.company_id.toString());
      }
      url.searchParams.append('page', params.page.toString());
      url.searchParams.append('pageSize', params.pageSize.toString());
      
      const response = await fetch(url);

      if (!response.ok) {
        console.error('[FileVault Debug] API request failed:', {
          status: response.status,
          statusText: response.statusText
        });
        throw new Error('Failed to fetch files');
      }

      const responseData = await response.json();
      console.log('[FileVault Debug] API Response received:', {
        responseData: responseData,
        responseStructure: Object.keys(responseData),
        fileCount: responseData.data?.length || 0,
        firstFile: responseData.data?.[0],
        pagination: responseData.pagination,
        timestamp: new Date().toISOString()
      });

      // Check if the response has the expected structure with data and pagination
      if (!responseData.data || !Array.isArray(responseData.data)) {
        console.log('[FileVault Debug] Legacy response structure detected');
        
        // Handle if the response is an array directly (older API format)
        if (Array.isArray(responseData)) {
          console.log('[FileVault Debug] Processing array response');
          const fileArray = responseData;
          
          return {
            data: fileArray.map((file: any) => ({
              id: file.id.toString(),
              name: file.name,
              size: file.size || 0,
              status: file.status || 'uploaded',
              createdAt: file.created_at || file.createdAt || new Date().toISOString(),
              type: file.type || 'application/octet-stream'
            })),
            pagination: {
              page: 1,
              pageSize: itemsPerPage,
              totalItems: fileArray.length,
              totalPages: Math.ceil(fileArray.length / itemsPerPage)
            }
          };
        }
        
        // Handle any other unexpected response format
        console.error('[FileVault Debug] Unknown response format:', responseData);
        return {
          data: [],
          pagination: {
            page: 1,
            pageSize: itemsPerPage,
            totalItems: 0,
            totalPages: 0
          }
        };
      }

      // Normal response handling for paginated data
      return {
        data: responseData.data.map((file: any) => ({
          id: file.id.toString(),
          name: file.name,
          size: file.size || 0,
          status: file.status || 'uploaded',
          createdAt: file.created_at || file.createdAt || new Date().toISOString(),
          type: file.type || 'application/octet-stream'
        })),
        pagination: responseData.pagination || {
          page: 1,
          pageSize: itemsPerPage,
          totalItems: responseData.data.length,
          totalPages: Math.ceil(responseData.data.length / itemsPerPage)
        }
      };
    }
  });

  // Extract files from the response
  const files = filesResponse?.data || [];
  const serverPagination = filesResponse?.pagination;
  
  useEffect(() => {
    console.log('[FileVault Debug] Component state updated:', {
      hasFiles: files.length > 0,
      isLoading,
      serverPagination,
      userContext: {
        isAuthenticated: !!user,
        companyId: user?.company_id
      },
      timestamp: new Date().toISOString()
    });
  }, [files, isLoading, user, serverPagination]);

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
    
    // Apply status filtering
    if (statusFilter !== 'all') {
      result = result.filter(file => file.status === statusFilter);
    }
    
    // Apply search query filtering using Fuse.js for fuzzy matching
    if (searchQuery) {
      // Configure Fuse.js with search options
      const fuseOptions = {
        includeScore: true,
        threshold: 0.4, // Lower threshold means stricter matching
        keys: ['name'] // Search in the name field
      };
      
      // Initialize Fuse with our files
      const fuse = new Fuse(result, fuseOptions);
      
      // Perform the fuzzy search
      const searchResults = fuse.search(searchQuery);
      console.log('[FileVault Debug] Fuse.js search results:', {
        query: searchQuery,
        resultCount: searchResults.length,
        results: searchResults.map(r => ({ 
          name: r.item.name, 
          score: r.score 
        }))
      });
      
      // Extract the items from the Fuse.js results
      result = searchResults.map(result => result.item);
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

  // If we have server pagination, use the direct response from the server
  // Otherwise, use client-side pagination for uploading files etc.
  const paginatedFiles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    if (!searchQuery && statusFilter === 'all' && !uploadingFiles.length) {
      // When using server data with pagination, apply proper slicing based on current page
      const startIdx = (currentPage - 1) * itemsPerPage;
      const endIdx = Math.min(startIdx + itemsPerPage, files.length);
      const slicedFiles = files.slice(startIdx, endIdx);
      
      console.log('[FileVault Debug] Using server pagination with client-side slicing:', {
        page: currentPage,
        totalItems: serverPagination?.totalItems || 0,
        itemsPerPage,
        startIdx,
        endIdx,
        availableFiles: files.length,
        displayedFiles: slicedFiles.length
      });
      
      return slicedFiles;
    } else {
      // Use client-side filtering and pagination when filters are applied
      const result = filteredFiles.slice(startIndex, endIndex);

      console.log('[FileVault Debug] Using client-side pagination:', {
        page: currentPage,
        startIndex,
        endIndex,
        totalItems: filteredFiles.length,
        pageItems: result.length
      });

      return result;
    }
  }, [files, filteredFiles, currentPage, itemsPerPage, searchQuery, statusFilter, uploadingFiles.length, serverPagination]);

  useEffect(() => {
    setSelectedFiles(new Set());
  }, [currentPage]);

  // If no filtering, use server pagination, otherwise calculate on client
  const totalPages = useMemo(() => {
    if (!searchQuery && statusFilter === 'all' && !uploadingFiles.length) {
      // Server-side pagination
      return serverPagination?.totalPages || 1;
    } else {
      // Client-side pagination
      return Math.ceil(filteredFiles.length / itemsPerPage);
    }
  }, [filteredFiles.length, itemsPerPage, searchQuery, statusFilter, uploadingFiles.length, serverPagination]);

  // Refetch when page changes to get new data from server
  useEffect(() => {
    // Only refetch from server if we're using server-side pagination
    if (!searchQuery && statusFilter === 'all' && !uploadingFiles.length) {
      // Invalidate the query to trigger a refetch with the new page
      queryClient.invalidateQueries({ 
        queryKey: ['/api/files', { company_id: user?.company_id, page: currentPage, pageSize: itemsPerPage }] 
      });
    }
  }, [currentPage, queryClient, searchQuery, statusFilter, uploadingFiles.length, user?.company_id, itemsPerPage]);
  
  // Listen for WebSocket file_vault_update events to refresh file list automatically
  useEffect(() => {
    console.log('[FileVault Debug] Setting up WebSocket listener for file vault updates');
    
    // This function will be called whenever a file_vault_update event is received
    const handleFileVaultUpdate = (payload: any) => {
      console.log('[FileVault Debug] Received file_vault_update event:', payload);
      
      // Check if this update is for our company
      if (payload.companyId && user?.company_id && payload.companyId === user.company_id) {
        console.log('[FileVault Debug] Refreshing file list for company:', payload.companyId);
        
        // Invalidate and refetch the files query
        queryClient.invalidateQueries({ 
          queryKey: ['/api/files', { company_id: user?.company_id, page: currentPage, pageSize: itemsPerPage }] 
        });
      }
    };
    
    // We need to access the global WebSocket service
    if (typeof window !== 'undefined') {
      // Add event listener for the file_vault_update message type
      window.addEventListener('file_vault_update', (event: any) => {
        if (event.detail) {
          handleFileVaultUpdate(event.detail);
        }
      });
      
      // Also listen for generic ws_message events that might contain file_vault_update
      window.addEventListener('ws_message', (event: any) => {
        // Check if this is a file vault update event
        if (event.detail?.type === 'file_vault_update' && event.detail?.payload) {
          handleFileVaultUpdate(event.detail.payload);
        }
      });
    }
    
    // Keep references to the actual event listeners so we can remove them properly
    const fileVaultEventHandler = (event: any) => {
      if (event.detail) {
        handleFileVaultUpdate(event.detail);
      }
    };
    
    const wsMessageEventHandler = (event: any) => {
      // Check if this is a file vault update event
      if (event.detail?.type === 'file_vault_update' && event.detail?.payload) {
        handleFileVaultUpdate(event.detail.payload);
      }
    };
    
    // We need to access the global WebSocket service
    if (typeof window !== 'undefined') {
      // Add event listener for the file_vault_update message type
      window.addEventListener('file_vault_update', fileVaultEventHandler);
      
      // Also listen for generic ws_message events that might contain file_vault_update
      window.addEventListener('ws_message', wsMessageEventHandler);
    }
    
    return () => {
      // Clean up event listeners when component unmounts
      if (typeof window !== 'undefined') {
        // Remove event listeners by referencing the same function instances
        window.removeEventListener('file_vault_update', fileVaultEventHandler);
        window.removeEventListener('ws_message', wsMessageEventHandler);
      }
    };
  }, [queryClient, user?.company_id, currentPage, itemsPerPage]);

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
    
    // Create an upload toast with a unique ID
    const toastId = unifiedToast.fileUploadProgress(file.name);
    
    console.log('[FileVault] Created upload toast with ID:', toastId);
    
    try {
      // Perform the actual upload
      const result = await uploadMutation.mutateAsync(formData);
      console.log('[FileVault] Upload completed:', result);
      
      // Update local state
      setUploadingFiles(prev => prev.filter(f => f.id !== tempId));
      
      // Invalidate with the complete query key structure to match our fetch
      queryClient.invalidateQueries({ 
        queryKey: ['/api/files', { company_id: user?.company_id, page: currentPage, pageSize: itemsPerPage }] 
      });

      // First explicitly dismiss the uploading toast
      // Need to use the dismiss method directly from the toast reference
      if (toastId && toastId.dismiss) {
        toastId.dismiss();
        console.log('[FileVault] Successfully dismissed upload toast');
      }
      
      // Then after a brief delay, show the success toast
      setTimeout(() => {
        unifiedToast.fileUploadSuccess(file.name);
        console.log('[FileVault] Showed success toast for file:', file.name);
      }, 300);
      
    } catch (error) {
      console.error('[FileVault Debug] Upload error:', {
        error,
        fileName: file.name,
        tempId
      });

      // Update UI for failed upload
      setUploadingFiles(prev =>
        prev.map(f =>
          f.id === tempId
            ? { ...f, status: 'error' as FileStatus }
            : f
        )
      );

      // First explicitly dismiss the uploading toast
      // Need to use the dismiss method directly from the toast reference
      if (toastId && toastId.dismiss) {
        toastId.dismiss();
        console.log('[FileVault] Dismissed error upload toast');
      }
      
      // Then show the error toast
      setTimeout(() => {
        unifiedToast.fileUploadError(
          file.name, 
          error instanceof Error ? error.message : "Upload failed"
        );
        console.log('[FileVault] Showed error toast for file:', file.name);
      }, 300);
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
      // For bulk uploads, we need special handling to ensure toasts work properly
      if (files.length > 1) {
        console.log('[FileVault] Processing bulk upload of', files.length, 'files');
        
        // Process files one by one, with a slight delay between success toasts
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          
          // Upload each file
          await uploadFile(file);
          
          // For bulk uploads, add a small delay between files to prevent toast overlap
          if (i < files.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      } else {
        // Single file upload - normal flow
        await uploadFile(files[0]);
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
      {/* Add the tutorial manager for file-vault */}
      <TutorialManager tabName="file-vault" />
      
      {!user ? (
        <div className="flex items-center justify-center h-[50vh]">
          <LoadingSpinner size="sm" className="text-primary" />
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
            <DragDropProvider>
              <FileUploadZone
                acceptedFormats={ACCEPTED_FORMATS}
                disabled={isUploading}
                onFilesAccepted={handleFileUpload}
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isUploading) {
                    fileInputRef.current?.click();
                  }
                }}
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
                {(!searchQuery && statusFilter === 'all' && !uploadingFiles.length) ? (
                  // Server pagination display
                  files.length > 0 ? (
                    `Showing ${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(
                      currentPage * itemsPerPage, 
                      serverPagination?.totalItems || 0
                    )} of ${serverPagination?.totalItems || 0} files`
                  ) : (
                    'No files to display'
                  )
                ) : (
                  // Client-side pagination display
                  filteredFiles.length > 0 ? (
                    `Showing ${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(
                      currentPage * itemsPerPage, 
                      filteredFiles.length
                    )} of ${filteredFiles.length} files`
                  ) : (
                    'No files to display'
                  )
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