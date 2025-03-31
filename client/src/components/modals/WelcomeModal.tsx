import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";

// New carousel content with the updated 5 steps
const carouselContent = [
  {
    src: "/modal_userOboarding_1.png",
    alt: "Welcome to Invela",
    title: "Welcome to Invela",
    subtitle: "Your intelligent platform for managing Risk and Accreditation."
  },
  {
    src: "/harmonized_modal_userOboarding_2.png", 
    alt: "Easy Onboarding",
    title: "Easy Onboarding",
    subtitle: "A simple, goal-oriented setup."
  },
  {
    src: "/harmonized_modal_userOboarding_3.png",
    alt: "Built for Trust",
    title: "Built for Trust",
    subtitle: "Progress through KYB, Security, and Open Banking surveys — all in one secure flow."
  },
  {
    src: "/harmonized_modal_userOboarding_4.png",
    alt: "Your Data, Protected", 
    title: "Your Data, Protected",
    subtitle: "Best-in-class encryption and secure controls at every step."
  },
  {
    src: "/harmonized_modal_userOboarding_5.png",
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
    <Dialog open={showModal} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">{carouselContent[currentSlide].title}</DialogTitle>
        <DialogDescription className="sr-only">{carouselContent[currentSlide].subtitle}</DialogDescription>
        <div className="flex flex-col w-full">
          {/* Content header with title and subtitle */}
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">{carouselContent[currentSlide].title}</h2>
            <p className="text-lg text-muted-foreground">{carouselContent[currentSlide].subtitle}</p>
          </div>
          
          {/* Image content */}
          <div className="px-12 py-4 flex justify-center items-center">
            <div className="w-full max-w-md aspect-square relative rounded-lg bg-primary/5 p-8 flex items-center justify-center">
              <img
                src={carouselContent[currentSlide].src}
                alt={carouselContent[currentSlide].alt}
                className="max-h-full max-w-full object-contain h-48"
              />
            </div>
          </div>
          
          {/* Step indicators */}
          <div className="flex justify-center my-6 px-8">
            <div className="flex gap-3">
              {carouselContent.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentSlide
                      ? "bg-primary w-10"
                      : "bg-primary/20 w-6"
                  }`}
                />
              ))}
            </div>
          </div>
          
          {/* Navigation buttons */}
          <div className="flex justify-between p-6 bg-muted/20 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentSlide === 0}
              className="px-6"
            >
              Back
            </Button>

            <Button
              onClick={handleNext}
              className="px-6 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isLastSlide ? "Start" : "Next"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}