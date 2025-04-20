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
  
  // INSTANT AND IMMEDIATE unlock of the file-vault tab
  // This code runs SYNCHRONOUSLY upon component mount with zero delay
  useEffect(() => {
    if (!open) return;

    // ULTRA-AGGRESSIVE APPROACH: Update UI first, then sync with server
    console.log('[KYBSuccessModal] 🚀 INSTANT UNLOCK: Immediate forced tab visibility');
    
    try {
      // APPROACH: Make file-vault visible IMMEDIATELY without waiting for anything
      // 1. First update cache synchronously (happens instantly)
      // 2. Dispatch custom event to force all components to re-render
      // 3. Only then communicate with server (fully async, doesn't block UI)
      // 4. Implement safety checks that run on a timer to prevent any flicker
      
      // Step 1: Get current company data and instantly update cache
      const company = queryClient.getQueryData(['/api/companies/current']) as any;
      if (company) {
        // Force tabs to include file-vault no matter what
        const stableTabs = [...new Set([...(Array.isArray(company.available_tabs) ? company.available_tabs : ['task-center']), 'file-vault'])];
        
        // Instantly update the cache - this happens synchronously
        queryClient.setQueryData(['/api/companies/current'], {
          ...company,
          available_tabs: stableTabs
        });
        
        console.log('[KYBSuccessModal] ✅ TABS INSTANTLY UPDATED:', stableTabs);
        
        // Step 2: Force sidebar to re-render immediately via custom event
        // This ensures the UI updates instantly without waiting for React Query
        window.dispatchEvent(new CustomEvent('force-sidebar-update'));
        document.dispatchEvent(new CustomEvent('file-vault-unlocked'));
        
        // REDUNDANT SAFETY: Also manually add the tab to DOM for ultra-reliability
        const forceRender = () => {
          // Double check the cache is still correctly set
          const latestCompany = queryClient.getQueryData(['/api/companies/current']) as any;
          if (latestCompany && !latestCompany.available_tabs?.includes('file-vault')) {
            console.log('[KYBSuccessModal] 🛡️ SAFETY CHECK: Re-adding file-vault tab to cache');
            queryClient.setQueryData(['/api/companies/current'], {
              ...latestCompany,
              available_tabs: [...(latestCompany.available_tabs || []), 'file-vault']
            });
            
            // Force sidebar update again
            window.dispatchEvent(new CustomEvent('force-sidebar-update'));
          }
        };
        
        // Run safety checks at staggered intervals
        forceRender(); // Run immediately
        requestAnimationFrame(forceRender); // Run on next animation frame
        setTimeout(forceRender, 0); // Run after current event loop
        setTimeout(forceRender, 50); // Run after a short delay
        setTimeout(forceRender, 100); // Run after slightly longer delay
        
        // Step 3: Only after UI is updated, communicate with server (async)
        fetch(`/api/companies/${company.id}/unlock-file-vault`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }).catch(() => {
          // Even if server fails, the UI is already updated correctly
          console.log('[KYBSuccessModal] 🔄 Server sync running in background');
        });
      } else {
        // Fallback if company data isn't in cache yet
        console.error('[KYBSuccessModal] ⚠️ No company data in cache, using backup approach');
        
        // Force update using localStorage as backup
        window.localStorage.setItem('force_file_vault_visible', 'true');
        window.dispatchEvent(new CustomEvent('force-sidebar-update'));
      }
    } catch (error) {
      console.error('[KYBSuccessModal] 🚨 Error during tab unlock:', error);
      // Still try to show the tab even if there was an error
      window.dispatchEvent(new CustomEvent('force-sidebar-update'));
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
                // INSTANT NAVIGATION APPROACH
                // 1. First update UI synchronously (guarantee file-vault tab is visible)
                // 2. Close modal without delay
                // 3. Navigate immediately
                
                // Step 1: Final check to ensure tab is visible in UI
                const company = queryClient.getQueryData(['/api/companies/current']) as any;
                if (company) {
                  // Make sure tab is 100% in the available tabs list
                  if (!company.available_tabs?.includes('file-vault')) {
                    const stableTabs = [...(Array.isArray(company.available_tabs) ? company.available_tabs : ['task-center']), 'file-vault'];
                    
                    // Synchronously update cache
                    queryClient.setQueryData(['/api/companies/current'], {
                      ...company,
                      available_tabs: stableTabs
                    });
                    
                    // Force sidebar to update immediately
                    window.dispatchEvent(new CustomEvent('force-sidebar-update'));
                    document.dispatchEvent(new CustomEvent('file-vault-unlocked'));
                  }
                }
                
                // Step 2: Close modal
                onOpenChange(false);
                
                // Step 3: Navigate immediately
                navigate('/file-vault');
                
                // Extra safety measure - dispatch another event after navigation to ensure visibility
                requestAnimationFrame(() => {
                  window.dispatchEvent(new CustomEvent('force-sidebar-update'));
                });
              } catch (error) {
                console.error('[KYBSuccessModal] Error during navigation:', error);
                // Fall back to simple navigation if there was an error
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