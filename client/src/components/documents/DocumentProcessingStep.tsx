import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCardFields, type CardField } from '@/services/cardService';
import { processDocuments } from '@/services/documentProcessingService';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { DocumentRow } from './DocumentRow';
import { UploadedFile, DocumentStatus } from './types';

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

  const { data: cardFields, isLoading: isLoadingFields } = useQuery<CardField[]>({
    queryKey: ['/api/card/fields']
  });

  // Validate files and set up the queue
  React.useEffect(() => {
    console.log('[DocumentProcessingStep] Initializing processing:', {
      companyName,
      uploadedFilesCount: initialFiles.length,
      fileDetails: initialFiles.map(f => ({
        id: f.id,
        name: f.name,
        size: f.size,
        type: f.type,
        status: f.status,
        hasId: f.id !== undefined
      })),
      timestamp: new Date().toISOString()
    });

    // Validate and filter files
    const validFiles = initialFiles.filter(file => {
      const isValid = file.id !== undefined && file.status === 'uploaded';

      if (!isValid) {
        console.error('[DocumentProcessingStep] Invalid file found:', {
          id: file.id,
          name: file.name,
          status: file.status,
          hasId: file.id !== undefined,
          isUploaded: file.status === 'uploaded',
          timestamp: new Date().toISOString()
        });
      }
      return isValid;
    });

    // Set up initial files and queue
    setFiles(validFiles);
    const queue = validFiles.map((_, index) => index);
    setProcessingQueue(queue);

    console.log('[DocumentProcessingStep] Processing queue initialized:', {
      validFiles: validFiles.length,
      queueLength: queue.length,
      fileStatuses: validFiles.map(f => ({
        id: f.id,
        name: f.name,
        status: f.status,
        type: f.type
      })),
      timestamp: new Date().toISOString()
    });
  }, [initialFiles, companyName]);

  // Process the next file in queue
  const processNextFile = React.useCallback(async () => {
    if (!cardFields?.length || isProcessing || processingQueue.length === 0) {
      return;
    }

    const nextIndex = processingQueue[0];
    const fileToProcess = files[nextIndex];

    if (!fileToProcess?.id) {
      console.error('[DocumentProcessingStep] Invalid file to process:', {
        index: nextIndex,
        fileDetails: fileToProcess,
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log('[DocumentProcessingStep] Starting file processing:', {
      index: nextIndex,
      fileId: fileToProcess.id,
      fileName: fileToProcess.name,
      fileType: fileToProcess.type,
      remainingQueue: processingQueue.length,
      timestamp: new Date().toISOString()
    });

    setCurrentProcessingIndex(nextIndex);
    setIsProcessing(true);

    try {
      // Update only current file to processing status
      setFiles(prevFiles => prevFiles.map((file, index) => 
        index === nextIndex ? { ...file, status: 'processing' as DocumentStatus } : file
      ));

      // Show processing toast
      toast({
        title: 'Processing Document',
        description: `Starting analysis of ${fileToProcess.name}...`,
      });

      const result = await processDocuments([fileToProcess.id], cardFields, (progress) => {
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

      // Update processed file with results
      setFiles(prevFiles => prevFiles.map((file, index) => 
        index === nextIndex ? {
          ...file,
          status: 'processed' as DocumentStatus,
          answersFound: result.answersFound,
          error: undefined
        } : file
      ));

      // Show success toast
      toast({
        title: 'Document Processed',
        description: `Successfully analyzed ${fileToProcess.name} and found ${result.answersFound} matches.`,
      });

    } catch (error: any) {
      console.error('[DocumentProcessingStep] Processing error:', {
        fileId: fileToProcess.id,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      setProcessingError(error.message);
      toast({
        variant: 'destructive',
        title: 'Processing Error',
        description: `Failed to process ${fileToProcess.name}. Please try again.`
      });

      // Update file status to error
      setFiles(prevFiles => prevFiles.map((file, index) => 
        index === nextIndex ? {
          ...file,
          status: 'error' as DocumentStatus,
          error: error.message
        } : file
      ));
    } finally {
      // Remove processed file from queue
      setProcessingQueue(prevQueue => prevQueue.slice(1));
      setIsProcessing(false);
      setCurrentProcessingIndex(-1);

      // Short delay before processing next file
      setTimeout(() => {
        processNextFile();
      }, 500);
    }
  }, [cardFields, files, isProcessing, processingQueue, toast]);

  // Start processing when ready
  React.useEffect(() => {
    if (!cardFields?.length || isLoadingFields) {
      return;
    }

    if (!isProcessing && processingQueue.length > 0) {
      processNextFile();
    }
  }, [cardFields, isProcessing, processingQueue.length, processNextFile, isLoadingFields]);

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

      <div className="space-y-2">
        {files.map((uploadedFile, index) => (
          <DocumentRow 
            key={uploadedFile.id || uploadedFile.name} 
            file={{
              name: uploadedFile.name,
              size: uploadedFile.size,
              type: uploadedFile.type,
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