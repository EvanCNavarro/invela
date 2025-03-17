import React from 'react';
import { DocumentRow } from './DocumentRow';
import { getCardFields, type CardField } from '@/services/cardService';
import { useQuery } from '@tanstack/react-query';
import { processDocuments } from '@/services/documentProcessingService';
import { useToast } from '@/hooks/use-toast';

interface UploadedFile {
  file: File;
  id?: number;
  status: 'uploaded' | 'processing' | 'classified' | 'error';
  answersFound?: number;
  error?: string;
}

interface DocumentProcessingStepProps {
  companyName: string;
  uploadedFiles: UploadedFile[];
}

export function DocumentProcessingStep({ 
  companyName,
  uploadedFiles 
}: DocumentProcessingStepProps) {
  const { toast } = useToast();
  const [processingError, setProcessingError] = React.useState<string | null>(null);

  // Fetch card fields using React Query
  const { data: cardFields, isLoading: isLoadingFields } = useQuery<CardField[]>({
    queryKey: ['/api/card/fields']
  });

  React.useEffect(() => {
    console.log('[DocumentProcessingStep] Component mounted:', {
      companyName,
      uploadedFilesCount: uploadedFiles.length,
      timestamp: new Date().toISOString()
    });

    return () => {
      console.log('[DocumentProcessingStep] Component unmounting');
    };
  }, []);

  React.useEffect(() => {
    console.log('[DocumentProcessingStep] Card fields loaded:', {
      count: cardFields?.length,
      fields: cardFields?.map(f => f.field_key),
      timestamp: new Date().toISOString()
    });
  }, [cardFields]);

  React.useEffect(() => {
    console.log('[DocumentProcessingStep] Files state updated:', {
      fileCount: uploadedFiles.length,
      files: uploadedFiles.map(f => ({
        name: f.file.name,
        id: f.id,
        status: f.status,
        answersFound: f.answersFound,
        error: f.error
      })),
      timestamp: new Date().toISOString()
    });
  }, [uploadedFiles]);

  // Start processing files when component mounts
  React.useEffect(() => {
    // Clear any previous errors
    setProcessingError(null);

    if (!cardFields || uploadedFiles.length === 0) {
      console.log('[DocumentProcessingStep] Waiting for prerequisites:', {
        hasCardFields: !!cardFields,
        uploadedFilesCount: uploadedFiles.length,
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log('[DocumentProcessingStep] Starting document processing:', {
      fileCount: uploadedFiles.length,
      files: uploadedFiles.map(f => ({
        name: f.file.name,
        id: f.id,
        status: f.status
      })),
      timestamp: new Date().toISOString()
    });

    // Get file IDs for processing
    const fileIds = uploadedFiles
      .filter(f => f.id && f.status === 'uploaded')
      .map(f => f.id as number);

    if (fileIds.length === 0) {
      console.log('[DocumentProcessingStep] No files to process:', {
        reason: 'No uploaded files with IDs found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log('[DocumentProcessingStep] Initiating processing for files:', {
      fileIds,
      cardFieldCount: cardFields.length,
      timestamp: new Date().toISOString()
    });

    // Process files
    processDocuments(
      fileIds,
      cardFields,
      (result) => {
        console.log('[DocumentProcessingStep] Processing progress update:', {
          status: result.status,
          answersFound: result.answersFound,
          error: result.error,
          timestamp: new Date().toISOString()
        });

        if (result.status === 'error') {
          setProcessingError(result.error || 'An unknown error occurred');
          toast({
            variant: 'destructive',
            title: 'Processing Error',
            description: result.error || 'Failed to process documents'
          });
          return;
        }

        // Update file statuses based on processing results
        uploadedFiles.forEach(file => {
          if (file.id && fileIds.includes(file.id)) {
            console.log('[DocumentProcessingStep] Updating file status:', {
              fileId: file.id,
              fileName: file.file.name,
              oldStatus: file.status,
              newStatus: result.status,
              answersFound: result.answersFound,
              timestamp: new Date().toISOString()
            });

            file.status = result.status;
            file.answersFound = result.answersFound;
            file.error = undefined; // Clear any previous errors
          }
        });
      }
    ).catch(error => {
      console.error('[DocumentProcessingStep] Processing error:', {
        error: error.message,
        timestamp: new Date().toISOString()
      });

      setProcessingError(error.message);
      toast({
        variant: 'destructive',
        title: 'Processing Error',
        description: 'Failed to process documents. Please try again.'
      });
    });
  }, [uploadedFiles, cardFields]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        2. Extracting Compliance Information
      </h1>

      {processingError && (
        <div className="p-4 mb-4 text-sm text-red-800 bg-red-100 rounded-lg">
          <p className="font-medium">Error processing documents:</p>
          <p>{processingError}</p>
        </div>
      )}

      {/* Document List */}
      <div className="space-y-2">
        {uploadedFiles.map((uploadedFile) => (
          <DocumentRow 
            key={uploadedFile.id || uploadedFile.file.name} 
            file={{
              name: uploadedFile.file.name,
              size: uploadedFile.file.size,
              status: uploadedFile.status,
              answersFound: uploadedFile.answersFound,
              error: uploadedFile.error
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default DocumentProcessingStep;