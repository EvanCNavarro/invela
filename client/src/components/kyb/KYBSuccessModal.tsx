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
  
  // Enhanced effect to ensure immediate file vault visibility when the modal opens
  useEffect(() => {
    if (open) {
      console.log('[KYBSuccessModal] ⚡ CRITICAL: Modal opened, force unlocking file vault');
      
      // APPROACH 1: Client-side cache update for immediate UI feedback
      // This ensures the tab is visible right away without waiting for server response
      const currentCompanyData = queryClient.getQueryData(['/api/companies/current']);
      
      if (currentCompanyData) {
        const company = currentCompanyData as any;
        console.log('[KYBSuccessModal] Current company data:', {
          id: company.id, 
          tabs: company.available_tabs,
          hasFileVault: company.available_tabs?.includes('file-vault') || false
        });
        
        if (!company.available_tabs?.includes('file-vault')) {
          console.log('[KYBSuccessModal] 🔄 Proactively adding file-vault tab to cache');
          const updatedCompany = {
            ...company,
            available_tabs: [...(company.available_tabs || ['task-center']), 'file-vault']
          };
          
          // Update the cache immediately for instant UI update
          queryClient.setQueryData(['/api/companies/current'], updatedCompany);
          
          // APPROACH 2: Direct API call to ensure server-side update
          // This makes a direct API call to force unlock file vault on the server
          const forcedUnlockFileVault = async () => {
            try {
              console.log('[KYBSuccessModal] 🔐 Making direct API call to force unlock file vault');
              const response = await fetch(`/api/companies/${company.id}/unlock-file-vault`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              });
              
              if (response.ok) {
                const result = await response.json();
                console.log('[KYBSuccessModal] ✅ Successfully forced file vault unlock:', result);
              } else {
                console.error('[KYBSuccessModal] ❌ Failed to force unlock file vault:', response.statusText);
              }
            } catch (error) {
              console.error('[KYBSuccessModal] ❌ Error in direct file vault unlock:', error);
            }
          };
          
          // Execute the forced unlock immediately
          forcedUnlockFileVault();
        }
      }
      
      // APPROACH 3: Invalidate and refetch company data with high priority
      console.log('[KYBSuccessModal] 🔄 Invalidating and refetching company data');
      queryClient.invalidateQueries({ 
        queryKey: ['/api/companies/current'],
        refetchType: 'all' // Force all queries to refetch, including inactive ones
      });
      
      // Force immediate refetch with high priority
      queryClient.refetchQueries({ 
        queryKey: ['/api/companies/current'],
        exact: true,
        type: 'all' // Refetch all queries including inactive
      });
      
      // APPROACH 4: Scheduled refetches to ensure data is eventually consistent
      // Add delayed refetches to catch any updates that might have been missed
      const delayTimes = [500, 1500, 3000]; // 0.5s, 1.5s, 3s delays
      
      delayTimes.forEach(delay => {
        setTimeout(() => {
          console.log(`[KYBSuccessModal] 🔄 Delayed refetch (${delay}ms) of company data`);
          queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
          queryClient.refetchQueries({ 
            queryKey: ['/api/companies/current'],
            exact: true
          });
        }, delay);
      });
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