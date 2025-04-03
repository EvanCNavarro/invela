import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { DocumentUploadStep } from "./DocumentUploadStep";
import { DocumentProcessingStep } from "./DocumentProcessingStep";
import { UploadedFile, DocumentStatus } from "./types";

interface DocumentCount {
  category: string;
  count: number;
  isProcessing?: boolean;
}

interface DocumentUploadWizardProps {
  companyName: string;
  onComplete?: () => void;
}

export const DocumentUploadWizard = ({ companyName, onComplete }: DocumentUploadWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [documentCounts, setDocumentCounts] = useState<Record<string, DocumentCount>>({});
  const [processingComplete, setProcessingComplete] = useState(false);

  // Function to check if all files are processed (either success or error)
  const isAllFilesProcessed = () => {
    return uploadedFiles.length > 0 && (processingComplete || uploadedFiles.every(file =>
      file.status === 'processed' || file.status === 'error'
    ));
  };

  // Function to check if any files are currently processing
  const isProcessing = () => {
    return !processingComplete && uploadedFiles.some(file =>
      file.status === 'processing' || file.status === 'waiting'
    );
  };

  const handleProcessingComplete = () => {
    console.log('[DocumentUploadWizard] All files processed');
    setProcessingComplete(true);
  };

  const handleNext = () => {
    console.log('[DocumentUploadWizard] Moving to next step:', {
      currentStep,
      nextStep: currentStep + 1,
      files: uploadedFiles.map(f => ({
        id: f.id,
        name: f.name,
        size: f.size,
        type: f.type,
        status: f.status,
        answersFound: f.answersFound
      })),
      timestamp: new Date().toISOString()
    });

    // Validate files before moving to processing step
    if (currentStep === 0) {
      const invalidFiles = uploadedFiles.filter(file => !file.id || file.status !== 'uploaded');
      if (invalidFiles.length > 0) {
        console.error('[DocumentUploadWizard] Invalid files found:', {
          invalidFiles: invalidFiles.map(f => ({
            id: f.id,
            name: f.name,
            status: f.status
          })),
          timestamp: new Date().toISOString()
        });
        return;
      }
    }

    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(current => current + 1);
    } else {
      setIsSubmitted(true);
      onComplete?.();
    }
  };

  const handleFilesUpdated = (files: File[]) => {
    console.log('[DocumentUploadWizard] Updating files:', {
      newFiles: files.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type
      })),
      timestamp: new Date().toISOString()
    });

    setUploadedFiles(prev => {
      // Only add files that aren't already in the list
      const newFiles = files
        .filter(file => !prev.some(existing => existing.name === file.name))
        .map(file => ({
          id: undefined,
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'uploaded' as DocumentStatus
        }));

      const updatedFiles = [...prev, ...newFiles];

      console.log('[DocumentUploadWizard] Files state updated:', {
        totalFiles: updatedFiles.length,
        fileDetails: updatedFiles.map(f => ({
          id: f.id,
          name: f.name,
          size: f.size,
          type: f.type,
          status: f.status
        })),
        timestamp: new Date().toISOString()
      });

      return updatedFiles;
    });
  };

  const updateFileMetadata = (fileId: number, metadata: Partial<UploadedFile>) => {
    console.log('[DocumentUploadWizard] Updating file metadata:', {
      fileId,
      metadata: {
        id: metadata.id,
        name: metadata.name,
        status: metadata.status
      },
      timestamp: new Date().toISOString()
    });

    setUploadedFiles(prev => {
      // Find file by name AND file ID
      const fileToUpdate = prev.find(f =>
        (metadata.name && f.name === metadata.name) ||
        (fileId && f.id === fileId)
      );

      if (!fileToUpdate) {
        console.log('[DocumentUploadWizard] No matching file found for update:', {
          fileId,
          metadata,
          currentFiles: prev.map(f => ({ id: f.id, name: f.name })),
          timestamp: new Date().toISOString()
        });
        return prev;
      }

      console.log('[DocumentUploadWizard] Found file to update:', {
        currentFile: {
          id: fileToUpdate.id,
          name: fileToUpdate.name,
          status: fileToUpdate.status
        },
        newMetadata: metadata,
        fileId,
        timestamp: new Date().toISOString()
      });

      return prev.map(file =>
        file === fileToUpdate
          ? { ...file, ...metadata, id: fileId }
          : file
      );
    });
  };


  const handleBack = () => {
    console.log('[DocumentUploadWizard] Moving to previous step:', {
      currentStep,
      previousStep: currentStep - 1,
      files: uploadedFiles.map(f => ({
        id: f.id,
        name: f.name,
        size: f.size,
        type: f.type,
        status: f.status
      })),
      timestamp: new Date().toISOString()
    });
    if (currentStep > 0) {
      setCurrentStep(current => current - 1);
    }
  };

  const WIZARD_STEPS = [
    {
      id: 'upload',
      title: 'Upload Documents',
      description: 'Upload your compliance and security documents'
    },
    {
      id: 'process',
      title: 'Document Processing',
      description: 'Processing and analyzing uploaded documents'
    },
    {
      id: 'review',
      title: 'Review & Continue',
      description: 'Review extracted information and continue to form'
    }
  ];

  const updateDocumentCounts = (category: string, count: number, isProcessing: boolean = false) => {
    console.log('[DocumentUploadWizard] Updating document counts:', {
      category,
      count,
      isProcessing,
      timestamp: new Date().toISOString()
    });

    setDocumentCounts(prev => ({
      ...prev,
      [category]: {
        category,
        count: (prev[category]?.count || 0) + count,
        isProcessing
      }
    }));
  };

  const progress = Math.round((currentStep / (WIZARD_STEPS.length - 1)) * 100);
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className={`px-2 py-1 text-xs rounded ${
                  isSubmitted
                    ? 'bg-green-100 text-green-600'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {isSubmitted ? 'COMPLETED' : 'IN PROGRESS'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">Upload {companyName}'s Compliance Documentation</h2>
              </div>
            </div>
            {!isSubmitted && (
              <div className="text-sm text-muted-foreground">
                {progress}% Complete
              </div>
            )}
          </div>

          {!isSubmitted && (
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center">
            {WIZARD_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className={`
                  flex items-center justify-center w-6 h-6 rounded-full text-sm
                  ${index < currentStep || isSubmitted
                    ? 'bg-green-600 text-white'
                    : index === currentStep && !isSubmitted
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }
                `}>
                  {index < currentStep || isSubmitted ? '✓' : index + 1}
                </div>
                <div className="mx-2">
                  <p className={`text-xs font-medium ${
                    index === currentStep && !isSubmitted
                      ? 'text-blue-500'
                      : index < currentStep || isSubmitted
                        ? 'text-green-600'
                        : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < WIZARD_STEPS.length - 1 && (
                  <div className={`
                    flex-1 h-[1px]
                    ${index < currentStep || isSubmitted
                      ? 'bg-green-600'
                      : 'bg-gray-200'
                    }
                  `} />
                )}
              </div>
            ))}
          </div>
        </div>

        <hr className="border-t border-gray-200 my-6" />

        <div className="min-h-[300px]">
          {currentStep === 0 ? (
            <DocumentUploadStep
              onFilesUpdated={handleFilesUpdated}
              companyName={companyName}
              uploadedFiles={uploadedFiles}
              updateFileMetadata={updateFileMetadata}
              documentCounts={documentCounts}
              updateDocumentCounts={updateDocumentCounts}
            />
          ) : currentStep === 1 ? (
            <DocumentProcessingStep
              companyName={companyName}
              uploadedFiles={uploadedFiles}
              onProcessingComplete={handleProcessingComplete}
            />
          ) : (
            <div className="flex items-center justify-center text-muted-foreground">
              {WIZARD_STEPS[currentStep].description}
            </div>
          )}
        </div>

        <div className="flex justify-between mt-8 pt-4 border-t">
          {!isSubmitted && (
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 0 || (currentStep === 1 && isProcessing())}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          {isSubmitted ? (
            <div className="ml-auto">
              <Button
                disabled
                className="bg-green-600 hover:bg-green-600 text-white"
              >
                Completed
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleNext}
              className="ml-auto"
              disabled={
                (currentStep === 0 && uploadedFiles.length === 0) ||
                (currentStep === 1 && !isAllFilesProcessed())
              }
            >
              {isLastStep ? 'Continue to Form' : 'Next'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default DocumentUploadWizard;