/**
 * Form Submit Section
 * 
 * This component provides a standardized UI for form submission
 * with appropriate buttons, loading states, and feedback.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formSubmissionService } from '@/services/formSubmissionService';
import { Loader2, Check } from 'lucide-react';
import { FormSubmissionListener } from './FormSubmissionListener';

export interface FormSubmitSectionProps {
  taskId: number;
  formType: string;
  formData: Record<string, any>;
  isValid?: boolean;
  isSubmitting?: boolean;
  progress?: number;
  disabled?: boolean;
  onSuccess?: () => void;
  navigateAfterSubmit?: string;
  submitText?: string;
  requireConfirmation?: boolean;
  confirmationText?: string;
}

/**
 * Form Submit Section
 * 
 * Provides a standardized UI for form submission with confirmation checkbox,
 * submit button, loading states, and WebSocket-based feedback.
 */
export function FormSubmitSection({
  taskId,
  formType,
  formData,
  isValid = true,
  isSubmitting = false,
  progress = 0,
  disabled = false,
  onSuccess,
  navigateAfterSubmit,
  submitText = 'Submit',
  requireConfirmation = true,
  confirmationText = 'I confirm that the information provided is accurate and complete.'
}: FormSubmitSectionProps) {
  const [agreed, setAgreed] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(isSubmitting);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  
  // Determine if the submit button should be disabled
  const submitDisabled = 
    disabled || 
    isSubmittingForm || 
    (requireConfirmation && !agreed) || 
    !isValid ||
    progress < 100;
  
  // Calculate color based on progress
  const progressColor = progress < 50 ? 'text-red-500' : 
                       progress < 80 ? 'text-amber-500' : 
                       progress < 100 ? 'text-blue-500' : 
                       'text-green-500';
  
  // Handle form submission
  const handleSubmit = async () => {
    if (submitDisabled) return;
    
    setIsSubmittingForm(true);
    setSubmissionError(null);
    
    try {
      // Include the taskId in the form data
      const enrichedFormData = {
        ...formData,
        taskId
      };
      
      console.log(`[FormSubmitSection] Submitting ${formType} form for task ${taskId}`);
      
      // Submit the form using the form submission service
      const result = await formSubmissionService.submitForm({
        taskId,
        formType,
        formData: enrichedFormData
      });
      
      if (result.success) {
        console.log(`[FormSubmitSection] Form submitted successfully:`, result);
        
        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        }
      } else {
        console.error(`[FormSubmitSection] Form submission failed:`, result.error);
        setSubmissionError(result.error || 'An unknown error occurred');
      }
    } catch (error) {
      console.error(`[FormSubmitSection] Error submitting form:`, error);
      setSubmissionError((error as Error).message || 'An unknown error occurred');
    } finally {
      setIsSubmittingForm(false);
    }
  };
  
  return (
    <div className="space-y-6 py-4">
      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Completion:</span>
          <span className={`text-sm font-bold ${progressColor}`}>
            {progress}%
          </span>
        </div>
        
        {progress === 100 && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Check size={16} />
            <span>Form complete</span>
          </div>
        )}
      </div>
      
      {/* Confirmation checkbox */}
      {requireConfirmation && (
        <div className="flex items-center space-x-2 py-2">
          <Checkbox 
            id="agreement" 
            checked={agreed} 
            onCheckedChange={(checked) => setAgreed(checked === true)}
            disabled={disabled || isSubmittingForm}
          />
          <label
            htmlFor="agreement"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {confirmationText}
          </label>
        </div>
      )}
      
      {/* Error message */}
      {submissionError && (
        <div className="text-sm text-red-600 py-2">
          Error: {submissionError}
        </div>
      )}
      
      {/* Submit button */}
      <Button
        onClick={handleSubmit}
        disabled={submitDisabled}
        className="w-full"
      >
        {isSubmittingForm ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          submitText
        )}
      </Button>
      
      {/* Submission feedback via WebSockets */}
      <FormSubmissionListener 
        taskId={taskId}
        formType={formType}
        onSuccess={onSuccess}
        navigateTo={navigateAfterSubmit}
      />
    </div>
  );
}

export default FormSubmitSection;