import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

interface KYBSuccessModalProps {
  companyName: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

export function KYBSuccessModal({ 
  companyName, 
  open: controlledOpen, 
  onOpenChange, 
  onClose 
}: KYBSuccessModalProps) {
  const [internalOpen, setInternalOpen] = useState(true);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  
  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  const handleClose = () => {
    if (!isControlled) {
      setInternalOpen(false);
    }
    onOpenChange?.(false);
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            KYB Survey Submitted Successfully
          </DialogTitle>
          <DialogDescription className="text-center">
            Thank you for submitting your KYB survey for <span className="font-semibold">{companyName}</span>. Our compliance team will review your submission and update the status accordingly.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4 py-2">
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">What happens next?</h3>
                <div className="mt-2 text-sm text-green-700">
                  <ul className="list-disc space-y-1 pl-5">
                    <li>Our compliance team will review your submission</li>
                    <li>You may be contacted for additional information</li>
                    <li>Once approved, your company will be granted full access to all platform features</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="sm:justify-center">
          <Button onClick={handleClose}>
            Return to Task Center
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}