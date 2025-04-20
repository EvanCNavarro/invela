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
  
  // Ensures that file-vault tab stays permanently unlocked
  useEffect(() => {
    if (!open) return;
    
    try {
      // Get current company data
      const company = queryClient.getQueryData(['/api/companies/current']) as any;
      if (!company) return;
      
      console.log('[KYBSuccessModal] Making file-vault tab visible - permanent unlock');
      
      // Make sure we keep any existing tabs (like task-center) 
      // but definitely add file-vault if it's not already there
      const currentTabs = Array.isArray(company.available_tabs) ? company.available_tabs : ['task-center'];
      const updatedTabs = currentTabs.includes('file-vault') 
        ? currentTabs 
        : [...currentTabs, 'file-vault'];
      
      console.log('[KYBSuccessModal] Updating available_tabs:', currentTabs, ' → ', updatedTabs);
      
      // 1. Update React Query cache with the updated tabs that include file-vault
      queryClient.setQueryData(['/api/companies/current'], {
        ...company,
        available_tabs: updatedTabs
      });
      
      // 2. Notify server (async, doesn't affect UI)
      fetch(`/api/companies/${company.id}/unlock-file-vault`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      .then(response => response.json())
      .then(data => {
        console.log('[KYBSuccessModal] Server updated file-vault status:', data);
        
        // 3. After server confirms, do one more cache update just to be sure
        setTimeout(() => {
          const updatedCompany = queryClient.getQueryData(['/api/companies/current']) as any;
          if (updatedCompany && !updatedCompany.available_tabs?.includes('file-vault')) {
            console.log('[KYBSuccessModal] Ensuring file-vault is in tabs after server update');
            queryClient.setQueryData(['/api/companies/current'], {
              ...updatedCompany,
              available_tabs: [...(updatedCompany.available_tabs || []), 'file-vault']
            });
          }
        }, 500); // Short delay to ensure any concurrent updates are processed
      })
      .catch(err => console.error('[KYBSuccessModal] Server notification error:', err));
    } catch (error) {
      console.error('[KYBSuccessModal] Tab update error:', error);
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