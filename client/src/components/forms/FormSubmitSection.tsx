/**
 * Form Submit Section
 * 
 * This component provides a standardized UI for form submission including:
 * - Confirmation checkbox
 * - Submit button with loading state
 * - Progress indicator
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export interface FormSubmitSectionProps {
  onSubmit: () => void;
  isSubmitting: boolean;
  isDisabled?: boolean;
  buttonText?: string;
  confirmationText?: string;
  requireConfirmation?: boolean;
  showProgress?: boolean;
  progressValue?: number;
}

export function FormSubmitSection({
  onSubmit,
  isSubmitting,
  isDisabled = false,
  buttonText = 'Submit Form',
  confirmationText = 'I confirm that all information provided is accurate and complete.',
  requireConfirmation = true,
  showProgress = true,
  progressValue = 0
}: FormSubmitSectionProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  
  // Determine if submit button should be disabled
  const submitDisabled = isDisabled || isSubmitting || (requireConfirmation && !isConfirmed);
  
  return (
    <div className="space-y-6">
      {/* Progress bar */}
      {showProgress && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Submission Progress</span>
            <span>{progressValue}%</span>
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>
      )}
      
      {/* Confirmation checkbox */}
      {requireConfirmation && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="confirmation"
            checked={isConfirmed}
            onCheckedChange={(checked) => setIsConfirmed(checked === true)}
            disabled={isSubmitting}
          />
          <Label
            htmlFor="confirmation"
            className="text-sm font-normal cursor-pointer"
          >
            {confirmationText}
          </Label>
        </div>
      )}
      
      {/* Submit button */}
      <Button
        type="button"
        onClick={onSubmit}
        disabled={submitDisabled}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          buttonText
        )}
      </Button>
    </div>
  );
}

export default FormSubmitSection;