import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { CheckCircle, FileText, ArrowRight, Archive } from "lucide-react";

interface KYBSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
}

export function KYBSuccessModal({ open, onOpenChange, companyName }: KYBSuccessModalProps) {
  const [, navigate] = useLocation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <div className="flex flex-col items-center text-center gap-3">
            <div className="rounded-full bg-green-50 p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-xl font-semibold">
              KYB Assessment Complete
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="py-5 space-y-5">
          <p className="text-center">
            The Know Your Business assessment for <span className="font-semibold">{companyName}</span> has been successfully submitted.
          </p>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 border rounded-md p-3 bg-slate-50">
              <Archive className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">File Vault Access Enabled</p>
                <p className="text-gray-600">Your submission has been automatically saved to the File Vault. All uploaded and generated documents can be accessed there.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 border rounded-md p-3 bg-slate-50">
              <FileText className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Documentation Available</p>
                <p className="text-gray-600">A complete record of your KYB assessment has been generated and can be downloaded from the File Vault.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 border rounded-md p-3 bg-slate-50">
              <ArrowRight className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Next Step: Security Assessment</p>
                <p className="text-gray-600">The Security Assessment task has been unlocked in your Task Center. This is the next required step in your compliance process.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-between gap-4 mt-2">
          <Button
            variant="outline"
            onClick={() => {
              navigate('/task-center');
              onOpenChange(false);
            }}
            className="flex-1"
          >
            Go to Task Center
          </Button>
          <Button
            onClick={() => {
              navigate('/file-vault');
              onOpenChange(false);
            }}
            className="flex-1"
          >
            View File Vault
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}