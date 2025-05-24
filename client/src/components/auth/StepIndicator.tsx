/**
 * ========================================
 * Step Indicator Component
 * ========================================
 * 
 * Reusable visual step progression indicator supporting both vertical and
 * horizontal orientations with smooth animations and accessibility features.
 * 
 * @module components/auth/StepIndicator
 * @version 1.0.0
 * @since 2025-05-24
 */

import React from "react";
import { motion } from "framer-motion";
import { Check, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StepIndicatorProps, StepStatus } from "../../../../types/auth";

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Get step status styling classes
 */
const getStepStatusClasses = (status: StepStatus) => {
  switch (status) {
    case 'active':
      return {
        container: 'bg-blue-600 border-blue-600 text-white',
        connector: 'bg-gray-300',
        text: 'text-blue-600 font-semibold'
      };
    case 'completed':
      return {
        container: 'bg-green-600 border-green-600 text-white',
        connector: 'bg-green-600',
        text: 'text-green-600 font-medium'
      };
    case 'error':
      return {
        container: 'bg-red-600 border-red-600 text-white',
        connector: 'bg-gray-300',
        text: 'text-red-600 font-medium'
      };
    case 'pending':
    default:
      return {
        container: 'bg-gray-100 border-gray-300 text-gray-400',
        connector: 'bg-gray-300',
        text: 'text-gray-400'
      };
  }
};

/**
 * Get appropriate icon for step status
 */
const getStepIcon = (status: StepStatus, stepNumber: number) => {
  switch (status) {
    case 'completed':
      return <Check className="w-4 h-4" />;
    case 'error':
      return <AlertCircle className="w-4 h-4" />;
    case 'active':
    case 'pending':
    default:
      return <span className="text-sm font-semibold">{stepNumber}</span>;
  }
};

// ========================================
// MAIN COMPONENT
// ========================================

/**
 * StepIndicator Component
 * 
 * Displays visual progression through multi-step flows with smooth animations
 * and comprehensive accessibility support.
 */
export function StepIndicator({
  steps,
  currentStep,
  orientation = 'vertical',
  className
}: StepIndicatorProps) {
  
  console.log(`[StepIndicator] Rendering with ${steps.length} steps, current: ${currentStep}, orientation: ${orientation}`);

  return (
    <div 
      className={cn(
        "flex gap-4",
        orientation === 'vertical' ? 'flex-col' : 'flex-row items-center',
        className
      )}
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={steps.length}
      aria-valuenow={currentStep}
      aria-label={`Step ${currentStep} of ${steps.length}`}
    >
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const statusClasses = getStepStatusClasses(step.status);
        
        return (
          <motion.div
            key={step.step}
            className={cn(
              "flex items-center gap-3",
              orientation === 'vertical' ? 'flex-row' : 'flex-col'
            )}
            initial={{ opacity: 0, y: orientation === 'vertical' ? 10 : 0, x: orientation === 'horizontal' ? -10 : 0 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            transition={{ 
              duration: 0.3, 
              delay: index * 0.1,
              ease: "easeOut" 
            }}
          >
            {/* Step Circle */}
            <div className="relative flex items-center">
              <motion.div
                className={cn(
                  "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                  statusClasses.container
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {getStepIcon(step.status, step.step)}
              </motion.div>
              
              {/* Connector Line */}
              {!isLast && (
                <div
                  className={cn(
                    "absolute transition-all duration-300",
                    orientation === 'vertical' 
                      ? "top-8 left-4 w-0.5 h-8 -translate-x-0.5" 
                      : "left-8 top-4 h-0.5 w-8 -translate-y-0.5",
                    statusClasses.connector
                  )}
                />
              )}
            </div>

            {/* Step Content */}
            <div className={cn(
              "flex-1",
              orientation === 'horizontal' && "text-center mt-2"
            )}>
              <motion.h3
                className={cn(
                  "text-sm font-medium transition-colors duration-200",
                  statusClasses.text
                )}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 + 0.2 }}
              >
                {step.title}
              </motion.h3>
              
              {step.description && (
                <motion.p
                  className="text-xs text-gray-500 mt-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 + 0.3 }}
                >
                  {step.description}
                </motion.p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ========================================
// EXPORTS
// ========================================

export default StepIndicator;