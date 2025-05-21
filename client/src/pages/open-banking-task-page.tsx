import React, { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import useEnhancedFormSubmission from '@/hooks/use-enhanced-form-submission';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { UniversalForm } from '@/components/forms';
import { SubmissionSuccessModal } from '@/components/modals/SubmissionSuccessModal';
import ConnectionIssueModal from '@/components/modals/ConnectionIssueModal';

// Simple console logging helper
const logDebug = (message: string, data?: any) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[OpenBankingTaskPage] ${message}`, data || '');
  }
};

export default function OpenBankingTaskPage() {
  const params = useParams<{ taskId?: string }>();
  const taskId = parseInt(params.taskId || '', 10);
  const [, navigate] = useLocation();
  const [companyName, setCompanyName] = useState('');
  
  // Fetch task data
  const { data: task, isLoading, error } = useQuery<any>({ 
    queryKey: ['/api/tasks', taskId],
    enabled: !isNaN(taskId)
  });
  
  // Extract company name from task data
  useEffect(() => {
    if (task) {
      const name = task.metadata?.company_name || 
                   task.metadata?.companyName || 
                   task.metadata?.company?.name || 
                   'Company';
      setCompanyName(name);
      logDebug('Company name extracted', name);
    }
  }, [task]);
  
  // Handle navigation back to task center
  const handleBackClick = () => {
    navigate('/task-center');
  };
  
  // Form submission hook with enhanced two-step process
  const { toast } = useToast();
  const {
    submitForm,
    retrySubmission,
    isSubmitting,
    isPreparing,
    isSuccess,
    isError,
    error: submissionError,
    showSuccessModal,
    showConnectionIssueModal,
    closeSuccessModal,
    closeConnectionIssueModal,
  } = useEnhancedFormSubmission({
    prepareEndpoint: `/api/enhanced-open-banking/prepare/${taskId}`,
    submitEndpoint: `/api/enhanced-open-banking/submit/${taskId}`,
    invalidateQueries: ['/api/tasks', `/api/tasks/${taskId}`],
    onSuccess: (data) => {
      logDebug('Form submitted successfully with enhanced process', data);
    },
    onError: (error) => {
      logDebug('Enhanced form submission error', error.message);
    }
  });

  // Handle enhanced form submission with two-step process
  const handleFormSubmit = async (formData: any) => {
    logDebug('Starting enhanced Open Banking form submission process', { taskId });
    
    // Prepare file name with standardized format
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const formattedTime = now.toISOString().slice(11, 19).replace(/:/g, ''); // HHMMSS
    const cleanCompanyName = companyName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');
    const fileName = `OpenBanking_Survey_${taskId}_${cleanCompanyName}_${formattedDate}_${formattedTime}.json`;
    
    try {
      // Use the enhanced two-step submission process
      const result = await submitForm({
        taskId: taskId,
        formData: formData,  // The actual form data that will be stored in the responses table
        fileName: fileName,
        formType: 'open_banking',
        companyName: companyName
      });
      
      if (result && result.success) {
        logDebug('Enhanced form submission completed successfully', { taskId, status: result.status });
      } else {
        logDebug('Enhanced form submission failed', { 
          taskId, 
          error: result?.error || 'Unknown error' 
        });
      }
    } catch (error) {
      logDebug('Exception during enhanced form submission', { 
        taskId, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  };
  
  // Show loading state while task data is being fetched
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="md" className="text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading Open Banking task...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  // Show error state if task data couldn't be fetched
  if (error || !task) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Button
            variant="outline"
            size="sm"
            className="text-sm font-medium bg-white border-muted-foreground/20"
            onClick={handleBackClick}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Task Center
          </Button>
          
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <p className="text-destructive text-lg mb-4">Error loading Open Banking task</p>
              <p className="text-muted-foreground mb-6">
                {error instanceof Error ? error.message : 'Task not found or you do not have access'}
              </p>
              <Button onClick={handleBackClick}>Return to Task Center</Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  // Render the form
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title={`Open Banking Survey: ${companyName}`}
          description="Complete the Open Banking compliance survey"
        />
        
        <div className="container max-w-7xl mx-auto">
          <UniversalForm 
            taskId={task.id}
            taskType="open_banking"
            initialData={task.savedFormData}
            onSubmit={handleFormSubmit}
            // Disable the form during both prepare and submit phases
            disabled={isPreparing || isSubmitting}
          />
        </div>
      </div>
      
      {/* Success Modal */}
      <SubmissionSuccessModal
        open={showSuccessModal}
        onClose={() => {
          closeSuccessModal();
          navigate('/task-center');
        }}
        title="Open Banking Survey Submitted"
        message="Your form has been successfully submitted."
        returnPath="/task-center"
        returnLabel="Return to Tasks"
        taskType="open_banking"
      />
      
      {/* Connection Issue Modal */}
      <ConnectionIssueModal
        open={showConnectionIssueModal}
        onClose={closeConnectionIssueModal}
        onRetry={() => {
          // Make sure we have the latest task data for retry
          if (task && task.savedFormData) {
            // Create the submission data package
            const now = new Date();
            const formattedDate = now.toISOString().slice(0, 10);
            const formattedTime = now.toISOString().slice(11, 19).replace(/:/g, '');
            const cleanCompanyName = companyName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');
            const fileName = `OpenBanking_Survey_${taskId}_${cleanCompanyName}_${formattedDate}_${formattedTime}.json`;
            
            // Retry with proper data structure
            retrySubmission({
              taskId: taskId,
              formData: task.savedFormData,
              fileName: fileName,
              formType: 'open_banking',
              companyName: companyName
            });
          } else {
            toast({
              title: "Retry Failed",
              description: "Could not retrieve form data for retry. Please try refreshing the page.",
              variant: "destructive"
            });
          }
        }}
        errorMessage={
          submissionError?.message || 
          "We're having trouble connecting to the database. This might be due to a temporary connection issue."
        }
      />
    </DashboardLayout>
  );
}