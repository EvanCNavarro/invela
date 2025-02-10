import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

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
  const [open, setOpen] = useState(true);
  const { user } = useAuth();

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/users/complete-onboarding");
      if (!res.ok) {
        throw new Error("Failed to complete onboarding");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const handleNext = () => {
    if (currentSlide < carouselImages.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    completeOnboardingMutation.mutate();
    setOpen(false);
  };

  if (user?.onboardingUserCompleted) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        handleComplete();
      }
      setOpen(isOpen);
    }}>
      <DialogContent className="sm:max-w-xl">
        <div className="relative px-4 pb-8 pt-6">
          <button
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>

          <div className="relative aspect-video overflow-hidden rounded-lg">
            <img
              src={carouselImages[currentSlide].src}
              alt={carouselImages[currentSlide].alt}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>

          <div className="mt-4 text-center">
            <h3 className="text-lg font-semibold">
              {carouselImages[currentSlide].title}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {carouselImages[currentSlide].description}
            </p>
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