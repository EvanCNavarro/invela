import React, { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { UniversalForm } from "@/components/forms/UniversalForm";
import { CardFormPlayground } from "@/components/playground/CardFormPlayground";
import { SecurityFormPlayground } from "@/components/playground/SecurityFormPlayground";
import { OpenBankingPlayground } from "@/components/playground/OpenBankingPlayground";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import { ArrowLeft, Download, FileJson, FileSpreadsheet, FileText } from "lucide-react";
import { PageTemplate } from "@/components/ui/page-template";
import { BreadcrumbNav } from "@/components/dashboard/BreadcrumbNav";
import { KYBSuccessModal } from "@/components/kyb/KYBSuccessModal";
import { SecuritySuccessModal } from "@/components/security/SecuritySuccessModal";
import { fireEnhancedConfetti } from '@/utils/confetti';
import { CardMethodChoice } from "@/components/card/CardMethodChoice";
import { DocumentUploadWizard } from "@/components/documents/DocumentUploadWizard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

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
  metadata: {
    companyId?: number;
    companyName?: string;
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

// Define task type as a valid type
type TaskContentType = 'kyb' | 'card' | 'security' | 'open_banking' | 'unknown';

export default function TaskPage({ params }: TaskPageProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // All state variables defined at the top level
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [fileId, setFileId] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'upload' | 'manual' | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [derivedCompanyName, setDerivedCompanyName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [taskContentType, setTaskContentType] = useState<TaskContentType>('unknown');
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  
  // Parse taskSlug into a numeric ID if possible
  const parsedId = parseInt(params.taskSlug);
  const taskId = !isNaN(parsedId) ? parsedId : null;
  
  // The url for fetching tasks
  const apiEndpoint = taskId ? `/api/tasks.json/${taskId}` : '/api/tasks';
  
  // Function to extract company name from task title
  const extractCompanyNameFromTitle = useCallback((title: string): string => {
    const match = title?.match(/(\d+\.\s*)?(Company\s*)?(KYB|CARD|Open Banking \(1033\) Survey|Security Assessment)(\s*Form)?(\s*Assessment)?:\s*(.*)/);
    if (match && match[6]) {
      return match[6].trim();
    }
    return 'Unknown Company';
  }, []);
  
  // Log task initialization for debugging
  useEffect(() => {
    console.log('[TaskPage] Task initialization:', { 
      taskSlug: params.taskSlug,
      parsedId,
      taskId,
      apiEndpoint: taskId ? apiEndpoint : '/api/tasks',
      timestamp: new Date().toISOString()
    });
  }, [params.taskSlug, parsedId, taskId, apiEndpoint]);
  
  // Handle back button click
  const handleBackClick = useCallback(() => {
    navigate('/task-center');
  }, [navigate]);
  
  // Handle file downloads
  const handleDownload = useCallback(async (format: 'json' | 'csv' | 'txt') => {
    if (!fileId) return;
    
    try {
      const response = await fetch(`/api/files/${fileId}/download?format=${format}`);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }
      
      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance_data_${taskContentType}_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('[TaskPage] Download error:', err);
      toast({
        title: "Download Failed",
        description: "Could not download the file. Please try again later.",
        variant: "destructive",
      });
    }
  }, [fileId, taskContentType, toast]);
  
  // Fetch task data and keep local state to allow updates
  const { data: taskData, isLoading, error } = useQuery<Task>({
    queryKey: [apiEndpoint, taskId, params.taskSlug],
    queryFn: async () => {
      try {
        let response;
        
        // If we have a task ID, use direct ID lookup with special endpoint
        if (taskId) {
          console.log('[TaskPage] Fetching task data by ID:', { 
            taskId,
            fullUrl: apiEndpoint,
            timestamp: new Date().toISOString()
          });
          
          response = await fetch(apiEndpoint);
        } 
        // Otherwise try to parse the slug for name-based lookup
        else {
          // Parse the slug format: "{taskType}-{companyName}"
          const match = params.taskSlug.match(/^(kyb|card|security)-(.+)$/i);
          
          if (match) {
            const [, type, companyName] = match;
            console.log('[TaskPage] Fetching task by type and company name:', { 
              type, 
              companyName,
              timestamp: new Date().toISOString()
            });
            
            // Determine the endpoint based on task type
            let lookupEndpoint = '';
            if (type.toLowerCase() === 'kyb') {
              lookupEndpoint = `/api/tasks/kyb/${encodeURIComponent(companyName)}`;
            } else if (type.toLowerCase() === 'card') {
              lookupEndpoint = `/api/tasks/card/${encodeURIComponent(companyName)}`;
            } else if (type.toLowerCase() === 'security') {
              lookupEndpoint = `/api/tasks/security/${encodeURIComponent(companyName)}`;
            }
            
            if (lookupEndpoint) {
              response = await fetch(lookupEndpoint);
            } else {
              throw new Error(`Unsupported task type: ${type}`);
            }
          } else {
            throw new Error(`Invalid task slug format: ${params.taskSlug}`);
          }
        }
        
        if (!response.ok) {
          console.error('[TaskPage] Failed to fetch task:', { 
            status: response.status, 
            url: response.url,
            timestamp: new Date().toISOString()
          });
          throw new Error(`Failed to fetch task: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        console.log('[TaskPage] Task data received:', { 
          taskId: data.id,
          taskType: data.task_type,
          title: data.title,
          status: data.status,
          timestamp: new Date().toISOString()
        });
        
        return data;
      } catch (err) {
        console.error('[TaskPage] Error fetching task:', err);
        throw err;
      }
    },
    staleTime: 300000 // 5 minutes
  });
  
  // Define the task processing logic outside the render cycle
  const processTaskData = useCallback((taskData: Task) => {
    if (!taskData) return;
    
    // Determine task type for rendering
    let type: TaskContentType = 'unknown';
    
    if (taskData.task_type === 'company_kyb' || taskData.task_type === 'company_onboarding_KYB') {
      type = 'kyb';
    } else if (taskData.task_type === 'company_card') {
      type = 'card';
    } else if (taskData.task_type === 'security_assessment' || taskData.task_type === 'sp_ky3p_assessment' || taskData.task_type === 'ky3p') {
      type = 'security';
    } else if (taskData.task_type === 'open_banking_survey' || taskData.task_type === 'open_banking') {
      type = 'open_banking';
    }
    
    // Extract company information
    const extractedName = extractCompanyNameFromTitle(taskData.title);
    
    // Set display name from metadata or fallback to extracted name
    const displayNameValue = taskData?.metadata?.company?.name || 
                            taskData?.metadata?.companyName || 
                            extractedName || 
                            'Unknown Company';
    
    // Return the processed values
    return {
      type,
      extractedName,
      displayNameValue,
      shouldRedirect: type === 'unknown',
      isSubmitted: !!(
        taskData.status === 'submitted' || 
        (type === 'kyb' && taskData.metadata?.kybFormFile) ||
        (type === 'card' && taskData.metadata?.cardFormFile) ||
        (type === 'security' && taskData.metadata?.securityFormFile) ||
        (type === 'open_banking' && taskData.metadata?.openBankingFormFile)
      ),
      fileId: type === 'kyb' ? taskData.metadata?.kybFormFile :
              type === 'card' ? taskData.metadata?.cardFormFile :
              type === 'security' ? taskData.metadata?.securityFormFile :
              type === 'open_banking' ? taskData.metadata?.openBankingFormFile : null
    };
  }, [extractCompanyNameFromTitle]);
  
  // Function to safely update task progress
  const updateTaskProgress = useCallback((progress: number, task: Task | null) => {
    if (!task) return;
    setTask({
      ...task,
      progress
    });
  }, []);

  // Set task state from taskData when it changes
  useEffect(() => {
    if (taskData) {
      setTask(taskData);
    }
  }, [taskData]);

  // Process task data once loaded - using useEffect properly
  useEffect(() => {
    if (!task) return;
    
    const processedData = processTaskData(task);
    if (!processedData) return;
    
    // Update state variables safely in useEffect
    setTaskContentType(processedData.type);
    setDerivedCompanyName(processedData.extractedName);
    setDisplayName(processedData.displayNameValue);
    setShouldRedirect(processedData.shouldRedirect);
    setIsSubmitted(processedData.isSubmitted);
    
    if (processedData.fileId) {
      setFileId(processedData.fileId);
    }
    
    // Log for debugging
    if (processedData.shouldRedirect) {
      console.log('[TaskPage] Unknown task type, redirecting to task center:', task.task_type);
    }
  }, [task, processTaskData]);
  
  // Handle error states
  useEffect(() => {
    if (error) {
      console.error('[TaskPage] Task fetch error:', error);
      toast({
        title: "Error",
        description: "Failed to load task details. Please try again or contact support.",
        variant: "destructive",
      });
      
      // Redirect back to task center after short delay
      const timer = setTimeout(() => {
        navigate('/task-center');
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [error, navigate, toast]);
  
  // Handle redirection for unknown task types
  useEffect(() => {
    if (shouldRedirect) {
      navigate('/task-center');
    }
  }, [shouldRedirect, navigate]);
  
  // Show loading spinner while fetching data
  if (isLoading) {
    return (
      <DashboardLayout>
        <PageTemplate className="container">
          <div className="flex items-center justify-center min-h-[60vh]">
            <LoadingSpinner size="lg" />
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }
  
  // Show loading spinner for unknown task types while redirecting
  if (shouldRedirect) {
    return (
      <DashboardLayout>
        <PageTemplate className="container">
          <div className="flex items-center justify-center min-h-[60vh]">
            <LoadingSpinner size="lg" />
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }
  
  // KYB Task Form Rendering
  if (taskContentType === 'kyb' && task) {
    return (
      <DashboardLayout>
        <PageTemplate className="space-y-6">
          <div className="space-y-4">
            <BreadcrumbNav forceFallback={true} />
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                className="text-sm font-medium bg-white border-muted-foreground/20"
                onClick={handleBackClick}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Task Center
              </Button>

              {isSubmitted && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDownload('json')}>
                      <FileJson className="mr-2 h-4 w-4" />
                      Download as JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload('csv')}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Download as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload('txt')}>
                      <FileText className="mr-2 h-4 w-4" />
                      Download as TXT
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <div className="container max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              {/* Universal form component */}
              <UniversalForm
                taskId={task.id}
                taskType="kyb"
                taskStatus={task.status}
                companyName={displayName}
                initialData={task.savedFormData}
                onProgress={(progress) => {
                  // Update local state immediately for responsive UI
                  updateTaskProgress(progress, task);
                  
                  console.log('[TaskPage] Form progress updated:', progress);
                  
                  // Send the progress to the server to update the task
                  fetch(`/api/tasks/${task.id}/update-progress`, {
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
                  .then(response => {
                    if (!response.ok) {
                      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                    }
                    return response.json();
                  })
                  .then(result => {
                    console.log('[TaskPage] Task progress updated on server:', result);
                    
                    // Force refetch of tasks to update task center
                    fetch('/api/tasks')
                      .then(response => response.json())
                      .catch(err => console.warn('[TaskPage] Error refreshing task list:', err));
                  })
                  .catch(error => {
                    console.error('[TaskPage] Failed to update task progress:', error);
                    
                    // Revert local state on error if we have a valid task
                    if (task) {
                      updateTaskProgress(task.progress, task);
                    }
                  });
                }}
                onSubmit={(formData) => {
                  toast({
                    title: "Submitting KYB Form",
                    description: "Please wait while we process your submission...",
                  });

                  fetch(`/api/kyb/submit/${task.id}`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ formData })
                  })
                    .then(async response => {
                      const data = await response.json();
                      if (!response.ok) {
                        throw new Error(data.details || data.error || 'Failed to save KYB form');
                      }
                      return data;
                    })
                    .then((result) => {
                      confetti({
                        particleCount: 150,
                        spread: 80,
                        origin: { y: 0.6 },
                        colors: ['#00A3FF', '#0091FF', '#0068FF', '#0059FF', '#0040FF']
                      });

                      setFileId(result.fileId);
                      setIsSubmitted(true);
                      setShowSuccessModal(true);

                      toast({
                        title: "Success",
                        description: "KYB form has been saved successfully.",
                        variant: "default",
                      });
                    })
                    .catch(error => {
                      console.error('[TaskPage] Form submission failed:', error);
                      toast({
                        title: "Error",
                        description: error.message || "Failed to save KYB form. Please try again.",
                        variant: "destructive",
                      });
                    });
                }}
              />
            </div>

            {showSuccessModal && (
              <KYBSuccessModal
                open={showSuccessModal}
                onOpenChange={(open) => setShowSuccessModal(open)}
                companyName={displayName}
              />
            )}
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
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                className="text-sm font-medium bg-white border-muted-foreground/20"
                onClick={handleBackClick}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Task Center
              </Button>

              {isSubmitted && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDownload('json')}>
                      <FileJson className="mr-2 h-4 w-4" />
                      Download as JSON
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <div className="container max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              {/* Universal form for Security Assessment */}
              <UniversalForm
                taskId={task.id}
                taskType="ky3p"
                taskStatus={task.status}
                companyName={displayName}
                initialData={task.savedFormData}
                onProgress={(progress) => {
                  // Update local state immediately for responsive UI
                  updateTaskProgress(progress, task);
                  
                  console.log('[TaskPage] Security Form progress updated:', progress);
                  
                  // Send the progress to the server to update the task
                  fetch(`/api/tasks/${task.id}/update-progress`, {
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
                  .then(response => {
                    if (!response.ok) {
                      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                    }
                    return response.json();
                  })
                  .then(result => {
                    console.log('[TaskPage] Task progress updated on server:', result);
                    
                    // Force refetch of tasks to update task center
                    fetch('/api/tasks')
                      .then(response => response.json())
                      .catch(err => console.warn('[TaskPage] Error refreshing task list:', err));
                  })
                  .catch(error => {
                    console.error('[TaskPage] Failed to update task progress:', error);
                    
                    // Revert local state on error if we have a valid task
                    if (task) {
                      updateTaskProgress(task.progress, task);
                    }
                  });
                }}
                onSubmit={(formData) => {
                  toast({
                    title: "Submitting Security Assessment",
                    description: "Please wait while we process your submission...",
                  });

                  // Submit the security assessment
                  fetch(`/api/security/submit/${task.id}`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ formData })
                  })
                    .then(async response => {
                      const data = await response.json();
                      if (!response.ok) {
                        throw new Error(data.details || data.error || 'Failed to submit security assessment');
                      }
                      return data;
                    })
                    .then(() => {
                      confetti({
                        particleCount: 150,
                        spread: 80,
                        origin: { y: 0.6 },
                        colors: ['#00A3FF', '#0091FF', '#0068FF', '#0059FF', '#0040FF']
                      });

                      setIsSubmitted(true);
                      setShowSuccessModal(true);

                      toast({
                        title: "Success",
                        description: "Security assessment has been submitted successfully.",
                        variant: "default",
                      });
                    })
                    .catch(error => {
                      console.error('[TaskPage] Security assessment submission failed:', error);
                      toast({
                        title: "Error",
                        description: error.message || "Failed to submit security assessment. Please try again.",
                        variant: "destructive",
                      });
                    });
                }}
              />
            </div>
          </div>
          
          {showSuccessModal && (
            <SecuritySuccessModal
              open={showSuccessModal}
              onOpenChange={(open) => setShowSuccessModal(open)}
              companyName={displayName}
            />
          )}
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
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                className="text-sm font-medium bg-white border-muted-foreground/20"
                onClick={handleBackClick}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Task Center
              </Button>

              {isSubmitted && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDownload('json')}>
                      <FileJson className="mr-2 h-4 w-4" />
                      Download as JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload('csv')}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Download as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload('txt')}>
                      <FileText className="mr-2 h-4 w-4" />
                      Download as Text
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <div className="container max-w-7xl mx-auto">
            {selectedMethod === 'upload' && !showForm ? (
              <DocumentUploadWizard
                companyName={derivedCompanyName}
                onComplete={() => {
                  setShowForm(true);
                }}
              />
            ) : (selectedMethod === 'manual' || showForm) ? (
              <UniversalForm
                taskId={task.id}
                taskType="card"
                taskStatus={task.status}
                companyName={displayName}
                initialData={task.savedFormData}
                onProgress={(progress) => {
                  // Update local state immediately for responsive UI
                  updateTaskProgress(progress, task);
                  
                  console.log('[TaskPage] Card Form progress updated:', progress);
                  
                  // Send the progress to the server to update the task
                  fetch(`/api/tasks/${task.id}/update-progress`, {
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
                  .then(response => {
                    if (!response.ok) {
                      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                    }
                    return response.json();
                  })
                  .then(result => {
                    console.log('[TaskPage] Task progress updated on server:', result);
                    
                    // Force refetch of tasks to update task center
                    fetch('/api/tasks')
                      .then(response => response.json())
                      .catch(err => console.warn('[TaskPage] Error refreshing task list:', err));
                  })
                  .catch(error => {
                    console.error('[TaskPage] Failed to update task progress:', error);
                    
                    // Revert local state on error if we have a valid task
                    if (task) {
                      updateTaskProgress(task.progress, task);
                    }
                  });
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
                      const data = await response.json();
                      if (!response.ok) {
                        throw new Error(data.details || data.error || 'Failed to save compliance form');
                      }
                      return data;
                    })
                    .then((result) => {
                      confetti({
                        particleCount: 150,
                        spread: 80,
                        origin: { y: 0.6 },
                        colors: ['#00A3FF', '#0091FF', '#0068FF', '#0059FF', '#0040FF']
                      });

                      setFileId(result.fileId);
                      setIsSubmitted(true);
                      setShowSuccessModal(true);

                      toast({
                        title: "Success",
                        description: result.warnings?.length
                          ? "Compliance form has been saved successfully with some updates to existing data."
                          : "Compliance form has been saved successfully.",
                        variant: "default",
                      });

                      if (result.warnings?.length) {
                        result.warnings.forEach((warning: string) => {
                          console.warn('[Card Form] Warning:', warning);
                        });
                      }
                    })
                    .catch(error => {
                      console.error('[TaskPage] Form submission failed:', error);
                      toast({
                        title: "Error",
                        description: error.message || "Failed to submit compliance form. Please try again.",
                        variant: "destructive",
                      });
                    });
                }}
              />
            ) : (
              // Method selection screen
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-2xl font-semibold mb-4">Open Banking (1033) Survey: {displayName}</h2>
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
        </PageTemplate>
      </DashboardLayout>
    );
  }

  // Open Banking Survey Form Rendering
  if (taskContentType === 'open_banking' && task) {
    return (
      <DashboardLayout>
        <PageTemplate className="space-y-6">
          <div className="space-y-4">
            <BreadcrumbNav forceFallback={true} />
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                className="text-sm font-medium bg-white border-muted-foreground/20"
                onClick={handleBackClick}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Task Center
              </Button>

              {isSubmitted && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDownload('json')}>
                      <FileJson className="mr-2 h-4 w-4" />
                      Download as JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload('csv')}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Download as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload('txt')}>
                      <FileText className="mr-2 h-4 w-4" />
                      Download as TXT
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <div className="container max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              {/* Universal form for Open Banking Survey */}
              <UniversalForm
                taskId={task.id}
                taskType="open_banking"
                taskStatus={task.status}
                companyName={displayName}
                initialData={task.savedFormData}
                onSubmit={(formData) => {
                  console.log('[TaskPage] Open Banking Survey submitted via playground');
                  
                  // Update UI state
                  setIsSubmitted(true);
                  
                  // Force refetch of tasks to update task center
                  fetch('/api/tasks')
                    .then(response => response.json())
                    .catch(err => console.warn('[TaskPage] Error refreshing task list:', err));
                    
                  // Show success toast
                  toast({
                    title: "Success",
                    description: "Open Banking Survey has been submitted successfully.",
                    variant: "default",
                  });
                }}
              />
            </div>
          </div>
          
          {/* Show success modal if needed */}
          {showSuccessModal && (
            <SecuritySuccessModal
              open={showSuccessModal}
              onOpenChange={(open) => setShowSuccessModal(open)}
              companyName={displayName}
              description="The Open Banking Survey has been successfully submitted and processed."
            />
          )}
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