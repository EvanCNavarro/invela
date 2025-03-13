import React, { useState } from 'react';
import { FileUploadZone } from '@/components/files/FileUploadZone';
import { FileUploadPreview } from '@/components/files/FileUploadPreview';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';

interface DocumentCategory {
  id: string;
  name: string;
  description?: string;
  required: boolean;
  acceptedFormats: string;
  files: File[];
}

interface DocumentUploadStepProps {
  onFilesUpdated?: (files: Record<string, File[]>) => void;
}

export function DocumentUploadStep({ onFilesUpdated }: DocumentUploadStepProps) {
  const [categories] = useState<DocumentCategory[]>([
    {
      id: 'soc2',
      name: 'SOC 2 Audit Report',
      required: true,
      acceptedFormats: '.PDF, .DOC, .DOCX',
      files: []
    },
    {
      id: 'iso27001',
      name: 'ISO 27001 Certification',
      required: true,
      acceptedFormats: '.PDF, .DOC, .DOCX, .PNG, .JPG',
      files: []
    },
    {
      id: 'pentest',
      name: 'Penetration Test Report',
      required: true,
      acceptedFormats: '.PDF, .DOC, .DOCX',
      files: []
    },
    {
      id: 'bcp',
      name: 'Business Continuity Plan',
      required: false,
      acceptedFormats: '.PDF, .DOC, .DOCX',
      files: []
    },
    {
      id: 'other',
      name: 'Other Documents',
      required: false,
      description: 'Additional supporting documentation',
      acceptedFormats: '.PDF, .DOC, .DOCX, .PNG, .JPG, .JPEG',
      files: []
    }
  ]);

  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File[]>>({});

  const handleFilesAccepted = (categoryId: string, files: File[]) => {
    const updatedFiles = {
      ...uploadedFiles,
      [categoryId]: [...(uploadedFiles[categoryId] || []), ...files]
    };
    setUploadedFiles(updatedFiles);
    onFilesUpdated?.(updatedFiles);
  };

  const handleRemoveFile = (categoryId: string, fileIndex: number) => {
    const updatedFiles = {
      ...uploadedFiles,
      [categoryId]: uploadedFiles[categoryId]?.filter((_, i) => i !== fileIndex) || []
    };
    setUploadedFiles(updatedFiles);
    onFilesUpdated?.(updatedFiles);
  };

  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <div 
          key={category.id}
          className={cn(
            "p-6 rounded-lg border-2",
            uploadedFiles[category.id]?.length 
              ? "border-primary/30 bg-primary/5" 
              : "border-muted"
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{category.name}</h3>
                {category.required && (
                  <Badge variant="secondary">Required</Badge>
                )}
                {uploadedFiles[category.id]?.length > 0 && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </div>
              {category.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {category.description}
                </p>
              )}
            </div>
            {uploadedFiles[category.id]?.length > 0 && (
              <Badge variant="outline">
                {uploadedFiles[category.id].length} file{uploadedFiles[category.id].length !== 1 ? 's' : ''} uploaded
              </Badge>
            )}
          </div>

          <FileUploadZone
            onFilesAccepted={(files) => handleFilesAccepted(category.id, files)}
            acceptedFormats={category.acceptedFormats}
            variant="row"
            className="mb-4"
          />

          {uploadedFiles[category.id]?.map((file, index) => (
            <FileUploadPreview
              key={`${file.name}-${index}`}
              file={file}
              variant="compact"
              onRemove={() => handleRemoveFile(category.id, index)}
              className="mb-2"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
