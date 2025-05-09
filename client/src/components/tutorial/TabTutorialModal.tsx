import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Progress } from '@/components/ui/progress';
import useTutorialAssets from '@/hooks/use-tutorial-assets';

export interface TutorialStep {
  title: string;
  description: string;
  imageUrl?: string;
}

interface TabTutorialModalProps {
  tabKey: string;
  steps: TutorialStep[];
  title: string;
  subtitle?: string;
}

/**
 * TabTutorialModal Component
 * 
 * This component displays a tutorial modal for specific tabs,
 * showing a series of tutorial steps that guide the user through the tab's functionality.
 * 
 * It appears when a user visits a tab for the first time, and it tracks completion state
 * in the database so it only appears once per user per tab.
 */
export const TabTutorialModal: React.FC<TabTutorialModalProps> = ({
  tabKey,
  steps,
  title,
  subtitle
}) => {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Extract all image URLs from steps for preloading
  const imageUrls = useMemo(() => 
    steps.map(step => step.imageUrl).filter(Boolean) as string[],
  [steps]);
  
  // Preload assets
  const { isLoading: assetsLoading, progress: assetsProgress } = useTutorialAssets(imageUrls);

  const checkTutorialCompletion = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest(`/api/user-tab-tutorials/${tabKey}/check`);
      const data = await response.json();
      
      // If the tutorial hasn't been completed yet, open the modal
      if (!data.completed) {
        setOpen(true);
      }
    } catch (error) {
      console.error('Error checking tutorial completion:', error);
      // If there's an error, we don't show the tutorial
      // This prevents blocking user access if the API is down
    } finally {
      setIsLoading(false);
    }
  }, [tabKey]);

  // Check if the tutorial has been completed when the component mounts
  useEffect(() => {
    checkTutorialCompletion();
  }, [checkTutorialCompletion]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      setIsSubmitting(true);
      
      // Mark the tutorial as completed in the database
      const response = await apiRequest('/api/user-tab-tutorials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tabKey }),
      });

      const data = await response.json();
      
      if (data.completed) {
        // Invalidate any related queries
        queryClient.invalidateQueries({ queryKey: ['/api/user-tab-tutorials'] });
        
        // Close the modal
        setOpen(false);
        
        // Show success toast
        toast({
          title: 'Tutorial completed',
          description: 'You can access this tutorial again from the help menu if needed.',
        });
      }
    } catch (error) {
      console.error('Error marking tutorial as completed:', error);
      toast({
        title: 'Error',
        description: 'Failed to save tutorial completion status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return null; // Don't render anything while API check is loading
  }

  const currentTutorialStep = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px] bg-background">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          {subtitle && (
            <DialogDescription className="text-muted-foreground">
              {subtitle}
            </DialogDescription>
          )}
        </DialogHeader>
        
        {assetsLoading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <div className="text-center text-muted-foreground mb-2">
              Loading tutorial content...
            </div>
            <Progress value={assetsProgress} className="w-[80%] mx-auto" />
            <div className="text-sm text-muted-foreground">
              {assetsProgress}% complete
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium">{currentTutorialStep.title}</h3>
              <p className="text-muted-foreground mt-1">{currentTutorialStep.description}</p>
            </div>
            
            {currentTutorialStep.imageUrl && (
              <div className="relative rounded-md overflow-hidden border border-border">
                <img
                  src={currentTutorialStep.imageUrl}
                  alt={`Tutorial step ${currentStep + 1}`}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}
            
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {steps.length}
              </div>
              <div className="flex space-x-2">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 w-6 rounded-full ${
                      index === currentStep
                        ? 'bg-primary'
                        : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between">
          <div>
            {currentStep > 0 && !assetsLoading && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={isSubmitting || assetsLoading}
              >
                Previous
              </Button>
            )}
          </div>
          <div className="flex space-x-2">
            {!isLastStep ? (
              <Button 
                onClick={handleNext} 
                disabled={isSubmitting || assetsLoading}
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleComplete} 
                disabled={isSubmitting || assetsLoading}
              >
                {isSubmitting ? 'Completing...' : 'Complete Tutorial'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TabTutorialModal;