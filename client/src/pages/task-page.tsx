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

  // Parse taskSlug - it could be either a direct ID or a formatted string like "kyb-CompanyName"
  let taskId: number | null = null;
  let taskType = ''; // Will be determined after we get task data
  
  // First, try to parse as a direct numeric ID
  const parsedId = parseInt(params.taskSlug);
  
  // Check if the slug is simply a numeric ID
  if (!isNaN(parsedId)) {
    taskId = parsedId;
    console.log('[TaskPage] Using direct task ID:', { 
      taskId,
      timestamp: new Date().toISOString()
    });
  } else {
    // If taskSlug is not a simple ID, it might be in the format "taskType-companyName"
    // For now, we'll still need to fetch the task by ID, so we'll fall back to direct endpoint
    console.log('[TaskPage] Using fallback lookup for task slug:', {
      taskSlug: params.taskSlug,
      timestamp: new Date().toISOString()
    });
    
    // We'll implement smarter lookup later if needed
    const match = params.taskSlug.match(/^(kyb|card|security)-(.+)$/i);
    if (match) {
      const [, type, companyName] = match;
      console.log('[TaskPage] Parsed task slug format:', { type, companyName });
      // For now, we still need an ID, which we'll get from API response
    }
  }
  
  // API endpoint for task fetching
  const apiEndpoint = '/api/tasks';
  
  console.log('[TaskPage] Task initialization:', { 
    taskSlug: params.taskSlug,
    parsedId,
    taskId,
    apiEndpoint: taskId ? `${apiEndpoint}/${taskId}` : apiEndpoint,
    timestamp: new Date().toISOString()
  });

  // Function to extract company name from task title when needed
  const extractCompanyNameFromTitle = (title: string): string => {
    const match = title?.match(/(\d+\.\s*)?(Company\s*)?(KYB|CARD|Open Banking \(1033\) Survey|Security Assessment)(\s*Form)?(\s*Assessment)?:\s*(.*)/);
    if (match && match[6]) {
      return match[6].trim();
    }
    return 'Unknown Company';
  };

  const { data: task, isLoading, error } = useQuery<Task>({
    queryKey: [apiEndpoint, taskId, params.taskSlug],
    queryFn: async () => {
      try {
        let response;
        
        // If we have a task ID, use direct ID lookup with special endpoint
        if (taskId) {
          console.log('[TaskPage] Fetching task data by ID:', { 
            taskId,
            fullUrl: `/api/tasks.json/${taskId}`, // Use .json extension to avoid Vite interference
            timestamp: new Date().toISOString()
          });
          
          // Use the special non-Vite task ID endpoint with .json extension
          response = await fetch(`/api/tasks.json/${taskId}`);
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
            let lookupEndpoint;
            if (type.toLowerCase() === 'kyb') {
              lookupEndpoint = `${apiEndpoint}/kyb/${encodeURIComponent(companyName)}`;
            } else if (type.toLowerCase() === 'card') {
              lookupEndpoint = `${apiEndpoint}/card/${encodeURIComponent(companyName)}`;
            } else if (type.toLowerCase() === 'security') {
              lookupEndpoint = `${apiEndpoint}/security/${encodeURIComponent(companyName)}`;
            }
            
            // Fetch the task using the appropriate endpoint
            if (lookupEndpoint) {
              response = await fetch(lookupEndpoint);
            } else {
              throw new Error(`Invalid task type: ${type}`);
            }
          } else {
            throw new Error(`Invalid task slug format: ${params.taskSlug}`);
          }
        }
        
        console.log('[TaskPage] API response:', { 
          status: response.status, 
          ok: response.ok,
          statusText: response.statusText,
          timestamp: new Date().toISOString()
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[TaskPage] Failed to fetch task:', {
            taskSlug: params.taskSlug,
            taskId,
            status: response.status,
            statusText: response.statusText,
            errorText,
            timestamp: new Date().toISOString()
          });
          throw new Error(`Failed to fetch task: ${errorText}`);
        }
        
        // Parse the response data
        const data = await response.json();
        console.log('[TaskPage] Task data received:', { 
          taskId: data.id,
          taskType: data.task_type,
          title: data.title,
          status: data.status,
          timestamp: new Date().toISOString()
        });
        
        // Determine the task type based on the task_type field
        if (data.task_type === 'company_kyb' || data.task_type === 'company_onboarding_KYB') {
          taskType = 'kyb';
        } else if (data.task_type === 'company_card') {
          taskType = 'card';
        } else if (data.task_type === 'security_assessment') {
          taskType = 'security';
        } else {
          taskType = 'unknown';
        }
        
        // Check if the task has a form file for rendering submitted content
        const formFileKey = `${taskType}FormFile`;
        if (data.metadata?.[formFileKey]) {
          setFileId(data.metadata[formFileKey]);
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
    enabled: true, // Always enabled to fetch the task
    staleTime: 0,
  });

  useEffect(() => {
    if (error) {
      console.error('[TaskPage] Error loading task:', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        taskType: taskType || 'unknown',
        taskId,
        apiEndpoint,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Error",
        description: `Failed to load task #${taskId}. Please try again.`,
        variant: "destructive",
      });
      
      console.log('[TaskPage] Redirecting to task-center due to error');
      navigate('/task-center');
    }
  }, [error, navigate, toast, taskType, taskId, apiEndpoint]);

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
              Could not find the task #{taskId}. Please try again.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // This useEffect will handle navigation outside of the render cycle
  // to avoid React errors about setState during render
  useEffect(() => {
    if (task && taskType !== 'kyb' && taskType !== 'card' && taskType !== 'security') {
      console.log('[TaskPage] Unknown task type, redirecting to task center:', taskType);
      navigate('/task-center');
    }
  }, [task, taskType, navigate]);
  
  if (task && taskType !== 'kyb' && taskType !== 'card' && taskType !== 'security') {
    return <LoadingSpinner size="lg" />;
  }
  
  // Get the company name from task metadata or title 
  const derivedCompanyName = task ? extractCompanyNameFromTitle(task.title) : '';
  const displayName = task?.metadata?.company?.name || task?.metadata?.companyName || derivedCompanyName;
  
  // KYB Task Form Rendering
  if (taskType === 'kyb') {
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
              <h2 className="text-2xl font-semibold mb-4">KYB Form: {displayName}</h2>
              <p className="text-muted-foreground mb-6">
                Please complete the Know Your Business (KYB) form for {displayName}. 
                This information helps us understand your business and ensure compliance with regulations.
              </p>
              
              <OnboardingKYBFormPlayground
                taskId={task.id}
                companyName={derivedCompanyName}
                companyData={{
                  name: displayName,
                  description: task.metadata?.company?.description || undefined
                }}
                savedFormData={task.savedFormData}
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

  // We already defined these variables earlier

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
              <SecurityFormPlayground
                taskId={task.id}
                companyName={derivedCompanyName}
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
                companyName={derivedCompanyName}
                onComplete={() => {
                  setShowForm(true);
                }}
              />
            ) : (selectedMethod === 'manual' || showForm) ? (
              <CardFormPlayground
                taskId={task?.id || 0}
                companyName={derivedCompanyName}
                companyData={{
                  name: displayName,
                  description: task?.metadata?.company?.description || undefined
                }}
                onSubmit={(formData) => {
                  fetch('/api/card/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      fileName: `compliance_${derivedCompanyName}_${new Date().toISOString().replace(/[:]/g, '').split('.')[0]}`,
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
                companyName={derivedCompanyName}
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
              companyName={derivedCompanyName}
              companyData={{
                name: displayName,
                description: task.metadata?.company?.description || undefined
              }}
              savedFormData={task.savedFormData}
              onSubmit={(formData) => {
                const submitData = {
                  fileName: `kyb_${derivedCompanyName}_${new Date().toISOString().replace(/[:]/g, '').split('.')[0]}`,
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
          ) : null}

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