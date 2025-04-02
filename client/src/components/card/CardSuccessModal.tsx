import { useLocation } from "wouter";
import { ArrowRight, CheckCircle, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect } from "react";

interface CardSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  fileId?: number; // Optional file ID for download references
}

export function CardSuccessModal({ open, onOpenChange, companyName, fileId }: CardSuccessModalProps) {
  const [, navigate] = useLocation();

  // Prevent modal from causing page reloads
  useEffect(() => {
    // Add event listeners to prevent form submissions while modal is open
    const preventFormSubmission = (e: Event) => {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Add these listeners only when the modal is open
    if (open) {
      // Prevent form submissions
      document.addEventListener('submit', preventFormSubmission, true);
      // Prevent click propagation
      document.addEventListener('click', preventFormSubmission, true);
    }

    // Clean up event listeners when modal closes
    return () => {
      document.removeEventListener('submit', preventFormSubmission, true);
      document.removeEventListener('click', preventFormSubmission, true);
    };
  }, [open]);

  // Safe close handler that prevents refreshes
  const handleSafeModalClose = useCallback(() => {
    console.log('[CardSuccessModal] Closing modal safely');
    
    // Add a small delay to ensure we're not in the middle of an event cycle
    setTimeout(() => {
      onOpenChange(false);
    }, 10);
  }, [onOpenChange]);

  // Safe navigation that prevents refreshes
  const handleSafeNavigation = useCallback((path: string) => {
    console.log('[CardSuccessModal] Safe navigation to', path);
    
    // First close modal
    handleSafeModalClose();
    
    // Then navigate with a slight delay
    setTimeout(() => {
      navigate(path);
    }, 50);
  }, [navigate, handleSafeModalClose]);

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" 
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-lg w-full max-w-[525px] p-6 relative"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="flex flex-col items-center text-center gap-2">
          <div className="rounded-full bg-green-50 p-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold">
            Open Banking Assessment Complete
          </h2>
        </div>
        
        <div className="py-5 space-y-6">
          <p className="text-center text-gray-500">
            Great job! You have successfully submitted the Open Banking (1033) Survey for <span className="font-semibold text-gray-700">{companyName}</span>
          </p>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 border rounded-md p-3 bg-slate-50">
              <FileText className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">New Download Available</p>
                <p className="text-gray-600">A complete record of your Open Banking Assessment has been generated and can be downloaded from the File Vault.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 border rounded-md p-3 bg-blue-50 border-blue-200">
              <ArrowRight className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Completed: Full Accreditation Process</p>
                <p className="text-gray-600">
                  Congratulations! You have completed all required assessments for accreditation. Visit the Insights tab to see your company's risk analysis.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between gap-4 mt-2">
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSafeNavigation('/file-vault');
            }}
            className="flex-1"
            type="button"
          >
            View File Vault
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSafeNavigation('/insights');
            }}
            className="flex-1"
            type="button"
          >
            Go to Insights
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSafeModalClose();
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
}