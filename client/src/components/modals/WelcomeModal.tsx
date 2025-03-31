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
    <Dialog 
      open={showModal} 
      onOpenChange={() => {}} // Disabled clicking outside to close
      modal={true} // Force modal behavior
    >
      <DialogContent 
        className="sm:max-w-md p-0 overflow-hidden rounded-xl backdrop-blur-xl" 
        hideClose={true} // Remove close button
      >
        <DialogTitle className="sr-only">{carouselContent[currentSlide].title}</DialogTitle>
        <DialogDescription className="sr-only">{carouselContent[currentSlide].subtitle}</DialogDescription>
        <div className="flex flex-col w-full">
          {/* Content header with title and subtitle */}
          <div className="p-6 text-center">
            <h2 className="text-2xl font-bold mb-2">{carouselContent[currentSlide].title}</h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">{carouselContent[currentSlide].subtitle}</p>
          </div>
          
          {/* Image content - wider layout */}
          <div className="px-8 py-4 flex justify-center items-center">
            <div className="relative flex items-center justify-center">
              {/* Log image path but don't display anything */}
              {(() => { console.log('Loading image:', carouselContent[currentSlide].src); return null; })()}
              <img
                src={carouselContent[currentSlide].src}
                alt={carouselContent[currentSlide].alt}
                className="rounded-xl max-h-[320px] max-w-full object-contain shadow-md"
                onError={(e) => {
                  console.error('Failed to load image:', carouselContent[currentSlide].src, e);
                }}
                onLoad={() => {
                  console.log('Successfully loaded image:', carouselContent[currentSlide].src);
                }}
              />
            </div>
          </div>
          
          {/* Navigation buttons with step indicators in between */}
          <div className="flex items-center justify-between p-4 border-t mt-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentSlide === 0}
              className="px-6 py-2 h-auto text-base"
            >
              Back
            </Button>

            {/* Step indicators in the middle */}
            <div className="flex gap-2 mx-2">
              {carouselContent.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentSlide
                      ? "bg-primary w-8"
                      : "bg-primary/20 w-4"
                  }`}
                />
              ))}
            </div>

            <Button
              onClick={handleNext}
              className={cn(
                "px-6 py-2 h-auto text-base bg-primary text-primary-foreground hover:bg-primary/90",
                isLastSlide && "animate-pulse"
              )}
            >
              {isLastSlide ? "Start" : "Next"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}