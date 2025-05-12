import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSidebarStore } from '@/stores/sidebar-store';
import { cn } from '@/lib/utils';

// Define the tutorial step interface
export interface TutorialStep {
  title: string;
  description: string;
  imagePath?: string;
  imageUrl?: string;
}

// Define props interface
export interface TabTutorialModalProps {
  title: string;
  description: string;
  imageUrl?: string;
  isLoading?: boolean;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack?: () => void;
  onComplete: () => void;
  onClose: () => void;
}

/**
 * Tab Tutorial Modal Component
 * 
 * This reusable component renders a tutorial modal specifically for the content area
 * with a consistent UI and navigation controls, while keeping sidebar and navbar accessible.
 */
export function TabTutorialModal({
  title,
  description,
  imageUrl,
  isLoading = false,
  currentStep,
  totalSteps,
  onNext,
  onBack,
  onComplete,
  onClose
}: TabTutorialModalProps) {
  const [open, setOpen] = useState(true);
  const { isExpanded } = useSidebarStore();
  
  // Handle skip action
  const handleClose = () => {
    setOpen(false);
    onClose();
  };
  
  // Handle next step or completion
  const handleNext = () => {
    if (currentStep >= totalSteps - 1) {
      // This is the last step - mark as complete before closing
      // We need to call onComplete first to ensure the state is updated
      // in both local cache and server before closing the modal
      onComplete();
      
      // Add a small delay before closing to ensure state updates are processed
      // This prevents the state mismatch between UI and persistence layer
      setTimeout(() => {
        setOpen(false);
      }, 100);
    } else {
      // Normal progression to next step
      onNext();
    }
  };
  
  // Reset open state when a new tutorial is shown
  useEffect(() => {
    setOpen(true);
  }, []);
  
  // ROOT CAUSE FIX: Add critical early returns to prevent tutorial modal from showing
  // when it shouldn't, specifically for final steps or edge cases
  
  // If the modal is closed, don't render anything
  if (!open) return null;
  
  // FIXED IMPLEMENTATION: Only prevent render of FINAL step when marked completed
  // This prevents the 4/4 modal flash issue without blocking ALL tutorials
  const isLastStep = currentStep >= totalSteps - 1;
  
  // ADDITIONAL DEBUG LOGGING FOR TUTORIAL DISPLAY
  console.log(`[TabTutorialModal] Rendering modal with currentStep=${currentStep}, totalSteps=${totalSteps}, isLastStep=${isLastStep}`, {
    title,
    description: description.substring(0, 30) + '...',
    imageUrl: imageUrl?.substring(0, 30) + '...',
  });
  
  // If this is the last step of the tutorial, we should automatically mark as complete
  // but CONTINUE to render it (unlike our previous implementation)
  if (isLastStep) {
    console.log(`[TabTutorialModal] At final step - will mark as complete shortly but WILL STILL RENDER`);
    // If it's the final step, simply ensure completion is tracked
    // This helps ensure consistent state
    setTimeout(() => {
      // Only call complete if we're at the end
      if (currentStep >= totalSteps - 1) {
        console.log(`[TabTutorialModal] Marking tutorial as complete via onComplete()`);
        onComplete();
      }
    }, 0);
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none" style={{ pointerEvents: 'none' }}>
      {/* Content-only overlay - dynamically adjusts to sidebar width */}
      <div 
        className={cn(
          "absolute top-[3.5rem] right-0 bottom-0 bg-black/20 transition-all duration-300 ease-in-out",
          isExpanded ? "left-[16rem]" : "left-[5rem]"
        )} 
        style={{ pointerEvents: 'auto' }}
      ></div>
      
      {/* Modal container */}
      <div 
        className="bg-white rounded-lg shadow-xl w-[600px] z-50 overflow-hidden"
        style={{ pointerEvents: 'auto' }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-0">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="text-base mt-2 text-muted-foreground">
            {description}
          </p>
        </div>
        
        {/* Image area with loading state */}
        <div className="p-6 flex justify-center items-center bg-muted/20">
          {isLoading ? (
            <Skeleton className="w-full h-64 rounded-lg" />
          ) : imageUrl ? (
            <img 
              src={imageUrl} 
              alt={title} 
              className="max-h-64 rounded-lg object-contain" 
            />
          ) : (
            <div className="w-full h-64 rounded-lg bg-muted/30 flex items-center justify-center text-muted-foreground">
              No image available
            </div>
          )}
        </div>
        
        {/* Footer with progress indicator and controls */}
        <div className="p-6 flex flex-row justify-between items-center border-t">
          <div className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {totalSteps}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Skip
            </Button>
            {onBack && currentStep > 0 && (
              <Button variant="outline" onClick={onBack}>
                Back
              </Button>
            )}
            <Button onClick={handleNext}>
              {currentStep >= totalSteps - 1 ? 'Complete' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}