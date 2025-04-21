import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { UniversalForm } from "@/components/forms/UniversalForm";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import { ArrowLeft } from "lucide-react";
import { TaskDownloadMenu } from "@/components/TaskDownloadMenu";
import { PageTemplate } from "@/components/ui/page-template";
import { BreadcrumbNav } from "@/components/dashboard/BreadcrumbNav";
import { KYBSuccessModal } from "@/components/kyb/KYBSuccessModal";
import { SecuritySuccessModal } from "@/components/security/SecuritySuccessModal";
import { OpenBankingSuccessModal } from "@/components/openbanking/OpenBankingSuccessModal";
import { fireEnhancedConfetti } from '@/utils/confetti';
import { CardMethodChoice } from "@/components/card/CardMethodChoice";
import { DocumentUploadWizard } from "@/components/documents/DocumentUploadWizard";
import { OpenBankingFormService } from "@/services/open-banking-form-service";

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
    openBankingFormFile?: number;
    [key: string]: any;
  } | null;
  savedFormData?: Record<string, any>;
}

// Define task type as a valid type
type TaskContentType = 'kyb' | 'card' | 'security' | 'ky3p' | 'open_banking' | 'unknown';

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
    console.log(`[TaskPage] Extracting company name from title: "${title}"`);
    
    // Updated regex to match various Open Banking Survey patterns
    const match = title?.match(/(\d+\.\s*)?(Company\s*)?(KYB|CARD|Open Banking(\s*\(1033\))?\s*Survey|Security Assessment)(\s*Form)?(\s*Assessment)?:\s*(.*)/i);
    
    if (match && match[8]) {
      const companyName = match[8].trim();
      console.log(`[TaskPage] Extracted company name: "${companyName}"`);
      return companyName;
    }
    
    // If standard pattern doesn't match, try a simpler approach for the OpenBanking form
    if (title?.includes('Open Banking Survey:')) {
      const companyName = title.split('Open Banking Survey:')[1]?.trim();
      if (companyName) {
        console.log(`[TaskPage] Extracted company name (fallback): "${companyName}"`);
        return companyName;
      }
    }
    
    console.log(`[TaskPage] Could not extract company name from title: "${title}"`);
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
  
  // Handle file downloads - returns a Promise that resolves when download is started
  const handleDownload = useCallback(async (format: 'csv' | 'txt' | 'json'): Promise<void> => {
    console.log('[TaskPage] Starting download process:', { 
      format, 
      fileId, 
      taskContentType,
      taskType: task?.task_type,
      taskStatus: task?.status,
      metadata: task?.metadata
    });
    
    if (!fileId) {
      console.error('[TaskPage] Download failed: No file ID available');
      // Throw an error to be caught by the TaskDownloadMenu component
      throw new Error("No file is available for download. Please contact support.");
    }
    
    try {
      // If this is a ky3p task but we're using the security form file, log this information
      if (taskContentType === 'ky3p') {
        console.log('[TaskPage] KY3P task download:', { 
          fileId,
          securityFormFile: task?.metadata?.securityFormFile,
          ky3pFormFile: task?.metadata?.ky3pFormFile
        });
      }
      
      // Prepare task type display name for toast notifications
      const taskTypeDisplay = taskContentType === 'kyb' ? 'KYB Assessment' :
                           taskContentType === 'ky3p' ? 'S&P KY3P Assessment' :
                           taskContentType === 'open_banking' ? '1033 Open Banking Survey' :
                           taskContentType === 'card' ? 'CARD Assessment' : 'Form';
      
      // Skip showing the "Download Started" toast as requested
      // We'll just show the completion toast once download is finished
      
      console.log(`[TaskPage] Fetching file from: /api/files/${fileId}/download?format=${format}`);
      
      // Fix type error: use proper credentials type
      // Add timestamp to prevent caching issues
      const timestamp = new Date().getTime();
      
      // Enhanced request with retry capability
      let response;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          console.log(`[TaskPage] Requesting download (attempt ${retryCount + 1}/${maxRetries + 1}):`, 
            `/api/files/${fileId}/download?format=${format}&t=${timestamp}`
          );
          
          response = await fetch(`/api/files/${fileId}/download?format=${format}&t=${timestamp}`, {
            credentials: 'include' as RequestCredentials, // Include session cookies for authentication
            headers: {
              'Accept': format === 'json' ? 'application/json' : 
                       format === 'txt' ? 'text/plain' : 'text/csv',
              'X-Download-Format': format,
              'X-Task-Type': taskContentType || 'unknown'
            },
            cache: 'no-store' // Prevent caching to ensure fresh content
          });
          
          // Break the retry loop if successful
          if (response.ok) break;
          
          // If error is not retryable (client errors), break immediately
          if (response.status >= 400 && response.status < 500) {
            console.error(`[TaskPage] Client error (${response.status}), not retrying.`);
            break;
          }
          
          // If we've reached the maximum retries, break
          if (retryCount >= maxRetries) break;
          
          // Increment retry counter and wait before next attempt
          retryCount++;
          console.warn(`[TaskPage] Download attempt failed, retrying (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        } catch (fetchError) {
          console.error('[TaskPage] Fetch error during download:', fetchError);
          
          // If we've reached the maximum retries, break and re-throw
          if (retryCount >= maxRetries) throw fetchError;
          
          // Increment retry counter and wait before next attempt
          retryCount++;
          console.warn(`[TaskPage] Network error, retrying (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }
      
      if (!response) {
        throw new Error('Network error during download');
      }
      
      console.log(`[TaskPage] Download response:`, { 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok,
        retries: retryCount
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }
      
      // Handle file download
      const blob = await response.blob();
      console.log(`[TaskPage] Downloaded blob:`, { 
        size: blob.size, 
        type: blob.type,
        empty: blob.size === 0
      });
      
      // Check if the blob is empty or very small
      if (blob.size === 0) {
        console.warn('[TaskPage] Downloaded file appears to be empty. This may indicate a server-side error.');
      }
      
      // Log headers for debugging
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.log('[TaskPage] Response headers:', headers);
      
      // Create and trigger download
      try {
        const url = window.URL.createObjectURL(blob);
        console.log('[TaskPage] Created blob URL:', url);
        
        const a = document.createElement('a');
        a.href = url;
        
        // Try to get the filename from Content-Disposition header first
        let filename = '';
        const contentDisposition = response.headers.get('Content-Disposition');
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
          if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1];
            console.log('[TaskPage] Using server-provided filename:', filename);
          }
        }
        
        // Fallback to generated filename if server didn't provide one
        if (!filename) {
          const timestamp = new Date().toISOString().split('T')[0];
          // Use standardized assessment type naming conventions
          const assessmentType = 
            taskContentType === 'kyb' ? 'kyb_assessment' :
            taskContentType === 'ky3p' ? 'spglobal_ky3p_assessment' :
            taskContentType === 'open_banking' ? '1033_open_banking_survey' :
            taskContentType === 'card' ? 'card_assessment' : 'assessment';
          
          filename = `${assessmentType}_${timestamp}.${format}`;
          console.log('[TaskPage] Using fallback filename:', filename);
        }
        
        a.download = filename;
        console.log('[TaskPage] Setting download filename:', filename);
        
        // Append temporarily to document to trigger download
        document.body.appendChild(a);
        console.log('[TaskPage] Initiating download...');
        a.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        console.log('[TaskPage] Download cleanup complete');
      } catch (downloadError) {
        console.error('[TaskPage] Error during download file creation:', downloadError);
        throw downloadError; // Re-throw to be caught by outer try/catch
      }
      
      // Display success toast to confirm download complete
      // We already have the taskTypeDisplay variable from above
      
      // No need to dismiss anything since we're not showing the "Download Started" toast
      
      // Show the success toast
      toast({
        title: "Download Complete",
        description: `Your ${taskTypeDisplay} has been downloaded successfully.`,
        variant: "success",
      });
      
      console.log(`[TaskPage] Download completed successfully`);
    } catch (err) {
      console.error('[TaskPage] Download error:', err);
      
      // No need to dismiss anything since we're not showing the "Download Started" toast
      
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
          const match = params.taskSlug.match(/^(kyb|card|security|ky3p)-(.+)$/i);
          
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
            } else if (type.toLowerCase() === 'security' || type.toLowerCase() === 'ky3p') {
              lookupEndpoint = `/api/tasks/ky3p/${encodeURIComponent(companyName)}`;
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
    } else if (taskData.task_type === 'security_assessment' || taskData.task_type === 'sp_ky3p_assessment' || taskData.task_type === 'ky3p' || taskData.task_type === 'security') {
      // Always use 'ky3p' as the taskType for the form component, regardless of the task.task_type value
      // This ensures we use the correct form service
      type = 'ky3p';
    } else if (taskData.task_type === 'open_banking_survey' || taskData.task_type === 'open_banking') {
      type = 'open_banking';
    }
    
    // Extract company information
    const extractedName = extractCompanyNameFromTitle(taskData.title);
    
    // Extract company name from current company data (using React Query cache)
    const { queryClient } = require('@/lib/queryClient');
    const currentCompanyData = queryClient.getQueryData<any>(['/api/companies/current']);
    const currentCompanyName = currentCompanyData?.name;
    
    if (currentCompanyName) {
      console.log(`[TaskPage] Found current company name from API: "${currentCompanyName}"`);
    }
    
    // Set display name from multiple sources with priority order
    const displayNameValue = taskData?.metadata?.company?.name || 
                            taskData?.metadata?.companyName || 
                            extractedName || 
                            currentCompanyName ||
                            'Unknown Company';
                            
    console.log(`[TaskPage] Company name set for ${type} form:`, {
      displayNameValue,
      extractedName,
      metadataName: taskData?.metadata?.company?.name || taskData?.metadata?.companyName,
      currentCompanyName,
      taskTitle: taskData.title
    });
    
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
        (type === 'ky3p' && (taskData.metadata?.securityFormFile || taskData.metadata?.ky3pFormFile)) ||
        (type === 'open_banking' && taskData.metadata?.openBankingFormFile)
      ),
      fileId: type === 'kyb' ? taskData.metadata?.kybFormFile :
              type === 'card' ? taskData.metadata?.cardFormFile :
              type === 'ky3p' ? taskData.metadata?.ky3pFormFile || taskData.metadata?.securityFormFile :
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
    // Use displayNameValue which includes the proper company metadata for all forms
    setDisplayName(processedData.displayNameValue);
    
    // Log company name extraction for debugging
    console.log(`[TaskPage] Company name set for ${processedData.type} form:`, {
      displayNameValue: processedData.displayNameValue,
      extractedName: processedData.extractedName,
      metadataName: task?.metadata?.company?.name || task?.metadata?.companyName,
      taskTitle: task?.title
    });
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
                <TaskDownloadMenu 
                  onDownload={handleDownload}
                  taskType="kyb"
                  disabled={!fileId}
                />
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
                      console.error('[TaskPage] Failed to update progress:', response.statusText);
                    }
                  })
                  .catch(err => {
                    console.error('[TaskPage] Error updating progress:', err);
                  });
                }}
                onSuccess={() => {
                  setShowSuccessModal(true);
                  fireEnhancedConfetti();
                  
                  // Fetch updated task data to get the file ID
                  fetch(`/api/tasks/${task.id}`)
                    .then(response => response.json())
                    .then(data => {
                      if (data.metadata?.kybFormFile) {
                        setFileId(data.metadata.kybFormFile);
                      }
                    })
                    .catch(err => {
                      console.error('[TaskPage] Error fetching updated task:', err);
                    });
                }}
              />
            </div>
          </div>
          
          {/* KYB Success Modal */}
          <KYBSuccessModal
            open={showSuccessModal}
            onOpenChange={setShowSuccessModal}
            companyName={displayName}
          />
        </PageTemplate>
      </DashboardLayout>
    );
  }
  
  // Card Form Rendering
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
                <TaskDownloadMenu 
                  onDownload={handleDownload}
                  taskType="card"
                  disabled={!fileId}
                />
              )}
            </div>
          </div>

          <div className="container max-w-7xl mx-auto">
            {/* Method selection first, then form */}
            {!showForm && !isSubmitted && (
              <div className="mb-6">
                <CardMethodChoice
                  taskId={task.id}
                  companyName={displayName}
                  onMethodSelect={(method) => {
                    setSelectedMethod(method);
                    setShowForm(true);
                  }}
                  title="Card Industry Questionnaire"
                  description={`Please choose how you would like to complete this Card Industry Questionnaire for ${displayName}.`}
                />
              </div>
            )}
            
            {/* Document upload option */}
            {selectedMethod === 'upload' && showForm && !isSubmitted && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <DocumentUploadWizard
                  taskId={task.id}
                  taskType="card"
                  companyName={displayName}
                  onSuccess={(fileId) => {
                    setFileId(fileId);
                    setIsSubmitted(true);
                    fireEnhancedConfetti();
                  }}
                />
              </div>
            )}
            
            {/* Manual form filling option or view submitted form */}
            {(selectedMethod === 'manual' || isSubmitted) && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <UniversalForm
                  taskId={task.id}
                  taskType="card"
                  taskStatus={task.status}
                  companyName={displayName}
                  initialData={task.savedFormData}
                  onProgress={(progress) => {
                    updateTaskProgress(progress, task);
                    
                    fetch(`/api/tasks/${task.id}/update-progress`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ 
                        progress,
                        calculateFromForm: false, 
                        forceStatusUpdate: true 
                      })
                    })
                    .then(response => {
                      if (!response.ok) {
                        console.error('[TaskPage] Failed to update progress:', response.statusText);
                      }
                    })
                    .catch(err => {
                      console.error('[TaskPage] Error updating progress:', err);
                    });
                  }}
                  onSuccess={() => {
                    setIsSubmitted(true);
                    fireEnhancedConfetti();
                    
                    fetch(`/api/tasks/${task.id}`)
                      .then(response => response.json())
                      .then(data => {
                        if (data.metadata?.cardFormFile) {
                          setFileId(data.metadata.cardFormFile);
                        }
                      })
                      .catch(err => {
                        console.error('[TaskPage] Error fetching updated task:', err);
                      });
                  }}
                />
              </div>
            )}
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }
  
  // Security Assessment (KY3P) Form Rendering
  if (taskContentType === 'ky3p' && task) {
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
                <TaskDownloadMenu 
                  onDownload={handleDownload}
                  taskType="ky3p"
                  disabled={!fileId}
                />
              )}
            </div>
          </div>

          <div className="container max-w-7xl mx-auto">
            {/* Method selection first, then form */}
            {!showForm && !isSubmitted && (
              <div className="mb-6">
                <CardMethodChoice
                  taskId={task.id}
                  companyName={displayName}
                  onMethodSelect={(method) => {
                    setSelectedMethod(method);
                    setShowForm(true);
                  }}
                  title="S&P KY3P Security Assessment"
                  description={`Please choose how you would like to complete this S&P KY3P Security Assessment for ${displayName}.`}
                />
              </div>
            )}
            
            {/* Document upload option */}
            {selectedMethod === 'upload' && showForm && !isSubmitted && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <DocumentUploadWizard
                  taskId={task.id}
                  taskType="ky3p"
                  companyName={displayName}
                  onSuccess={(fileId) => {
                    setFileId(fileId);
                    setIsSubmitted(true);
                    setShowSuccessModal(true);
                    fireEnhancedConfetti();
                  }}
                />
              </div>
            )}
            
            {/* Manual form filling option or view submitted form */}
            {(selectedMethod === 'manual' || isSubmitted) && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <UniversalForm
                  taskId={task.id}
                  taskType="ky3p"
                  taskStatus={task.status}
                  companyName={displayName}
                  initialData={task.savedFormData}
                  onProgress={(progress) => {
                    updateTaskProgress(progress, task);
                    
                    fetch(`/api/tasks/${task.id}/update-progress`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ 
                        progress,
                        calculateFromForm: false, 
                        forceStatusUpdate: true 
                      })
                    })
                    .then(response => {
                      if (!response.ok) {
                        console.error('[TaskPage] Failed to update progress:', response.statusText);
                      }
                    })
                    .catch(err => {
                      console.error('[TaskPage] Error updating progress:', err);
                    });
                  }}
                  onSuccess={() => {
                    setIsSubmitted(true);
                    setShowSuccessModal(true);
                    fireEnhancedConfetti();
                    
                    fetch(`/api/tasks/${task.id}`)
                      .then(response => response.json())
                      .then(data => {
                        console.log('[TaskPage] KY3P task updated metadata:', data.metadata);
                        
                        // Check for both field names and use whichever is available
                        if (data.metadata?.ky3pFormFile) {
                          console.log('[TaskPage] Using ky3pFormFile:', data.metadata.ky3pFormFile);
                          setFileId(data.metadata.ky3pFormFile);
                        } else if (data.metadata?.securityFormFile) {
                          console.log('[TaskPage] Using securityFormFile:', data.metadata.securityFormFile);
                          setFileId(data.metadata.securityFormFile);
                        }
                      })
                      .catch(err => {
                        console.error('[TaskPage] Error fetching updated task:', err);
                      });
                  }}
                />
              </div>
            )}
          </div>
          
          {/* Security Success Modal */}
          <SecuritySuccessModal
            open={showSuccessModal}
            onOpenChange={setShowSuccessModal}
            companyName={displayName}
          />
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
                <TaskDownloadMenu 
                  onDownload={handleDownload}
                  taskType="open_banking"
                  disabled={!fileId}
                />
              )}
            </div>
          </div>

          <div className="container max-w-7xl mx-auto">
            {/* Method selection first, then form */}
            {!showForm && !isSubmitted && (
              <div className="mb-6">
                <CardMethodChoice
                  taskId={task.id}
                  companyName={displayName}
                  onMethodSelect={(method) => {
                    setSelectedMethod(method);
                    setShowForm(true);
                  }}
                  title="1033 Open Banking Survey"
                  description={`Please choose how you would like to complete this 1033 Open Banking Survey for ${displayName}.`}
                />
              </div>
            )}
            
            {/* Document upload option */}
            {selectedMethod === 'upload' && showForm && !isSubmitted && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <DocumentUploadWizard
                  taskId={task.id}
                  taskType="open_banking"
                  companyName={displayName}
                  onSuccess={(fileId) => {
                    setFileId(fileId);
                    setIsSubmitted(true);
                    setShowSuccessModal(true);
                    fireEnhancedConfetti();
                  }}
                />
              </div>
            )}
            
            {/* Force show method selection for Open Banking Survey, but don't auto-select anymore */}
            {/* We want users to choose between upload and manual entry explicitly */}
            
            {/* Manual form filling option or view submitted form */}
            {(selectedMethod === 'manual' || isSubmitted) && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <UniversalForm
                  taskId={task.id}
                  taskType="open_banking"
                  taskStatus={task.status}
                  companyName={displayName}
                  initialData={task.savedFormData}
                  onProgress={(progress) => {
                    updateTaskProgress(progress, task);
                    
                    fetch(`/api/tasks/${task.id}/update-progress`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ 
                        progress,
                        calculateFromForm: false, 
                        forceStatusUpdate: true 
                      })
                    })
                    .then(response => {
                      if (!response.ok) {
                        console.error('[TaskPage] Failed to update progress:', response.statusText);
                      }
                    })
                    .catch(err => {
                      console.error('[TaskPage] Error updating progress:', err);
                    });
                  }}
                  onSubmit={async (formData) => {
                    console.log(`[OPENBANKING SUBMIT] Starting submission for task ${task.id}`);
                    
                    try {
                      // Create service instance with task ID
                      const formService = new OpenBankingFormService(undefined, task.id);
                      
                      // Submit the form data
                      console.log(`[OPENBANKING SUBMIT] Calling OpenBankingFormService.submit()`);
                      const result = await formService.submit({
                        taskId: task.id,
                        fileName: `Open_Banking_Survey_${displayName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
                      });
                      
                      if (result.success) {
                        console.log(`[OPENBANKING SUBMIT] Submission successful, file ID: ${result.fileId}`);
                        
                        // Store the fileId for download functionality
                        if (result.fileId) {
                          setFileId(result.fileId);
                        }
                      } else {
                        console.error(`[OPENBANKING SUBMIT] Submission failed:`, result.error);
                        throw new Error(result.error || 'Unknown error during submission');
                      }
                    } catch (error) {
                      console.error(`[OPENBANKING SUBMIT] Error during submission:`, error);
                      
                      // Show error toast
                      toast({
                        title: "Form Submission Failed",
                        description: error instanceof Error ? error.message : "Failed to submit Open Banking form",
                        variant: "destructive"
                      });
                    }
                  }}
                  onSuccess={() => {
                    try {
                      console.log(`[OPENBANKING SUBMIT] 1. onSuccess handler triggered`);
                      
                      // Set form as submitted
                      setIsSubmitted(true);
                      console.log(`[OPENBANKING SUBMIT] 2. Form marked as submitted`);
                      
                      // Show success modal
                      setShowSuccessModal(true);
                      console.log(`[OPENBANKING SUBMIT] 3. Success modal triggered with company name: ${displayName}`);
                      
                      // CONFETTI DISABLED per user request
                      console.log(`[OPENBANKING SUBMIT] 4. Confetti animation disabled as requested`);
                      
                      console.log(`[OPENBANKING SUBMIT] 5. Fetching updated task data for ID ${task.id}`);
                      
                      fetch(`/api/tasks/${task.id}`)
                        .then(response => {
                          console.log(`[OPENBANKING SUBMIT] 6. Response received with status: ${response.status}`);
                          return response.json();
                        })
                        .then(data => {
                          console.log(`[OPENBANKING SUBMIT] 7. Task data received:`, {
                            fileId: data.metadata?.openBankingFormFile,
                            status: data.status,
                            progress: data.progress
                          });
                          
                          if (data.metadata?.openBankingFormFile) {
                            console.log(`[OPENBANKING SUBMIT] 8. File ID found: ${data.metadata.openBankingFormFile}`);
                            setFileId(data.metadata.openBankingFormFile);
                          } else {
                            console.log(`[OPENBANKING SUBMIT] 8. No fileId found in metadata`);
                          }
                          
                          console.log(`[OPENBANKING SUBMIT] 9. Form submission sequence completed successfully`);
                        })
                        .catch(err => {
                          console.error('[OPENBANKING SUBMIT] ERROR: Error fetching updated task:', err);
                        });
                    } catch (error) {
                      console.error('[TaskPage] Error in OpenBanking onSuccess handler:', error);
                      // Still try to show success even if there's an error
                      setIsSubmitted(true);
                    }
                  }}
                />
              </div>
            )}
          </div>
          
          {/* Render the appropriate success modal based on the task type */}
          {taskContentType === 'open_banking' && (
            <OpenBankingSuccessModal
              open={showSuccessModal}
              onOpenChange={setShowSuccessModal}
              companyName={displayName}
            />
          )}
          {taskContentType === 'kyb' && (
            <KYBSuccessModal
              open={showSuccessModal}
              onOpenChange={setShowSuccessModal}
              companyName={displayName}
            />
          )}
          {(taskContentType === 'security' || taskContentType === 'ky3p') && (
            <SecuritySuccessModal
              open={showSuccessModal} 
              onOpenChange={setShowSuccessModal}
              companyName={displayName}
            />
          )}
        </PageTemplate>
      </DashboardLayout>
    );
  }
  
  // Fallback content if task type is unknown
  return (
    <DashboardLayout>
      <div className="container max-w-7xl py-6">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Task Not Found</h2>
          <p className="text-muted-foreground mb-6">
            We couldn't find the task you're looking for. It may have been removed or you
            don't have access to it.
          </p>
          <Button onClick={handleBackClick}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Task Center
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}