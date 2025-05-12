import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSidebarStore } from '@/stores/sidebar-store';
import { cn } from '@/lib/utils';
import { createTutorialLogger } from '@/lib/tutorial-logger';
import { preloadImage, isImageCached } from '@/lib/image-cache';

// Create dedicated logger for this component
const logger = createTutorialLogger('TabTutorialModal');

// Define the tutorial step interface
export interface TutorialStep {
  title: string;
  description: string;
  imagePath?: string;
  imageUrl?: string;
  bulletPoints?: string[];
  stepTitle?: string;
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
  bulletPoints?: string[];
  stepTitle?: string;
  // Props for the new global preloader system
  preloadProgress?: number;
  preloadComplete?: boolean;
}

/**
 * Tab Tutorial Modal Component
 * 
 * This reusable component renders a tutorial modal specifically for the content area
 * with a consistent UI and navigation controls, while keeping sidebar and navbar accessible.
 * 
 * The component now supports image preloading for smoother transitions between steps.
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
  onClose,
  bulletPoints = [],
  stepTitle = '',
  preloadProgress = 0,
  preloadComplete = false
}: TabTutorialModalProps) {
  const [open, setOpen] = useState(true);
  const { isExpanded } = useSidebarStore();
  
  // State for image loading management
  const [imageLoadingState, setImageLoadingState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [imageOpacity, setImageOpacity] = useState(0);
  
  // Handle skip action
  const handleClose = () => {
    setOpen(false);
    onClose();
  };
  
  // Handle next step or completion
  const handleNext = () => {
    // Reset image opacity for smooth transition
    setImageOpacity(0);
    
    if (currentStep >= totalSteps - 1) {
      onComplete();
      setOpen(false);
    } else {
      onNext();
    }
  };

  // Image loading handler
  const handleImageLoad = () => {
    logger.debug(`Image loaded successfully: ${imageUrl}`);
    setImageLoadingState('loaded');
    
    // Fade in the image
    setTimeout(() => {
      setImageOpacity(1);
    }, 50);
  };
  
  // Image error handler
  const handleImageError = () => {
    logger.error(`Failed to load image: ${imageUrl}`);
    setImageLoadingState('error');
    setImageOpacity(1); // Show error state
  };
  
  // Handle loading state for the current image
  useEffect(() => {
    if (!imageUrl) {
      setImageLoadingState('loading');
      setImageOpacity(0);
      return;
    }
    
    // Reset loading state for the current image on step change
    setImageLoadingState('loading');
    setImageOpacity(0);
    
    // Check if the image is already cached
    if (isImageCached(imageUrl)) {
      logger.debug(`Current image already cached: ${imageUrl}`);
      setImageLoadingState('loaded');
      setTimeout(() => setImageOpacity(1), 50);
    } else {
      // Let the image element handle the loading process
      logger.debug(`Waiting for image to load: ${imageUrl}`);
      // We'll let the onLoad/onError handlers manage the state
    }
  }, [imageUrl]);
  
  // Reset open state when a new tutorial is shown
  useEffect(() => {
    setOpen(true);
    
    // Log preload progress if provided
    if (preloadProgress > 0) {
      logger.debug(`Tutorial images preload progress: ${preloadProgress}%`);
    }
    
    if (preloadComplete) {
      logger.info('All tutorial images have been preloaded');
    }
  }, [preloadProgress, preloadComplete]);
  
  if (!open) return null;
  
  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "transition-all duration-300 ease-in-out",
        isExpanded ? "pl-[16rem]" : "pl-[5rem]"
      )} 
      style={{ pointerEvents: 'none' }}
    >
      {/* Semi-transparent overlay - dynamically adjusts to sidebar width */}
      <div 
        className={cn(
          "absolute top-[3.5rem] right-0 bottom-0 bg-black/20 backdrop-blur-[2px] transition-all duration-300 ease-in-out",
          isExpanded ? "left-[16rem]" : "left-[5rem]"
        )} 
        style={{ pointerEvents: 'auto' }}
      ></div>
      
      {/* Modal container with responsive width */}
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-[860px] z-50 overflow-hidden backdrop-blur-md border border-gray-200 flex flex-col"
        style={{ 
          pointerEvents: 'auto', 
          margin: '0 1.5rem',
          height: 'min(calc(100vh - 12rem), 500px)'
        }}
      >
        {/* Main content container */}
        <div className="flex flex-col h-full overflow-hidden">
          {/* Content container - side by side layout */}
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Left side: Text content */}
            <div className="px-8 py-8 flex-1 flex flex-col justify-between overflow-auto">
              {/* Header with chip-style step title */}
              <div>
                {/* Title header with chip-style design */}
                <div className="mb-5">
                  <div className="inline-flex px-3 py-1 text-sm font-medium bg-primary/10 text-primary rounded-full">
                    {title}
                  </div>
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900">{stepTitle}</h2>
                
                {/* Bullet points only - no duplicate descriptive text */}
                <div className="mt-6 space-y-3">
                  {bulletPoints && bulletPoints.length > 0 ? (
                    bulletPoints.map((point, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="mt-1 h-5 w-5 text-primary flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <p className="text-base text-gray-700">
                          {point}
                        </p>
                      </div>
                    ))
                  ) : (
                    // Create bullet points from description if none provided
                    description.split('. ').filter(s => s.trim()).map((sentence, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="mt-1 h-5 w-5 text-primary flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <p className="text-base text-gray-700">
                          {sentence}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            
            {/* Right side: Image container - more square-shaped */}
            <div className="hidden md:block bg-blue-50/30 relative md:w-[45%] max-w-[450px] flex-shrink-0 border-l border-slate-100">
              {/* Enhanced image loading with smooth transitions */}
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Always show skeleton during initial load */}
                {(isLoading || imageLoadingState === 'loading') && (
                  <Skeleton className="w-[90%] aspect-square rounded-lg mx-auto" />
                )}
                
                {/* Image with transition */}
                {imageUrl && (
                  <div 
                    className={`absolute inset-0 flex items-center justify-center p-6 transition-opacity duration-300 ease-in-out`}
                    style={{ opacity: imageOpacity }}
                  >
                    <div className="relative w-full aspect-square flex items-center justify-center">
                      <div className="absolute inset-0 bg-blue-50/50 rounded-lg transform rotate-1"></div>
                      <div className="absolute inset-0 bg-blue-100/20 rounded-lg transform -rotate-1"></div>
                      <img 
                        src={imageUrl} 
                        alt={stepTitle || title} 
                        className="relative max-w-[95%] max-h-[95%] object-contain rounded-lg shadow-md border border-blue-100/50 z-10" 
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                      />
                    </div>
                  </div>
                )}
                
                {/* Error state */}
                {imageLoadingState === 'error' && !isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center p-5">
                    <div className="w-full aspect-square rounded-lg bg-red-50 flex flex-col items-center justify-center text-red-500 p-4">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <p className="mt-2 text-center">Image could not be loaded</p>
                    </div>
                  </div>
                )}
                
                {/* No image available state */}
                {!imageUrl && !isLoading && imageLoadingState !== 'error' && (
                  <div className="absolute inset-0 flex items-center justify-center p-5">
                    <div className="w-full aspect-square rounded-lg bg-muted/30 flex items-center justify-center text-muted-foreground">
                      No image available
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer with progress indicator and controls */}
        <div className="p-5 flex flex-row justify-between items-center border-t border-gray-100 bg-white/80 w-full">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-24 md:w-32 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-in-out" 
                style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              ></div>
            </div>
            <span className="text-gray-600 text-xs md:text-sm font-medium whitespace-nowrap">
              Step {currentStep + 1} of {totalSteps}
            </span>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="ghost" 
              onClick={handleClose}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              Skip
            </Button>
            {onBack && currentStep > 0 && (
              <Button 
                variant="outline" 
                onClick={onBack}
                className="text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                Back
              </Button>
            )}
            <Button 
              onClick={handleNext} 
              className="min-w-[80px] px-5 shadow-sm"
            >
              {currentStep >= totalSteps - 1 ? 'Complete' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}