import React, { useCallback } from 'react';
import { FileUploadZone } from '@/components/files/FileUploadZone';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { DocumentStatus, UploadedFile } from './types';

interface DocumentCategory {
  id: string;
  name: string;
  acceptedFormats?: string;
}

const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  {
    id: 'soc2_audit',
    name: 'SOC 2 Audit Report',
    acceptedFormats: '.PDF, .DOC, .DOCX'
  },
  {
    id: 'iso27001_cert',
    name: 'ISO 27001 Certification',
    acceptedFormats: '.PDF, .DOC, .DOCX, .PNG, .JPG'
  },
  {
    id: 'pentest_report',
    name: 'Penetration Test Report',
    acceptedFormats: '.PDF, .DOC, .DOCX'
  },
  {
    id: 'business_continuity',
    name: 'Business Continuity Plan',
    acceptedFormats: '.PDF, .DOC, .DOCX'
  },
  {
    id: 'other',
    name: 'Other Documents',
    acceptedFormats: '.PDF, .DOC, .DOCX, .PNG, .JPG, .JPEG'
  }
];

interface DocumentUploadStepProps {
  onFilesUpdated: (files: File[]) => void;
  companyName: string;
  uploadedFiles: UploadedFile[];
  updateFileMetadata: (fileId: number, metadata: Partial<UploadedFile>) => void;
  documentCounts: Record<string, { category: string; count: number; isProcessing?: boolean }>;
  updateDocumentCounts: (category: string, count: number, isProcessing?: boolean) => void;
}

export function DocumentUploadStep({
  onFilesUpdated,
  companyName,
  uploadedFiles,
  updateFileMetadata,
  documentCounts,
  updateDocumentCounts
}: DocumentUploadStepProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const { toast } = useToast();

  const uploadFile = useCallback(async (file: File) => {
    console.log('[DocumentUploadStep] Starting file upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString()
    });

    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log('[DocumentUploadStep] Sending file to server');

      const response = await fetch('/api/files', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      console.log('[DocumentUploadStep] Upload successful:', {
        fileId: result.id,
        fileName: file.name,
        category: result.document_category,
        answersFound: result.answers_found || 0,
        timestamp: new Date().toISOString()
      });

      // Update file metadata with the server-assigned ID and status
      updateFileMetadata(result.id, {
        id: result.id,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploaded' as DocumentStatus,
        answersFound: result.answers_found || 0
      });

      // Update document counts directly after successful upload
      if (result.document_category) {
        updateDocumentCounts(result.document_category, 1);
      }

      toast({
        title: "Upload Successful",
        description: `${file.name} has been uploaded.`,
      });

      return result;
    } catch (error) {
      console.error('[DocumentUploadStep] Upload error:', error);
      throw error;
    }
  }, [updateFileMetadata, updateDocumentCounts, toast]);

  const handleFilesAccepted = async (files: File[]) => {
    console.log('[DocumentUploadStep] Files accepted:', {
      fileCount: files.length,
      files: files.map(f => ({ name: f.name, size: f.size, type: f.type }))
    });

    setIsUploading(true);
    toast({
      title: "Uploading Files",
      description: `Starting upload of ${files.length} file${files.length > 1 ? 's' : ''}...`,
    });

    try {
      // Add files to state first so UI updates immediately
      onFilesUpdated(files);

      // Then process each file
      for (const file of files) {
        try {
          await uploadFile(file);
        } catch (error) {
          console.error('[DocumentUploadStep] Error uploading file:', {
            fileName: file.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          });

          toast({
            title: "Upload Failed",
            description: `Failed to upload ${file.name}. Please try again.`,
            variant: "destructive",
          });
        }
      }
    } finally {
      setIsUploading(false);
    }
  };

  // WebSocket effect for real-time updates
  React.useEffect(() => {
    console.log('[DocumentUploadStep] Setting up WebSocket connection');
    const socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('[DocumentUploadStep] WebSocket message received:', data);

      if (data.type === 'UPLOAD_PROGRESS') {
        if (data.status === 'uploading') {
          toast({
            title: "Uploading File",
            description: `Uploading ${data.fileName}...`,
          });
        } else if (data.status === 'error') {
          toast({
            title: "Upload Error",
            description: data.error || `Failed to upload ${data.fileName}`,
            variant: "destructive",
          });
        }
      } else if (data.type === 'COUNT_UPDATE') {
        console.log('[DocumentUploadStep] Updating document count:', {
          category: data.category,
          countChange: data.count
        });
        updateDocumentCounts(data.category, data.count);
      }
    };

    return () => {
      console.log('[DocumentUploadStep] Closing WebSocket connection');
      socket.close();
    };
  }, [updateDocumentCounts, toast]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        1. Upload {companyName}'s Compliance Documentation
      </h1>

      <FileUploadZone
        onFilesAccepted={handleFilesAccepted}
        acceptedFormats=".CSV, .DOC, .DOCX, .ODT, .PDF, .RTF, .TXT, .WPD, .WPF, .JPG, .JPEG, .PNG, .GIF, .WEBP, .SVG"
        className="min-h-[200px]"
        disabled={isUploading}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {DOCUMENT_CATEGORIES.map((category) => {
          const countData = documentCounts[category.id] || { count: 0, isProcessing: false };

          return (
            <div
              key={category.id}
              className={cn(
                "p-4 rounded-lg border-2",
                countData.count > 0
                  ? "border-green-600/30 bg-green-50/50"
                  : "border-gray-200 bg-gray-50/50"
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">{category.name}</h3>
                <div className="flex items-center gap-2">
                  {countData.isProcessing && (
                    <LoadingSpinner size="sm" className="text-blue-500" />
                  )}
                  <Badge
                    variant={countData.count > 0 ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {countData.count}
                  </Badge>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}