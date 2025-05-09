import React, { useState, useEffect, useRef } from 'react';
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
 * A simplified modal that only overlays the content area, keeping the navbar and sidebar accessible.
 * This component uses React Portal and positions itself relative to the main content area.
 * 
 * KISS Approach:
 * - Uses a simple div structure instead of complex Dialog component
 * - Calculates position based on DOM elements
 * - Uses React Portal for clean DOM placement
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
  const [modalPosition, setModalPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    height: 0
  });
  const overlayRef = useRef<HTMLDivElement>(null);
  
  // Find the content container element
  const getContentElement = (): HTMLElement | null => {
    // Try to find the content area by common selectors
    return (
      document.querySelector('.main-content-container') ||
      document.querySelector('main') ||
      document.getElementById('content') ||
      document.querySelector('.page-wrapper') ||
      // Fallback to body if no content container found
      document.body
    ) as HTMLElement;
  };
  
  // Calculate the position of the modal relative to the content
  const calculatePosition = () => {
    const contentEl = getContentElement();
    if (!contentEl) return;
    
    // Get the sidebar and navbar elements
    const sidebar = document.querySelector('aside') || document.getElementById('sidebar');
    const navbar = document.querySelector('nav') || document.querySelector('header');
    
    // Get the content position
    const contentRect = contentEl.getBoundingClientRect();
    
    // Calculate the position for the overlay
    const position = {
      top: navbar ? navbar.getBoundingClientRect().height : 0,
      left: sidebar ? sidebar.getBoundingClientRect().width : 0,
      width: contentRect.width,
      height: contentRect.height - (navbar ? navbar.getBoundingClientRect().height : 0)
    };
    
    setModalPosition(position);
  };
  
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
  
  // Calculate position on mount and window resize
  useEffect(() => {
    calculatePosition();
    
    const handleResize = () => {
      calculatePosition();
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Reset open state when a new tutorial is shown
  useEffect(() => {
    setOpen(true);
  }, [currentStep]);
  
  if (!open) return null;
  
  // Get the content element to portal into
  const contentEl = getContentElement();
  if (!contentEl) return null;
  
  // Create a portal to render the modal inside the content element
  return createPortal(
    <>
      {/* Semi-transparent overlay only for the content area */}
      <div
        ref={overlayRef}
        className="absolute z-50 bg-black/50"
        style={{
          position: 'absolute',
          top: `${modalPosition.top}px`,
          left: `${modalPosition.left}px`,
          width: `${modalPosition.width}px`,
          height: `${modalPosition.height}px`,
          backdropFilter: 'blur(4px)',
        }}
      />
      
      {/* Modal dialog */}
      <div 
        className="fixed z-50 w-[600px] max-w-[90%] rounded-lg border bg-background shadow-lg"
        style={{
          position: 'fixed',
          top: '50%',
          left: `${(modalPosition.left + modalPosition.width / 2)}px`,
          transform: 'translate(-50%, -50%)',
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
    contentEl
  );
}