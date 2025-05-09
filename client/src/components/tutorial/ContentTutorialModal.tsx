import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
export interface ContentTutorialModalProps {
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
 * Content Tutorial Modal Component
 * 
 * A modal that displays on top of the content without modifying the page structure.
 * This implementation preserves the page content while adding a semi-transparent overlay.
 */
export function ContentTutorialModal({
  title,
  description,
  imageUrl,
  isLoading = false,
  currentStep,
  totalSteps,
  onNext,
  onComplete,
  onClose
}: ContentTutorialModalProps) {
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
  }, [currentStep]);
  
  if (!open) return null;
  
  // Create portal directly to body
  return createPortal(
    <>
      {/* Fixed-position overlay that covers the entire viewport except sidebar */}
      <div 
        className="fixed inset-0 z-50"
        onClick={handleClose} // Close when clicking overlay background
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(3px)'
        }}
      />
      
      {/* Modal dialog - centered in the viewport */}
      <div 
        className="fixed z-[60] w-[600px] max-w-[90vw] rounded-lg border bg-background shadow-lg"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}
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
            <Button onClick={handleNext}>
              {currentStep >= totalSteps - 1 ? 'Complete' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}