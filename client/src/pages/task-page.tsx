/**
 * Task Page Component
 * 
 * This page handles displaying task details based on the task type.
 * It supports KYB forms, card industry questionnaires, KY3P security assessments,
 * and Open Banking surveys.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { PageTemplate } from '@/components/ui/page-template';
import { BreadcrumbNav } from '@/components/dashboard/BreadcrumbNav';
import { UniversalForm } from '@/components/forms/UniversalForm';
import { DocumentUploadWizard } from '@/components/documents/DocumentUploadWizard';
import { CardMethodChoice } from '@/components/card/CardMethodChoice';
import { TaskDownloadMenu } from '@/components/TaskDownloadMenu';
import FormSubmissionListener from '@/components/forms/FormSubmissionListener';
import { SubmissionSuccessModal } from '@/components/modals/SubmissionSuccessModal';
import { UniversalSuccessModal } from '@/components/forms/UniversalSuccessModal';
import { fireEnhancedConfetti } from '@/utils/confetti';
import { FormSubmissionEvent } from '@/hooks/use-form-submission-events';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { submitFormTransactional } from '@/api/form-submission-api';
import { userContext } from '@/lib/user-context';
import { useCurrentCompany } from '@/hooks/use-current-company';
import getLogger from '@/utils/logger';

const logger = getLogger('TaskPage');

interface TaskPageProps {
  params: {
    taskSlug: string;
  }
}

interface SubmissionAction {
  type: string;
  description: string;
  fileId?: number;
  data?: {
    details?: string;
    buttonText?: string;
  };
}

interface SubmissionResult {
  taskId: number;
  fileId?: number;
  fileName?: string;
  taskStatus: string;
  unlockedTabs?: string[];
  completedActions?: SubmissionAction[];
}

type TaskContentType = 'kyb' | 'card' | 'security' | 'ky3p' | 'open_banking' | 'unknown';

export default function TaskPage({ params }: TaskPageProps) {
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taskContentType, setTaskContentType] = useState<TaskContentType>('unknown');
  const [showForm, setShowForm] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'manual' | 'upload' | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [fileId, setFileId] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult>({
    taskId: 0,
    taskStatus: 'not_started',
    completedActions: []
  });
  
  const [_, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Handle back button click
  const handleBackClick = useCallback(() => {
    navigate('/task-center');
  }, [navigate]);
  
  // Update the task progress in state
  const updateTaskProgress = useCallback((progress: number) => {
    setTask((prevTask: any) => {
      if (!prevTask) return null;
      return {
        ...prevTask,
        progress
      };
    });
    
    console.log(`[TaskPage] Form progress updated: ${progress}%`);
  }, []);
  
  // Handle file download
  const handleDownload = useCallback(async (format: 'csv' | 'txt' | 'json' = 'csv') => {
    if (!fileId) {
      toast({
        title: "Download Failed",
        description: "No file available for download",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const response = await fetch(`/api/files/${fileId}/download?format=${format}`);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const filename = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || `file-${fileId}.${format}`;
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download Success",
        description: `Successfully downloaded ${filename}`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    }
  }, [fileId, toast]);
  
  // Handle form submission success
  const handleFormSubmissionSuccess = useCallback((event: FormSubmissionEvent) => {
    console.log('[TaskPage] Form submission success:', event);
    
    if (event.fileId) {
      setFileId(event.fileId);
    }
    
    // Store the submission result with all needed data for the UniversalSuccessModal
    setSubmissionResult({
      taskId: event.taskId,
      fileId: event.fileId,
      fileName: event.fileName,
      taskStatus: 'submitted',
      unlockedTabs: event.unlockedTabs,
      completedActions: event.actions || []
    });
    
    // Set state to update UI
    setIsSubmitted(true);
    setShowSuccessModal(true);
    
    // Invalidate queries to refresh task list
    queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    
    // Show confetti effect
    fireEnhancedConfetti();
  }, [queryClient]);
  
  // Handle form submission error
  const handleFormSubmissionError = useCallback((event: FormSubmissionEvent) => {
    console.error('[TaskPage] Form submission error:', event);
    
    toast({
      title: "Form Submission Failed",
      description: event.error || "An error occurred while submitting the form",
      variant: "destructive"
    });
  }, [toast]);
  
  // Determine the task content type based on the task data
  const processTaskData = useCallback((taskData: any) => {
    let type: TaskContentType = 'unknown';
    
    if (taskData.task_type === 'kyb_assessment' || taskData.task_type === 'kyb' || taskData.task_type === 'company_kyb') {
      type = 'kyb';
    } else if (taskData.task_type === 'card_assessment' || taskData.task_type === 'card') {
      type = 'card';
    } else if (taskData.task_type === 'ky3p_assessment' || taskData.task_type === 'security_assessment' || 
               taskData.task_type === 'ky3p' || taskData.task_type === 'security') {
      type = 'ky3p';
    } else if (taskData.task_type === 'open_banking_assessment' || taskData.task_type === 'open_banking') {
      type = 'open_banking';
    }
    
    console.log(`[TaskPage] Processed task type: ${taskData.task_type} → ${type}`, {
      originalType: taskData.task_type,
      mappedType: type,
      timestamp: new Date().toISOString()
    });
    
    setTaskContentType(type);
    
    // Check if the task is already submitted
    if (taskData.status === 'submitted') {
      setIsSubmitted(true);
      
      // Set file ID if available in metadata
      if (type === 'kyb' && taskData.metadata?.kybFormFile) {
        setFileId(taskData.metadata.kybFormFile);
      } else if (type === 'card' && taskData.metadata?.cardFormFile) {
        setFileId(taskData.metadata.cardFormFile);
      } else if (type === 'ky3p' && taskData.metadata?.securityFormFile) {
        setFileId(taskData.metadata.securityFormFile);
      } else if (type === 'open_banking' && taskData.metadata?.openBankingFormFile) {
        setFileId(taskData.metadata.openBankingFormFile);
      }
    }
    
    // Set the display name based on metadata or extract from title
    let companyDisplayName = '';
    if (taskData.metadata?.companyName) {
      companyDisplayName = taskData.metadata.companyName;
    } else if (taskData.metadata?.company?.name) {
      companyDisplayName = taskData.metadata.company.name;
    } else {
      // Extract company name from title if possible (e.g., "KY3P Assessment: CompanyName")
      const titleMatch = taskData.title.match(/:\s*([^:]+)$/);
      if (titleMatch && titleMatch[1]) {
        companyDisplayName = titleMatch[1].trim();
      } else {
        companyDisplayName = 'Company'; // Generic fallback
      }
    }
    
    setDisplayName(companyDisplayName);
    console.log(`[TaskPage] Company name set for ${type} form`, {
      displayNameValue: companyDisplayName,
      extractedName: companyDisplayName,
      metadata: taskData.metadata
    });
  }, []);
  
  // Fetch task data based on slug
  useEffect(() => {
    const taskSlug = params.taskSlug;
    
    // Extract task ID from slug
    const taskIdMatch = taskSlug?.match(/\d+/);
    if (!taskIdMatch) {
      setError("Invalid task identifier");
      setLoading(false);
      return;
    }
    
    const taskId = parseInt(taskIdMatch[0], 10);
    logger.info(`Fetching task data for ID: ${taskId}`);
    
    // Set the task ID in user context for proper data isolation
    // This is CRITICAL for ensuring each task only accesses its own data
    userContext.setContext({
      taskId: taskId
    });
    logger.info(`Set task context: taskId=${taskId}`);
    
    fetch(`/api/tasks/${taskId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Task fetch failed: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        setTask(data);
        processTaskData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(`[TaskPage] Error fetching task:`, err);
        setError(err.message || "Failed to load task");
        setLoading(false);
      });
  }, [params.taskSlug, processTaskData]);
  
  // Show loading state
  if (loading) {
    return (
      <DashboardLayout>
        <PageTemplate>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary rounded-full border-t-transparent mx-auto mb-4"></div>
              <h3 className="text-lg font-medium">Loading task...</h3>
            </div>
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <DashboardLayout>
        <PageTemplate>
          <div className="max-w-3xl mx-auto my-12">
            <Alert variant="destructive">
              <AlertTitle>Error Loading Task</AlertTitle>
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
            <div className="mt-6">
              <Button onClick={handleBackClick}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Task Center
              </Button>
            </div>
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }
  
  // Show not found state if no task data
  if (!task) {
    return (
      <DashboardLayout>
        <PageTemplate>
          <div className="max-w-3xl mx-auto my-12 text-center">
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
        </PageTemplate>
      </DashboardLayout>
    );
  }
  
  // Render appropriate form based on task content type
  
  // KYB Task Form Rendering
  if (taskContentType === 'kyb' && task) {
    return (
      <>
        {/* Form submission event listener */}
        <FormSubmissionListener 
          taskId={task.id}
          formType="kyb"
          onSuccess={handleFormSubmissionSuccess}
          onError={handleFormSubmissionError}
        />
        
        {/* Success modal - Using enhanced UniversalSuccessModal for better dynamic content */}
        <UniversalSuccessModal
          open={showSuccessModal}
          onOpenChange={(open) => setShowSuccessModal(open)}
          taskType="kyb"
          companyName={displayName}
          submissionResult={{
            fileId: fileId || undefined,
            fileName: submissionResult.fileName,
            taskId: task?.id,
            taskStatus: 'submitted',
            unlockedTabs: submissionResult.unlockedTabs,
            completedActions: submissionResult.completedActions || []
          }}
        />
        
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
                {isSubmitted && fileId && (
                  <TaskDownloadMenu fileId={fileId} onDownload={handleDownload} />
                )}
              </div>
            </div>
            
            <UniversalForm
              taskId={task.id}
              taskType="kyb"
              initialData={{}}
              onProgress={updateTaskProgress}
              companyName={displayName}
              onSubmit={async (data) => {
                console.log('[TaskPage] KYB form submission handler called', { taskId: task.id });
                try {
                  // Get company ID from task metadata if available
                  const companyId = task.company_id || task.metadata?.company?.id;
                  
                  // Use the submitForm API function to submit the form
                  const result = await submitFormTransactional(task.id, 'kyb', data, companyId);
                  
                  // We no longer immediately show the success modal here.
                  // Instead, we now wait for the WebSocket event in FormSubmissionListener
                  // which will call handleFormSubmissionSuccess when the server finishes processing
                  // This ensures tabs are properly unlocked before showing the modal
                  
                  console.log('[TaskPage] KYB form submission API call completed successfully', result);
                  console.log('[TaskPage] Waiting for WebSocket confirmation of tab unlocking before showing success modal');
                } catch (error) {
                  console.error('[TaskPage] KYB form submission error:', error);
                  
                  // Dispatch error event
                  const event = new CustomEvent('form-submission-error', {
                    detail: {
                      taskId: task.id,
                      formType: 'kyb',
                      error: error instanceof Error ? error.message : String(error)
                    }
                  });
                  document.dispatchEvent(event);
                  
                  // Show toast
                  toast({
                    title: "Form Submission Failed",
                    description: error instanceof Error ? error.message : String(error),
                    variant: "destructive"
                  });
                }
              }}
            />
          </PageTemplate>
        </DashboardLayout>
      </>
    );
  }
  
  // Card Form Rendering
  if (taskContentType === 'card' && task) {
    return (
      <>
        {/* Form submission event listener */}
        <FormSubmissionListener 
          taskId={task.id}
          formType="card"
          onSuccess={handleFormSubmissionSuccess}
          onError={handleFormSubmissionError}
        />
        
        {/* Success modal */}
        <SubmissionSuccessModal
          open={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          title="Card Industry Questionnaire Submitted"
          actions={submissionResult.completedActions || []}
          returnPath="/task-center"
          returnLabel="Back to Task Center"
          onDownload={handleDownload}
        />
        
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
                {isSubmitted && fileId && (
                  <TaskDownloadMenu fileId={fileId} onDownload={handleDownload} />
                )}
              </div>
            </div>
            
            <UniversalForm
              taskId={task.id}
              taskType="card"
              initialData={{}}
              onProgress={updateTaskProgress}
              companyName={displayName}
              onSubmit={async (data) => {
                console.log('[TaskPage] Card form submission handler called', { taskId: task.id });
                try {
                  // Get company ID from task metadata if available
                  const companyId = task.company_id || task.metadata?.company?.id;
                  
                  // Use the submitForm API function to submit the form
                  const result = await submitFormTransactional(task.id, 'card', data, companyId);
                  
                  // Dispatch a custom event to notify the form submission listener
                  const event = new CustomEvent('form-submission-success', {
                    detail: {
                      taskId: task.id,
                      formType: 'card',
                      result,
                      fileId: result.fileId,
                      actions: result.completedActions || []
                    }
                  });
                  document.dispatchEvent(event);
                  
                  console.log('[TaskPage] Card form submission completed successfully', result);
                } catch (error) {
                  console.error('[TaskPage] Card form submission error:', error);
                  
                  // Dispatch error event
                  const event = new CustomEvent('form-submission-error', {
                    detail: {
                      taskId: task.id,
                      formType: 'card',
                      error: error instanceof Error ? error.message : String(error)
                    }
                  });
                  document.dispatchEvent(event);
                  
                  // Show toast
                  toast({
                    title: "Form Submission Failed",
                    description: error instanceof Error ? error.message : String(error),
                    variant: "destructive"
                  });
                }
              }}
            />
          </PageTemplate>
        </DashboardLayout>
      </>
    );
  }
  
  // Security Assessment (KY3P) Form Rendering
  if (taskContentType === 'ky3p' && task) {
    return (
      <>
        {/* Form submission event listener */}
        <FormSubmissionListener 
          taskId={task.id}
          formType="ky3p"
          onSuccess={handleFormSubmissionSuccess}
          onError={handleFormSubmissionError}
        />
        
        {/* Success modal */}
        <SubmissionSuccessModal
          open={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          title="KY3P Security Assessment Submitted"
          actions={submissionResult.completedActions || []}
          returnPath="/task-center"
          returnLabel="Back to Task Center"
          onDownload={handleDownload}
        />
        
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
                {isSubmitted && fileId && (
                  <TaskDownloadMenu fileId={fileId} onDownload={handleDownload} />
                )}
              </div>
            </div>
            
            <UniversalForm
              taskId={task.id}
              taskType="ky3p"
              initialData={{}}
              onProgress={updateTaskProgress}
              companyName={displayName}
              onSubmit={async (data) => {
                console.log('[TaskPage] KY3P form submission handler called', { taskId: task.id });
                try {
                  // Get company ID from task metadata if available
                  const companyId = task.company_id || task.metadata?.company?.id;
                  
                  // Use the submitForm API function to submit the form
                  const result = await submitFormTransactional(task.id, 'ky3p', data, companyId);
                  
                  // Dispatch a custom event to notify the form submission listener
                  const event = new CustomEvent('form-submission-success', {
                    detail: {
                      taskId: task.id,
                      formType: 'ky3p',
                      result,
                      fileId: result.fileId,
                      actions: result.completedActions || []
                    }
                  });
                  document.dispatchEvent(event);
                  
                  console.log('[TaskPage] KY3P form submission completed successfully', result);
                } catch (error) {
                  console.error('[TaskPage] KY3P form submission error:', error);
                  
                  // Dispatch error event
                  const event = new CustomEvent('form-submission-error', {
                    detail: {
                      taskId: task.id,
                      formType: 'ky3p',
                      error: error instanceof Error ? error.message : String(error)
                    }
                  });
                  document.dispatchEvent(event);
                  
                  // Show toast
                  toast({
                    title: "Form Submission Failed",
                    description: error instanceof Error ? error.message : String(error),
                    variant: "destructive"
                  });
                }
              }}
            />
          </PageTemplate>
        </DashboardLayout>
      </>
    );
  }
  
  // Open Banking Survey Form Rendering
  if (taskContentType === 'open_banking' && task) {
    return (
      <>
        {/* Form submission event listener */}
        <FormSubmissionListener 
          taskId={task.id}
          formType="open_banking"
          onSuccess={handleFormSubmissionSuccess}
          onError={handleFormSubmissionError}
        />
        
        {/* Success modal */}
        <SubmissionSuccessModal
          open={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          title="Open Banking Survey Submitted"
          actions={submissionResult.completedActions || []}
          returnPath="/task-center"
          returnLabel="Back to Task Center"
          onDownload={handleDownload}
        />
        
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
                {isSubmitted && fileId && (
                  <TaskDownloadMenu fileId={fileId} onDownload={handleDownload} />
                )}
              </div>
            </div>
            
            <UniversalForm
              taskId={task.id}
              taskType="open_banking"
              initialData={{}}
              onProgress={updateTaskProgress}
              companyName={displayName}
              onSubmit={async (data) => {
                console.log('[TaskPage] Open Banking form submission handler called', { taskId: task.id });
                try {
                  // Get company ID from task metadata if available
                  const companyId = task.company_id || task.metadata?.company?.id;
                  
                  // Use the submitForm API function to submit the form
                  const result = await submitFormTransactional(task.id, 'open_banking', data, companyId);
                  
                  // Dispatch a custom event to notify the form submission listener
                  const event = new CustomEvent('form-submission-success', {
                    detail: {
                      taskId: task.id,
                      formType: 'open_banking',
                      result,
                      fileId: result.fileId,
                      actions: result.completedActions || []
                    }
                  });
                  document.dispatchEvent(event);
                  
                  console.log('[TaskPage] Open Banking form submission completed successfully', result);
                } catch (error) {
                  console.error('[TaskPage] Open Banking form submission error:', error);
                  
                  // Dispatch error event
                  const event = new CustomEvent('form-submission-error', {
                    detail: {
                      taskId: task.id,
                      formType: 'open_banking',
                      error: error instanceof Error ? error.message : String(error)
                    }
                  });
                  document.dispatchEvent(event);
                  
                  // Show toast
                  toast({
                    title: "Form Submission Failed",
                    description: error instanceof Error ? error.message : String(error),
                    variant: "destructive"
                  });
                }
              }}
            />
          </PageTemplate>
        </DashboardLayout>
      </>
    );
  }
  
  // Default case: unknown task type
  return (
    <DashboardLayout>
      <PageTemplate>
        <div className="max-w-3xl mx-auto my-12">
          <Alert>
            <AlertTitle>Unsupported Task Type</AlertTitle>
            <AlertDescription>
              This task type ({task.task_type}) is not supported in the current view.
              Please contact support if you believe this is an error.
            </AlertDescription>
          </Alert>
          <div className="mt-6">
            <Button onClick={handleBackClick}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Task Center
            </Button>
          </div>
        </div>
      </PageTemplate>
    </DashboardLayout>
  );
}