import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";
import { cn } from "@/lib/utils";

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

export function WelcomeModal() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { socket, connected } = useWebSocket();

  const isLastSlide = currentSlide === carouselContent.length - 1;

  // Only set modal visibility once when component mounts
  useEffect(() => {
    if (!user) return;
    setShowModal(!user.onboarding_user_completed);
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

      if (connected && socket && onboardingTask?.id) {
        try {
          socket.send(JSON.stringify({
            type: 'task_update',
            data: {
              taskId: onboardingTask.id,
              status: 'completed',
              metadata: {
                onboardingCompleted: true,
                completionTime: new Date().toISOString()
              }
            }
          }));
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

  // Don't render anything if user has completed onboarding
  if (!user || user.onboarding_user_completed) {
    return null;
  }

  return (
    <>
      {/* Global styles for pulsating border and hiding the close button */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Hide the close button in the dialog */
          button[aria-label="Close"] {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
          }
          
          @keyframes pulse-border {
            0% {
              box-shadow: 0 0 0 0 rgba(73, 101, 236, 0.7);
            }
            70% {
              box-shadow: 0 0 0 10px rgba(73, 101, 236, 0);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(73, 101, 236, 0);
            }
          }
          
          .pulse-border-animation {
            animation: pulse-border 2s infinite;
          }
        `
      }} />

      <Dialog 
        open={showModal} 
        onOpenChange={() => {}} // Disabled clicking outside to close
        modal={true} // Force modal behavior
      >
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden rounded-xl backdrop-blur-xl border-none" hideCloseButton={true}>
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
                <img
                  src={carouselContent[currentSlide].src}
                  alt={carouselContent[currentSlide].alt}
                  className="rounded-xl max-h-[380px] w-auto object-contain shadow-md mx-auto"
                  style={{ 
                    maxWidth: '92%',
                    height: 'auto'
                  }}
                  onError={(e) => {
                    console.error('Failed to load image:', carouselContent[currentSlide].src, e);
                  }}
                  onLoad={() => {
                    console.log('Successfully loaded image:', carouselContent[currentSlide].src);
                  }}
                />
              </div>
            </div>
            
            {/* Navigation buttons with step indicators in between - more spacing */}
            <div className="flex items-center justify-between p-8 border-t mt-4">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentSlide === 0}
                className="px-8 py-2 h-auto text-base"
              >
                Back
              </Button>

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
        </DialogContent>
      </Dialog>
    </>
  );
}