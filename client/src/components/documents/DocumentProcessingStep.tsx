import React, { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCardFields, type CardField } from '@/services/cardService';
import { processDocuments } from '@/services/documentProcessingService';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { DocumentRow } from './DocumentRow';
import { UploadedFile, DocumentStatus } from './types';
import { wsService } from '@/lib/websocket';
import { useWebSocket } from '@/hooks/useWebSocket';

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
  const subscriptionsRef = useRef<(() => void)[]>([]);
  const { connected } = useWebSocket();
  const processingStartedRef = useRef(false);

  const { data: cardFields, isLoading: isLoadingFields } = useQuery<CardField[]>({
    queryKey: ['/api/card/fields']
  });

  // Validate files and set up initial state
  React.useEffect(() => {
    const validFiles = initialFiles.filter(file => {
      const isValid = file.id !== undefined && file.status === 'uploaded';
      if (!isValid) {
        console.warn('[DocumentProcessingStep] Invalid file found:', {
          id: file.id,
          name: file.name,
          status: file.status,
          timestamp: new Date().toISOString()
        });
      }
      return isValid;
    });

    setFiles(validFiles);
    console.log('[DocumentProcessingStep] Files initialized:', {
      validFiles: validFiles.length,
      fileDetails: validFiles.map(f => ({
        id: f.id,
        name: f.name,
        status: f.status
      })),
      timestamp: new Date().toISOString()
    });
  }, [initialFiles]);

  // Handle WebSocket events
  React.useEffect(() => {
    if (!connected) return;

    const setupSubscriptions = async () => {
      try {
        const taskSub = await wsService.subscribe('TASK_UPDATE', (data) => {
          const fileIndex = files.findIndex(f => f.id === data.id);
          if (fileIndex === -1) return;

          setFiles(prevFiles => prevFiles.map((file, index) => 
            index === fileIndex ? {
              ...file,
              status: data.status as DocumentStatus,
              answersFound: data.metadata?.answersFound || 0
            } : file
          ));

          if (data.status === 'error') {
            toast({
              variant: 'destructive',
              title: 'Processing Error',
              description: `Failed to process ${files[fileIndex].name}`
            });
          }
        });

        subscriptionsRef.current = [taskSub];
      } catch (error) {
        console.error('[DocumentProcessingStep] WebSocket subscription error:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    };

    setupSubscriptions();

    return () => {
      subscriptionsRef.current.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('[DocumentProcessingStep] Unsubscribe error:', error);
        }
      });
      subscriptionsRef.current = [];
    };
  }, [connected, files, toast]);

  // Start processing when ready
  React.useEffect(() => {
    if (isLoadingFields || !cardFields?.length || processingStartedRef.current || isProcessing) {
      return;
    }

    const startProcessing = async () => {
      if (files.length === 0) return;

      try {
        setIsProcessing(true);
        processingStartedRef.current = true;

        console.log('[DocumentProcessingStep] Starting document processing:', {
          fileCount: files.length,
          timestamp: new Date().toISOString()
        });

        const fileIds = files.map(f => f.id!);
        await processDocuments(fileIds, cardFields, (progress) => {
          setCurrentProcessingIndex(fileIds.indexOf(progress.fileId));
        });

      } catch (error) {
        console.error('[DocumentProcessingStep] Processing error:', error);
        setProcessingError(error instanceof Error ? error.message : 'Processing failed');
        toast({
          variant: 'destructive',
          title: 'Processing Error',
          description: 'Failed to process documents. Please try again.'
        });
      } finally {
        setIsProcessing(false);
        setCurrentProcessingIndex(-1);
      }
    };

    startProcessing();
  }, [cardFields, files, isLoadingFields, isProcessing, toast]);

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