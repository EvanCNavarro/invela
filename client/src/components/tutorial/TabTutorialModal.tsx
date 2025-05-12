import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSidebarStore } from '@/stores/sidebar-store';
import { cn } from '@/lib/utils';
import { createTutorialLogger } from '@/lib/tutorial-logger';
import { preloadImage, isImageCached, preloadTutorialImages, getCacheStats } from '@/lib/image-cache';
import { useTutorialImageCache } from '@/hooks/use-tutorial-image-cache';
import { AnimatePresence, motion } from 'framer-motion';

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

// Define props interface - simplified version
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
}

/**
 * Tab Tutorial Modal Component
 * 
 * This reusable component renders a tutorial modal specifically for the content area
 * with a consistent UI and navigation controls, while keeping sidebar and navbar accessible.
 * 
 * The component now supports advanced image caching for smoother transitions between steps.
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
  stepTitle = ''
}: TabTutorialModalProps) {
  const [open, setOpen] = useState(true);
  const { isExpanded } = useSidebarStore();
  
  // Use a ref to track previous step for determining animation direction
  const prevStepRef = useRef(currentStep);
  
  // Calculate animation direction (1 for forward, -1 for backward)
  const animationDirection = useMemo(() => {
    const direction = currentStep >= prevStepRef.current ? 1 : -1;
    prevStepRef.current = currentStep;
    return direction;
  }, [currentStep]);
  
  // Extract tab name from image URL for preloading adjacent images
  const tabName = useMemo(() => {
    if (!imageUrl) return '';
    
    // Parse the tab name from URL patterns like /assets/tutorials/tab-name/image.png
    const match = imageUrl.match(/\/assets\/tutorials\/([^\/]+)\//);
    return match ? match[1] : '';
  }, [imageUrl]);
  
  // Use our enhanced image caching hook
  const { 
    isLoading: isImageLoading, 
    cachePerformance 
  } = useTutorialImageCache({
    tabName,
    currentStep,
    totalSteps,
    imageUrl
  });
  
  // State for image loading management
  const [imageLoadingState, setImageLoadingState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [imageOpacity, setImageOpacity] = useState(0);
  
  // Handle skip action
  const handleClose = () => {
    setOpen(false);
    // Restore body scrolling
    document.body.style.overflow = 'auto';
    onClose();
  };
  
  // Handle next step or completion
  const handleNext = () => {
    // Reset image opacity for smooth transition
    setImageOpacity(0);
    
    // Preload next step's image ahead of time
    if (currentStep < totalSteps - 1 && tabName) {
      const nextImageUrl = `/assets/tutorials/${tabName}/modal_risk_${currentStep + 2}.png`;
      logger.debug(`Preloading next step image: ${nextImageUrl}`);
      preloadImage(nextImageUrl);
    }
    
    if (currentStep >= totalSteps - 1) {
      onComplete();
      setOpen(false);
      // Restore body scrolling when tutorial is completed
      document.body.style.overflow = 'auto';
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
  
  // Preload adjacent tutorial images for smoother navigation
  useEffect(() => {
    if (tabName && currentStep >= 0 && totalSteps > 0) {
      // Use the dedicated preloading function
      preloadTutorialImages(tabName, currentStep, totalSteps);
      
      // Log cache statistics for debugging
      logger.debug('Current image cache stats:', getCacheStats());
    }
  }, [tabName, currentStep, totalSteps]);
  
  // Reset open state and track progress when a new tutorial is shown
  useEffect(() => {
    setOpen(true);
    
    // Disable body scrolling when modal is open
    document.body.style.overflow = 'hidden';
    
    // Re-enable scrolling when component unmounts or modal is closed
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);
  
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
              <AnimatePresence mode="wait">
                <motion.div
                  key={`content-${currentStep}`}
                  initial={{ 
                    opacity: 0, 
                    x: animationDirection * 30 
                  }}
                  animate={{ 
                    opacity: 1, 
                    x: 0 
                  }}
                  exit={{ 
                    opacity: 0, 
                    x: animationDirection * -30 
                  }}
                  transition={{ 
                    duration: 0.4, 
                    ease: [0.22, 1, 0.36, 1],
                    staggerChildren: 0.1,
                  }}
                >
                  {/* Title header with chip-style design */}
                  <motion.div 
                    className="mb-5"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="inline-flex px-3 py-1 text-sm font-medium bg-primary/10 text-primary rounded-full">
                      {title}
                    </div>
                  </motion.div>
                  
                  <motion.h2 
                    className="text-2xl font-bold text-gray-900 mb-2"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {stepTitle}
                  </motion.h2>
                  
                  {/* Bullet points with staggered animation */}
                  <motion.div 
                    className="mt-8 space-y-5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {bulletPoints && bulletPoints.length > 0 ? (
                      bulletPoints.map((point, index) => (
                        <motion.div 
                          key={index} 
                          className="flex items-start space-x-3"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + (index * 0.1) }}
                        >
                          <div className="mt-1 h-6 w-6 text-primary flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                          <p className="text-lg font-medium text-gray-700">
                            {point}
                          </p>
                        </motion.div>
                      ))
                    ) : (
                      // Create bullet points from description if none provided
                      description.split('. ').filter(s => s.trim()).map((sentence, index) => (
                        <motion.div 
                          key={index} 
                          className="flex items-start space-x-3"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + (index * 0.1) }}
                        >
                          <div className="mt-1 h-6 w-6 text-primary flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                          <p className="text-lg font-medium text-gray-700">
                            {sentence}
                          </p>
                        </motion.div>
                      ))
                    )}
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>
            
            {/* Right side: Image container - more square-shaped */}
            <div className="hidden md:block bg-blue-50/30 relative md:w-[45%] max-w-[450px] flex-shrink-0 border-l border-slate-100">
              {/* Enhanced image loading with smooth transitions */}
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Always show skeleton during initial load */}
                {(isLoading || imageLoadingState === 'loading') && (
                  <motion.div
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: 1 }}
                    transition={{ 
                      duration: 0.8, 
                      repeat: Infinity, 
                      repeatType: "reverse" 
                    }}
                  >
                    <Skeleton className="w-[90%] aspect-square rounded-lg mx-auto" />
                  </motion.div>
                )}
                
                {/* Image with animation */}
                {imageUrl && (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`image-${currentStep}`}
                      initial={{ 
                        opacity: 0,
                        scale: 0.95,
                        y: animationDirection * 10 
                      }}
                      animate={{ 
                        opacity: imageOpacity,
                        scale: 1,
                        y: 0
                      }}
                      exit={{ 
                        opacity: 0,
                        scale: 0.95,
                        y: animationDirection * -10
                      }}
                      transition={{ 
                        duration: 0.5,
                        ease: [0.22, 1, 0.36, 1]
                      }}
                      className="absolute inset-0 flex items-center justify-center p-6"
                    >
                      <motion.div 
                        className="relative w-full aspect-square flex items-center justify-center"
                        initial={{ rotate: animationDirection * -1 }}
                        animate={{ rotate: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      >
                        <motion.div 
                          className="absolute inset-0 bg-blue-50/50 rounded-lg"
                          initial={{ rotate: animationDirection * 2 }}
                          animate={{ rotate: 1 }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                        <motion.div 
                          className="absolute inset-0 bg-blue-100/20 rounded-lg"
                          initial={{ rotate: animationDirection * -2 }}
                          animate={{ rotate: -1 }}
                          transition={{ duration: 0.7, ease: "easeOut" }}
                        />
                        <img 
                          src={imageUrl} 
                          alt={stepTitle || title} 
                          className="relative max-w-[95%] max-h-[95%] object-contain rounded-lg shadow-md border border-blue-100/50 z-10" 
                          onLoad={handleImageLoad}
                          onError={handleImageError}
                        />
                      </motion.div>
                    </motion.div>
                  </AnimatePresence>
                )}
                
                {/* Error state */}
                {imageLoadingState === 'error' && !isLoading && (
                  <motion.div 
                    className="absolute inset-0 flex items-center justify-center p-5"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div 
                      className="w-full aspect-square rounded-lg bg-red-50 flex flex-col items-center justify-center text-red-500 p-4"
                      initial={{ y: 10 }}
                      animate={{ y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    >
                      <motion.svg 
                        width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                      >
                        <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </motion.svg>
                      <motion.p 
                        className="mt-2 text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.3 }}
                      >
                        Image could not be loaded
                      </motion.p>
                    </motion.div>
                  </motion.div>
                )}
                
                {/* No image available state */}
                {!imageUrl && !isLoading && imageLoadingState !== 'error' && (
                  <motion.div 
                    className="absolute inset-0 flex items-center justify-center p-5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div 
                      className="w-full aspect-square rounded-lg bg-muted/30 flex items-center justify-center text-muted-foreground"
                      initial={{ y: 10 }}
                      animate={{ y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    >
                      No image available
                    </motion.div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer with progress indicator and controls */}
        <motion.div 
          className="p-5 flex flex-row justify-between items-center border-t border-gray-100 bg-white/80 w-full"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-24 md:w-32 bg-gray-200 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary" 
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                transition={{ 
                  duration: 0.5, 
                  ease: "easeOut",
                  delay: 0.1
                }}
              />
            </div>
            <motion.span 
              className="text-gray-600 text-xs md:text-sm font-medium whitespace-nowrap"
              key={`step-counter-${currentStep}`}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              Step {currentStep + 1} of {totalSteps}
            </motion.span>
          </div>
          <div className="flex gap-3">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <Button 
                variant="ghost" 
                onClick={handleClose}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                Skip
              </Button>
            </motion.div>
            
            <AnimatePresence mode="wait">
              {onBack && currentStep > 0 && (
                <motion.div
                  key="back-button"
                  initial={{ opacity: 0, x: -10, width: 0 }}
                  animate={{ opacity: 1, x: 0, width: 'auto' }}
                  exit={{ opacity: 0, x: -10, width: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Button 
                    variant="outline" 
                    onClick={onBack}
                    className="text-gray-700 border-gray-300 hover:bg-gray-50"
                  >
                    Back
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            
            <motion.div
              key={`next-button-${currentStep}`}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2, delay: 0.4 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                onClick={handleNext} 
                className="min-w-[80px] px-5 shadow-sm"
              >
                {currentStep >= totalSteps - 1 ? 'Complete' : 'Next'}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}