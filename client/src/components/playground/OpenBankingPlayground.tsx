import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from "@/components/ui/tooltip";
import { 
  CheckCircle2, 
  Info, 
  Download, 
  CheckCircle, 
  ArrowRight, 
  FileText,
  Trophy,
  Shield,
  LayoutDashboard,
  LineChart,
  Upload,
  FileUp
} from "lucide-react";
import confetti from 'canvas-confetti';
import { useLocation } from "wouter";
import { DocumentUploadWizard } from "@/components/documents/DocumentUploadWizard";
import { UniversalForm } from "@/components/forms/UniversalForm";

interface OpenBankingPlaygroundProps {
  taskId: number;
  companyName: string;
  companyData?: {
    name: string;
    description?: string;
  };
  onSubmit: (formData: Record<string, any>) => void;
}

interface OpenBankingField {
  id: number;
  field_key: string;
  group: string;
  display_name: string;
  question: string;
  example_response?: string;
  ai_search_instructions?: string;
  partial_risk_score_max: number;
}

interface OpenBankingResponse {
  id: number;
  task_id: number;
  field_id: number;
  response_value: string | null;
  status: 'EMPTY' | 'COMPLETE';
  version: number;
  progress?: number;
  ai_suspicion_level: number;
  partial_risk_score: number;
  reasoning: string;
}

export function OpenBankingPlayground({
  taskId,
  companyName,
  companyData,
  onSubmit
}: OpenBankingPlaygroundProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState<'upload' | 'manual' | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploadedDocument, setUploadedDocument] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [successData, setSuccessData] = useState<{
    riskScore: number;
    assessmentFile: string;
  } | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [loadingFields, setLoadingFields] = useState<Record<number, boolean>>({});
  const [fieldAnalysis, setFieldAnalysis] = useState<Record<number, {
    suspicionLevel: number;
    riskScore: number;
    reasoning: string;
  }>>({});
  const [openTooltip, setOpenTooltip] = useState<number | null>(null);
  const [, navigate] = useLocation();
  const [formResponses, setFormResponses] = useState<Record<string, string>>({});
  const [previousResponses, setPreviousResponses] = useState<Record<string, string>>({});

  // Get task data
  const { data: taskData } = useQuery({
    queryKey: ['/api/tasks/open-banking', companyName],
    queryFn: async () => {
      console.log('[OpenBankingPlayground] Fetching task data:', { companyName, timestamp: new Date().toISOString() });
      const response = await fetch(`/api/tasks/open-banking/${companyName}`);
      if (!response.ok) {
        throw new Error('Failed to fetch task data');
      }
      return response.json();
    }
  });

  // Update progress when task data changes
  useEffect(() => {
    if (taskData?.progress !== undefined) {
      setProgress(taskData.progress);
    }
  }, [taskData]);

  // Handle document upload
  const handleDocumentUpload = async (fileId: number, fileName: string) => {
    console.log('[OpenBankingPlayground] Document uploaded:', { fileId, fileName });
    setUploadedDocument(fileName);
    
    try {
      // Start processing the uploaded document
      const res = await fetch(`/api/open-banking/extract/${taskId}/${fileId}`, {
        method: 'POST'
      });
      
      if (!res.ok) {
        throw new Error('Failed to process document');
      }
      
      const result = await res.json();
      
      // Update progress based on response
      if (typeof result.progress === 'number') {
        setProgress(result.progress);
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/open-banking/responses', taskId] });
      
      // Show success message
      toast({
        title: "Document Processed",
        description: "Your document has been successfully processed. You can now edit the extracted information."
      });
      
      // Switch to form view
      setShowForm(true);
      
    } catch (error) {
      console.error('[OpenBankingPlayground] Error processing document:', error);
      toast({
        title: "Processing Failed",
        description: "Failed to process the document. Please try again or switch to manual entry.",
        variant: "destructive"
      });
    }
  };

  // Handle method selection
  const handleMethodSelection = (method: 'upload' | 'manual') => {
    setSelectedMethod(method);
    if (method === 'manual') {
      setShowForm(true);
    }
  };

  // Submit assessment
  const submitAssessment = useMutation({
    mutationFn: async () => {
      console.log('[OpenBankingPlayground] Submitting assessment:', {
        taskId,
        timestamp: new Date().toISOString()
      });

      const response = await fetch(`/api/open-banking/submit/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to submit assessment');
      }

      let data;
      try {
        const text = await response.text();
        data = JSON.parse(text);
      } catch (error) {
        throw new Error('Invalid response format');
      }

      if (!data.success) {
        throw new Error(data.message || 'Failed to submit assessment');
      }

      return data;
    },
    onSuccess: (data) => {
      console.log('[OpenBankingPlayground] Assessment submitted successfully:', {
        taskId,
        riskScore: data.riskScore,
        assessmentFile: data.assessmentFile,
        timestamp: new Date().toISOString()
      });

      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#00A3FF', '#0091FF', '#0068FF', '#0059FF', '#0040FF']
      });

      setSuccessData({
        riskScore: data.riskScore,
        assessmentFile: data.assessmentFile
      });
      setIsSuccessModalOpen(true);

      toast({
        title: "Assessment Submitted",
        description: `Assessment completed successfully. Risk Score: ${data.riskScore}`,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      onSubmit({});
    },
    onError: (error) => {
      console.error('[OpenBankingPlayground] Submit error:', error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Handle form submission
  const handleFormSubmit = async (data: Record<string, any>) => {
    console.log('[OpenBankingPlayground] Form submitted:', { 
      fieldCount: Object.keys(data).length,
      timestamp: new Date().toISOString()
    });
    
    try {
      submitAssessment.mutate();
    } catch (error) {
      console.error('[OpenBankingPlayground] Form submission error:', error);
    }
  };

  // Method selection view
  if (!selectedMethod) {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Open Banking Survey</h1>
          <p className="text-muted-foreground">
            Please select how you would like to complete the Open Banking Survey
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Card className="p-6 cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => handleMethodSelection('upload')}>
            <div className="flex flex-col items-center space-y-4 h-full">
              <div className="bg-primary/10 p-4 rounded-full">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Upload a Document</h2>
              <p className="text-center text-muted-foreground">
                Upload an existing Open Banking document. We will automatically extract and process the information.
              </p>
              <Button className="mt-auto" onClick={() => handleMethodSelection('upload')}>
                Upload Document
              </Button>
            </div>
          </Card>
          
          <Card className="p-6 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleMethodSelection('manual')}>
            <div className="flex flex-col items-center space-y-4 h-full">
              <div className="bg-primary/10 p-4 rounded-full">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Manual Entry</h2>
              <p className="text-center text-muted-foreground">
                Manually complete the Open Banking Survey by filling out each section of the form.
              </p>
              <Button className="mt-auto" onClick={() => handleMethodSelection('manual')}>
                Start Manual Entry
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Document upload view
  if (selectedMethod === 'upload' && !showForm) {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Upload Open Banking Document</h1>
          <p className="text-muted-foreground">
            Upload your Open Banking document to automatically populate the survey
          </p>
        </div>
        
        <div className="max-w-3xl mx-auto">
          <DocumentUploadWizard 
            taskId={taskId}
            onUploadComplete={handleDocumentUpload}
            allowedFileTypes={['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv']}
            maxFileSize={10} // in MB
          />
          
          <div className="mt-6 text-center">
            <Button variant="outline" onClick={() => setSelectedMethod(null)}>
              Back to Selection
            </Button>
            <Button className="ml-4" onClick={() => handleMethodSelection('manual')}>
              Switch to Manual Entry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Universal form view
  return (
    <div className="space-y-6">
      {selectedMethod === 'upload' && uploadedDocument && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
            <p className="text-green-700">
              Document <span className="font-medium">{uploadedDocument}</span> successfully processed
            </p>
          </div>
        </div>
      )}
      
      <div className="p-1">
        <UniversalForm
          taskId={taskId}
          taskType="open_banking"
          onProgress={(progress) => {
            setProgress(progress);
            
            // Send the progress to the server to update the task
            fetch(`/api/tasks/${taskId}/update-progress`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                progress,
                calculateFromForm: false, // We're explicitly setting progress
                forceStatusUpdate: true // Force the task status to update
              })
            })
            .catch(error => {
              console.error('[OpenBankingPlayground] Failed to update task progress:', error);
            });
          }}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            // Reset to method selection if user cancels
            setSelectedMethod(null);
            setShowForm(false);
          }}
        />
      </div>
      
      {/* Success Modal */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Trophy className="text-yellow-500 h-6 w-6 mr-2" />
              Open Banking Survey Completed!
            </DialogTitle>
            <DialogDescription>
              Your Open Banking Survey has been successfully submitted and processed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {successData && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm font-medium">
                    <Shield className="h-5 w-5 mr-2 text-primary" />
                    Risk Score
                  </div>
                  <div className="font-bold text-lg">{successData.riskScore}</div>
                </div>
                
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    The following features are now available:
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      <span>Assessment File Generated</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      <span>Company Risk Score Updated</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      <span>Company Onboarding Completed</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      <span>Insights Dashboard Unlocked</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                navigate(`/files/${successData?.assessmentFile}`);
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              View Assessment
            </Button>
            
            <Button
              onClick={() => {
                navigate('/company/dashboard');
              }}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}