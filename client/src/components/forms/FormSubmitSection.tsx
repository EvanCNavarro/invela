/**
 * FormSubmitSection Component
 * 
 * A standardized form submission section that uses the unified form submission system
 * to provide consistent submission behavior across all form types.
 */
import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Loader2, CheckCircle2, Send } from 'lucide-react';
import { 
  formSubmissionService, 
  formatSuccessActions,
  FormSubmissionResponse
} from '@/services/formSubmissionService';
import { modalService } from '@/services/modalService';
import { SubmissionSuccessModal } from '@/components/modals/SubmissionSuccessModal';
import { SubmissionErrorModal } from '@/components/modals/SubmissionErrorModal';

export interface FormSubmitSectionProps {
  taskId: number;
  taskType: 'kyb' | 'ky3p' | 'open_banking';
  formData: Record<string, any>;
  formType: string;
  title?: string;
  description?: string;
  submitButtonText?: string;
  returnPath?: string;
  fileName?: string;
  canSubmit?: boolean;
  onBeforeSubmit?: () => boolean | Promise<boolean>;
  onSuccess?: (result: FormSubmissionResponse) => void;
  onError?: (error: Error) => void;
}

export function FormSubmitSection({
  taskId,
  taskType,
  formData,
  formType = '',
  title = 'Submit Form',
  description = 'Please review your form data before submission. This action cannot be undone.',
  submitButtonText = 'Submit Form',
  returnPath = '/tasks',
  fileName,
  canSubmit = true,
  onBeforeSubmit,
  onSuccess,
  onError
}: FormSubmitSectionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [, navigate] = useLocation();

  const handleSubmit = async () => {
    // If already submitting, prevent multiple submissions
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Run optional pre-submission hook
      if (onBeforeSubmit) {
        const shouldContinue = await onBeforeSubmit();
        if (!shouldContinue) {
          setIsSubmitting(false);
          return;
        }
      }
      
      // Submit the form using the unified submission service
      const result = await formSubmissionService.submitForm({
        taskId,
        formType: taskType,
        formData,
        fileName,
        onSuccess: (result) => {
          // Set local success state
          setSuccess(true);
          
          // Show success modal
          modalService.showSuccessModal({
            title: 'Form Submitted Successfully',
            description: `Your ${formType} has been submitted.`,
            actions: formatSuccessActions(result),
            returnPath,
            returnLabel: 'Return to Tasks',
            onClose: () => {
              // Navigate back to the task list after closing the modal
              navigate(returnPath);
            }
          });
          
          // Call custom success handler if provided
          if (onSuccess) {
            onSuccess(result);
          }
        },
        onError: (error) => {
          // Show error modal
          modalService.showErrorModal({
            title: 'Submission Failed',
            description: error.message || 'An unexpected error occurred during submission.',
            returnPath,
            returnLabel: 'Return to Tasks',
            onClose: () => {
              setIsSubmitting(false);
            }
          });
          
          // Call custom error handler if provided
          if (onError) {
            onError(error);
          }
        }
      });
      
      // Reset submitting state if the submission service didn't call onSuccess or onError
      setIsSubmitting(false);
    } catch (error) {
      console.error('Error in form submission:', error);
      
      // Show error modal for uncaught errors
      modalService.showErrorModal({
        title: 'Unexpected Error',
        description: error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred during form submission. Please try again.',
        onClose: () => {
          setIsSubmitting(false);
        }
      });
      
      // Call custom error handler if provided
      if (onError && error instanceof Error) {
        onError(error);
      }
      
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card className="mt-8 border-2 border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        
        <CardContent>
          {success ? (
            <div className="flex flex-col items-center justify-center py-4">
              <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
              <p className="text-lg font-medium text-center">Form submitted successfully!</p>
              <p className="text-sm text-gray-500 text-center mt-2">
                You will be redirected to the next step shortly.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Before submitting, ensure all required fields are complete and accurate.
              </p>
              <ul className="text-sm space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300">
                <li>The form will be marked as submitted and can't be edited afterwards</li>
                <li>A CSV file will be generated with your responses</li>
                <li>Additional tabs may be unlocked based on your submission</li>
              </ul>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-end">
          <Button
            className="w-full md:w-auto"
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting || success || !canSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Submitted
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {submitButtonText}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Include the modals for form submission feedback */}
      <SubmissionSuccessModal />
      <SubmissionErrorModal />
    </>
  );
}

export default FormSubmitSection;