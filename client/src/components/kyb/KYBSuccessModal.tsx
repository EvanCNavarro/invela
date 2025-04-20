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
  
  // Ultra-optimized synchronization for instant visual tab appearance
  useEffect(() => {
    if (open) {
      console.time('file-vault-tab-update');
      
      // PHASE 0: Preload file-vault path data - prevents flickering on navigation
      const preloadFileVaultPath = document.createElement('link');
      preloadFileVaultPath.rel = 'prefetch';
      preloadFileVaultPath.href = '/file-vault';
      document.head.appendChild(preloadFileVaultPath);
      
      // Prioritize DOM operations with multiple execution approaches
      const executeTabUpdate = () => {
        try {
          // Get current company data
          const company = queryClient.getQueryData(['/api/companies/current']) as any;
          
          if (company) {
            console.log('[KYBSuccessModal] PHASE 1: Instant UI update');
            
            // CRITICAL: Direct DOM manipulation for ZERO-DELAY tab visibility
            document.querySelectorAll('[data-menu-item="file-vault"]').forEach(item => {
              // Immediate CSS changes through data attributes 
              item.setAttribute('data-locked', 'false');
              item.classList.add('fast-transition');
              
              // Remove lock icon if present
              const lockIcon = item.querySelector('.lock-icon');
              if (lockIcon) lockIcon.remove();
            });
            
            // PHASE 2: Update React Query cache for longer-term data consistency
            console.log('[KYBSuccessModal] PHASE 2: Cache update');
            queryClient.setQueryData(['/api/companies/current'], {
              ...company,
              available_tabs: [...new Set([...(company.available_tabs || ['task-center']), 'file-vault'])]
            });
            
            // PHASE 3: Force component re-renders with microtask priority
            queueMicrotask(() => {
              console.log('[KYBSuccessModal] PHASE 3: Component update');
              window.dispatchEvent(new CustomEvent('force-sidebar-update', { 
                detail: { tabs: ['file-vault'], action: 'unlock' }
              }));
              
              // PHASE 4: Server notification (lowest priority, happens last)
              setTimeout(() => {
                fetch(`/api/companies/${company.id}/unlock-file-vault`, { method: 'POST' })
                  .then(() => console.log('[KYBSuccessModal] PHASE 4: Server notified'))
                  .catch(() => {/* Ignore errors */});
                  
                console.timeEnd('file-vault-tab-update');
              }, 0);
            });
          }
        } catch (error) {
          console.error('[KYBSuccessModal] Tab update error:', error);
        }
      };
      
      // Execute with multiple timing approaches to ensure at least one succeeds quickly
      executeTabUpdate(); // Instant execution
      requestAnimationFrame(executeTabUpdate); // Next frame priority execution
      
      // Set up a tiny CSS animation trigger on the tab for perceived immediate response
      const style = document.createElement('style');
      style.textContent = `
        [data-menu-item="file-vault"] {
          animation: highlight-tab 200ms ease-out;
        }
        @keyframes highlight-tab {
          0% { background-color: rgba(73, 101, 236, 0.08); }
          100% { background-color: transparent; }
        }
      `;
      document.head.appendChild(style);
      setTimeout(() => document.head.removeChild(style), 300);
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