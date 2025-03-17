import React from 'react';
import { DocumentRow } from './DocumentRow';
import { getCardFields, type CardField } from '@/services/cardService';
import { useQuery } from '@tanstack/react-query';

interface UploadedFile {
  file: File;
  id?: number;
  status: 'uploaded' | 'processing' | 'classified';
  answersFound?: number;
}

interface DocumentProcessingStepProps {
  companyName: string;
  uploadedFiles: UploadedFile[];
}

export function DocumentProcessingStep({ 
  companyName,
  uploadedFiles 
}: DocumentProcessingStepProps) {
  // Fetch card fields using React Query
  const { data: cardFields, isLoading: isLoadingFields } = useQuery({
    queryKey: ['/api/card/fields'],
    onSuccess: (data) => {
      console.log('[DocumentProcessingStep] Card fields loaded:', {
        count: data?.length,
        timestamp: new Date().toISOString()
      });
    }
  });

  React.useEffect(() => {
    console.log('[DocumentProcessingStep] Rendering with files:', {
      fileCount: uploadedFiles.length,
      files: uploadedFiles.map(f => ({
        name: f.file.name,
        status: f.status,
        answersFound: f.answersFound
      }))
    });
  }, [uploadedFiles]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        2. Extracting Compliance Information
      </h1>

      {/* Document List */}
      <div className="space-y-2">
        {uploadedFiles.map((uploadedFile) => (
          <DocumentRow 
            key={uploadedFile.id || uploadedFile.file.name} 
            file={{
              name: uploadedFile.file.name,
              size: uploadedFile.file.size,
              status: uploadedFile.status,
              answersFound: uploadedFile.answersFound
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default DocumentProcessingStep;