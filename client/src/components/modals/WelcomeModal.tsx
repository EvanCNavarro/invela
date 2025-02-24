import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";

const carouselImages = [
  {
    src: "/welcome-1.svg",
    alt: "Welcome to Invela",
    title: "Welcome to Invela",
    description: "Your intelligent platform for managing business relationships and compliance."
  },
  {
    src: "/welcome-2.svg",
    alt: "Streamlined Onboarding",
    title: "Streamlined Onboarding",
    description: "Easy and secure onboarding process for your team and partners."
  },
  {
    src: "/welcome-3.svg",
    alt: "Risk Management",
    title: "Risk Management",
    description: "Advanced risk assessment and monitoring tools at your fingertips."
  },
  {
    src: "/welcome-4.svg",
    alt: "Document Management",
    title: "Document Management",
    description: "Secure document storage and sharing with role-based access control."
  }
];

export function WelcomeModal() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { socket, connected } = useWebSocket();

  // Only set modal visibility once when component mounts
  useEffect(() => {
    if (!user) return;
    setShowModal(!user.onboarding_user_completed);
  }, [user]); // Added user dependency to properly track changes

  const { data: onboardingTask } = useQuery({
    queryKey: ["/api/tasks", { type: "user_invitation", email: user?.email }],
    enabled: !!user?.email,
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) {
        throw new Error("User email not found");
      }

      const response = await fetch('/api/users/complete-onboarding', {
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

      if (connected && socket && data.task) {
        try {
          socket.send(JSON.stringify({
            type: 'task_update',
            data: {
              taskId: data.task.id,
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
    if (currentSlide < carouselImages.length - 1) {
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

  // Don't render anything if user has completed onboarding
  if (!user || user.onboarding_user_completed) {
    return null;
  }

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="sm:max-w-xl">
        <DialogTitle>{carouselImages[currentSlide].title}</DialogTitle>
        <DialogDescription>
          {carouselImages[currentSlide].description}
        </DialogDescription>
        <div className="relative px-4 pb-8 pt-6">
          <div className="relative aspect-video overflow-hidden rounded-lg">
            <img
              src={carouselImages[currentSlide].src}
              alt={carouselImages[currentSlide].alt}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>

          <div className="mt-6 flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevious}
              disabled={currentSlide === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex gap-1">
              {carouselImages.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 w-1.5 rounded-full transition-all ${
                    index === currentSlide
                      ? "bg-primary w-3"
                      : "bg-primary/30"
                  }`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}