import React from 'react';
import { DocumentRow } from './DocumentRow';
import { getCardFields, type CardField } from '@/services/cardService';
import { useQuery } from '@tanstack/react-query';
import { startDocumentProcessing } from '@/services/documentProcessingService';

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
  const { data: cardFields, isLoading: isLoadingFields } = useQuery<CardField[]>({
    queryKey: ['/api/card/fields']
  });

  React.useEffect(() => {
    console.log('[DocumentProcessingStep] Card fields loaded:', {
      count: cardFields?.length,
      timestamp: new Date().toISOString()
    });
  }, [cardFields]);

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

  // Start processing files when component mounts
  React.useEffect(() => {
    if (!cardFields) return;

    console.log('[DocumentProcessingStep] Starting document processing for files:', {
      fileCount: uploadedFiles.length,
      files: uploadedFiles.map(f => ({
        name: f.file.name,
        status: f.status,
        answersFound: f.answersFound
      }))
    });

    // Process each uploaded file
    uploadedFiles.forEach((uploadedFile, index) => {
      if (uploadedFile.status === 'uploaded') {
        // Start processing after a delay to stagger the files
        setTimeout(() => {
          console.log('[DocumentProcessingStep] File transitioning to processing:', {
            fileName: uploadedFile.file.name,
            timestamp: new Date().toISOString()
          });

          startDocumentProcessing(
            uploadedFile.file,
            cardFields,
            (result) => {
              uploadedFile.status = result.status;
              uploadedFile.answersFound = result.answersFound;
            }
          ).catch(error => {
            console.error('[DocumentProcessingStep] Processing error:', {
              fileName: uploadedFile.file.name,
              error: error.message,
              timestamp: new Date().toISOString()
            });
          });
        }, index * 1000); // Stagger processing starts
      }
    });
  }, [uploadedFiles, cardFields]);

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