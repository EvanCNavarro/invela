/**
 * Form Submission Listener
 * 
 * This component listens for form submission events from WebSocket
 * and displays appropriate feedback (success/error modals) to the user.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'wouter';
import { useFormSubmissionEvents } from '@/hooks/use-form-submission-events';
import { formatSuccessActions } from '@/services/formSubmissionService';
import { SubmissionSuccessModal } from '@/components/modals/SubmissionSuccessModal';
import { SubmissionErrorModal } from '@/components/modals/SubmissionErrorModal';

export interface FormSubmissionListenerProps {
  taskId: number;
  formType: string;
  onSuccess?: () => void;
  navigateTo?: string;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Form Submission Listener Component
 * 
 * This component monitors WebSocket events for form submissions
 * and triggers the appropriate UI feedback.
 */
export function FormSubmissionListener({
  taskId,
  formType,
  onSuccess,
  navigateTo,
  successMessage = 'Form submitted successfully',
  errorMessage = 'There was an error submitting the form'
}: FormSubmissionListenerProps) {
  const [submissionSuccessOpen, setSubmissionSuccessOpen] = useState(false);
  const [submissionErrorOpen, setSubmissionErrorOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState(successMessage);
  const [modalDetails, setModalDetails] = useState<string[]>([]);
  const [errorDetails, setErrorDetails] = useState('');
  
  const { submissionEvent, isForTask, resetEvent } = useFormSubmissionEvents(taskId);
  const navigate = useNavigate();
  
  // Process submission events
  useEffect(() => {
    if (!submissionEvent) return;
    
    // Check if this event is for our task
    if (submissionEvent.taskId === taskId) {
      console.log(`[FormSubmissionListener] Processing event for task ${taskId}`, submissionEvent);
      
      if (submissionEvent.status === 'submitted') {
        // Format success actions
        const actions = formatSuccessActions({
          success: true,
          taskId: submissionEvent.taskId,
          formType: submissionEvent.formType,
          status: submissionEvent.status,
          fileId: submissionEvent.fileId,
          fileName: submissionEvent.fileName,
          unlockedTabs: submissionEvent.unlockedTabs,
          unlockedTasks: submissionEvent.unlockedTasks
        });
        
        // Set modal content
        setModalTitle(`${formType} form submitted successfully`);
        setModalDetails(actions);
        
        // Show success modal
        setSubmissionSuccessOpen(true);
        
        // Call success callback if provided
        if (onSuccess) {
          onSuccess();
        }
      } else if (submissionEvent.status === 'error') {
        // Set error details and show error modal
        setErrorDetails(submissionEvent.error || 'Unknown error occurred');
        setSubmissionErrorOpen(true);
      }
      
      // Reset the event to avoid showing the modal multiple times
      resetEvent();
    }
  }, [submissionEvent, taskId, formType, onSuccess, resetEvent]);
  
  // Handle success modal close
  const handleSuccessClose = () => {
    setSubmissionSuccessOpen(false);
    
    // Navigate if a destination is provided
    if (navigateTo) {
      navigate(navigateTo);
    }
  };
  
  // Handle error modal close
  const handleErrorClose = () => {
    setSubmissionErrorOpen(false);
  };
  
  return (
    <>
      {/* Success Modal */}
      <SubmissionSuccessModal
        open={submissionSuccessOpen}
        onClose={handleSuccessClose}
        title={modalTitle}
        details={modalDetails}
      />
      
      {/* Error Modal */}
      <SubmissionErrorModal
        open={submissionErrorOpen}
        onClose={handleErrorClose}
        title={errorMessage}
        details={errorDetails}
      />
    </>
  );
}

export default FormSubmissionListener;