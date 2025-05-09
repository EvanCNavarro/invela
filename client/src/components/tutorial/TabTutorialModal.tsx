import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

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
  onComplete: () => void;
  onClose: () => void;
}

/**
 * Tab Tutorial Modal Component
 * 
 * This reusable component renders a tutorial modal for any tab
 * with a consistent UI and navigation controls.
 */
export function TabTutorialModal({
  title,
  description,
  imageUrl,
  isLoading = false,
  currentStep,
  totalSteps,
  onNext,
  onComplete,
  onClose
}: TabTutorialModalProps) {
  const [open, setOpen] = useState(true);
  
  // Handle dialog close
  const handleClose = () => {
    setOpen(false);
    onClose();
  };
  
  // Handle next step or completion
  const handleNext = () => {
    if (currentStep >= totalSteps - 1) {
      onComplete();
      setOpen(false);
    } else {
      onNext();
    }
  };
  
  // Reset open state when a new tutorial is shown
  useEffect(() => {
    setOpen(true);
  }, []);
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent 
        className="sm:max-w-[600px] p-0 overflow-hidden"
        onInteractOutside={(e) => {
          // Prevent closing on outside click to ensure users complete the tutorial
          e.preventDefault();
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-2xl">{title}</DialogTitle>
          <DialogDescription className="text-base mt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        
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
        <DialogFooter className="p-6 flex flex-row justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {totalSteps}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Skip
            </Button>
            <Button onClick={handleNext}>
              {currentStep >= totalSteps - 1 ? 'Complete' : 'Next'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}