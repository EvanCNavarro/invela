/**
 * ========================================
 * Authentication Layout Component
 * ========================================
 * 
 * Responsive authentication layout providing consistent structure and styling
 * for login and registration pages in the enterprise risk assessment platform.
 * Features adaptive design with hero sections and professional branding.
 * 
 * @module components/auth/AuthLayout
 * @version 1.0.0
 * @since 2025-05-23
 */

import React from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { AuthHeroSection } from "./AuthHeroSection";
import { AuthFooter } from "./AuthFooter";
import { LoginDemoHeader } from "./LoginDemoHeader";
import { DemoHeader } from "./DemoHeader";
import { StepIndicator } from "./StepIndicator";
import { DemoStepVisual } from "./DemoStepVisual";
import { motion } from "framer-motion";

// Temporary inline types until path resolution is fixed
type AuthMode = 'login' | 'register' | 'register-validated' | 'demo';
type AuthStep = 1 | 2 | 3 | 4 | 5;

interface AuthLayoutProps {
  children: React.ReactNode;
  mode: AuthMode;
  currentStep?: AuthStep;
  totalSteps?: AuthStep;
  onStepChange?: (step: AuthStep) => void;
  onBack?: () => void;
  isSystemSetup?: boolean; // Enhanced: Track system setup for step fading
}

export function AuthLayout({ 
  children, 
  mode, 
  currentStep = 1, 
  totalSteps = 3, 
  onStepChange, 
  onBack,
  isSystemSetup = false 
}: AuthLayoutProps) {
  
  console.log(`[AuthLayout] Rendering with mode: ${mode}, step: ${currentStep}/${totalSteps}`);
  return (
    <div className="min-h-screen flex flex-col justify-between bg-gray-100">
      {/* Header with spacing - no back button */}
      <div className="w-full flex justify-center pt-8">
        <motion.div 
          className={`w-full px-4 mb-4 transition-all duration-350 ease-out`}
          style={{ 
            maxWidth: mode === 'register-validated' ? '800px' : '980px' 
          }}
          layout
          transition={{ duration: 0.35, ease: "easeInOut" }}
        >

        </motion.div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6">
        {mode === 'register-validated' ? (
          // Account creation form (step 2 of registration) - narrow width
          <motion.div 
            className="auth-layout-container bg-white rounded-lg shadow-lg overflow-hidden min-h-[800px] h-auto pt-10 pb-14 w-full max-w-[800px]"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            layout
          >
            {children}
          </motion.div>
        ) : (
          // Login, register, or demo - wider width with two columns
          <motion.div 
            className="auth-layout-container bg-white rounded-lg shadow-lg overflow-hidden min-h-[700px] h-full flex flex-col w-full max-w-[980px]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            layout
          >
            {/* Headers for login and demo modes */}
            {mode === 'login' && (
              <div className="w-full">
                <LoginDemoHeader className="rounded-t-lg" />
              </div>
            )}
            {mode === 'demo' && (
              <div className="w-full">
                <DemoHeader className="rounded-t-lg" />
              </div>
            )}
            
            <div className="flex flex-1 h-full">
              {mode === 'login' ? (
                // Login layout with hero on right
                <>
                  <motion.div 
                    className="w-full lg:w-[55%] p-14 flex flex-col justify-center"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {children}
                  </motion.div>
                  <div className="hidden lg:block w-[45%] p-3">
                    <AuthHeroSection isLogin={true} />
                  </div>
                </>
              ) : mode === 'demo' ? (
                // Demo layout with step indicators on right
                <>
                  <motion.div 
                    className="w-full lg:w-[70%] px-14 flex flex-col h-full min-h-[760px]"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {children}
                  </motion.div>
                  <div className="hidden lg:block w-[30%] h-full min-h-[760px]">
                    <DemoStepVisual currentStep={currentStep} isSystemSetup={isSystemSetup} />
                  </div>
                </>
              ) : (
                // Register layout with hero on left
                <>
                  <div className="hidden lg:block w-[45%] p-3">
                    <AuthHeroSection isLogin={false} />
                  </div>
                  <motion.div 
                    className="w-full lg:w-[55%] p-14 flex flex-col justify-center"
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {children}
                  </motion.div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </div>
      
      {/* Footer */}
      <AuthFooter />
    </div>
  );
}