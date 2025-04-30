import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle } from "lucide-react";
import { useLocation } from "wouter";

interface SubmissionSuccessModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  returnPath?: string;
  returnLabel?: string;
  taskType?: string;
}

/**
 * A modal component to display upon successful form submission
 * 
 * This component shows a success message and provides navigation options
 * after a form has been successfully submitted.
 */
export default function SubmissionSuccessModal({
  open,
  onClose,
  title = "Submission Successful",
  description = "Your form has been successfully submitted.",
  returnPath = "/tasks",
  returnLabel = "Return to Tasks",
  taskType = "",
}: SubmissionSuccessModalProps) {
  const [_, navigate] = useLocation();

  // Enhanced descriptions for specific form types
  const enhancedDescription = getEnhancedDescription(description, taskType);

  const handleReturn = () => {
    navigate(returnPath);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center">
          <CheckCircle className="h-16 w-16 text-emerald-500 mb-4" />
          <DialogTitle className="text-center text-xl">{title}</DialogTitle>
          <DialogDescription className="text-center mt-2">
            {enhancedDescription}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex justify-center mt-6">
          <Button 
            onClick={handleReturn} 
            className="min-w-[200px]"
          >
            {returnLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Generate an enhanced description based on form type
 */
function getEnhancedDescription(baseDescription: string, taskType: string): string {
  switch (taskType) {
    case 'kyb':
      return `${baseDescription} Your KYB information has been recorded and is being processed. The KY3P and Open Banking surveys are now available.`;
    
    case 'ky3p':
      return `${baseDescription} Your KY3P assessment has been recorded. Thank you for providing this security information.`;
    
    case 'open_banking':
      return `${baseDescription} Your Open Banking survey has been successfully processed. The Dashboard and Insights tabs are now available for you to explore.`;
    
    default:
      return baseDescription;
  }
}