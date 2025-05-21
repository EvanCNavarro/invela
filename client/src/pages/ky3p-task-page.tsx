import React, { useState, useEffect } from 'react';
import { useLocation, useParams, useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { UniversalForm } from '@/components/forms';
import { SubmissionSuccessModal } from '@/components/modals/SubmissionSuccessModal';
import getLogger from '@/utils/logger';
import submissionTracker from '@/utils/submission-tracker';

// Create a logger for this component
const logger = getLogger('KY3PTaskPage', { 
  levels: { debug: true, info: true, warn: true, error: true } 
});

export default function KY3PTaskPage() {
  const params = useParams<{ taskId?: string }>();
  const taskId = parseInt(params.taskId || '', 10);
  const [, navigate] = useLocation();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
    }
  }, [task]);
  
  // Handle navigation back to task center
  const handleBackClick = () => {
    navigate('/task-center');
  };
  
  // Show loading state while task data is being fetched
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="md" className="text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading KY3P task...</p>
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
              <p className="text-destructive text-lg mb-4">Error loading KY3P task</p>
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
  
  // Handle form submission
  const handleFormSubmit = (formData: any) => {
    // Start tracking this submission
    submissionTracker.startTracking(taskId, 'ky3p');
    submissionTracker.trackEvent('Begin KY3P form submission', { companyName });
    setSubmitting(true);
    
    // Prepare file name with standardized format
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const formattedTime = now.toISOString().slice(11, 19).replace(/:/g, ''); // HHMMSS
    const cleanCompanyName = companyName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');
    
    // Prepare request data
    const requestData = {
      fileName: `KY3P_Assessment_${taskId}_${cleanCompanyName}_${formattedDate}_${formattedTime}.json`,
      formData,
      taskId,
      explicitSubmission: true // Explicitly mark this as a submission
    };
    
    // Show initial toast
    toast({
      title: 'Processing Submission',
      description: 'Working on submitting your data...',
    });
    
    submissionTracker.trackEvent('Sending KY3P submission request', { 
      fileName: requestData.fileName,
      taskId: requestData.taskId 
    });
    
    // Submit form data
    fetch(`/api/ky3p/submit/${taskId}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json' 
      },
      credentials: 'include',
      body: JSON.stringify(requestData)
    })
    .then(async response => {
      submissionTracker.trackEvent('Received server response', { 
        status: response.status, 
        ok: response.ok 
      });
      
      if (!response.ok) {
        // Handle error responses
        let errorMessage = 'Failed to submit KY3P form';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        throw new Error(errorMessage);
      }
      
      // Parse successful response
      return response.json();
    })
    .then(result => {
      // Show success state
      submissionTracker.trackEvent('KY3P form submission successful', result);
      setSubmitting(false);
      
      // Show success toast immediately
      toast({
        title: 'KY3P Form Submitted',
        description: 'Your KY3P assessment has been successfully submitted.',
        variant: 'success',
      });
      
      // Show success modal
      setShowSuccessModal(true);
      
      // Stop tracking with success
      submissionTracker.stopTracking(true);
    })
    .catch(error => {
      // Handle submission failures
      submissionTracker.trackEvent('KY3P form submission failed', { 
        error: error.message 
      });
      setSubmitting(false);
      
      toast({
        title: 'Submission Failed',
        description: error.message,
        variant: 'destructive',
      });
      
      // Stop tracking with failure
      submissionTracker.stopTracking(false);
    });
  };
  
  // Render the form
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title={`KY3P Security Assessment: ${companyName}`}
          description="Complete the Know Your Third Party (KY3P) security assessment"
        />
        
        <div className="container max-w-7xl mx-auto">
          <UniversalForm 
            taskId={task.id}
            taskType="ky3p"
            initialData={task.savedFormData}
            onSubmit={handleFormSubmit}
          />
        </div>
      </div>
      
      {/* Success Modal */}
      <SubmissionSuccessModal
        open={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          navigate('/task-center');
        }}
        title="KY3P Assessment Submitted"
        message="Your KY3P security assessment has been successfully submitted. The task has been marked as completed."
        returnPath="/task-center"
        returnLabel="Return to Task Center"
        taskType="ky3p"
        // Enable File Vault button for better file access
        showFileVaultButton={true}
        fileVaultPath="/file-vault"
        fileVaultLabel="Access Files in Vault"
        actions={[
          {
            type: 'form_submitted',
            description: 'KY3P assessment successfully submitted'
          },
          {
            type: 'tabs_unlocked',
            description: 'Files are now accessible in the File Vault'
          }
        ]}
      />
    </DashboardLayout>
  );
}