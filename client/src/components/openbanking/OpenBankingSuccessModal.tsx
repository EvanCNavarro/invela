import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { CheckCircle, FileText, ArrowRight, LayoutDashboard } from "lucide-react";

interface OpenBankingSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
}

export function OpenBankingSuccessModal({ open, onOpenChange, companyName }: OpenBankingSuccessModalProps) {
  const [, navigate] = useLocation();
  
  console.log(`[OpenBankingSuccessModal] Rendering with:`, {
    isOpen: open,
    companyName: companyName || 'Unknown company'
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] dialog-content-above-confetti">
        <DialogHeader>
          <div className="flex flex-col items-center text-center gap-2">
            <div className="rounded-full bg-green-50 p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-xl font-semibold">
              Open Banking Survey Complete
            </DialogTitle>
            <DialogDescription className="sr-only">
              Open Banking Survey completion notification with next steps
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="py-5 space-y-6">
          <p className="text-center text-gray-500">
            Good job! You have successfully submitted the Open Banking Survey for <span className="font-semibold text-gray-700">{companyName}</span>
          </p>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 border rounded-md p-3 bg-slate-50">
              <FileText className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">New Download Available</p>
                <p className="text-gray-600">A complete record of your Open Banking Survey has been generated and can be downloaded from the File Vault.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 border rounded-md p-3 bg-blue-50 border-blue-200">
              <LayoutDashboard className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Insights Dashboard Unlocked</p>
                <p className="text-gray-600">
                  Your company onboarding is now complete. The Insights Dashboard has been unlocked with your company's risk assessment and analytics.
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
              onOpenChange(false);
            }}
            className="flex-1"
          >
            View File Vault
          </Button>
          <Button
            onClick={() => {
              navigate('/company/dashboard');
              onOpenChange(false);
            }}
            className="flex-1"
          >
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}