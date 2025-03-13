import React, { useState } from 'react';
import { FileUploadZone } from '@/components/files/FileUploadZone';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface DocumentCategory {
  id: string;
  name: string;
  description?: string;
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
    description: 'Additional supporting documentation',
    acceptedFormats: '.PDF, .DOC, .DOCX, .PNG, .JPG, .JPEG'
  }
];

interface DocumentUploadStepProps {
  onFilesUpdated?: (files: File[]) => void;
}

export function DocumentUploadStep({ onFilesUpdated }: DocumentUploadStepProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleFilesAccepted = (files: File[]) => {
    const newFiles = [...uploadedFiles, ...files];
    setUploadedFiles(newFiles);
    onFilesUpdated?.(newFiles);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Upload Documents</h1>

      <FileUploadZone
        onFilesAccepted={handleFilesAccepted}
        acceptedFormats=".CSV, .DOC, .DOCX, .ODT, .PDF, .RTF, .TXT, .WPD, .WPF, .JPG, .JPEG, .PNG, .GIF, .WEBP, .SVG"
        className="min-h-[200px]"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {DOCUMENT_CATEGORIES.map((category) => (
          <div 
            key={category.id}
            className="p-4 rounded-lg border-2 border-muted bg-muted/5"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">{category.name}</h3>
              <Badge variant="secondary" className="text-xs">
                {uploadedFiles.length} files
              </Badge>
            </div>
            {category.description && (
              <p className="text-xs text-muted-foreground">
                {category.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}