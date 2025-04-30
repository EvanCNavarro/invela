import React, { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import useFormSubmission from '@/hooks/use-form-submission';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { UniversalForm } from '@/components/forms/UniversalForm';
import SubmissionSuccessModal from '@/components/modals/SubmissionSuccessModal';
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
  
  // Form submission hook with enhanced error handling
  const { toast } = useToast();
  const {
    submitForm,
    retrySubmission,
    isSubmitting,
    isSuccess,
    isError,
    error: submissionError,
    showSuccessModal,
    showConnectionIssueModal,
    closeSuccessModal,
    closeConnectionIssueModal,
  } = useFormSubmission({
    endpoint: `/api/tasks/${taskId}/submit`,
    invalidateQueries: ['/api/tasks', `/api/tasks/${taskId}`],
    onSuccess: (data) => {
      logDebug('Form submitted successfully', data);
    },
    onError: (error) => {
      logDebug('Form submission error', error.message);
    }
  });

  // Handle form submission
  const handleFormSubmit = async (formData: any) => {
    logDebug('Submitting open banking form', { taskId });
    
    // Prepare file name with standardized format
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const formattedTime = now.toISOString().slice(11, 19).replace(/:/g, ''); // HHMMSS
    const cleanCompanyName = companyName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');
    const fileName = `OpenBanking_Survey_${taskId}_${cleanCompanyName}_${formattedDate}_${formattedTime}.json`;
    
    // Submit the form data
    await submitForm({
      task_id: taskId,
      form_type: 'open_banking',
      data: formData,
      file_name: fileName,
      company_name: companyName
    });
  };
  
  // Show loading state while task data is being fetched
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
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
            // Pass isSubmitting through form props
            formProps={{ disabled: isSubmitting }}
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
        description="Your form has been successfully submitted."
        returnPath="/task-center"
        returnLabel="Return to Tasks"
        taskType="open_banking"
      />
      
      {/* Connection Issue Modal */}
      <ConnectionIssueModal
        open={showConnectionIssueModal}
        onClose={closeConnectionIssueModal}
        onRetry={() => retrySubmission(null)}
        errorMessage={
          submissionError?.message || 
          "We're having trouble connecting to the database. This might be due to a temporary connection issue."
        }
      />
    </DashboardLayout>
  );
}