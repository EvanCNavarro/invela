/**
 * ========================================
 * Auth Steps Management Hook
 * ========================================
 * 
 * Custom hook for managing multi-step authentication flows with validation,
 * navigation controls, and comprehensive logging for debugging.
 * 
 * @module hooks/use-auth-steps
 * @version 1.0.0
 * @since 2025-05-24
 */

import { useState, useCallback, useMemo } from "react";
import type { AuthStep, UseAuthStepsReturn } from "../../../types/auth";

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Validates step number is within allowed range
 */
const isValidStep = (step: AuthStep, totalSteps: AuthStep): boolean => {
  return step >= 1 && step <= totalSteps;
};

/**
 * Logs step navigation for debugging and analytics
 */
const logStepNavigation = (action: string, from: AuthStep, to?: AuthStep, totalSteps?: AuthStep) => {
  console.log(`[useAuthSteps] ${action}:`, {
    from,
    to,
    totalSteps,
    timestamp: new Date().toISOString()
  });
};

// ========================================
// MAIN HOOK
// ========================================

/**
 * useAuthSteps Hook
 * 
 * Provides comprehensive step management for multi-step authentication flows
 * with validation, navigation controls, and progress tracking.
 * 
 * @param initialStep - Starting step (default: 1)
 * @param maxSteps - Maximum number of steps (default: 3)
 * @returns Step management functions and state
 */
export function useAuthSteps(
  initialStep: AuthStep = 1,
  maxSteps: AuthStep = 3
): UseAuthStepsReturn {
  
  // Validate initial parameters
  if (!isValidStep(initialStep, maxSteps)) {
    console.warn(`[useAuthSteps] Invalid initial step ${initialStep}, using step 1`);
    initialStep = 1;
  }

  const [currentStep, setCurrentStep] = useState<AuthStep>(initialStep);
  
  console.log(`[useAuthSteps] Initialized with step ${initialStep} of ${maxSteps}`);

  // ========================================
  // NAVIGATION FUNCTIONS
  // ========================================

  /**
   * Move to the next step if possible
   */
  const nextStep = useCallback(() => {
    if (currentStep < maxSteps) {
      const nextStepNumber = (currentStep + 1) as AuthStep;
      logStepNavigation('Next step', currentStep, nextStepNumber, maxSteps);
      setCurrentStep(nextStepNumber);
    } else {
      console.warn(`[useAuthSteps] Cannot proceed beyond step ${maxSteps}`);
    }
  }, [currentStep, maxSteps]);

  /**
   * Move to the previous step if possible
   */
  const previousStep = useCallback(() => {
    if (currentStep > 1) {
      const prevStepNumber = (currentStep - 1) as AuthStep;
      logStepNavigation('Previous step', currentStep, prevStepNumber, maxSteps);
      setCurrentStep(prevStepNumber);
    } else {
      console.warn(`[useAuthSteps] Cannot go back from step 1`);
    }
  }, [currentStep, maxSteps]);

  /**
   * Jump directly to a specific step
   */
  const goToStep = useCallback((step: AuthStep) => {
    if (isValidStep(step, maxSteps)) {
      logStepNavigation('Jump to step', currentStep, step, maxSteps);
      setCurrentStep(step);
    } else {
      console.error(`[useAuthSteps] Invalid step ${step}, must be between 1 and ${maxSteps}`);
    }
  }, [currentStep, maxSteps]);

  /**
   * Reset to the initial step
   */
  const resetSteps = useCallback(() => {
    logStepNavigation('Reset steps', currentStep, initialStep, maxSteps);
    setCurrentStep(initialStep);
  }, [currentStep, initialStep, maxSteps]);

  // ========================================
  // COMPUTED VALUES
  // ========================================

  /**
   * Memoized navigation state
   */
  const navigationState = useMemo(() => ({
    canGoNext: currentStep < maxSteps,
    canGoBack: currentStep > 1,
    isFirstStep: currentStep === 1,
    isLastStep: currentStep === maxSteps,
    progressPercentage: Math.round((currentStep / maxSteps) * 100)
  }), [currentStep, maxSteps]);

  console.log(`[useAuthSteps] Current navigation state:`, {
    currentStep,
    totalSteps: maxSteps,
    ...navigationState
  });

  // ========================================
  // RETURN OBJECT
  // ========================================

  return {
    currentStep,
    totalSteps: maxSteps,
    canGoNext: navigationState.canGoNext,
    canGoBack: navigationState.canGoBack,
    nextStep,
    previousStep,
    goToStep,
    resetSteps
  };
}

// ========================================
// EXPORTS
// ========================================

export default useAuthSteps;