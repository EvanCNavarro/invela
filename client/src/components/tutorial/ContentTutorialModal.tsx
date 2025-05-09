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
 * A modal that overlays the main content area while keeping the navbar and sidebar accessible.
 * This implementation creates a fixed-position modal with a separate content overlay.
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
  
  // Add body overflow control
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);
  
  if (!open) return null;
  
  // Create minimal overlay container directly in body
  return createPortal(
    <>
      {/* Add CSS styles for z-index management and overlay */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Force high z-index for navigation elements to keep them visible */
        nav.w-16, aside, #sidebar, .sidebar, [class*="sidebar"] {
          position: relative !important;
          z-index: 9999 !important;
        }
        
        /* Force high z-index for header elements to keep them visible */
        header, nav:not(.w-16), .navbar, .header, [class*="navbar"], [class*="header"] {
          position: relative !important;
          z-index: 9999 !important;
        }
        
        /* Ensure main content area is positioned correctly */
        main, .flex-1.min-w-0, .page-content, .content, [class*="content"] {
          position: relative !important;
        }
        
        /* Set body overflow to prevent scrolling while tutorial is active */
        body {
          overflow: hidden !important;
        }
      `}} />
      
      {/* Semi-transparent overlay for main content only */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-50"
        style={{
          // Exclude sidebar width if it exists
          left: (() => {
            const sidebarEl = document.querySelector('nav.w-16') || 
                            document.querySelector('aside') || 
                            document.querySelector('.sidebar') ||
                            document.getElementById('sidebar');
            return sidebarEl ? sidebarEl.getBoundingClientRect().width + 'px' : '0';
          })(),
          // Exclude header height if it exists
          top: (() => {
            const headerEl = document.querySelector('header') || 
                           document.querySelector('.navbar') ||
                           document.querySelector('.header') ||
                           document.querySelector('nav:not(.w-16)');
            return headerEl ? headerEl.getBoundingClientRect().height + 'px' : '0';
          })()
        }}
        onClick={handleClose} // Close when clicking on the overlay
      />
      
      {/* Modal dialog - positioned in the center of the content area */}
      <div 
        className="fixed z-[9000] w-[600px] max-w-[90vw] rounded-lg border bg-background shadow-lg"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          // Adjust left position to account for sidebar if present
          marginLeft: (() => {
            const sidebarEl = document.querySelector('nav.w-16') || 
                            document.querySelector('aside') || 
                            document.querySelector('.sidebar') ||
                            document.getElementById('sidebar');
            return sidebarEl ? (sidebarEl.getBoundingClientRect().width / 2) + 'px' : '0';
          })()
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