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
  
  // Immediately and permanently unlock the file-vault tab
  useEffect(() => {
    // Only run once when the modal is opened
    if (!open) return;
    
    console.log('[KYBSuccessModal] AGGRESSIVE UNLOCK: Forcing file-vault tab visibility');
    
    // Force the file-vault tab to be visible by directly patching React Query cache
    // This runs immediately at component mount to prevent any flickering
    try {
      // Get current company data
      const company = queryClient.getQueryData(['/api/companies/current']) as any;
      if (!company) {
        console.log('[KYBSuccessModal] No company data in cache, cannot update tabs');
        return;
      }
      
      // AGGRESSIVELY set file-vault as visible without checking current state
      console.log('[KYBSuccessModal] Directly forcing file-vault tab visibility');
      
      // Create stable tabs array that always includes file-vault and any existing tabs
      const baseTabsArray = Array.isArray(company.available_tabs) ? company.available_tabs : ['task-center'];
      const stableTabs = baseTabsArray.includes('file-vault') 
        ? baseTabsArray
        : [...baseTabsArray, 'file-vault'];
      
      // Forcefully update the cache with file-vault included
      queryClient.setQueryData(['/api/companies/current'], {
        ...company,
        available_tabs: stableTabs
      });
      
      console.log('[KYBSuccessModal] TABS FORCEFULLY UPDATED TO:', stableTabs);
      
      // Immediately send server update to persist changes
      fetch(`/api/companies/${company.id}/unlock-file-vault`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).then(response => {
        if (!response.ok) throw new Error('Server update failed');
        return response.json();
      }).then(data => {
        console.log('[KYBSuccessModal] Server confirmed file-vault unlocked:', data);
      }).catch(err => {
        console.error('[KYBSuccessModal] Server error, but UI already updated:', err);
      });
      
      // CRITICAL: Disable any polling or auto-refresh that could cause flickering
      // by setting up a blocker that runs multiple times
      const preventFlickering = () => {
        // Refresh company data from cache
        const latestCompany = queryClient.getQueryData(['/api/companies/current']) as any;
        if (latestCompany && !latestCompany.available_tabs?.includes('file-vault')) {
          console.log('[KYBSuccessModal] ANTI-FLICKER: Correcting missing file-vault tab');
          queryClient.setQueryData(['/api/companies/current'], {
            ...latestCompany,
            available_tabs: [...(latestCompany.available_tabs || []), 'file-vault']
          });
        }
      };
      
      // Run the flicker prevention multiple times to ensure stability
      preventFlickering();
      setTimeout(preventFlickering, 100);
      setTimeout(preventFlickering, 500);
      setTimeout(preventFlickering, 1000);
      setTimeout(preventFlickering, 2000);
      
    } catch (error) {
      console.error('[KYBSuccessModal] Critical tab visibility error:', error);
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
              try {
                // Update company data one more time as safeguard before navigation
                const company = queryClient.getQueryData(['/api/companies/current']) as any;
                if (company && !company.available_tabs?.includes('file-vault')) {
                  // Force add file-vault to available_tabs if it's not already there
                  const updatedTabs = [...(company.available_tabs || []), 'file-vault'];
                  queryClient.setQueryData(['/api/companies/current'], {
                    ...company,
                    available_tabs: updatedTabs
                  });
                  console.log('[KYBSuccessModal] Added file-vault before navigation as safeguard');
                }
                
                // Close modal first, then navigate with a slightly longer delay to ensure stability
                onOpenChange(false);
                setTimeout(() => {
                  navigate('/file-vault');
                }, 200);
              } catch (error) {
                console.error('[KYBSuccessModal] Error during navigation:', error);
                // Still try to navigate even if there was an error
                onOpenChange(false);
                navigate('/file-vault');
              }
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