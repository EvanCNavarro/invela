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
  status: 'uploading' | 'uploaded' | 'processing' | 'processed' | 'error';
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

  // Validate file objects before adding to queue
  const validateFiles = (filesToValidate: UploadedFile[]) => {
    console.log('[DocumentProcessingStep] Starting file validation:', {
      totalFiles: filesToValidate.length,
      fileDetails: filesToValidate.map(f => ({
        id: f.id,
        name: f.file.name,
        size: f.file.size,
        type: f.file.type,
        status: f.status,
        isFileObject: f.file instanceof File
      })),
      timestamp: new Date().toISOString()
    });

    const validFiles = filesToValidate.filter(file => {
      const isValid = file.file instanceof File && file.status === 'uploaded';
      if (!isValid) {
        console.log('[DocumentProcessingStep] Invalid file found:', {
          fileId: file.id,
          fileName: file.file.name,
          status: file.status,
          isFileObject: file.file instanceof File,
          type: file.file.type,
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
        name: f.file.name,
        type: f.file.type,
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
        name: f.file.name,
        size: f.file.size,
        type: f.file.type,
        status: f.status,
        isFileObject: f.file instanceof File
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
      queueIndices: queue,
      queueFiles: queue.map(index => ({
        id: validatedFiles[index].id,
        name: validatedFiles[index].file.name,
        status: validatedFiles[index].status
      })),
      timestamp: new Date().toISOString()
    });

    setProcessingQueue(queue);
  }, [initialFiles, companyName]);

  // Initialize queue when card fields are ready
  React.useEffect(() => {
    if (isLoadingFields) {
      console.log('[DocumentProcessingStep] Waiting for card fields to load');
      return;
    }

    if (!cardFields?.length) {
      console.error('[DocumentProcessingStep] No card fields available');
      return;
    }

    if (!isQueueInitialized && files.length > 0) {
      console.log('[DocumentProcessingStep] Queue initialization starting:', {
        cardFieldsCount: cardFields.length,
        filesCount: files.length,
        queueLength: processingQueue.length,
        files: files.map(f => ({
          id: f.id,
          name: f.file.name,
          status: f.status,
          isFileObject: f.file instanceof File
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

    if (!fileToProcess?.id || !(fileToProcess.file instanceof File)) {
      console.error('[DocumentProcessingStep] Invalid file to process:', {
        index: nextIndex,
        file: fileToProcess ? {
          id: fileToProcess.id,
          name: fileToProcess.file.name,
          isFileObject: fileToProcess.file instanceof File
        } : null,
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log('[DocumentProcessingStep] Starting to process file:', {
      index: nextIndex,
      fileId: fileToProcess.id,
      fileName: fileToProcess.file.name,
      remainingQueue: processingQueue.length,
      timestamp: new Date().toISOString()
    });

    setCurrentProcessingIndex(nextIndex);
    setIsProcessing(true);

    try {
      // Update file status to processing
      setFiles(prevFiles => prevFiles.map((file, index) => 
        index === nextIndex ? { ...file, status: 'processing' } : file
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
          status: 'processed',
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
    if (isLoadingFields) {
      console.log('[DocumentProcessingStep] Waiting for card fields to load');
      return;
    }

    if (!cardFields?.length) {
      console.error('[DocumentProcessingStep] No card fields available');
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
            key={uploadedFile.id || uploadedFile.file.name} 
            file={{
              name: uploadedFile.file.name,
              size: uploadedFile.file.size,
              type: uploadedFile.file.type,
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