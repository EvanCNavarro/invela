import React, { useState } from 'react';
import { FileUploadZone } from '@/components/files/FileUploadZone';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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

  const handleFilesAccepted = (files: File[]) => {
    const newFiles = [...uploadedFiles, ...files];
    setUploadedFiles(newFiles);
    onFilesUpdated?.(newFiles);
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