import React, { useCallback } from 'react';
import { FileUploadZone } from '@/components/files/FileUploadZone';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

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

interface UploadedFile {
  file: File;
  id?: number;
  status: 'uploaded' | 'processing' | 'classified';
  category?: string;
  answersFound?: number;
}

interface DocumentCount {
  category: string;
  count: number;
  isProcessing?: boolean;
}

interface DocumentUploadStepProps {
  onFilesUpdated: (files: File[]) => void;
  companyName: string;
  uploadedFiles: UploadedFile[];
  updateFileMetadata: (fileId: number, metadata: Partial<UploadedFile>) => void;
  documentCounts: Record<string, DocumentCount>;
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

      // Log the received file ID and metadata
      console.log('[DocumentUploadStep] Upload successful:', {
        fileId: result.id,
        fileName: file.name,
        category: result.document_category,
        answersFound: result.answers_found || 0,
        timestamp: new Date().toISOString()
      });

      // Update file metadata with the correct database ID
      updateFileMetadata(result.id, {
        id: result.id, // Ensure we're using the database-assigned ID
        status: 'classified',
        category: result.document_category,
        answersFound: result.answers_found || 0
      });

      toast({
        title: "Upload Successful",
        description: `${file.name} has been uploaded and classified.`,
      });

      return result;
    } catch (error) {
      console.error('[DocumentUploadStep] Upload error:', error);
      throw error;
    }
  }, [updateFileMetadata, toast]);

  const handleFilesAccepted = async (files: File[]) => {
    console.log('[DocumentUploadStep] Files accepted:', {
      fileCount: files.length,
      files: files.map(f => ({ name: f.name, size: f.size, type: f.type }))
    });

    setIsUploading(true);

    try {
      // Create new uploaded file entries first
      const newFiles = files.map(file => ({
        file,
        status: 'uploaded' as const
      }));

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

      if (data.type === 'COUNT_UPDATE') {
        console.log('[DocumentUploadStep] Updating document count:', {
          category: data.category,
          countChange: data.count
        });

        updateDocumentCounts(data.category, data.count, false);
      }

      if (data.type === 'CLASSIFICATION_UPDATE') {
        console.log('[DocumentUploadStep] Classification update received:', {
          fileId: data.fileId,
          category: data.category,
          answersFound: data.answers_found
        });

        updateDocumentCounts(data.category, 0, false);
      }
    };

    return () => {
      console.log('[DocumentUploadStep] Closing WebSocket connection');
      socket.close();
    };
  }, [updateDocumentCounts]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        1. Upload {companyName}'s Compliance Documentation
      </h1>

      {/* File Upload Zone */}
      <FileUploadZone
        onFilesAccepted={handleFilesAccepted}
        acceptedFormats=".CSV, .DOC, .DOCX, .ODT, .PDF, .RTF, .TXT, .WPD, .WPF, .JPG, .JPEG, .PNG, .GIF, .WEBP, .SVG"
        className="min-h-[200px]"
        disabled={isUploading}
      />

      {/* Category Grid */}
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