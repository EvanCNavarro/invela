import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// Class to be applied to body when modal is open
// Using Tailwind's overflow-hidden class
const NO_SCROLL_CLASS = 'overflow-hidden';

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
  onBack?: () => void;  // New prop for going back to previous step
  onComplete: () => void;
  onClose: () => void;
}

/**
 * Content Tutorial Modal Component
 * 
 * A modal that overlays only the main content area while keeping
 * navbar and sidebar visible and accessible.
 * 
 * Handles responsive sidebar states (expanded/collapsed) by using a
 * resize observer to track layout changes.
 */
export function ContentTutorialModal({
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
}: ContentTutorialModalProps) {
  const [open, setOpen] = useState(true);
  const [overlayStyles, setOverlayStyles] = useState({
    top: '0',
    left: '0',
    right: '0',
    bottom: '0'
  });
  
  // Keep references to sidebar and navbar elements
  const sidebarRef = useRef<Element | null>(null);
  const navbarRef = useRef<Element | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  
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
  
  // Calculate overlay position based on current sidebar and navbar dimensions
  const updateOverlayPosition = () => {
    // Get current dimensions
    const sidebarWidth = sidebarRef.current ? sidebarRef.current.getBoundingClientRect().width : 0;
    const navbarHeight = navbarRef.current ? navbarRef.current.getBoundingClientRect().height : 0;
    
    // Update styles
    setOverlayStyles({
      top: `${navbarHeight}px`,
      left: `${sidebarWidth}px`,
      right: '0',
      bottom: '0'
    });
  };
  
  // Find elements and set up observers
  useEffect(() => {
    // Find navbar and sidebar elements
    sidebarRef.current = document.querySelector('nav.w-16') || 
                         document.querySelector('aside') || 
                         document.querySelector('.sidebar') ||
                         document.getElementById('sidebar');
    
    navbarRef.current = document.querySelector('header') || 
                        document.querySelector('.navbar') ||
                        document.querySelector('.header') ||
                        document.querySelector('nav:not(.w-16)');
    
    // Do initial position calculation
    updateOverlayPosition();
    
    // Set up resize observer for layout changes
    resizeObserverRef.current = new ResizeObserver((entries) => {
      // Update positions when any observed element changes size
      updateOverlayPosition();
    });
    
    // Observe both sidebar and navbar if they exist
    if (sidebarRef.current) {
      resizeObserverRef.current.observe(sidebarRef.current);
    }
    
    if (navbarRef.current) {
      resizeObserverRef.current.observe(navbarRef.current);
    }
    
    // Also observe window resize events
    window.addEventListener('resize', updateOverlayPosition);
    
    // Clean up
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      window.removeEventListener('resize', updateOverlayPosition);
    };
  }, []);
  
  // Watch for DOM mutations (sidebar expanding/collapsing)
  useEffect(() => {
    // Create mutation observer to watch for class changes and DOM structure changes
    const mutationObserver = new MutationObserver((mutations) => {
      let needsUpdate = false;
      
      for (const mutation of mutations) {
        // If attributes changed (like classes for expanded/collapsed states)
        if (mutation.type === 'attributes' || 
            mutation.type === 'childList' || 
            mutation.attributeName === 'class') {
          needsUpdate = true;
          break;
        }
      }
      
      if (needsUpdate) {
        // Handle new sidebar element if it changed
        sidebarRef.current = document.querySelector('nav.w-16') || 
                             document.querySelector('aside') || 
                             document.querySelector('.sidebar') ||
                             document.getElementById('sidebar');
        
        updateOverlayPosition();
      }
    });
    
    // Observe document body for any significant DOM changes
    mutationObserver.observe(document.body, { 
      attributes: true, 
      childList: true, 
      subtree: true,
      attributeFilter: ['class', 'style']
    });
    
    return () => {
      mutationObserver.disconnect();
    };
  }, []);
  
  // Reset open state when a new tutorial is shown
  useEffect(() => {
    setOpen(true);
  }, [currentStep]);
  
  // Disable scrolling when modal is open
  useEffect(() => {
    if (open) {
      // Disable scrolling on body when modal is open
      document.body.classList.add(NO_SCROLL_CLASS);
      
      // Make sure navbar is fixed (if it isn't already)
      if (navbarRef.current) {
        // Save current styles to restore later
        const currentPosition = window.getComputedStyle(navbarRef.current).position;
        
        // Only change if not already fixed
        if (currentPosition !== 'fixed') {
          navbarRef.current.setAttribute('data-previous-position', currentPosition);
          (navbarRef.current as HTMLElement).style.position = 'fixed';
          (navbarRef.current as HTMLElement).style.top = '0';
          (navbarRef.current as HTMLElement).style.width = '100%';
          (navbarRef.current as HTMLElement).style.zIndex = '40';
        }
      }
    }
    
    // Cleanup function to re-enable scrolling when the modal closes
    return () => {
      // Always remove the class on cleanup, regardless of open state
      document.body.classList.remove(NO_SCROLL_CLASS);
      
      // Restore navbar position if needed
      if (navbarRef.current) {
        const previousPosition = navbarRef.current.getAttribute('data-previous-position');
        if (previousPosition) {
          (navbarRef.current as HTMLElement).style.position = previousPosition;
          navbarRef.current.removeAttribute('data-previous-position');
        }
      }
    };
  }, [open]);
  
  if (!open) return null;
  
  // Create portal directly to body
  return createPortal(
    <>
      {/* Position the overlay to cover only the content area */}
      <div 
        className="fixed z-50"
        onClick={handleClose} // Close when clicking overlay background
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(3px)',
          ...overlayStyles
        }}
      />
      
      {/* Modal dialog - centered in the content area */}
      <div 
        className="fixed z-[60] w-[600px] max-w-[80vw] rounded-lg border bg-background shadow-lg"
        style={{
          top: `calc(${overlayStyles.top} + ((100vh - ${overlayStyles.top}) / 2))`,
          left: `calc(${overlayStyles.left} + ((100vw - ${overlayStyles.left}) / 2))`,
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
            {/* Display step numbers starting from 1 for user-friendly numbering */}
            Step {currentStep + 1} of {totalSteps}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Skip
            </Button>
            {currentStep > 0 && onBack && (
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
    </>,
    document.body
  );
}