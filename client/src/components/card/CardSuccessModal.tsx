import { ArrowRight, CheckCircle, Download, FileText } from "lucide-react";
import { useLocation } from "wouter";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CardSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  fileId?: number; // Optional file ID for download references
}

export function CardSuccessModal({ open, onOpenChange, companyName, fileId }: CardSuccessModalProps) {
  const [, navigate] = useLocation();

  // Prevent default browser behavior to avoid refresh
  const handleCloseModal = (openState: boolean) => {
    console.log('[CardSuccessModal] Closing modal');
    // Only call onOpenChange if the state is actually changing to avoid unnecessary re-renders
    if (open !== openState) {
      onOpenChange(openState);
    }
  };
  
  return (
    <Dialog 
      open={open} 
      onOpenChange={handleCloseModal}
      modal={true} // Ensure it's modal to prevent background interactions
    >
      <DialogContent 
        className="sm:max-w-[525px] dialog-content-above-confetti"
        onEscapeKeyDown={(e) => {
          // Prevent default esc key behavior to avoid refreshes
          e.preventDefault();
          handleCloseModal(false);
        }}
        onPointerDownOutside={(e) => {
          // Prevent closing on outside click which might trigger refresh
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <div className="flex flex-col items-center text-center gap-2">
            <div className="rounded-full bg-green-50 p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-xl font-semibold">
              Open Banking Assessment Complete
            </DialogTitle>
            <DialogDescription className="sr-only">
              Open Banking (1033) assessment completion notification
            </DialogDescription>
          </div>
        </DialogHeader>
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
            onClick={() => {
              navigate('/file-vault');
            }}
            className="flex-1"
          >
            View File Vault
          </Button>
          <Button
            onClick={() => {
              navigate('/insights');
            }}
            className="flex-1"
          >
            Go to Insights
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}