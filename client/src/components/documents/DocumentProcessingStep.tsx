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
  const [currentProcessingIndex, setCurrentProcessingIndex] = React.useState<number>(-1);
  const [isProcessing, setIsProcessing] = React.useState(false);

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

  // Process next file in queue
  const processNextFile = React.useCallback(async () => {
    if (!cardFields || isProcessing) return;

    // Get next unprocessed file
    const nextIndex = uploadedFiles.findIndex(
      (file) => file.status === 'uploaded' && file.id
    );

    if (nextIndex === -1) {
      console.log('[DocumentProcessingStep] No more files to process');
      setIsProcessing(false);
      setCurrentProcessingIndex(-1);
      return;
    }

    setCurrentProcessingIndex(nextIndex);
    setIsProcessing(true);

    const fileToProcess = uploadedFiles[nextIndex];
    console.log('[DocumentProcessingStep] Starting to process file:', {
      fileId: fileToProcess.id,
      fileName: fileToProcess.file.name,
      index: nextIndex,
      timestamp: new Date().toISOString()
    });

    try {
      // Process single file
      await processDocuments(
        [fileToProcess.id!],
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
              description: result.error || 'Failed to process document'
            });
            return;
          }

          // Update file status
          uploadedFiles[nextIndex].status = result.status;
          uploadedFiles[nextIndex].answersFound = result.answersFound;
          uploadedFiles[nextIndex].error = undefined;
        }
      );
    } catch (error: any) {
      console.error('[DocumentProcessingStep] Processing error:', {
        error: error.message,
        timestamp: new Date().toISOString()
      });

      setProcessingError(error.message);
      toast({
        variant: 'destructive',
        title: 'Processing Error',
        description: 'Failed to process document. Please try again.'
      });
    } finally {
      setIsProcessing(false);
      setCurrentProcessingIndex(-1);

      // Process next file in queue
      processNextFile();
    }
  }, [uploadedFiles, cardFields, isProcessing, toast]);

  // Start processing when component mounts or new files are added
  React.useEffect(() => {
    if (!isProcessing && uploadedFiles.some(f => f.status === 'uploaded')) {
      console.log('[DocumentProcessingStep] Starting document processing queue');
      processNextFile();
    }
  }, [uploadedFiles, isProcessing, processNextFile]);

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
        {uploadedFiles.map((uploadedFile, index) => (
          <DocumentRow 
            key={uploadedFile.id || uploadedFile.file.name} 
            file={{
              name: uploadedFile.file.name,
              size: uploadedFile.file.size,
              status: uploadedFile.status,
              answersFound: uploadedFile.answersFound,
              error: uploadedFile.error
            }}
            isActive={index === currentProcessingIndex}
          />
        ))}
      </div>
    </div>
  );
}

export default DocumentProcessingStep;