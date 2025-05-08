import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertCircle, CheckCircle } from "lucide-react";
import useKy3pFormSubmission from "@/hooks/use-ky3p-form-submission";

interface Ky3pSubmitButtonProps {
  taskId: number;
  disabled?: boolean;
  onSuccess?: () => void;
  className?: string;
}

/**
 * KY3P Submit Button
 * 
 * A specialized button component for KY3P form submissions that uses
 * our custom hook to properly handle submission status.
 */
export default function Ky3pSubmitButton({
  taskId,
  disabled = false,
  onSuccess,
  className = "",
}: Ky3pSubmitButtonProps) {
  // State for disable after submit
  const [submitted, setSubmitted] = useState(false);

  // Use our specialized KY3P form submission hook
  const {
    submitKy3pForm,
    isSubmitting,
    isSuccess,
    isError,
    error,
    showSuccessModal,
    showConnectionIssueModal,
    retrySubmission,
    closeSuccessModal,
    closeConnectionIssueModal,
  } = useKy3pFormSubmission({
    invalidateQueries: [`/api/tasks/${taskId}`, '/api/tasks'],
    onSuccess: () => {
      setSubmitted(true);
      if (onSuccess) {
        onSuccess();
      }
    },
  });

  // Handle form submission
  const handleSubmit = async () => {
    await submitKy3pForm(taskId);
  };

  // Determine button state
  const isDisabled = disabled || submitted || isSubmitting;
  const buttonText = isSubmitting 
    ? "Submitting..." 
    : submitted 
      ? "Submitted" 
      : "Submit";

  return (
    <>
      <Button
        type="button"
        className={className}
        disabled={isDisabled}
        onClick={handleSubmit}
      >
        {buttonText}
      </Button>

      {/* Success Dialog */}
      <Dialog open={showSuccessModal} onOpenChange={closeSuccessModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Form Submitted Successfully
            </DialogTitle>
            <DialogDescription>
              Your KY3P form has been submitted successfully. The task status has been updated to "Submitted".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={closeSuccessModal}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Connection Issue Dialog */}
      <Dialog open={showConnectionIssueModal} onOpenChange={closeConnectionIssueModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Connection Issue
            </DialogTitle>
            <DialogDescription>
              There was a connection issue while submitting your form. Your work has been saved,
              but the submission process couldn't be completed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={closeConnectionIssueModal}>
              Cancel
            </Button>
            <Button onClick={() => retrySubmission(taskId)}>
              Try Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}