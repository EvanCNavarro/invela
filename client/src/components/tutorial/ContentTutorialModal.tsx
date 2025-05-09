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
 * A modal that overlays the content area while keeping the navbar and sidebar accessible.
 * This implementation uses React's createPortal to render the modal at the document body level,
 * ensuring it works reliably across different page layouts.
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
  const [contentRect, setContentRect] = useState<DOMRect | null>(null);
  
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
  
  // Find the main content area and calculate its position
  useEffect(() => {
    const updateContentRect = () => {
      // Try to find the main content container by looking for common elements
      // Here we look for the content area (excluding sidebar and header)
      const sidebarEl = document.querySelector('nav.w-16') || 
                         document.querySelector('aside') || 
                         document.getElementById('sidebar');
                         
      const headerEl = document.querySelector('header') || 
                       document.querySelector('nav:not(.w-16)');
                       
      // Find the main content container
      // Dashboard layout is typically a flex container with min-width-0
      const contentEl = document.querySelector('.flex-1.min-w-0') || 
                        document.querySelector('main') || 
                        document.querySelector('.page-content') ||
                        document.getElementById('content') ||
                        document.body;
                        
      if (contentEl) {
        setContentRect(contentEl.getBoundingClientRect());
      }
    };
    
    // Initial calculation
    updateContentRect();
    
    // Recalculate on resize
    window.addEventListener('resize', updateContentRect);
    return () => {
      window.removeEventListener('resize', updateContentRect);
    };
  }, []);
  
  // Reset open state when a new tutorial is shown
  useEffect(() => {
    setOpen(true);
  }, [currentStep]);
  
  if (!open) return null;
  
  // Calculate main content area including offsets for sidebar and header
  const sidebarEl = document.querySelector('nav.w-16') || 
                   document.querySelector('aside') || 
                   document.getElementById('sidebar');
                   
  const headerEl = document.querySelector('header') || 
                  document.querySelector('nav:not(.w-16)');
                  
  // Get sidebar width and header height
  const sidebarWidth = sidebarEl ? sidebarEl.getBoundingClientRect().width : 0;
  const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 0;
  
  // Portal directly to body for most reliable positioning
  return createPortal(
    <div className="tutorial-modal-container">
      {/* Global styles for overlay */}
      <style jsx global>{`
        body {
          overflow: hidden;
        }
        .tutorial-overlay::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 48;
        }
        /* Add transparent areas for sidebar and header */
        .tutorial-overlay::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: ${sidebarWidth}px;
          height: 100vh;
          background: transparent;
          z-index: 49;
        }
        .tutorial-overlay-header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: ${headerHeight}px;
          background: transparent;
          z-index: 49;
        }
      `}</style>
      
      {/* Full-page overlay with transparent areas for navbar and sidebar */}
      <div className="tutorial-overlay fixed inset-0 z-40">
        {/* Transparent area for header */}
        <div className="tutorial-overlay-header"></div>
      </div>
      
      {/* Modal dialog - centered in the main content area */}
      <div 
        className="fixed z-50 w-[600px] max-w-[90%] rounded-lg border bg-background shadow-lg"
        style={{
          position: 'fixed',
          top: '50%',
          left: `${sidebarWidth + ((window.innerWidth - sidebarWidth) / 2)}px`,
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
    </div>,
    document.body
  );
}