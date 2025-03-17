import React from 'react';
import { DocumentRow } from './DocumentRow';
import { getCardFields, type CardField } from '@/services/cardService';
import { useQuery } from '@tanstack/react-query';
import { processDocuments } from '@/services/documentProcessingService';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

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
  uploadedFiles: initialFiles 
}: DocumentProcessingStepProps) {
  const { toast } = useToast();
  const [processingError, setProcessingError] = React.useState<string | null>(null);
  const [currentProcessingIndex, setCurrentProcessingIndex] = React.useState<number>(-1);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [files, setFiles] = React.useState<UploadedFile[]>(initialFiles);

  // Fetch card fields using React Query
  const { data: cardFields, isLoading: isLoadingFields } = useQuery<CardField[]>({
    queryKey: ['/api/card/fields']
  });

  React.useEffect(() => {
    console.log('[DocumentProcessingStep] Component mounted:', {
      companyName,
      uploadedFilesCount: files.length,
      cardFieldsLoaded: !!cardFields,
      timestamp: new Date().toISOString()
    });
  }, []);

  // Process next file in queue
  const processNextFile = React.useCallback(async () => {
    if (!cardFields) {
      console.log('[DocumentProcessingStep] Waiting for card fields to load');
      return;
    }

    if (isProcessing) {
      console.log('[DocumentProcessingStep] Already processing a file');
      return;
    }

    // Get next unprocessed file
    const nextIndex = files.findIndex(
      (file) => file.status === 'uploaded' && file.id
    );

    console.log('[DocumentProcessingStep] Looking for next file to process:', {
      filesCount: files.length,
      fileDetails: files.map(f => ({
        id: f.id,
        name: f.file.name,
        status: f.status,
      })),
      foundIndex: nextIndex,
      timestamp: new Date().toISOString()
    });

    if (nextIndex === -1) {
      console.log('[DocumentProcessingStep] No more files to process');
      setIsProcessing(false);
      setCurrentProcessingIndex(-1);
      return;
    }

    setCurrentProcessingIndex(nextIndex);
    setIsProcessing(true);

    const fileToProcess = files[nextIndex];
    console.log('[DocumentProcessingStep] Starting to process file:', {
      fileId: fileToProcess.id,
      fileName: fileToProcess.file.name,
      index: nextIndex,
      timestamp: new Date().toISOString()
    });

    try {
      // Update file status to processing
      setFiles(prevFiles => prevFiles.map((file, index) => 
        index === nextIndex ? { ...file, status: 'processing' } : file
      ));

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
          setFiles(prevFiles => prevFiles.map((file, index) => 
            index === nextIndex ? {
              ...file,
              status: result.status,
              answersFound: result.answersFound,
              error: undefined
            } : file
          ));
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

      // Update file status to error
      setFiles(prevFiles => prevFiles.map((file, index) => 
        index === nextIndex ? {
          ...file,
          status: 'error',
          error: error.message
        } : file
      ));
    } finally {
      setIsProcessing(false);
      setCurrentProcessingIndex(-1);

      // Process next file in queue after a short delay
      setTimeout(() => {
        processNextFile();
      }, 500);
    }
  }, [files, cardFields, isProcessing, toast]);

  // Start processing when component mounts or new files are added
  React.useEffect(() => {
    if (isLoadingFields) {
      console.log('[DocumentProcessingStep] Waiting for card fields to load');
      return;
    }

    if (!cardFields) {
      console.log('[DocumentProcessingStep] No card fields available');
      return;
    }

    if (!isProcessing && files.some(f => f.status === 'uploaded')) {
      console.log('[DocumentProcessingStep] Starting document processing queue:', {
        filesCount: files.length,
        cardFieldsCount: cardFields.length,
        files: files.map(f => ({
          id: f.id,
          name: f.file.name,
          status: f.status
        })),
        timestamp: new Date().toISOString()
      });
      processNextFile();
    }
  }, [files, cardFields, isProcessing, processNextFile, isLoadingFields]);

  // Update local files state when initialFiles changes
  React.useEffect(() => {
    setFiles(initialFiles);
  }, [initialFiles]);

  if (isLoadingFields) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <LoadingSpinner size="lg" className="text-blue-500" />
        <span className="ml-2 text-muted-foreground">Loading document processing configuration...</span>
      </div>
    );
  }

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
        {files.map((uploadedFile, index) => (
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