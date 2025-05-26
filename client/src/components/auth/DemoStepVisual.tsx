/**
 * ========================================
 * Demo Step Visual Component
 * ========================================
 * 
 * Visual step indicator for the demo page using three stacked images
 * within the hero section. Shows current step in full color while
 * others are displayed in grayscale/muted style.
 * 
 * @module components/auth/DemoStepVisual
 * @version 1.0.0
 * @since 2025-05-24
 */

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDemoAssetPreloader } from "@/hooks/use-demo-asset-preloader";

// ========================================
// TYPE DEFINITIONS
// ========================================

interface DemoStepVisualProps {
  currentStep: 1 | 2 | 3 | 4 | 5;
  className?: string;
  isSystemSetup?: boolean; // Enhanced: Fade previous steps during system setup
  step3WizardStage?: 'review' | 'setup' | 'launch'; // Enhanced: Stage-aware GIF switching
}

/**
 * Asset configuration for each demo step
 * Contains both static image and animated GIF paths
 */
interface StepAssets {
  staticImage: string;
  animatedGif: string;
}

/**
 * Complete step configuration including metadata and assets
 */
interface StepConfig {
  id: number;
  title: string;
  description: string;
  assets: StepAssets;
}

// ========================================
// CONSTANTS & CONFIGURATION
// ========================================

/**
 * Demo step configuration with asset paths
 * 
 * Asset Path Convention (organized within /assets/demo/steps/):
 * - Static images: /assets/demo/steps/step-{number}-static.{ext}
 * - Animated GIFs: /assets/demo/steps/step-{number}-animated.gif
 * 
 * This provides a clean, organized structure within the existing
 * assets directory for better maintainability and consistency.
 */
const DEMO_STEPS: StepConfig[] = [
  {
    id: 1,
    title: "Platform Overview",
    description: "Introduction to the Invela Trust Network ecosystem",
    assets: {
      staticImage: "/assets/demo/steps/step-1-static.png",
      animatedGif: "/assets/demo/steps/step-1-animated.gif"
    }
  },
  {
    id: 2,
    title: "Interactive Experience", 
    description: "Hands-on demonstration of key platform features",
    assets: {
      staticImage: "/assets/demo/steps/step-2-static.png",
      animatedGif: "/assets/demo/steps/step-2-animated.gif"
    }
  },
  {
    id: 3,
    title: "Results & Insights",
    description: "Comprehensive view of assessment outcomes and next steps",
    assets: {
      staticImage: "/assets/demo/steps/step-3-static.png",
      animatedGif: "/assets/demo/steps/step-3-animated.gif"
    }
  }
];

/**
 * Visual configuration constants for consistent styling
 */
const VISUAL_CONFIG = {
  containerSize: {
    width: 220,
    height: 220
  },
  animations: {
    duration: 0.4,
    glowDuration: 2,
    staggerDelay: 0.1
  },
  spacing: {
    betweenSteps: 16 // 4 * 4px (space-y-4)
  }
} as const;

// ========================================
// UTILITY FUNCTIONS  
// ========================================

/**
 * Determines the appropriate asset source based on step state and wizard stage
 * 
 * Enhanced stage-aware logic for Step 3:
 * - Review stage: Uses regular step 3 animated GIF
 * - Setup stage: Uses launch GIF in hero section
 * - Launch stage: Continues with launch GIF during final transitions
 * 
 * @param stepConfig - Configuration for the step
 * @param isActive - Whether this step is currently active
 * @param isSystemSetup - Whether system setup is in progress (Step 3 only)
 * @param step3WizardStage - Current stage within Step 3 wizard
 * @returns The path to the appropriate asset (static, animated, or launch GIF)
 */
const getStepAssetSource = (
  stepConfig: StepConfig, 
  isActive: boolean, 
  isSystemSetup: boolean = false,
  step3WizardStage?: 'review' | 'setup' | 'launch'
): string => {
  // Enhanced: Stage-aware GIF switching for Step 3
  if (isActive && stepConfig.id === 3) {
    // During setup or launch stages, show the launch GIF in hero section
    if (step3WizardStage === 'setup' || step3WizardStage === 'launch') {
      console.log('[DemoStepVisual] Step 3 stage-aware switching:', {
        stage: step3WizardStage,
        asset: 'launch-gif',
        location: 'hero-section'
      });
      return "/assets/demo/steps/step-3-launch.gif";
    }
    
    // During review stage, use regular step 3 animated GIF
    if (step3WizardStage === 'review') {
      console.log('[DemoStepVisual] Step 3 review stage:', {
        stage: step3WizardStage,
        asset: 'regular-animated-gif'
      });
      return stepConfig.assets.animatedGif;
    }
  }
  
  // Standard logic for all other steps and states
  return isActive ? stepConfig.assets.animatedGif : stepConfig.assets.staticImage;
};

/**
 * Generates accessible alt text for step images
 * 
 * @param stepConfig - Configuration for the step  
 * @param isActive - Whether this step is currently active
 * @returns Descriptive alt text for screen readers
 */
const getStepAltText = (stepConfig: StepConfig, isActive: boolean): string => {
  const state = isActive ? "Active" : "Inactive";
  return `${state} demo step ${stepConfig.id}: ${stepConfig.title} - ${stepConfig.description}`;
};

// ========================================
// MAIN COMPONENT
// ========================================

/**
 * DemoStepVisual Component
 * 
 * Renders three stacked 220x220 dynamic images within the hero section
 * to visually indicate the current demo step. Active steps display animated
 * GIFs while inactive steps show static images. Maintains all existing
 * animation behaviors and visual transitions.
 * 
 * Key Features:
 * - Dynamic asset switching (static images ↔ animated GIFs)
 * - Preserved Framer Motion animations and transitions
 * - Accessibility support with descriptive alt text
 * - Responsive image loading with proper error handling
 * - Consistent visual hierarchy and styling
 */
export function DemoStepVisual({ currentStep, className, isSystemSetup = false, step3WizardStage }: DemoStepVisualProps) {
  console.log(`[DemoStepVisual] Rendering with currentStep: ${currentStep}, isSystemSetup: ${isSystemSetup}, step3WizardStage: ${step3WizardStage}`);
  
  // ========================================
  // ASSET PRELOADING
  // ========================================
  
  /**
   * Initialize asset preloading for optimal step transition performance
   * 
   * This preloads the next step's animated GIF to eliminate loading delays
   * when users navigate through the demo flow. The preloader automatically
   * handles edge cases and cleanup.
   */
  useDemoAssetPreloader(currentStep);

  return (
    <div className={cn("h-full p-3", className)}>
      {/* Outer container with same padding as hero section */}
      <div className="h-full bg-gray-100 rounded-xl p-6">
        {/* Inner container with same spacing as hero section */}
        <div className="h-full flex flex-col items-center justify-center space-y-4">
          {DEMO_STEPS.map((stepConfig, index) => {
            const isActive = stepConfig.id === currentStep;
            const assetSource = getStepAssetSource(stepConfig, isActive, isSystemSetup, step3WizardStage);
            const altText = getStepAltText(stepConfig, isActive);
            
            console.log(`[DemoStepVisual] Step ${stepConfig.id} - Active: ${isActive}, Asset: ${assetSource}`);
            
            // Enhanced: Sophisticated fade logic for system setup stage
            const isPreviousStep = stepConfig.id < currentStep;
            const shouldFadePrevious = isSystemSetup && isPreviousStep;
            
            return (
              <motion.div
                key={stepConfig.id}
                className={cn(
                  "w-[220px] h-[220px] rounded-xl relative overflow-hidden",
                  "transition-all duration-800 ease-in-out", // Longer duration for elegance
                  isActive 
                    ? "bg-white border-2 border-blue-400 shadow-xl" 
                    : shouldFadePrevious 
                    ? "bg-gray-100 opacity-30" // Enhanced: Fade to 30% during system setup
                    : "bg-gray-100 opacity-60"
                )}
                initial={{ scale: 0.9, opacity: 0.6 }}
                animate={{ 
                  scale: isActive ? 1 : shouldFadePrevious ? 0.8 : 0.85, // Enhanced: More fade for previous steps
                  opacity: isActive ? 1 : shouldFadePrevious ? 0.3 : 0.4 // Enhanced: Elegant fade to 30%
                }}
                transition={{ 
                  duration: VISUAL_CONFIG.animations.duration * 1.5, // Enhanced: Smoother animation
                  ease: "easeInOut",
                  delay: index * VISUAL_CONFIG.animations.staggerDelay
                }}
              >
                {/* Dynamic Image/GIF Content - Clean presentation without overlays */}
                <img
                  src={assetSource}
                  alt={altText}
                  className={cn(
                    "w-full h-full object-cover rounded-lg",
                    "transition-all duration-300 ease-in-out",
                    isActive ? "" : "grayscale"
                  )}
                  loading="lazy"
                  onError={(e) => {
                    console.warn(`[DemoStepVisual] Failed to load asset: ${assetSource}`);
                    // Fallback to static image if GIF fails to load
                    if (isActive && assetSource.includes('.gif')) {
                      (e.target as HTMLImageElement).src = stepConfig.assets.staticImage;
                    }
                  }}
                />
                
                {/* Active step indicator glow effect */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 bg-blue-100 opacity-20 rounded-xl pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.1, 0.3, 0.1] }}
                    transition={{ 
                      duration: VISUAL_CONFIG.animations.glowDuration, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default DemoStepVisual;