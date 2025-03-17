import React from 'react';
import { DocumentRow } from './DocumentRow';
import { getCardFields, type CardField } from '@/services/cardService';
import { useQuery } from '@tanstack/react-query';
import { processDocuments } from '@/services/documentProcessingService';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

enum DocumentStatus {
  uploading = 'uploading',
  uploaded = 'uploaded',
  processing = 'processing',
  processed = 'processed',
  error = 'error',
}

interface UploadedFile {
  id?: number;
  fileData: {
    name: string;
    size: number;
    type: string;
    lastModified: number;
  };
  status: DocumentStatus;
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
  const [processingQueue, setProcessingQueue] = React.useState<number[]>([]);
  const [isQueueInitialized, setIsQueueInitialized] = React.useState(false);

  // Fetch card fields using React Query
  const { data: cardFields, isLoading: isLoadingFields } = useQuery<CardField[]>({
    queryKey: ['/api/card/fields']
  });


  // Validate files before adding to queue
  const validateFiles = (filesToValidate: UploadedFile[]) => {
    console.log('[DocumentProcessingStep] Starting file validation:', {
      totalFiles: filesToValidate.length,
      fileDetails: filesToValidate.map(f => ({
        id: f.id,
        name: f.fileData.name,
        size: f.fileData.size,
        type: f.fileData.type,
        status: f.status
      })),
      timestamp: new Date().toISOString()
    });

    const validFiles = filesToValidate.filter(file => {
      const isValid = file.fileData && file.status === 'uploaded';
      if (!isValid) {
        console.log('[DocumentProcessingStep] Invalid file found:', {
          fileId: file.id,
          fileName: file.fileData?.name,
          status: file.status,
          timestamp: new Date().toISOString()
        });
      }
      return isValid;
    });

    console.log('[DocumentProcessingStep] File validation complete:', {
      validFiles: validFiles.length,
      invalidFiles: filesToValidate.length - validFiles.length,
      validFileDetails: validFiles.map(f => ({
        id: f.id,
        name: f.fileData.name,
        type: f.fileData.type,
        status: f.status
      })),
      timestamp: new Date().toISOString()
    });

    return validFiles;
  };

  // Initialize files and processing queue
  React.useEffect(() => {
    console.log('[DocumentProcessingStep] Initializing component:', {
      companyName,
      uploadedFilesCount: initialFiles.length,
      fileDetails: initialFiles.map(f => ({
        id: f.id,
        name: f.fileData.name,
        size: f.fileData.size,
        type: f.fileData.type,
        status: f.status
      })),
      timestamp: new Date().toISOString()
    });

    // Validate and set initial files
    const validatedFiles = validateFiles(initialFiles);
    setFiles(validatedFiles);

    // Setup processing queue with validated file indices
    const queue = validatedFiles
      .map((_, index) => index)
      .filter(index => validatedFiles[index].status === 'uploaded');

    console.log('[DocumentProcessingStep] Setting up processing queue:', {
      queueLength: queue.length,
      queueFiles: queue.map(index => ({
        id: validatedFiles[index].id,
        name: validatedFiles[index].fileData.name,
        status: validatedFiles[index].status
      })),
      timestamp: new Date().toISOString()
    });

    setProcessingQueue(queue);
  }, [initialFiles, companyName]);

  // Initialize queue when card fields are ready
  React.useEffect(() => {
    if (!cardFields?.length || isLoadingFields) {
      console.log('[DocumentProcessingStep] Waiting for card fields to load');
      return;
    }

    if (!isQueueInitialized && files.length > 0) {
      console.log('[DocumentProcessingStep] Queue initialization starting:', {
        cardFieldsCount: cardFields.length,
        filesCount: files.length,
        queueLength: processingQueue.length,
        files: files.map(f => ({
          id: f.id,
          name: f.fileData.name,
          status: f.status
        })),
        timestamp: new Date().toISOString()
      });

      setIsQueueInitialized(true);
    }
  }, [cardFields, files, isLoadingFields, isQueueInitialized, processingQueue.length]);

  // Process next file in queue
  const processNextFile = React.useCallback(async () => {
    if (!isQueueInitialized || isProcessing || processingQueue.length === 0) {
      console.log('[DocumentProcessingStep] Processing skipped:', {
        reason: !isQueueInitialized ? 'Queue not initialized' :
                isProcessing ? 'Already processing' : 'Queue empty',
        queueLength: processingQueue.length,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const nextIndex = processingQueue[0];
    const fileToProcess = files[nextIndex];

    if (!fileToProcess?.id) {
      console.error('[DocumentProcessingStep] Invalid file to process:', {
        index: nextIndex,
        file: fileToProcess ? {
          id: fileToProcess.id,
          name: fileToProcess.fileData.name
        } : null,
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log('[DocumentProcessingStep] Starting to process file:', {
      index: nextIndex,
      fileId: fileToProcess.id,
      fileName: fileToProcess.fileData.name,
      remainingQueue: processingQueue.length,
      timestamp: new Date().toISOString()
    });

    setCurrentProcessingIndex(nextIndex);
    setIsProcessing(true);

    try {
      // Update file status to processing
      setFiles(prevFiles => prevFiles.map((file, index) => 
        index === nextIndex ? { ...file, status: DocumentStatus.processing } : file
      ));

      // Process file
      const result = await processDocuments([fileToProcess.id], cardFields!, (progress) => {
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
          status: DocumentStatus.processed,
          answersFound: result.answersFound,
          error: undefined
        } : file
      ));

    } catch (error: any) {
      console.error('[DocumentProcessingStep] Processing error:', {
        fileId: fileToProcess.id,
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
          status: DocumentStatus.error,
          error: error.message
        } : file
      ));
    } finally {
      // Remove processed file from queue
      setProcessingQueue(prevQueue => prevQueue.slice(1));
      setIsProcessing(false);
      setCurrentProcessingIndex(-1);

      // Process next file in queue after a short delay
      setTimeout(() => {
        processNextFile();
      }, 500);
    }
  }, [files, isProcessing, cardFields, processingQueue, toast, isQueueInitialized]);

  // Start processing when card fields load and we have files to process
  React.useEffect(() => {
    if (!cardFields?.length || isLoadingFields) {
      console.log('[DocumentProcessingStep] Waiting for card fields to load');
      return;
    }

    if (!isProcessing && processingQueue.length > 0 && isQueueInitialized) {
      console.log('[DocumentProcessingStep] Starting document processing queue:', {
        queueLength: processingQueue.length,
        cardFieldsCount: cardFields.length,
        timestamp: new Date().toISOString()
      });
      processNextFile();
    }
  }, [cardFields, isProcessing, processingQueue.length, processNextFile, isLoadingFields, isQueueInitialized]);

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
            key={uploadedFile.id || uploadedFile.fileData.name} 
            file={{
              name: uploadedFile.fileData.name,
              size: uploadedFile.fileData.size,
              type: uploadedFile.fileData.type,
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