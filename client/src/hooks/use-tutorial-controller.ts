/**
 * ========================================
 * Tutorial Controller Hook - Interactive Learning Management
 * ========================================
 * 
 * Advanced tutorial controller providing comprehensive interactive learning
 * management throughout the enterprise platform. Manages tutorial state,
 * real-time synchronization, and multi-tab coordination for seamless user education.
 * 
 * Key Features:
 * - Real-time tutorial synchronization across browser tabs
 * - Advanced step progression with validation
 * - WebSocket integration for multi-window coordination
 * - Tutorial completion tracking and persistence
 * - Loading states and error handling for robust UX
 * 
 * Tutorial Management:
 * - Step-by-step progression with completion validation
 * - Cross-tab tutorial state synchronization
 * - Tutorial visibility and timing control
 * - Completion ceremony and next step recommendations
 * - Real-time updates for collaborative learning environments
 * 
 * @module hooks/use-tutorial-controller
 * @version 1.0.0
 * @since 2025-05-23
 */

import { useState, useEffect, useCallback } from 'react';
import { useTabTutorials } from './use-tab-tutorials';
import { useTutorialWebSocket } from '@/hooks/use-tutorial-websocket';
import { TutorialStep } from '@/components/tutorial/TabTutorialModal';

interface TutorialControllerProps {
  tabName: string;
  steps: TutorialStep[];
}

interface TutorialControllerResult {
  isVisible: boolean;
  currentStep: number;
  totalSteps: number;
  currentStepData: TutorialStep | null;
  isLoading: boolean;
  handleNext: () => void;
  handleComplete: () => void;
  handleClose: () => void;
}

/**
 * A hook that combines tutorial data management with WebSocket capabilities
 * for real-time updates across multiple browser tabs/windows
 */
export function useTutorialController({
  tabName,
  steps
}: TutorialControllerProps): TutorialControllerResult {
  // Get tutorial status from server
  const { 
    tutorialEnabled, 
    currentStep: savedStep, 
    isLoading, 
    handleNext: updateStep,
    handleComplete: completeServer,
    markTutorialSeen
  } = useTabTutorials(tabName);
  
  // Connect to WebSocket for real-time tutorial updates
  const { tutorialUpdate } = useTutorialWebSocket(tabName);
  
  // Local state
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Initialize visibility and current step based on server data
  useEffect(() => {
    if (!isLoading) {
      setIsVisible(tutorialEnabled);
      setCurrentStep(savedStep);
    }
  }, [tutorialEnabled, savedStep, isLoading]);
  
  // Handle WebSocket updates
  useEffect(() => {
    if (tutorialUpdate) {
      if (tutorialUpdate.currentStep !== undefined) {
        setCurrentStep(tutorialUpdate.currentStep);
      }
      
      if (tutorialUpdate.completed) {
        setIsVisible(false);
      }
    }
  }, [tutorialUpdate]);
  
  // Get current step data
  const currentStepData = steps[currentStep] || null;
  
  // Handle next button
  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      // Not the last step, advance to next
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      updateStep();
    } else {
      // Last step, complete the tutorial
      handleComplete();
    }
  }, [currentStep, steps.length, updateStep]);
  
  // Handle complete button
  const handleComplete = useCallback(() => {
    completeServer();
    setIsVisible(false);
  }, [completeServer]);
  
  // Handle close/skip button
  const handleClose = useCallback(() => {
    markTutorialSeen();
    setIsVisible(false);
  }, [markTutorialSeen]);
  
  return {
    isVisible,
    currentStep,
    totalSteps: steps.length,
    currentStepData,
    isLoading,
    handleNext,
    handleComplete,
    handleClose
  };
}