import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { CheckCircle, FileText, ArrowRight, Archive } from "lucide-react";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface KYBSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
}

export function KYBSuccessModal({ open, onOpenChange, companyName }: KYBSuccessModalProps) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  // Truly instant file vault visibility the moment this modal appears
  useEffect(() => {
    if (open) {
      console.log('[KYBSuccessModal] ⚡ INSTANT: Adding file-vault tab immediately');
      
      // Get current company data from cache
      const currentCompanyData = queryClient.getQueryData(['/api/companies/current']);
      
      if (currentCompanyData) {
        const company = currentCompanyData as any;
        
        // No special case checks - just make it work for EVERY company
        // The most direct and reliable approach for truly instant updates
        console.log('[KYBSuccessModal] ⚡ INSTANT UPDATE: Force adding file-vault tab to company', company.id);
        
        // Create updated company data with file-vault tab
        const updatedCompany = {
          ...company,
          available_tabs: [...new Set([...(company.available_tabs || ['task-center']), 'file-vault'])]
        };
        
        // INSTANT UI UPDATE: Update the cache immediately to show tab right away
        queryClient.setQueryData(['/api/companies/current'], updatedCompany);
        
        // Fire-and-forget the server update (don't wait for response)
        fetch(`/api/companies/${company.id}/unlock-file-vault`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'}
        }).catch(() => {/* Ignore errors - the UI is already updated */});
        
        // Force sidebar to update by dispatching a custom event
        window.dispatchEvent(new CustomEvent('force-sidebar-update'));
      }
    }
  }, [open, queryClient]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] dialog-content-above-confetti">
        <DialogHeader>
          <div className="flex flex-col items-center text-center gap-2">
            <div className="rounded-full bg-green-50 p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-xl font-semibold">
              KYB Form Complete
            </DialogTitle>
            <DialogDescription className="sr-only">
              KYB form completion notification with next steps
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="py-5 space-y-6">
          <p className="text-center text-gray-500">
            Good job! You have successfully submitted the 'Know Your Business Form' for <span className="font-semibold text-gray-700">{companyName}</span>
          </p>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 border rounded-md p-3 bg-slate-50">
              <Archive className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">File Vault Tab Unlocked</p>
                <p className="text-gray-600">
                  <span className="font-medium text-blue-600">A new tab is now available in your navigation menu!</span> The File Vault stores all your uploaded and generated documents in one secure location.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 border rounded-md p-3 bg-slate-50">
              <FileText className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Download Available</p>
                <p className="text-gray-600">A complete record of your KYB form has been generated and can be downloaded from the File Vault.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 border rounded-md p-3 bg-blue-50 border-blue-200">
              <ArrowRight className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Next Step: Security Assessment</p>
                <p className="text-gray-600">
                  <span className="font-medium text-blue-600">Recommended:</span> The Security Assessment task has been unlocked in your Task Center. This is the next required step in your Accreditation process.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-between gap-4 mt-2">
          <Button
            variant="outline"
            onClick={() => {
              // First close modal, then navigate with a slight delay to ensure company data is refreshed
              onOpenChange(false);
              // Small delay to ensure the company data is fully refreshed before navigation
              setTimeout(() => {
                navigate('/file-vault');
              }, 100);
            }}
            className="flex-1"
          >
            View File Vault
          </Button>
          <Button
            onClick={() => {
              // First close modal, then navigate with a slight delay for better UX
              onOpenChange(false);
              setTimeout(() => {
                navigate('/task-center');
              }, 100);
            }}
            className="flex-1"
          >
            Go to Task Center
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}