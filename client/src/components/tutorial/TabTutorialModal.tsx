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
  
  if (!open) return null;
  
  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center pointer-events-none",
        "transition-all duration-300 ease-in-out",
        isExpanded ? "pl-[16rem]" : "pl-[5rem]"
      )} 
      style={{ pointerEvents: 'none' }}
    >
      {/* Content-only overlay - dynamically adjusts to sidebar width */}
      <div 
        className={cn(
          "absolute top-[3.5rem] right-0 bottom-0 bg-black/15 backdrop-blur-sm transition-all duration-300 ease-in-out",
          isExpanded ? "left-[16rem]" : "left-[5rem]"
        )} 
        style={{ pointerEvents: 'auto' }}
      ></div>
      
      {/* Modal container with responsive width */}
      <div 
        className="bg-white/95 rounded-lg shadow-xl w-full max-w-[900px] z-50 overflow-hidden backdrop-blur-md border border-slate-200"
        style={{ 
          pointerEvents: 'auto', 
          margin: '0 1rem',
          maxHeight: 'calc(100vh - 7rem)'
        }}
      >
        {/* Main content container */}
        <div className="flex flex-col max-h-[calc(100vh-7rem-64px)] overflow-auto">
          {/* Content container - side by side layout */}
          <div className="flex flex-col md:flex-row">
            {/* Left side: Text content */}
            <div className="px-6 py-6 md:py-8 flex-1 flex flex-col">
              {/* Header */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                <p className="text-base mt-4 text-gray-600 leading-relaxed max-w-xl">
                  {description}
                </p>
              </div>
              
              {/* Placeholder lines to mimic the image shown */}
              <div className="mt-8 mb-4 md:mb-0 hidden md:block">
                <div className="h-3 bg-gray-200 rounded-full w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded-full w-5/6 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded-full w-2/3"></div>
              </div>
            </div>
            
            {/* Right side: Image - hidden on small screens */}
            <div className="hidden md:flex bg-blue-50/50 p-6 justify-center items-center lg:min-w-[350px] lg:max-w-[450px] md:w-[45%] md:flex-shrink-0">
              {isLoading ? (
                <Skeleton className="w-full h-64 rounded-lg shadow-sm" />
              ) : imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt={title} 
                  className="w-full max-h-80 rounded-lg object-contain shadow-md transition-all duration-300 hover:scale-[1.02]" 
                />
              ) : (
                <div className="w-full h-64 rounded-lg bg-muted/30 flex items-center justify-center text-muted-foreground shadow-sm">
                  No image available
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer with progress indicator and controls - fixed to bottom */}
        <div className="p-4 md:p-6 flex flex-row justify-between items-center border-t bg-slate-50/50 sticky bottom-0 w-full">
          <div className="text-sm font-medium flex items-center gap-2">
            <div className="h-1.5 w-20 md:w-32 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-in-out" 
                style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              ></div>
            </div>
            <span className="text-muted-foreground text-xs md:text-sm">Step {currentStep + 1} of {totalSteps}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleClose} className="text-xs md:text-sm py-1 px-2 md:py-2 md:px-3">
              Skip
            </Button>
            {onBack && currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={onBack} className="text-xs md:text-sm py-1 px-2 md:py-2 md:px-3">
                Back
              </Button>
            )}
            <Button size="sm" onClick={handleNext} className="min-w-[60px] md:min-w-[80px] text-xs md:text-sm py-1 px-2 md:py-2 md:px-3">
              {currentStep >= totalSteps - 1 ? 'Complete' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}