import React, { useState } from 'react';
import { FileUploadZone } from '@/components/files/FileUploadZone';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface DocumentCategory {
  id: string;
  name: string;
  acceptedFormats?: string;
}

const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  {
    id: 'soc2',
    name: 'SOC 2 Audit Report',
    acceptedFormats: '.PDF, .DOC, .DOCX'
  },
  {
    id: 'iso27001',
    name: 'ISO 27001 Certification',
    acceptedFormats: '.PDF, .DOC, .DOCX, .PNG, .JPG'
  },
  {
    id: 'pentest',
    name: 'Penetration Test Report',
    acceptedFormats: '.PDF, .DOC, .DOCX'
  },
  {
    id: 'bcp',
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

export function DocumentUploadStep({ onFilesUpdated, companyName }: DocumentUploadStepProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Upload failed');
        }

        return await res.json();
      } catch (error) {
        console.error('[Document Upload] Upload error:', error);
        throw error;
      }
    }
  });

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      await uploadMutation.mutateAsync(formData);

      // Update UI and trigger parent callback
      setUploadedFiles(prev => [...prev, file]);
      onFilesUpdated?.([...uploadedFiles, file]);

      // Show success toast
      toast({
        title: "Success",
        description: `${file.name} uploaded successfully`,
        duration: 3000,
      });

      // Invalidate files query to refresh file list
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
    } catch (error) {
      toast({
        title: "Upload Error",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const handleFilesAccepted = async (files: File[]) => {
    if (isUploading) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        await uploadFile(file);
      }
    } finally {
      setIsUploading(false);
    }
  };

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
          const fileCount = uploadedFiles.length;
          const hasFiles = fileCount > 0;

          return (
            <div 
              key={category.id}
              className={cn(
                "p-4 rounded-lg border-2",
                hasFiles 
                  ? "border-green-600/30 bg-green-50/50" 
                  : "border-gray-200 bg-gray-50/50"
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">{category.name}</h3>
                <Badge 
                  variant={hasFiles ? "default" : "secondary"} 
                  className="text-xs"
                >
                  {hasFiles ? `${fileCount} files` : '0'}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}