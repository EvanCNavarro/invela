import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { DocumentUploadStep } from "./DocumentUploadStep";

// Define the wizard steps
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

interface UploadedFile {
  file: File;
  id?: number;
  status: 'uploaded' | 'processing' | 'classified';
  category?: string;
  confidence?: number;
}

interface DocumentUploadWizardProps {
  companyName: string;
  onComplete?: () => void;
}

export const DocumentUploadWizard = ({ companyName, onComplete }: DocumentUploadWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(current => current + 1);
    } else {
      setIsSubmitted(true);
      onComplete?.();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(current => current - 1);
    }
  };

  const handleFilesUpdated = (files: File[]) => {
    const newUploadedFiles = files.map((file, index) => ({
      file,
      id: index + 1, // Assign a unique ID
      status: 'uploaded' as const
    }));
    setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
  };

  const updateFileMetadata = (fileId: number, metadata: Partial<UploadedFile>) => {
    setUploadedFiles(prev => 
      prev.map(file => 
        file.id === fileId 
          ? { ...file, ...metadata }
          : file
      )
    );
  };

  // Calculate progress percentage
  const progress = Math.round((currentStep / (WIZARD_STEPS.length - 1)) * 100);
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        {/* Header Section */}
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

          {/* Progress bar */}
          {!isSubmitted && (
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Step Indicators */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {WIZARD_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                {/* Step circle */}
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
                {/* Step title */}
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
                {/* Connector line */}
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

        {/* Content Section */}
        <div className="min-h-[300px]">
          {currentStep === 0 ? (
            <DocumentUploadStep
              onFilesUpdated={handleFilesUpdated}
              companyName={companyName}
              uploadedFiles={uploadedFiles}
              updateFileMetadata={updateFileMetadata}
            />
          ) : (
            <div className="flex items-center justify-center text-muted-foreground">
              {WIZARD_STEPS[currentStep].description}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-4 border-t">
          {!isSubmitted && (
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 0}
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
              disabled={currentStep === 0 && uploadedFiles.length === 0}
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