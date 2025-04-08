import { useState, useEffect, forwardRef } from "react";
import { Dialog, DialogTitle, DialogDescription, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
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
    alt: "Welcome to Invela",
    title: "Welcome to Invela",
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
const preloadImages = (
  callback?: (src: string, success: boolean) => void
) => {
  carouselContent.forEach(item => {
    const img = new Image();
    img.src = item.src;
    img.onload = () => {
      console.log(`Preloaded image: ${item.src}`);
      if (callback) callback(item.src, true);
    };
    img.onerror = (e) => {
      console.error(`Failed to preload image: ${item.src}`, e);
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
  const websocket = useWebSocketContext();
  const connected = websocket.isConnected;

  const isLastSlide = currentSlide === carouselContent.length - 1;
  const isCurrentImageLoaded = imagesLoaded[carouselContent[currentSlide]?.src] === true;

  // Only set modal visibility once when user data is fully available
  useEffect(() => {
    if (!user) return;
    
    // Preload all images immediately to ensure fast display when modal shows
    preloadImages((src, success) => {
      if (success) {
        setImagesLoaded(prev => ({
          ...prev,
          [src]: true
        }));
      }
    });
    
    // A small delay to ensure all auth processes are complete
    const timer = setTimeout(() => {
      console.log('[WelcomeModal] Setting modal state:', { 
        userId: user.id,
        onboardingCompleted: user.onboarding_user_completed,
        showModal: !user.onboarding_user_completed
      });
      setShowModal(!user.onboarding_user_completed);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [user]);

  const { data: onboardingTask } = useQuery<{id: number}>({
    queryKey: ["/api/tasks", { type: "user_invitation", email: user?.email }],
    enabled: !!user?.email,
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) {
        throw new Error("User email not found");
      }

      const response = await fetch('/api/user/complete-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to complete onboarding");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });

      if (connected && websocket && onboardingTask?.id) {
        try {
          websocket.send('task_update', {
            taskId: onboardingTask.id,
            status: 'completed',
            metadata: {
              onboardingCompleted: true,
              completionTime: new Date().toISOString()
            }
          });
        } catch (error) {
          console.error('[WelcomeModal] WebSocket send error:', error);
        }
      }

      toast({
        title: "Welcome aboard!",
        description: "Your onboarding has been completed successfully.",
      });

      // Close modal after successful completion
      setShowModal(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete onboarding",
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (currentSlide < carouselContent.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      completeOnboardingMutation.mutate();
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
      completeOnboardingMutation.mutate();
    }
    setShowModal(open);
  };

  // Don't render anything if user has completed onboarding or modal isn't ready to show
  if (!user || user.onboarding_user_completed || !showModal) {
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
          <div className="p-10 text-center">
            <h2 className="text-3xl font-bold mb-4">{carouselContent[currentSlide].title}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{carouselContent[currentSlide].subtitle}</p>
          </div>
          
          {/* Image content - wider layout with more spacing */}
          <div className="px-12 py-8 flex justify-center items-center">
            <div className="relative flex items-center justify-center w-full">
              {/* Log image path but don't display anything */}
              {(() => { console.log('Loading image:', carouselContent[currentSlide].src); return null; })()}
              
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
                    console.error('Failed to load image:', carouselContent[currentSlide].src, e);
                  }}
                  onLoad={() => {
                    console.log('Successfully loaded image:', carouselContent[currentSlide].src);
                    // Mark this image as loaded
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
          <div className="flex items-center justify-between p-8 border-t mt-4">
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