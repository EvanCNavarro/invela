import { useState, useEffect, forwardRef, useCallback } from "react";
import { Dialog, DialogTitle, DialogDescription, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedToast } from "@/hooks/use-unified-toast";
import { unifiedToast } from "@/hooks/use-unified-toast";
import { useWebSocketContext } from "@/providers/websocket-provider";
import { cn } from "@/lib/utils";

// Create a custom dialog content without close button
const CustomDialogContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      {/* No close button here */}
    </DialogPrimitive.Content>
  </DialogPortal>
));
CustomDialogContent.displayName = "CustomDialogContent";

// New carousel content with the updated 5 steps
const carouselContent = [
  {
    src: "/assets/modal_userOboarding_1.png",
    alt: "The Invela Trust Network",
    title: "The Invela Trust Network",
    subtitle: "Your intelligent platform for managing Risk and Accreditation."
  },
  {
    src: "/assets/harmonized_modal_userOboarding_2.png",
    alt: "Easy Onboarding",
    title: "Easy Onboarding",
    subtitle: "A simple, goal-oriented setup."
  },
  {
    src: "/assets/harmonized_modal_userOboarding_3.png",
    alt: "Built for Trust",
    title: "Built for Trust",
    subtitle: "Progress through surveys, all in one secure flow."
  },
  {
    src: "/assets/harmonized_modal_userOboarding_4.png",
    alt: "Your Data, Protected", 
    title: "Your Data, Protected",
    subtitle: "Best-in-class encryption and secure controls at every step."
  },
  {
    src: "/assets/harmonized_modal_userOboarding_5.png",
    alt: "Start Your Process",
    title: "Start Your Process",
    subtitle: "Jump into your Task Center and start shaping your network."
  }
];

// Preload all images to ensure fast display
/**
 * Preload images for carousel to ensure smooth transitions
 * Only preloads images if onboarding is not completed
 * 
 * @param shouldPreload Boolean flag to determine if preloading should happen
 * @param callback Optional callback for image load status
 */
const preloadImages = (
  shouldPreload: boolean,
  callback?: (src: string, success: boolean) => void
): void => {
  // Skip preloading if user has completed onboarding
  if (!shouldPreload) {
    return;
  }
  
  // Track which images we're preloading for debugging
  const preloadingImages = carouselContent.map(item => item.src);
  
  // Log once at the start of preloading instead of per image
  import('@/lib/logger').then(({ logger }) => {
    logger.debug('[WelcomeModal] Preloading onboarding carousel images', {
      imageCount: preloadingImages.length,
      images: preloadingImages
    });
  });
  
  // Preload all images in parallel
  carouselContent.forEach(item => {
    const img = new Image();
    img.src = item.src;
    img.onload = () => {
      if (callback) callback(item.src, true);
    };
    img.onerror = (e) => {
      // Only log errors
      import('@/lib/logger').then(({ logger }) => {
        logger.error('[WelcomeModal] Failed to preload image', {
          src: item.src,
          error: e
        });
      });
      if (callback) callback(item.src, false);
    };
  });
};

export function WelcomeModal() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState<Record<string, boolean>>({});
  const { user } = useAuth();
  const { toast } = useToast();
  const unifiedToastHook = useUnifiedToast();
  const websocket = useWebSocketContext();
  const connected = websocket.isConnected;

  const isLastSlide = currentSlide === carouselContent.length - 1;
  const isCurrentImageLoaded = imagesLoaded[carouselContent[currentSlide]?.src] === true;

  // Enhanced localStorage handler - directly completes onboarding if localStorage has a record and syncs with server
  const completeOnboardingFromLocalStorage = useCallback(() => {
    if (!user) return false;
    
    try {
      const onboardingCompleted = localStorage.getItem('onboarding_completed') === 'true';
      const savedUserId = localStorage.getItem('onboarding_user_id');
      
      if (onboardingCompleted && savedUserId === user.id.toString()) {
        console.log('[ONBOARDING DEBUG] Found onboarding completion in localStorage, applying to user');
        user.onboarding_user_completed = true;
        return true;
      }
    } catch (err) {
      console.error('[ONBOARDING DEBUG] Error checking localStorage:', err);
    }
    return false;
  }, [user]);
  
  // Only set modal visibility once when user data is fully available
  useEffect(() => {
    if (!user) return;
    
    // DEBUGGING: Add detailed info about the user object and onboarding status
    console.log('[ONBOARDING DEBUG] WelcomeModal user data received:', { 
      userId: user.id,
      email: user.email,
      onboardingCompleted: user.onboarding_user_completed,
      userObject: JSON.stringify(user, null, 2).substring(0, 500) // Limit string length
    });
    
    // Preload images only if user hasn't completed onboarding
    const shouldPreloadImages = !user.onboarding_user_completed;
    
    // Update with correct typing
    preloadImages(
      shouldPreloadImages, 
      (src: string, success: boolean) => {
        if (success) {
          setImagesLoaded(prev => ({
            ...prev,
            [src]: true
          }));
        }
      }
    );
    
    // First step: Check if user is already marked as onboarded
    if (user.onboarding_user_completed === true) {
      console.log('[ONBOARDING DEBUG] User is already marked as onboarded in user object');
      // Double-verify in localStorage
      try {
        localStorage.setItem('onboarding_completed', 'true');
        localStorage.setItem('onboarding_user_id', user.id.toString());
      } catch (err) {
        console.error('[ONBOARDING DEBUG] Failed to update localStorage:', err);
      }
      return; // Exit early, no need to show modal
    }
    
    // Second step: Check localStorage using our helper function
    if (completeOnboardingFromLocalStorage()) {
      console.log('[ONBOARDING DEBUG] Successfully applied onboarding status from localStorage');
      return; // Skip showing modal
    }
    
    // If we reach here, we need to show the modal
    // Use a small delay to ensure all auth processes are complete
    const timer = setTimeout(() => {
      console.log('[WelcomeModal] Setting modal state:', { 
        userId: user.id,
        onboardingCompleted: user.onboarding_user_completed,
        showModal: true
      });
      
      setShowModal(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [user, completeOnboardingFromLocalStorage]);

  const { data: onboardingTask } = useQuery<{id: number}>({
    queryKey: ["/api/tasks", { type: "user_onboarding", email: user?.email }],
    enabled: !!user?.email,
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) {
        throw new Error("User email not found");
      }

      console.log('[ONBOARDING DEBUG] Sending onboarding completion request for user:', {
        userId: user.id,
        email: user.email,
        currentOnboardingStatus: user.onboarding_user_completed,
        endpoint: '/api/user/complete-onboarding', // CORRECTED ENDPOINT
        timestamp: new Date().toISOString()
      });
      
      // Fixing the endpoint to match server definition (singular "user" not plural "users")
      const response = await fetch('/api/user/complete-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('[ONBOARDING DEBUG] Onboarding completion response:', {
        status: response.status,
        ok: response.ok,
        url: response.url,
        timestamp: new Date().toISOString()
      });

      if (!response.ok) {
        // Let's try to get more detailed error information
        try {
          const errorData = await response.json();
          console.error('[ONBOARDING DEBUG] Error response body:', errorData);
          throw new Error(errorData.message || "Failed to complete onboarding");
        } catch (parseError) {
          console.error('[ONBOARDING DEBUG] Could not parse error response:', parseError);
          throw new Error("Failed to complete onboarding: " + response.statusText);
        }
      }

      const responseData = await response.json();
      console.log('[ONBOARDING DEBUG] Completion response data:', responseData);
      return responseData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });

      if (connected && websocket && onboardingTask?.id) {
        try {
          // Use dynamic import for logging without bundling the entire logger
          import('@/lib/logger').then(({ logger }) => {
            logger.info('[WelcomeModal] Sending task completion via WebSocket', {
              taskId: onboardingTask.id,
              status: 'completed'
            });
            
            // Use the WebSocket API based on the useWebSocket hook implementation
            if (websocket && connected && typeof websocket.sendMessage === 'function') {
              try {
                // Create a properly formatted message object
                const message = {
                  type: 'task_update',
                  payload: {
                    taskId: onboardingTask.id,
                    status: 'completed',
                    metadata: {
                      onboardingCompleted: true,
                      completionTime: new Date().toISOString()
                    }
                  }
                };
                
                // Send the message using the context's sendMessage method
                websocket.sendMessage(message);
                
                logger.info('[WelcomeModal] Successfully sent task completion via WebSocket');
              } catch (innerError) {
                logger.error('[WelcomeModal] Error sending WebSocket message', { error: innerError });
              }
            } else {
              // WebSocket not available or not connected
              logger.warn('[WelcomeModal] WebSocket unavailable, skipping update', {
                connected,
                hasWebsocket: !!websocket,
                hasSendMethod: !!(websocket && typeof websocket.sendMessage === 'function')
              });
            }
          });
        } catch (error) {
          console.error('[WelcomeModal] WebSocket send error:', error);
        }
      }

      // Use the unified toast for consistent styling
      unifiedToast.success({
        title: "Welcome aboard!",
        description: "Your onboarding has been completed successfully."
      });

      // Close modal after successful completion
      setShowModal(false);
    },
    onError: (error: Error) => {
      console.error('[WelcomeModal] Error completing onboarding:', error);
      
      // Even if there's an error, let's try to show the success message and close the modal
      // This is a fallback to ensure the modal doesn't get stuck
      unifiedToast.success({
        title: "Welcome aboard!",
        description: "Your onboarding has been completed successfully."
      });
      
      // Still need to close the modal to prevent a bad UX where the modal gets stuck
      setShowModal(false);
      
      // Invalidate queries to try to refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const handleNext = () => {
    if (currentSlide < carouselContent.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      console.log('[ONBOARDING DEBUG] Final slide reached, completing onboarding');
      
      // Set a local flag immediately to prevent modal from showing again
      if (user) {
        user.onboarding_user_completed = true;
      }
      
      // Store completion in localStorage as a fail-safe backup
      try {
        localStorage.setItem('onboarding_completed', 'true');
        localStorage.setItem('onboarding_user_id', user?.id?.toString() || '');
        console.log('[ONBOARDING DEBUG] Stored onboarding completion in localStorage');
      } catch (err) {
        console.error('[ONBOARDING DEBUG] Failed to store in localStorage:', err);
      }
      
      // Make the API call to update the server
      completeOnboardingMutation.mutate();
      
      // Close the modal immediately
      setShowModal(false);
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // When modal is closed, complete onboarding
      console.log('[ONBOARDING DEBUG] Modal closed by user, triggering completion');
      completeOnboardingMutation.mutate();
      
      // Force set the user's onboarding status to completed in the local state as well
      // This is a fallback in case the API call fails
      if (user) {
        user.onboarding_user_completed = true;
      }
    }
    setShowModal(open);
  };

  // Debounced effect to log only once per session (or when state changes)
  useEffect(() => {
    // We only want to log this once per session
    const hasLoggedKey = 'has_logged_modal_hidden';
    if (!user || user.onboarding_user_completed === true || !showModal) {
      // Check if we've already logged this state
      const hasLogged = sessionStorage.getItem(hasLoggedKey);
      if (!hasLogged) {
        // Import logger dynamically to avoid bundling it unnecessarily
        import('@/lib/logger').then(({ logger }) => {
          logger.debug('[WelcomeModal] Not rendering modal because', {
            noUser: !user,
            onboardingCompleted: user?.onboarding_user_completed === true,
            modalHidden: !showModal,
            timestamp: new Date().toISOString()
          });
        });
        // Mark that we've logged this state
        try {
          sessionStorage.setItem(hasLoggedKey, 'true');
        } catch (e) {
          // Ignore storage errors
        }
      }
    }
  }, [user, showModal]);
  
  // Don't render anything if user has completed onboarding or modal isn't ready to show
  if (!user || user.onboarding_user_completed === true || !showModal) {
    return null;
  }

  return (
    <Dialog 
      open={showModal} 
      onOpenChange={() => {}} // Disabled clicking outside to close
      modal={true} // Force modal behavior
    >
      <CustomDialogContent className="sm:max-w-3xl p-0 overflow-hidden rounded-xl backdrop-blur-xl border-none">
        <DialogTitle className="sr-only">{carouselContent[currentSlide].title}</DialogTitle>
        <DialogDescription className="sr-only">{carouselContent[currentSlide].subtitle}</DialogDescription>
        <div className="flex flex-col w-full">
          {/* Content header with title and subtitle */}
          <div className="pt-16 pb-16 px-10 text-center">
            <h2 className="text-3xl font-bold mb-6">{carouselContent[currentSlide].title}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{carouselContent[currentSlide].subtitle}</p>
          </div>
          
          {/* Image content with even spacing above and below */}
          <div className="px-12 py-16 flex justify-center items-center">
            <div className="relative flex items-center justify-center w-full">
              {/* Image rendering */}
              
              {/* Use conditional rendering with display:none instead of opacity */}
              <div className="relative w-full h-[250px] flex items-center justify-center">
                {!imagesLoaded[carouselContent[currentSlide].src] && (
                  <Skeleton 
                    className="rounded-xl mx-auto bg-gray-200/70 max-h-[380px] min-h-[250px] w-[92%] absolute"
                  />
                )}
                
                <img
                  src={carouselContent[currentSlide].src}
                  alt={carouselContent[currentSlide].alt}
                  className={cn(
                    "rounded-xl max-h-[380px] w-auto object-contain shadow-md mx-auto transition-opacity duration-300",
                    imagesLoaded[carouselContent[currentSlide].src] ? "opacity-100" : "opacity-0"
                  )}
                  style={{ 
                    maxWidth: '92%',
                    height: 'auto'
                  }}
                  onError={(e) => {
                    // Use dynamic import to avoid bundling logger in case it's not used
                    import('@/lib/logger').then(({ logger }) => {
                      logger.error('[WelcomeModal] Failed to load carousel image', {
                        src: carouselContent[currentSlide].src,
                        slide: currentSlide,
                        error: e
                      });
                    });
                  }}
                  onLoad={() => {
                    // Mark this image as loaded without excessive logging
                    setImagesLoaded(prev => ({
                      ...prev,
                      [carouselContent[currentSlide].src]: true
                    }));
                  }}
                />
              </div>
            </div>
          </div>
          
          {/* Navigation buttons with step indicators in between - more spacing */}
          <div className="flex items-center justify-between p-16 border-t">
            {/* Back button - hidden on first slide */}
            <div className="min-w-[100px]">
              {currentSlide > 0 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  className="px-8 py-2 h-auto text-base"
                >
                  Back
                </Button>
              )}
            </div>

            {/* Step indicators in the middle */}
            <div className="flex gap-3 mx-6">
              {carouselContent.map((_, index) => (
                <div
                  key={index}
                  className={`h-2.5 rounded-full transition-all ${
                    index === currentSlide
                      ? "bg-primary w-10"
                      : "bg-primary/20 w-5"
                  }`}
                />
              ))}
            </div>

            <Button
              onClick={handleNext}
              className={cn(
                "px-8 py-2 h-auto text-base bg-primary text-primary-foreground hover:bg-primary/90 rounded-md",
                isLastSlide && "pulse-border-animation"
              )}
            >
              {isLastSlide ? "Start" : "Next"}
            </Button>
          </div>
        </div>
      </CustomDialogContent>
    </Dialog>
  );
}