import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

interface SubmissionSuccessModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  returnPath: string;
  returnLabel: string;
  taskType?: string;
}

export default function SubmissionSuccessModal({
  open,
  onClose,
  title,
  description,
  returnPath,
  returnLabel,
  taskType
}: SubmissionSuccessModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <DialogTitle className="text-xl font-semibold tracking-tight">{title}</DialogTitle>
          <DialogDescription className="text-base pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        {taskType === 'open_banking' && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 my-4">
            <p className="text-sm text-blue-800">
              Your responses have been securely submitted. A PDF document has been automatically generated from your submission and placed in your File Vault for record-keeping purposes.
            </p>
          </div>
        )}
        
        {taskType === 'ky3p' && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-md p-4 my-4">
            <p className="text-sm text-indigo-800">
              Thanks for completing the KY3P security assessment. Your answers have been recorded and a comprehensive report has been generated in your File Vault.
            </p>
          </div>
        )}
        
        {taskType === 'kyb' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4 my-4">
            <p className="text-sm text-emerald-800">
              Your KYB information has been successfully recorded. You can now proceed with additional compliance tasks that have been unlocked in your task center.
            </p>
          </div>
        )}
        
        <DialogFooter className="sm:justify-center">
          <Link href={returnPath}>
            <Button onClick={onClose}>{returnLabel}</Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Named export for component
export { SubmissionSuccessModal };