import React, { useState, useCallback, useEffect } from 'react';
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

interface DocumentUploadStepProps {
  onFilesUpdated?: (files: File[]) => void;
  companyName: string;
}

interface DocumentCount {
  category: string;
  count: number;
  isProcessing?: boolean;
}

export function DocumentUploadStep({ onFilesUpdated, companyName }: DocumentUploadStepProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [documentCounts, setDocumentCounts] = useState<Record<string, DocumentCount>>({});
  const [isUploading, setIsUploading] = useState(false);
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

      // Show loading toast
      toast({
        title: "Processing Document",
        description: `Uploading and classifying ${file.name}...`,
      });

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
        category: result.document_category,
        confidence: result.classification_confidence
      });

      return result;
    } catch (error) {
      console.error('[DocumentUploadStep] Upload error:', error);
      throw error;
    }
  }, []);

  const handleFilesAccepted = async (files: File[]) => {
    console.log('[DocumentUploadStep] Files accepted:', {
      fileCount: files.length,
      files: files.map(f => ({ name: f.name, size: f.size, type: f.type }))
    });

    setIsUploading(true);

    try {
      const newFiles = [...uploadedFiles];

      for (const file of files) {
        try {
          await uploadFile(file);
          newFiles.push(file);

          toast({
            title: "Upload Successful",
            description: `${file.name} has been uploaded and classified.`,
          });
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

      setUploadedFiles(newFiles);
      onFilesUpdated?.(newFiles);
    } finally {
      setIsUploading(false);
    }
  };

  // Update document counts when receiving WebSocket messages
  useEffect(() => {
    const socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'COUNT_UPDATE') {
        setDocumentCounts(prev => ({
          ...prev,
          [data.category]: {
            category: data.category,
            count: (prev[data.category]?.count || 0) + data.count,
            isProcessing: false
          }
        }));
      }

      if (data.type === 'CLASSIFICATION_UPDATE') {
        // Mark document as processed
        setDocumentCounts(prev => ({
          ...prev,
          [data.category]: {
            ...prev[data.category],
            isProcessing: false
          }
        }));
      }
    };

    return () => {
      socket.close();
    };
  }, []);

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