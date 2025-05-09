import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, X } from 'lucide-react';

export interface TutorialStep {
  title: string;
  description: string;
  imagePath?: string;
  imageUrl?: string;
}

interface TabTutorialModalProps {
  title: string;
  description: string;
  imageUrl: string | null;
  isLoading: boolean;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onComplete: () => void;
  onClose: () => void;
}

/**
 * Tutorial Modal Component
 * 
 * This component displays a tutorial modal with a blurred background,
 * showing tutorial content with an image, description, and navigation controls.
 */
export function TabTutorialModal({
  title,
  description,
  imageUrl,
  isLoading,
  currentStep,
  totalSteps,
  onNext,
  onComplete,
  onClose,
}: TabTutorialModalProps) {
  const isLastStep = currentStep === totalSteps - 1;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur effect */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div className="relative max-w-3xl w-full mx-4 bg-white rounded-lg shadow-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          aria-label="Close tutorial"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
        
        {/* Progress indicator */}
        <div className="w-full bg-gray-100 h-1.5 rounded-t-lg overflow-hidden">
          <div 
            className="bg-blue-600 h-full transition-all duration-300 ease-out"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
        
        <div className="p-6">
          {/* Tutorial content */}
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">{title}</h2>
          <p className="text-gray-600 mb-6">{description}</p>
          
          {/* Tutorial image */}
          <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-6 overflow-hidden">
            {isLoading ? (
              <Loader2 className="h-10 w-10 text-gray-400 animate-spin" />
            ) : imageUrl ? (
              <img 
                src={imageUrl} 
                alt={title}
                className="w-full h-full object-contain" 
              />
            ) : (
              <div className="text-gray-400">No image available</div>
            )}
          </div>
          
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Step {currentStep + 1} of {totalSteps}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Skip
              </Button>
              <Button
                onClick={isLastStep ? onComplete : onNext}
              >
                {isLastStep ? 'Complete' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}