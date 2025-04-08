import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type FixedDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/**
 * FixedDialog - A dialog component that fixes the focus trap issues
 * This component properly releases focus and removes invisible overlays
 */
export function FixedDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className
}: FixedDialogProps) {
  // Track real open state to work around animation timing issues
  const [realOpen, setRealOpen] = useState(open);
  
  // Handle keyboard events for accessibility
  const handleKeyDown = React.useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation();
      onOpenChange(false);
    }
  }, [open, onOpenChange]);

  // Properly synchronize open state
  useEffect(() => {
    setRealOpen(open);
    
    // Clear any lingering overlay issues when component mounts or unmounts
    if (!open) {
      document.body.classList.remove("overflow-hidden", "fixed-dialog-open");
      
      // Ensure no lingering overlays
      const overlays = document.querySelectorAll('[data-radix-dialog-overlay]');
      overlays.forEach(overlay => {
        if (overlay instanceof HTMLElement) {
          overlay.style.pointerEvents = 'none';
          setTimeout(() => {
            if (overlay.parentNode) {
              overlay.parentNode.removeChild(overlay);
            }
          }, 300);
        }
      });
    } else {
      document.body.classList.add("overflow-hidden", "fixed-dialog-open");
    }
    
    // Add keyboard handlers
    document.addEventListener('keydown', handleKeyDown);
    
    // Clean up function 
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove("overflow-hidden", "fixed-dialog-open");
      
      // Force remove any lingering overlays on unmount
      const overlays = document.querySelectorAll('[data-radix-dialog-overlay]');
      overlays.forEach(overlay => {
        if (overlay instanceof HTMLElement && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      });
    };
  }, [open, handleKeyDown]);

  // Handle internal state changes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Delay the state change to allow animation to complete
      // but force the dialog to be non-interactive immediately
      document.body.classList.remove("overflow-hidden", "fixed-dialog-open");
      const overlays = document.querySelectorAll('[data-radix-dialog-overlay]');
      overlays.forEach(overlay => {
        if (overlay instanceof HTMLElement) {
          overlay.style.pointerEvents = 'none';
        }
      });
      
      // Small delay before actually closing it
      setTimeout(() => {
        setRealOpen(false);
        onOpenChange(false);
        
        // Force focus on body
        document.body.setAttribute('tabindex', '-1');
        document.body.focus();
        document.body.removeAttribute('tabindex');
      }, 10);
    } else {
      setRealOpen(true);
      onOpenChange(true);
      document.body.classList.add("overflow-hidden", "fixed-dialog-open");
    }
  };

  // Ensure dialog is fully removed from DOM when closed
  if (!realOpen && !open) {
    return null;
  }

  return (
    <Dialog open={realOpen} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogOverlay 
          className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          onClick={() => handleOpenChange(false)}
        />
        <DialogContent
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
            className
          )}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            handleOpenChange(false);
          }}
          onPointerDownOutside={(e) => {
            e.preventDefault();
            handleOpenChange(false);
          }}
          onInteractOutside={(e) => {
            e.preventDefault();
            handleOpenChange(false);
          }}
        >
          {(title || description) && (
            <DialogHeader>
              {title && <DialogTitle>{title}</DialogTitle>}
              {description && <DialogDescription>{description}</DialogDescription>}
            </DialogHeader>
          )}
          {children}
          <button
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            onClick={() => handleOpenChange(false)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}