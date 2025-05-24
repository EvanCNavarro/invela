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

// ========================================
// TYPE DEFINITIONS
// ========================================

interface DemoStepVisualProps {
  currentStep: 1 | 2 | 3 | 4 | 5;
  className?: string;
}

// ========================================
// MAIN COMPONENT
// ========================================

/**
 * DemoStepVisual Component
 * 
 * Renders three stacked 220x220 rounded images within the hero section
 * to visually indicate the current demo step. Active step shows in full
 * bluish color while others are grayscale/muted.
 */
export function DemoStepVisual({ currentStep, className }: DemoStepVisualProps) {
  const steps = [
    {
      id: 1,
      title: "Overview",
      color: "bg-blue-500"
    },
    {
      id: 2,
      title: "Interactive Demo",
      color: "bg-blue-600"
    },
    {
      id: 3,
      title: "Results",
      color: "bg-blue-700"
    }
  ];

  return (
    <div className={cn("h-full p-3", className)}>
      {/* Outer container with same padding as hero section */}
      <div className="h-full bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6">
        {/* Inner container with same spacing as hero section */}
        <div className="h-full flex flex-col items-center justify-center space-y-4">
          {steps.map((step) => {
            const isActive = step.id === currentStep;
            
            return (
              <motion.div
                key={step.id}
                className={cn(
                  "w-[220px] h-[220px] rounded-xl border-2 flex items-center justify-center relative overflow-hidden",
                  "transition-all duration-500 ease-in-out",
                  isActive 
                    ? "bg-white border-blue-200 shadow-xl" 
                    : "bg-gray-300 border-gray-400 opacity-40"
                )}
                initial={{ scale: 0.9, opacity: 0.6 }}
                animate={{ 
                  scale: isActive ? 1 : 0.85,
                  opacity: isActive ? 1 : 0.4
                }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              >
                {/* Placeholder content - will be replaced with actual images */}
                <div className="flex flex-col items-center justify-center text-center">
                  <div className={cn(
                    "w-16 h-16 rounded-full mb-3 flex items-center justify-center text-2xl font-bold",
                    isActive ? "bg-blue-600 text-white" : "bg-gray-400 text-white"
                  )}>
                    {step.id}
                  </div>
                  <span className={cn(
                    "text-sm font-medium",
                    isActive ? "text-blue-700" : "text-gray-500"
                  )}>
                    {step.title}
                  </span>
                </div>
                
                {/* Active step indicator glow effect */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 bg-blue-100 opacity-30 rounded-xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.2, 0.4, 0.2] }}
                    transition={{ 
                      duration: 2, 
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