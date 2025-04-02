import { useLocation } from "wouter";
import { ArrowRight, CheckCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect } from "react";

interface CardSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  fileId?: number; // Optional file ID for download references
}

export function CardSuccessModal({ open, onOpenChange, companyName, fileId }: CardSuccessModalProps) {
  const [, navigate] = useLocation();

  // CRITICAL FIX: Create a portal container that sits outside any form hierarchy
  useEffect(() => {
    // Create portal container if it doesn't exist
    let portalContainer = document.getElementById('modal-portal-container');
    if (!portalContainer && open) {
      console.log('[CardSuccessModal] Creating isolated portal container');
      portalContainer = document.createElement('div');
      portalContainer.id = 'modal-portal-container';
      portalContainer.style.position = 'fixed';
      portalContainer.style.top = '0';
      portalContainer.style.left = '0';
      portalContainer.style.width = '100%';
      portalContainer.style.height = '100%';
      portalContainer.style.zIndex = '9999';
      portalContainer.style.pointerEvents = 'none';
      document.body.appendChild(portalContainer);
    }
    
    return () => {
      // Clean up portal container if we created it
      if (portalContainer && !open) {
        setTimeout(() => {
          if (portalContainer && portalContainer.parentNode) {
            portalContainer.parentNode.removeChild(portalContainer);
            console.log('[CardSuccessModal] Removed portal container');
          }
        }, 100);
      }
    };
  }, [open]);

  // COMPLETE EVENT PREVENTION SYSTEM
  useEffect(() => {
    console.log('[CardSuccessModal] Modal visibility state:', { 
      open, 
      timestamp: new Date().toISOString() 
    });
    
    // This function captures ALL events that could cause page reloads
    const preventPageReloads = (e: Event) => {
      // Check if modal is open before preventing events
      if (!open) return;
      
      console.log('[CardSuccessModal] Preventing event:', { 
        type: e.type, 
        target: e.target ? (e.target as HTMLElement).tagName : 'unknown'
      });
      
      // CRITICAL: Always prevent default and stop propagation
      e.preventDefault();
      e.stopPropagation();
      
      // For extra security on form events, immediately stop event chain
      if (e.type === 'submit' || e.type === 'reset') {
        console.log('[CardSuccessModal] Blocked form event:', e.type);
        return false;
      }
      
      // Special handling for navigation/reload related keyboard shortcuts
      if (e.type === 'keydown') {
        const keyEvent = e as KeyboardEvent;
        // Prevent F5, Ctrl+R, Ctrl+F5
        if (keyEvent.key === 'F5' || (keyEvent.ctrlKey && keyEvent.key === 'r')) {
          console.log('[CardSuccessModal] Blocked page reload keyboard shortcut');
          return false;
        }
      }
    };

    // Add more comprehensive event blocking when modal is open
    if (open) {
      document.addEventListener('submit', preventPageReloads, true);
      document.addEventListener('reset', preventPageReloads, true);
      document.addEventListener('keydown', preventPageReloads, true);
      
      // Also prevent form submission through native form behaviors
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        form.setAttribute('data-original-onsubmit', form.onsubmit ? 'true' : 'false');
        form.onsubmit = (e) => { 
          e.preventDefault(); 
          e.stopPropagation();
          console.log('[CardSuccessModal] Blocked direct form onsubmit');
          return false; 
        };
      });
    }

    // Clean up ALL event listeners when modal closes
    return () => {
      document.removeEventListener('submit', preventPageReloads, true);
      document.removeEventListener('reset', preventPageReloads, true);
      document.removeEventListener('keydown', preventPageReloads, true);
      
      // Restore original form behaviors
      if (open) {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
          const hadOriginalHandler = form.getAttribute('data-original-onsubmit') === 'true';
          if (!hadOriginalHandler) {
            form.onsubmit = null;
          }
          form.removeAttribute('data-original-onsubmit');
        });
      }
      
      console.log('[CardSuccessModal] Cleaned up all event listeners');
    };
  }, [open]);

  // A function to safely close the modal
  const handleSafeModalClose = useCallback(() => {
    console.log('[CardSuccessModal] Preparing to safely close modal');
    
    // Use requestAnimationFrame for smoother state handling
    requestAnimationFrame(() => {
      // Call onOpenChange to update parent component state
      console.log('[CardSuccessModal] Changing modal visibility to false');
      onOpenChange(false);
    });
  }, [onOpenChange]);

  // CRITICAL NAVIGATION FIX: Two-phase navigation to ensure no form resubmissions
  const handleSafeNavigation = useCallback((path: string, e?: React.MouseEvent<HTMLButtonElement>) => {
    console.log('[CardSuccessModal] SAFE NAVIGATION ACTIVATED - destination:', path);
    
    // 1. Block ALL events to prevent ANY form submissions
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      // Use native event for more thorough prevention
      if (e.nativeEvent) {
        const nativeEvent = e.nativeEvent as any;
        if (typeof nativeEvent.stopImmediatePropagation === 'function') {
          nativeEvent.stopImmediatePropagation();
        }
      }
    }
    
    // Store navigation intent in sessionStorage to preserve across potential reloads
    try {
      sessionStorage.setItem('intended_navigation', path);
      console.log('[CardSuccessModal] Navigation intent stored in session');
    } catch (err) {
      console.warn('[CardSuccessModal] Could not store navigation intent');
    }
    
    // 2. First close the modal properly and wait for closure to complete
    handleSafeModalClose();
    
    // 3. Add a small but critical delay before navigation to avoid timing conflicts
    setTimeout(() => {
      // Double-check our stored navigation intent before proceeding
      const storedPath = sessionStorage.getItem('intended_navigation');
      
      console.log('[CardSuccessModal] Executing navigation to:', storedPath || path);
      
      // Only clear after retrieval
      sessionStorage.removeItem('intended_navigation');
      
      // Finally perform the navigation
      navigate(storedPath || path);
    }, 100); // Slightly longer delay to ensure UI state has fully updated
  }, [navigate, handleSafeModalClose]);

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" 
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-lg w-full max-w-[525px] p-6 relative cardModalContainer"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }}
      >
        <div className="flex flex-col items-center text-center gap-2">
          <div className="rounded-full bg-green-50 p-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold">
            Open Banking Assessment Complete
          </h2>
        </div>
        
        <div className="py-5 space-y-6">
          <p className="text-center text-gray-500">
            Great job! You have successfully submitted the Open Banking (1033) Survey for <span className="font-semibold text-gray-700">{companyName}</span>
          </p>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 border rounded-md p-3 bg-slate-50">
              <FileText className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">New Download Available</p>
                <p className="text-gray-600">A complete record of your Open Banking Assessment has been generated and can be downloaded from the File Vault.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 border rounded-md p-3 bg-blue-50 border-blue-200">
              <ArrowRight className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Completed: Full Accreditation Process</p>
                <p className="text-gray-600">
                  Congratulations! You have completed all required assessments for accreditation. Visit the Insights tab to see your company's risk analysis.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between gap-4 mt-2">
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSafeNavigation('/file-vault', e);
            }}
            className="flex-1"
            type="button"
          >
            View File Vault
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSafeNavigation('/insights', e);
            }}
            className="flex-1"
            type="button"
          >
            Go to Insights
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSafeModalClose();
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
}