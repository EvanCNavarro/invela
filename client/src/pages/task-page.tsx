import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { OnboardingKYBFormPlayground } from "@/components/playground/OnboardingKYBFormPlayground";
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
import { KYBSuccessModal } from "@/components/kyb/KYBSuccessModal";
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
  metadata: {
    companyId?: number;
    companyName?: string;
    company?: {
      name: string;
      description?: string;
    };
    kybFormFile?: number;
    cardFormFile?: number;
    [key: string]: any;
  } | null;
  savedFormData?: Record<string, any>;
}

export default function TaskPage({ params }: TaskPageProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [fileId, setFileId] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'upload' | 'manual' | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Handle both legacy and new slugs
  // Legacy format: "kyb-companyname" or "card-companyname"
  // New format might include task numbers: "1-kyb-companyname" or "3-card-companyname"
  let taskType, companyName;
  
  const slugParts = params.taskSlug.split('-');
  
  // Check if the first part is a number (new format)
  if (/^\d+$/.test(slugParts[0])) {
    // New format with number prefix
    taskType = slugParts[1].toLowerCase();
    companyName = slugParts.slice(2).join('-');
  } else {
    // Legacy format
    taskType = slugParts[0].toLowerCase();
    companyName = slugParts.slice(1).join('-');
  }

  console.log('[TaskPage] Parsed task slug:', { taskType, companyName });
  // Determine API endpoint based on task type
  let apiEndpoint;
  if (taskType === 'kyb') {
    apiEndpoint = '/api/tasks/kyb';
  } else if (taskType === 'card') {
    apiEndpoint = '/api/tasks/card';
  } else if (taskType === 'security') {
    apiEndpoint = '/api/tasks/security';
  } else {
    apiEndpoint = '/api/tasks/kyb'; // Default fallback
  }
  
  // A backup generic endpoint that will fetch all tasks for this company
  const companyTasksEndpoint = `/api/company-tasks`;

  const { data: task, isLoading, error } = useQuery<Task>({
    queryKey: [apiEndpoint, companyName],
    queryFn: async () => {
      try {
        console.log('[TaskPage] Fetching task data:', { 
          apiEndpoint, 
          companyName, 
          fullUrl: `${apiEndpoint}/${companyName}`,
          timestamp: new Date().toISOString()
        });
        
        // First try the specific endpoint
        const response = await fetch(`${apiEndpoint}/${companyName}`);
        console.log('[TaskPage] API response:', { 
          status: response.status, 
          ok: response.ok,
          statusText: response.statusText,
          timestamp: new Date().toISOString()
        });
        
        // If the specific endpoint fails, try the generic one
        if (!response.ok) {
          const errorText = await response.text();
          console.warn('[TaskPage] API error response, trying generic endpoint:', {
            status: response.status,
            statusText: response.statusText,
            errorText,
            timestamp: new Date().toISOString()
          });
          
          // Try the generic company tasks endpoint as a backup
          console.log('[TaskPage] Trying generic company tasks endpoint:', {
            companyTasksEndpoint,
            companyName,
            timestamp: new Date().toISOString()
          });
          
          const companyTasksResponse = await fetch(`${companyTasksEndpoint}/${companyName}`);
          
          if (!companyTasksResponse.ok) {
            console.error('[TaskPage] Generic endpoint also failed:', {
              status: companyTasksResponse.status,
              statusText: companyTasksResponse.statusText,
              timestamp: new Date().toISOString()
            });
            throw new Error(`Failed to fetch ${taskType.toUpperCase()} task: ${errorText}`);
          }
          
          // If the generic endpoint succeeds, find the matching task
          const companyTasksData = await companyTasksResponse.json();
          console.log('[TaskPage] Company tasks data received:', {
            companyId: companyTasksData.company?.id,
            companyName: companyTasksData.company?.name,
            taskCount: companyTasksData.tasks?.length,
            timestamp: new Date().toISOString()
          });
          
          // Find the matching task based on task type
          let matchingTask;
          if (taskType === 'kyb') {
            matchingTask = companyTasksData.tasks.find((t: any) => 
              t.task_type === 'company_kyb' || t.task_type === 'company_onboarding_KYB'
            );
          } else if (taskType === 'card') {
            matchingTask = companyTasksData.tasks.find((t: any) => 
              t.task_type === 'company_card'
            );
          } else if (taskType === 'security') {
            matchingTask = companyTasksData.tasks.find((t: any) => 
              t.task_type === 'security_assessment'
            );
          }
          
          if (!matchingTask) {
            console.error('[TaskPage] No matching task found in company tasks:', {
              taskType,
              availableTypes: companyTasksData.tasks.map((t: any) => t.task_type),
              timestamp: new Date().toISOString()
            });
            throw new Error(`No ${taskType.toUpperCase()} task found for company: ${companyName}`);
          }
          
          console.log('[TaskPage] Found matching task from company tasks:', {
            taskId: matchingTask.id,
            taskType: matchingTask.task_type,
            title: matchingTask.title,
            timestamp: new Date().toISOString()
          });
          
          if (matchingTask.metadata?.[`${taskType}FormFile`]) {
            setFileId(matchingTask.metadata[`${taskType}FormFile`]);
            setIsSubmitted(true);
          }
          
          return matchingTask;
        }
        
        // If the specific endpoint succeeds, use that data
        const data = await response.json();
        console.log('[TaskPage] Task data received:', { 
          taskId: data.id,
          taskType: data.task_type,
          title: data.title,
          status: data.status,
          timestamp: new Date().toISOString()
        });
        
        if (data.metadata?.[`${taskType}FormFile`]) {
          setFileId(data.metadata[`${taskType}FormFile`]);
          setIsSubmitted(true);
        }
        return data;
      } catch (error) {
        console.error('[TaskPage] Error in queryFn:', {
          error,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        });
        throw error;
      }
    },
    enabled: taskType === 'kyb' || taskType === 'card' || taskType === 'security',
    staleTime: 0,
  });

  useEffect(() => {
    if (error) {
      console.error('[TaskPage] Error loading task:', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        taskType,
        companyName,
        apiEndpoint,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Error",
        description: `Failed to load ${taskType.toUpperCase()} task. Please try again.`,
        variant: "destructive",
      });
      
      console.log('[TaskPage] Redirecting to task-center due to error');
      navigate('/task-center');
    }
  }, [error, navigate, toast, taskType, companyName, apiEndpoint]);

  const handleBackClick = () => {
    navigate('/task-center');
  };

  const handleDownload = async (format: 'json' | 'csv' | 'txt') => {
    if (!fileId) return;

    try {
      const downloadEndpoint = taskType === 'kyb' ? '/api/kyb/download' : '/api/card/download';
      const response = await fetch(`${downloadEndpoint}/${fileId}?format=${format}`);
      if (!response.ok) throw new Error('Failed to download file');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${taskType}_form.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download the file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleMethodSelect = (method: 'upload' | 'manual') => {
    setSelectedMethod(method);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!task) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Task Not Found</h2>
            <p className="text-muted-foreground">
              Could not find the {taskType.toUpperCase()} task for {companyName}. Please try again.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (taskType !== 'kyb' && taskType !== 'card' && taskType !== 'security') {
    console.log('[TaskPage] Unknown task type, redirecting to task center:', taskType);
    navigate('/task-center');
    return null;
  }

  const displayName = task.metadata?.company?.name || task.metadata?.companyName || companyName;

  if (taskType === 'security') {
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

              {(isSubmitted || task?.metadata?.securityFormFile) && (
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
              <h2 className="text-2xl font-semibold mb-4">Security Assessment: {displayName}</h2>
              <p className="text-muted-foreground mb-6">
                Complete the security assessment for {displayName}. This assessment evaluates security protocols, 
                data handling practices, and compliance measures. This is a required step before proceeding to the CARD assessment.
              </p>
              
              {/* Security Form Implementation */}
              {/* This would be replaced with a proper SecurityFormPlayground component once implemented */}
              <SecurityFormPlayground
                taskId={task.id}
                companyName={companyName}
                companyData={{
                  name: displayName,
                  description: task.metadata?.company?.description || undefined
                }}
                savedFormData={task.savedFormData}
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
        </PageTemplate>
      </DashboardLayout>
    );
  }
  
  if (taskType === 'card') {
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

              {(isSubmitted || task?.metadata?.cardFormFile) && (
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
                companyName={companyName}
                onComplete={() => {
                  setShowForm(true);
                }}
              />
            ) : (selectedMethod === 'manual' || showForm) ? (
              <CardFormPlayground
                taskId={task?.id || 0}
                companyName={companyName}
                companyData={{
                  name: task?.metadata?.company?.name || companyName,
                  description: task?.metadata?.company?.description || undefined
                }}
                onSubmit={(formData) => {
                  fetch('/api/card/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      fileName: `compliance_${companyName}_${new Date().toISOString().replace(/[:]/g, '').split('.')[0]}`,
                      formData,
                      taskId: task?.id
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
                        console.log('[TaskPage] Save completed with warnings:', result.warnings);
                      }
                    })
                    .catch(error => {
                      console.error('[TaskPage] Form submission failed:', error);
                      toast({
                        title: "Error",
                        description: error.message || "Failed to save compliance form. Please try again.",
                        variant: "destructive",
                      });
                    });
                }}
              />
            ) : (
              <CardMethodChoice
                taskId={task?.id || 0}
                companyName={companyName}
                onMethodSelect={handleMethodSelect}
              />
            )}
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }

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

            {(isSubmitted || task.metadata?.[`${taskType}FormFile`]) && (
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
          {taskType === 'kyb' ? (
            <OnboardingKYBFormPlayground
              taskId={task.id}
              companyName={companyName}
              companyData={{
                name: displayName,
                description: task.metadata?.company?.description || undefined
              }}
              savedFormData={task.savedFormData}
              onSubmit={(formData) => {
                const submitData = {
                  fileName: `kyb_${companyName}_${new Date().toISOString().replace(/[:]/g, '').split('.')[0]}`,
                  formData,
                  taskId: task.id
                };

                toast({
                  title: "Saving KYB form",
                  description: "Please wait while we process your submission...",
                });

                fetch('/api/kyb/save', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(submitData)
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
                      description: result.warnings?.length
                        ? "KYB form has been saved successfully with some updates to existing data."
                        : "KYB form has been saved successfully.",
                      variant: "default",
                    });

                    if (result.warnings?.length) {
                      console.log('[TaskPage] Save completed with warnings:', result.warnings);
                    }
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
          ) : (
            <></>
          )}
        </div>

        <KYBSuccessModal
          open={showSuccessModal}
          onOpenChange={setShowSuccessModal}
          companyName={displayName}
        />
      </PageTemplate>
    </DashboardLayout>
  );
}