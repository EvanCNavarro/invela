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
  status: 'uploading' | 'uploaded' | 'processing' | 'error';
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
  const [files, setFiles] = React.useState<UploadedFile[]>([]);

  // Fetch card fields using React Query
  const { data: cardFields, isLoading: isLoadingFields } = useQuery<CardField[]>({
    queryKey: ['/api/card/fields']
  });

  // Initialize files on mount and when initialFiles changes
  React.useEffect(() => {
    console.log('[DocumentProcessingStep] Initializing with files:', {
      companyName,
      uploadedFilesCount: initialFiles.length,
      fileDetails: initialFiles.map(f => ({
        id: f.id,
        name: f.file.name,
        status: f.status
      })),
      timestamp: new Date().toISOString()
    });

    setFiles(initialFiles);
  }, [initialFiles]);

  // Process next file in queue
  const processNextFile = React.useCallback(async () => {
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
        status: f.status
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

    const fileToProcess = files[nextIndex];
    setCurrentProcessingIndex(nextIndex);
    setIsProcessing(true);

    console.log('[DocumentProcessingStep] Starting to process file:', {
      fileId: fileToProcess.id,
      fileName: fileToProcess.file.name,
      status: fileToProcess.status,
      index: nextIndex,
      timestamp: new Date().toISOString()
    });

    try {
      // Update file status to processing
      setFiles(prevFiles => prevFiles.map((file, index) => 
        index === nextIndex ? { ...file, status: 'processing' } : file
      ));

      // Process single file
      const result = await processDocuments([fileToProcess.id!], cardFields!, (progress) => {
        console.log('[DocumentProcessingStep] Processing progress:', {
          fileId: fileToProcess.id,
          progress,
          timestamp: new Date().toISOString()
        });
      });

      console.log('[DocumentProcessingStep] Processing complete:', {
        fileId: fileToProcess.id,
        result,
        timestamp: new Date().toISOString()
      });

      // Update file with results
      setFiles(prevFiles => prevFiles.map((file, index) => 
        index === nextIndex ? {
          ...file,
          status: 'uploaded',
          answersFound: result.answersFound,
          error: undefined
        } : file
      ));

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
  }, [files, isProcessing, cardFields, toast]);

  // Start processing when component mounts, card fields load, or new files are added
  React.useEffect(() => {
    if (isLoadingFields) {
      console.log('[DocumentProcessingStep] Waiting for card fields to load');
      return;
    }

    if (!cardFields?.length) {
      console.error('[DocumentProcessingStep] No card fields available');
      return;
    }

    if (!isProcessing && files.some(f => f.status === 'uploaded')) {
      console.log('[DocumentProcessingStep] Starting document processing queue:', {
        filesCount: files.length,
        cardFieldsCount: cardFields.length,
        pendingFiles: files.filter(f => f.status === 'uploaded').map(f => ({
          id: f.id,
          name: f.file.name
        })),
        timestamp: new Date().toISOString()
      });
      processNextFile();
    }
  }, [files, cardFields, isProcessing, isLoadingFields, processNextFile]);

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