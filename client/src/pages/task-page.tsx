import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { UniversalForm } from "@/components/forms/UniversalForm";
import { CardFormPlayground } from "@/components/playground/CardFormPlayground";
import { SecurityFormPlayground } from "@/components/playground/SecurityFormPlayground";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Download, FileJson, FileText, FileSpreadsheet } from "lucide-react";
import { PageTemplate } from "@/components/ui/page-template";
import { BreadcrumbNav } from "@/components/dashboard/BreadcrumbNav";
// Modal handling now done by UniversalForm component
import { fireEnhancedConfetti, fireSuperConfetti } from '@/utils/confetti';
import confetti from 'canvas-confetti';
import { CardMethodChoice } from "@/components/card/CardMethodChoice";
import { DocumentUploadWizard } from "@/components/documents/DocumentUploadWizard";

interface TaskPageProps {
  params: {
    taskSlug: string;
  }
}

interface Task {
  id: number;
  title: string;
  description: string | null;
  task_type: string;
  task_scope: string;
  status: string;
  priority: string;
  progress: number;
  company_id?: number; // Added company_id field
  assigned_to?: number | null; 
  created_by?: number;
  created_at?: string;
  updated_at?: string;
  metadata: {
    companyId?: number;
    company_id?: number;
    companyName?: string;
    company_name?: string;
    company?: {
      name: string;
      description?: string;
    };
    kybFormFile?: number;
    cardFormFile?: number;
    securityFormFile?: number;
    [key: string]: any;
  } | null;
  savedFormData?: Record<string, any>;
}

type TaskContentType = 'kyb' | 'card' | 'security' | 'unknown';

export default function TaskPage({ params }: TaskPageProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [fileId, setFileId] = useState<number | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'upload' | 'manual' | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  // Task info state
  const [taskContentType, setTaskContentType] = useState<TaskContentType>('unknown');
  const [displayName, setDisplayName] = useState('');
  const [derivedCompanyName, setDerivedCompanyName] = useState('');
  
  // Handle page navigation
  const handleBackClick = useCallback(() => {
    navigate('/task-center');
  }, [navigate]);
  
  // Fetch the specific task directly from the server to always get fresh data
  const taskId = Number(params.taskSlug);
  
  const { data: task, isLoading, error, refetch } = useQuery<Task>({
    queryKey: [`/api/tasks/${taskId}`],
    retry: 2,
    // Disable caching to ensure we always get fresh data from the server
    // This is important for form data to be up-to-date on all reloads and navigation
    staleTime: 0,
    cacheTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always'
  });
  
  // Process task data when it's received
  const processTaskData = useCallback((taskData: Task) => {
    console.log('[TaskPage] Processing task data:', taskData);
    
    // Determine the task content type
    let type: TaskContentType = 'unknown';
    
    if (taskData.task_type === 'company_kyb' || taskData.task_type === 'kyb') {
      type = 'kyb';
    } else if (taskData.task_type === 'security_assessment' || taskData.task_type === 'security') {
      type = 'security';
    } else if (taskData.task_type === 'company_card' || taskData.task_type === 'card') {
      type = 'card';
    }
    
    setTaskContentType(type);
    
    // Set display names based on available data
    if (taskData.metadata) {
      // Get company name from different possible sources to avoid "Unknown Company"
      let companyName = 'Unknown Company';
      
      // Check all possible sources for company name
      if (taskData.metadata.companyName) {
        companyName = taskData.metadata.companyName;
      } else if (taskData.metadata.company?.name) {
        companyName = taskData.metadata.company.name;
      } else if (taskData.metadata.company_name) {
        companyName = taskData.metadata.company_name;
      } else if (taskData.company_id) {
        // If needed, could fetch company name from API using company_id
        console.log(`[TaskPage] No company name found in metadata, but found company_id: ${taskData.company_id}`);
      }
      
      console.log(`[TaskPage] Setting company name to: ${companyName}`);
      setDisplayName(companyName);
      setDerivedCompanyName(companyName);
      
      // Set fileId for direct downloads if present
      if (type === 'kyb' && taskData.metadata.kybFormFile) {
        setFileId(taskData.metadata.kybFormFile);
      } else if (type === 'security' && taskData.metadata.securityFormFile) {
        setFileId(taskData.metadata.securityFormFile);
      } else if (type === 'card' && taskData.metadata.cardFormFile) {
        setFileId(taskData.metadata.cardFormFile);
      } else if (taskData.metadata.fileId) {
        // Generic fileId if specific type not found
        setFileId(taskData.metadata.fileId);
      }
    }
    
    // Check various task statuses
    if (taskData.status === 'submitted' || taskData.status === 'completed') {
      setIsSubmitted(true);
    }
  }, []);
  
  // Process task data when it loads
  useEffect(() => {
    if (task) {
      processTaskData(task);
    }
  }, [task, processTaskData]);
  
  // Handle file download
  const handleDownload = useCallback((format: 'json' | 'csv' | 'txt') => {
    if (!fileId) {
      toast({
        title: "Download Failed",
        description: "No file associated with this task",
        variant: "destructive",
      });
      return;
    }
    
    fetch(`/api/files/${fileId}/download?format=${format}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.statusText}`);
        }
        return response.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Use standardized filename format: TaskType_TaskID_CompanyName_Date_Time_Version.format
const now = new Date();
const formattedDate = now.toISOString().slice(0, 10); // YYYY-MM-DD
const formattedTime = now.toISOString().slice(11, 19).replace(/:/g, ''); // HHMMSS
const cleanCompanyName = (task?.metadata?.company_name || 'Company').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');
a.download = `${taskContentType.toUpperCase()}Form_${task?.id}_${cleanCompanyName}_${formattedDate}_${formattedTime}_v1.0.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch(err => {
        console.error('Download error:', err);
        toast({
          title: "Download Failed",
          description: "Could not download the file. Please try again later.",
          variant: "destructive",
        });
      });
  }, [fileId, taskContentType, toast]);
  
  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout>
        <PageTemplate className="container">
          <div className="flex flex-col items-center justify-center h-80">
            <LoadingSpinner />
            <div className="mt-4 text-muted-foreground">Loading task...</div>
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }
  
  // Error state
  if (error || !task) {
    return (
      <DashboardLayout>
        <PageTemplate className="container">
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-4">Task Not Found</h2>
              <p className="text-muted-foreground mb-6">
                {error ? `Error: ${(error as Error).message}` : 'The requested task could not be found.'}
              </p>
              <div className="flex space-x-4 justify-center">
                <Button onClick={() => refetch()}>
                  Try Again
                </Button>
                <Button variant="outline" onClick={handleBackClick}>
                  Back to Task Center
                </Button>
              </div>
            </div>
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }
  
  // KYB Form Rendering
  if (taskContentType === 'kyb' && task) {
    return (
      <DashboardLayout>
        <PageTemplate className="space-y-6">
          <div className="space-y-4">
            <BreadcrumbNav forceFallback={true} />
          </div>
          
          <div className="w-full">
            <UniversalForm
              taskId={task.id}
              taskType="kyb"
              taskStatus={task.status}
              taskMetadata={task.metadata || {}}
              initialData={task.savedFormData}
              taskTitle={task.title}
              companyName={derivedCompanyName}
              fileId={fileId}
              onDownload={handleDownload}
              onSubmit={(formData) => {
                // No loading toast needed, it will be handled by UniversalForm

                // Generate a proper filename for CSV export
                const timestamp = new Date().toISOString().replace(/[:]/g, '').split('.')[0];
                const cleanTitle = task.title.toLowerCase().replace(/\s+/g, '_');
                const fileName = `kyb_form_${task.id}_${timestamp}.csv`;
                
                console.log('[TaskPage] Submitting KYB form with filename:', fileName);
                
                fetch(`/api/kyb/save`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                  },
                  credentials: 'include',
                  body: JSON.stringify({ 
                    taskId: task.id,
                    formData, 
                    fileName 
                  })
                })
                .then(async response => {
                  // First try to parse the response
                  try {
                    const data = await response.json();
                    
                    // Then check if the response was successful
                    if (!response.ok) {
                      throw new Error(data.details || data.error || 'Failed to save KYB form');
                    }
                    
                    // Verify we got a valid result with a fileId
                    if (!data || !data.success || !data.fileId) {
                      throw new Error('Server returned an invalid or incomplete response');
                    }
                    
                    return data;
                  } catch (parseError) {
                    // Handle JSON parse errors specifically
                    if (parseError instanceof SyntaxError) {
                      console.error('[TaskPage] Failed to parse server response:', parseError);
                      throw new Error('Server returned an invalid response format. Please try again.');
                    }
                    // Re-throw other errors
                    throw parseError;
                  }
                })
                .then((result) => {
                  // Only show success UI if we have a valid result
                  if (result && result.success && result.fileId) {
                    // Show confetti animation for success
                    fireEnhancedConfetti();
                    
                    // Update state for success modal
                    setFileId(result.fileId);
                    setIsSubmitted(true);
                    setShowSuccessModal(true);
                    
                    // Don't show success toast here - we'll only show the modal
                  } else {
                    // This shouldn't happen if we validate in the previous then(),
                    // but just in case something slips through
                    throw new Error('Received invalid success response from server');
                  }
                })
                .catch(error => {
                  // Log the error for debugging
                  console.error('[TaskPage] Form submission failed:', error);
                  
                  // Reset any partial success state to avoid showing success modal
                  setIsSubmitted(false);
                  setShowSuccessModal(false);
                  
                  // Show error toast with specific error message
                  toast({
                    title: "Submission Failed",
                    description: error.message || "Failed to save KYB form. Please try again.",
                    variant: "destructive",
                  });
                });
              }}
            />
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }

  // Security Assessment Form Rendering
  if (taskContentType === 'security' && task) {
    return (
      <DashboardLayout>
        <PageTemplate className="space-y-6">
          <div className="space-y-4">
            <BreadcrumbNav forceFallback={true} />
          </div>

          <div className="w-full">
            <SecurityFormPlayground
              taskId={task.id}
              companyName={derivedCompanyName}
              companyData={{
                name: displayName,
                description: task.metadata?.company?.description || undefined
              }}
              savedFormData={task.savedFormData}
              taskStatus={task.status}
              isSubmitted={isSubmitted}
              onSubmit={(formData) => {
                // No loading toast needed, it will be handled by UniversalForm

                // Generate a proper filename for security assessment export
                const timestamp = new Date().toISOString().replace(/[:]/g, '').split('.')[0];
                const cleanTitle = task.title.toLowerCase().replace(/\s+/g, '_');
                const fileName = `security_assessment_${task.id}_${timestamp}.csv`;
                
                console.log('[TaskPage] Submitting security assessment with filename:', fileName);
                
                // Submit the security assessment
                fetch(`/api/security/save`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                  },
                  credentials: 'include',
                  body: JSON.stringify({ 
                    taskId: task.id,
                    formData,
                    fileName
                  })
                })
                  .then(async response => {
                    // First try to parse the response
                    try {
                      const data = await response.json();
                      
                      // Then check if the response was successful
                      if (!response.ok) {
                        throw new Error(data.details || data.error || 'Failed to submit security assessment');
                      }
                      
                      // Verify we got a valid result
                      if (!data || !data.success) {
                        throw new Error('Server returned an invalid or incomplete response');
                      }
                      
                      return data;
                    } catch (parseError) {
                      // Handle JSON parse errors specifically
                      if (parseError instanceof SyntaxError) {
                        console.error('[TaskPage] Failed to parse server response:', parseError);
                        throw new Error('Server returned an invalid response format. Please try again.');
                      }
                      // Re-throw other errors
                      throw parseError;
                    }
                  })
                  .then((result) => {
                    // Only show success UI if we have a valid result
                    if (result && result.success) {
                      // Show confetti animation for success
                      fireSuperConfetti();
                      
                      // Update state for success modal
                      setIsSubmitted(true);
                      setShowSuccessModal(true);
                      
                      // Don't show success toast - we'll only show the modal
                    } else {
                      // This shouldn't happen if we validate in the previous then(),
                      // but just in case something slips through
                      throw new Error('Received invalid success response from server');
                    }
                  })
                  .catch(error => {
                    // Log the error for debugging
                    console.error('[TaskPage] Security assessment submission failed:', error);
                    
                    // Reset any partial success state to avoid showing success modal
                    setIsSubmitted(false);
                    setShowSuccessModal(false);
                    
                    // Show error toast with specific error message
                    toast({
                      title: "Submission Failed",
                      description: error.message || "Failed to submit security assessment. Please try again.",
                      variant: "destructive",
                    });
                  });
              }}
            />
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }
  
  // CARD (1033) Assessment Form Rendering
  if (taskContentType === 'card' && task) {
    return (
      <DashboardLayout>
        <PageTemplate className="space-y-6">
          <div className="space-y-4">
            <BreadcrumbNav forceFallback={true} />
          </div>

          <div className="w-full">
            <div className="bg-[#F2F5F7] rounded-lg shadow-sm p-4 sm:p-6 mb-6">
              <div className="mb-5">
                <h2 className="text-xl font-semibold">Open Banking (1033) Survey: {derivedCompanyName}</h2>
                <p className="text-sm text-gray-500">Submit Open Banking compliance details to verify "{displayName}"</p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
                {selectedMethod === 'upload' && !showForm ? (
                  <DocumentUploadWizard
                    companyName={derivedCompanyName}
                    onComplete={() => {
                      setShowForm(true);
                    }}
                  />
                ) : (selectedMethod === 'manual' || showForm) ? (
                  <CardFormPlayground
                    taskId={task.id}
                    companyName={derivedCompanyName}
                    companyData={{
                      name: displayName,
                      description: task.metadata?.company?.description || undefined
                    }}
                    onSubmit={(formData) => {
                      fetch('/api/card/save', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          fileName: `compliance_${derivedCompanyName}_${new Date().toISOString().replace(/[:]/g, '').split('.')[0]}`,
                          formData,
                          taskId: task.id
                        })
                      })
                        .then(async response => {
                          // First try to parse the response
                          try {
                            const data = await response.json();
                            
                            // Then check if the response was successful
                            if (!response.ok) {
                              throw new Error(data.details || data.error || 'Failed to save compliance form');
                            }
                            
                            // Verify we got a valid result with a fileId
                            if (!data || !data.success || !data.fileId) {
                              throw new Error('Server returned an invalid or incomplete response');
                            }
                            
                            return data;
                          } catch (parseError) {
                            // Handle JSON parse errors specifically
                            if (parseError instanceof SyntaxError) {
                              console.error('[TaskPage] Failed to parse server response:', parseError);
                              throw new Error('Server returned an invalid response format. Please try again.');
                            }
                            // Re-throw other errors
                            throw parseError;
                          }
                        })
                        .then((result) => {
                          // Only show success UI if we have a valid result
                          if (result && result.success && result.fileId) {
                            // Show confetti animation for success
                            fireSuperConfetti();
                            
                            // Update state for success modal
                            setFileId(result.fileId);
                            setIsSubmitted(true);
                            setShowSuccessModal(true);
                            
                            // Don't show success toast - we'll only show the modal
                            
                            // Log any warnings for debugging
                            if (result.warnings?.length) {
                              result.warnings.forEach((warning: string) => {
                                console.warn('[Card Form] Warning:', warning);
                              });
                            }
                          } else {
                            // This shouldn't happen if we validate in the previous then(),
                            // but just in case something slips through
                            throw new Error('Received invalid success response from server');
                          }
                        })
                        .catch(error => {
                          // Log the error for debugging
                          console.error('[TaskPage] Form submission failed:', error);
                          
                          // Reset any partial success state to avoid showing success modal
                          setIsSubmitted(false);
                          setShowSuccessModal(false);
                          
                          // Show error toast with specific error message
                          toast({
                            title: "Submission Failed",
                            description: error.message || "Failed to submit compliance form. Please try again.",
                            variant: "destructive",
                          });
                        });
                    }}
                  />
                ) : (
                  // Method selection screen
                  <div className="bg-white rounded-lg border border-gray-100 p-6">
                    <h3 className="text-lg font-medium mb-4">Select Submission Method</h3>
                    <p className="text-muted-foreground mb-6">
                      Please select how you would like to provide the Section 1033 compliance information for {displayName}.
                    </p>
                    
                    <CardMethodChoice 
                      taskId={task.id}
                      onMethodSelect={(method) => setSelectedMethod(method)} 
                      companyName={displayName}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }

  // Fallback handling - this should ideally never happen but provides graceful degradation
  return (
    <DashboardLayout>
      <PageTemplate className="container">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">Task Not Available</h2>
            <p className="text-muted-foreground mb-6">
              This task is no longer available or cannot be displayed.
            </p>
            <Button onClick={handleBackClick}>
              Back to Task Center
            </Button>
          </div>
        </div>
      </PageTemplate>
    </DashboardLayout>
  );
}