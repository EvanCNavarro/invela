/**
 * ========================================
 * Authentication Types & Definitions
 * ========================================
 * 
 * Comprehensive type definitions for the authentication system supporting
 * multiple auth flows with step-based progression and visual indicators.
 * 
 * @module types/auth
 * @version 1.0.0
 * @since 2025-05-24
 */

/**
 * Authentication mode enumeration
 * Defines the different types of authentication flows available
 */
export type AuthMode = 
  | 'login'              // Standard user login
  | 'register'           // User registration (invitation validation)
  | 'register-validated' // Account creation after invitation validation
  | 'demo';              // Interactive demo walkthrough

/**
 * Authentication step enumeration
 * Supports multi-step flows with future scalability (1-5 steps)
 */
export type AuthStep = 1 | 2 | 3 | 4 | 5;

/**
 * Step status for visual indicators
 */
export type StepStatus = 
  | 'active'    // Current step (highlighted)
  | 'completed' // Finished step (success state)
  | 'pending'   // Future step (disabled/grayed)
  | 'error';    // Step with validation errors

/**
 * Step configuration for each auth flow
 */
export interface StepConfig {
  step: AuthStep;
  title: string;
  description?: string;
  status: StepStatus;
  icon?: string; // Lucide icon name
}

/**
 * Auth layout props with enum-based mode system
 */
export interface AuthLayoutProps {
  children: React.ReactNode;
  mode: AuthMode;
  currentStep?: AuthStep;
  totalSteps?: AuthStep;
  onStepChange?: (step: AuthStep) => void;
  onBack?: () => void;
}

/**
 * Step indicator component props
 */
export interface StepIndicatorProps {
  steps: StepConfig[];
  currentStep: AuthStep;
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

/**
 * Demo step content configuration
 */
export interface DemoStepContent {
  step: AuthStep;
  title: string;
  subtitle?: string;
  content: React.ReactNode;
  nextButtonText?: string;
  canProceed?: boolean;
}

/**
 * Auth step navigation hook return type
 */
export interface UseAuthStepsReturn {
  currentStep: AuthStep;
  totalSteps: AuthStep;
  canGoNext: boolean;
  canGoBack: boolean;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: AuthStep) => void;
  resetSteps: () => void;
}