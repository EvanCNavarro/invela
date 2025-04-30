import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { formSubmissionService, formatSuccessActions, FormSubmissionResponse } from '@/services/formSubmissionService';
import { useToast } from '@/hooks/use-toast';

// Import modals for success and error feedback
import SubmissionSuccessModal from '@/components/modals/SubmissionSuccessModal';
import SubmissionErrorModal from '@/components/modals/SubmissionErrorModal';

interface FormSubmitSectionProps {
  /** The form data to submit */
  formData: Record<string, any>;
  
  /** The task ID associated with this form */
  taskId: number;
  
  /** The form type (e.g., 'kyb', 'ky3p', 'open_banking') */
  formType: string;
  
  /** Optional file name for generated files */
  fileName?: string;
  
  /** Whether the form is disabled (e.g., already submitted or not ready) */
  disabled?: boolean;
  
  /** Whether the form is currently being submitted */
  isSubmitting?: boolean;
  
  /** Custom text for the submit button */
  submitText?: string;
  
  /** Path to redirect after successful submission */
  returnPath?: string;
  
  /** Label for the return button after successful submission */
  returnLabel?: string;
  
  /** Callback after successful submission */
  onSubmitSuccess?: (result: FormSubmissionResponse) => void;
  
  /** Callback after submission error */
  onSubmitError?: (error: Error) => void;
}

/**
 * Form Submit Section Component
 * 
 * This component provides a standardized submit button with loading state,
 * error handling, and success feedback for form submissions.
 * 
 * @example
 * ```tsx
 * <FormSubmitSection
 *   formData={formData}
 *   taskId={123}
 *   formType="kyb"
 *   disabled={!formIsComplete}
 *   isSubmitting={isSubmitting}
 *   submitText="Submit KYB Form"
 *   returnPath="/tasks"
 *   returnLabel="Back to Tasks"
 *   onSubmitSuccess={(result) => console.log('Form submitted:', result)}
 * />
 * ```
 */
export function FormSubmitSection({
  formData,
  taskId,
  formType,
  fileName,
  disabled = false,
  isSubmitting = false,
  submitText = 'Submit Form',
  returnPath = '/tasks',
  returnLabel = 'Return to Tasks',
  onSubmitSuccess,
  onSubmitError
}: FormSubmitSectionProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(isSubmitting);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<FormSubmissionResponse | null>(null);
  const [submissionError, setSubmissionError] = useState<Error | null>(null);
  
  // Determine if the button should be disabled
  const buttonDisabled = disabled || submitting;
  
  // Handle form submission
  const handleSubmit = async () => {
    setSubmitting(true);
    
    try {
      // Submit the form using the form submission service
      const result = await formSubmissionService.submitForm({
        taskId,
        formType,
        formData,
        fileName,
        onSuccess: (result) => {
          // Call the onSubmitSuccess callback if provided
          if (onSubmitSuccess) {
            onSubmitSuccess(result);
          }
          
          // Show success toast notification
          toast({
            title: 'Form Submitted',
            description: 'Your form has been successfully submitted.',
            variant: 'default',
          });
          
          // Store the result and show success modal
          setSubmissionResult(result);
          setShowSuccessModal(true);
        },
        onError: (error) => {
          // Call the onSubmitError callback if provided
          if (onSubmitError) {
            onSubmitError(error);
          }
          
          // Show error toast notification
          toast({
            title: 'Submission Error',
            description: error.message || 'An error occurred while submitting the form.',
            variant: 'destructive',
          });
          
          // Store the error and show error modal
          setSubmissionError(error);
          setShowErrorModal(true);
        }
      });
      
      // If no callbacks were provided, handle the result here
      if (!onSubmitSuccess && !onSubmitError) {
        if (result.success) {
          // Show success toast notification
          toast({
            title: 'Form Submitted',
            description: 'Your form has been successfully submitted.',
            variant: 'default',
          });
          
          // Store the result and show success modal
          setSubmissionResult(result);
          setShowSuccessModal(true);
        } else {
          // Show error toast notification
          toast({
            title: 'Submission Error',
            description: result.error || 'An error occurred while submitting the form.',
            variant: 'destructive',
          });
          
          // Store the error and show error modal
          setSubmissionError(new Error(result.error || 'Form submission failed'));
          setShowErrorModal(true);
        }
      }
    } catch (error) {
      console.error('[FormSubmitSection] Error submitting form:', error);
      
      // Call the onSubmitError callback if provided
      if (onSubmitError) {
        onSubmitError(error as Error);
      }
      
      // Show error toast notification
      toast({
        title: 'Submission Error',
        description: (error as Error).message || 'An error occurred while submitting the form.',
        variant: 'destructive',
      });
      
      // Store the error and show error modal
      setSubmissionError(error as Error);
      setShowErrorModal(true);
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        disabled={buttonDisabled}
        onClick={handleSubmit}
        className="w-full md:w-auto"
        size="lg"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          submitText
        )}
      </Button>
      
      {/* Success Modal */}
      {showSuccessModal && submissionResult && (
        <SubmissionSuccessModal
          open={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          title="Form Submitted Successfully"
          description="Your form has been successfully submitted."
          actions={formatSuccessActions(submissionResult)}
          returnPath={returnPath}
          returnLabel={returnLabel}
          taskType={formType}
        />
      )}
      
      {/* Error Modal */}
      {showErrorModal && submissionError && (
        <SubmissionErrorModal
          open={showErrorModal}
          onClose={() => setShowErrorModal(false)}
          title="Form Submission Error"
          description={submissionError.message || 'An error occurred while submitting the form.'}
          errorDetails={submissionError.stack}
          buttonText="Try Again"
          onRetry={handleSubmit}
        />
      )}
    </div>
  );
}

export default FormSubmitSection;