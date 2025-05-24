/**
 * ========================================
 * Demo Page Component
 * ========================================
 * 
 * Interactive demo walkthrough providing users with a guided experience
 * of the Invela Trust Network platform through three progressive steps.
 * 
 * @module pages/demo-page
 * @version 1.0.0
 * @since 2025-05-24
 */

import React, { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowRight, 
  ArrowLeft,
  Play, 
  CheckCircle, 
  BarChart3, 
  Shield, 
  Users,
  User,
  TrendingUp,
  FileText,
  Lock,
  UserPlus,
  Award,
  Database,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

// Temporary inline types until path resolution is fixed
type AuthStep = 1 | 2 | 3 | 4 | 5;

// ========================================
// DEMO FLOW TYPES & INTERFACES
// ========================================

/**
 * Persona type definition for demo flow state management
 * Ensures type safety across demo steps and enables proper persona tracking
 */
interface DemoPersona {
  id: string;
  title: string;
  description: string;
  icon: typeof User | typeof Award | typeof Database | typeof Shield;
  color: 'gray' | 'green' | 'purple' | 'blue';
}

/**
 * Props interface for demo step components
 * Standardizes prop structure across all demo steps for consistent data flow
 */
interface DemoStepProps {
  onNext: () => void;
  onBack?: () => void;
  selectedPersona?: DemoPersona | null;
  onPersonaSelect?: (persona: DemoPersona) => void;
}

// ========================================
// DEMO FLOW CONSTANTS
// ========================================

/**
 * Shared persona definitions for consistent usage across demo steps
 * Centralized configuration enables easy maintenance and consistent behavior
 */
const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: "new-data-recipient",
    title: "New Data Recipient",
    description: "Explore initial onboarding and data access workflows",
    icon: User,
    color: "gray"
  },
  {
    id: "accredited-data-recipient", 
    title: "Accredited Data Recipient",
    description: "Experience advanced data management capabilities",
    icon: Award,
    color: "green"
  },
  {
    id: "data-provider",
    title: "Data Provider",
    description: "Discover data sharing and compliance features",
    icon: Database,
    color: "purple"
  },
  {
    id: "invela-admin",
    title: "Invela Admin",
    description: "Discover administrative and compliance management features",
    icon: Shield,
    color: "blue"
  }
];

/**
 * Utility function to get icon color classes for persona display
 * Centralizes color mapping logic for consistent styling across components
 */
const getIconColorForPersona = (color: 'gray' | 'green' | 'purple' | 'blue'): string => {
  const colorMap = {
    gray: "text-gray-500",
    green: "text-green-600",
    purple: "text-purple-600",
    blue: "text-blue-600"
  };
  return colorMap[color] || "text-gray-500";
};

// ========================================
// NAVIGATION COMPONENT
// ========================================

/**
 * Consistent navigation component for demo steps
 */
const DemoNavigation = ({ 
  onBack, 
  onNext, 
  showBack = true, 
  showNext = true, 
  nextDisabled = false,
  nextText = "Continue"
}: {
  onBack?: () => void;
  onNext?: () => void;
  showBack?: boolean;
  showNext?: boolean;
  nextDisabled?: boolean;
  nextText?: string;
}) => {
  return (
    <div className="flex justify-between items-center pt-8">
      {/* Back Button */}
      <div className="flex-1">
        {showBack && onBack && (
          <Button 
            variant="outline" 
            onClick={onBack}
            size="lg"
            className="px-8 py-3 text-base font-semibold"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Previous
          </Button>
        )}
      </div>

      {/* Next Button */}
      <div className="flex-1 flex justify-end">
        {showNext && onNext && (
          <Button 
            onClick={onNext}
            disabled={nextDisabled}
            size="lg"
            className="px-8 py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {nextText}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
};

// ========================================
// DEMO STEP CONTENT COMPONENTS
// ========================================

/**
 * Step 1: Platform Overview
 * Updated to use shared state management for persona selection
 */
const DemoStep1 = ({ onNext, selectedPersona, onPersonaSelect }: DemoStepProps) => {
  console.log('[DemoStep1] Rendering platform overview');
  
  /**
   * Handle persona selection with proper state management
   * Updates shared state that will be used in subsequent steps
   */
  const handlePersonaSelect = (persona: DemoPersona) => {
    console.log('[DemoStep1] Persona selected:', persona.id);
    onPersonaSelect?.(persona);
  };

  const getColorClasses = (color: string, isSelected: boolean) => {
    console.log(`[DemoStep1] Applying color scheme: ${color}, selected: ${isSelected}`);
    
    // All personas use consistent blue selection color regardless of icon color
    return isSelected 
      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-offset-2" 
      : "border-gray-200 bg-gray-50/30 hover:border-blue-300";
  };

  const getIconColor = (color: string) => {
    console.log(`[DemoStep1] Setting icon color for: ${color}`);
    
    const colorMap = {
      gray: "text-gray-500",      // New Data Recipient - gray icon
      green: "text-green-600",    // Accredited Data Recipient - green icon
      purple: "text-purple-600",  // Data Provider - purple icon
      blue: "text-blue-600",      // Invela Admin - blue icon
      
      // Legacy support for backward compatibility
      grayscale: "text-gray-500",
      fintech: "text-blue-600",
      bank: "text-purple-600", 
      umbrella: "text-blue-700"
    };
    return colorMap[color as keyof typeof colorMap] || "text-gray-500";
  };

  return (
    <div className="h-full flex flex-col min-h-[760px]">
      {/* TOP SPACER - same spacing used throughout */}
      <div className="flex-shrink-0 py-6"></div>
      
      {/* TOP SECTION: Fixed height header */}
      <div className="flex-shrink-0 space-y-2">
        {/* Icon + Chips */}
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600">
              <path d="M2.3134 6.81482H4.54491V9.03704H2.3134V6.81482Z" fill="currentColor"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M13.7685 8C13.7685 11.191 11.1709 13.7778 7.96656 13.7778C5.11852 13.7778 2.74691 11.7323 2.25746 9.03704H0C0.510602 12.9654 3.88272 16 7.96656 16C12.4033 16 16 12.4183 16 8C16 3.58172 12.4033 0 7.96656 0C3.9342 0 0.595742 2.95856 0.0206721 6.81482H2.28637C2.83429 4.19289 5.17116 2.22222 7.96656 2.22222C11.1709 2.22222 13.7685 4.80902 13.7685 8Z" fill="currentColor"/>
            </svg>
          </div>
          <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-md text-sm font-medium">
            Demo Login Setup
          </div>
          <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-md text-sm font-medium">
            Step 1 of 3
          </div>
        </div>
        
        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900">
          Select Demo Persona
        </h1>
        
        {/* Subtext */}
        <p className="text-base text-gray-600">
          Pick a role to experience the platform from their perspective.
        </p>
      </div>

      {/* MIDDLE SPACER - same spacing as top and bottom */}
      <div className="flex-shrink-0 py-6"></div>

      {/* MIDDLE SECTION: Flex-grow content area - top aligned */}
      <div className="flex-1">
        <div className="space-y-3">
          {DEMO_PERSONAS.map((persona, index) => {
            const Icon = persona.icon;
            const isSelected = selectedPersona?.id === persona.id;
            
            return (
              <div key={persona.id}>
                <Card 
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:shadow-md",
                    getColorClasses(persona.color, isSelected),
                    // Reduce opacity for unselected items when something is selected
                    selectedPersona && !isSelected ? "opacity-60" : "opacity-100"
                  )}
                  onClick={() => handlePersonaSelect(persona)}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-center gap-4">
                      {/* User Type Icon */}
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        isSelected ? "bg-white shadow-sm" : "bg-white/80"
                      )}>
                        <Icon className={cn("w-5 h-5", getIconColor(persona.color))} />
                      </div>
                      
                      {/* User Info */}
                      <div className="flex-1">
                        <CardTitle className="text-base font-semibold text-gray-900 mb-1">
                          {persona.title}
                        </CardTitle>
                        <CardDescription className="text-gray-600 text-sm">
                          {persona.description}
                        </CardDescription>
                      </div>
                      
                      {/* Selection Indicator */}
                      <div className="flex items-center">
                        {isSelected ? (
                          <div className="text-blue-600">
                            <CheckCircle className="w-5 h-5" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* BOTTOM SECTION: Fixed height button area */}
      <div className="flex-shrink-0">
        <DemoNavigation
          onNext={onNext}
          showBack={false}
          nextDisabled={!selectedPersona}
          nextText="Next Step"
        />
      </div>
      
      {/* BOTTOM SPACER - same spacing as top and middle */}
      <div className="flex-shrink-0 py-6"></div>
    </div>
  );
};

/**
 * Step 2: Interactive Demo Experience
 * Now displays the selected persona from Step 1 instead of generic form data
 */
const DemoStep2 = ({ onNext, onBack, selectedPersona }: DemoStepProps) => {
  console.log('[DemoStep2] Rendering interactive demo', { selectedPersona: selectedPersona?.id });
  
  return (
    <div className="h-[760px] flex flex-col">
      {/* TOP SPACER */}
      <div className="flex-shrink-0 py-6"></div>
      
      {/* HEADER SECTION */}
      <div className="flex-shrink-0 space-y-2">
        {/* Icon + Chips */}
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600">
              <path d="M2.3134 6.81482H4.54491V9.03704H2.3134V6.81482Z" fill="currentColor"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M13.7685 8C13.7685 11.191 11.1709 13.7778 7.96656 13.7778C5.11852 13.7778 2.74691 11.7323 2.25746 9.03704H0C0.510602 12.9654 3.88272 16 7.96656 16C12.4033 16 16 12.4183 16 8C16 3.58172 12.4033 0 7.96656 0C3.9342 0 0.595742 2.95856 0.0206721 6.81482H2.28637C2.83429 4.19289 5.17116 2.22222 7.96656 2.22222C11.1709 2.22222 13.7685 4.80902 13.7685 8Z" fill="currentColor"/>
            </svg>
          </div>
          <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-md text-sm font-medium">
            Demo Login Setup
          </div>
          <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-md text-sm font-medium">
            Step 2 of 3
          </div>
        </div>
        
        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900">
          Customize Demo Experience
        </h1>
        <p className="text-base text-gray-600">
          {selectedPersona ? (
            <>Select preferences for <span className="font-semibold text-gray-900">{selectedPersona.title}</span> to personalize your demo experience.</>
          ) : (
            "Select preferences to personalize your demo experience."
          )}
        </p>
      </div>
      
      {/* MIDDLE SPACER */}
      <div className="flex-shrink-0 py-6"></div>
      
      {/* MAIN BODY SECTION */}
      <div className="flex-1 space-y-6">
        {selectedPersona ? (
          <div className="space-y-4">
            {/* Space for persona-specific customization components */}
          </div>
        ) : (
          <Card className="p-6">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Persona Selected</h3>
              <p className="text-gray-600 text-sm">
                Please go back to Step 1 to select a demo persona
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* BUTTON SECTION */}
      <div className="flex-shrink-0">
        <DemoNavigation
          onBack={onBack}
          onNext={onNext}
          nextText="Next Step"
        />
      </div>
      
      {/* BOTTOM SPACER */}
      <div className="flex-shrink-0 py-6"></div>
    </div>
  );
};

/**
 * Step 3: Results and Next Steps
 */
const DemoStep3 = ({ onBack, selectedPersona }: DemoStepProps) => {
  const [, setLocation] = useLocation();
  
  console.log('[DemoStep3] Rendering results and next steps');
  
  const handleGetStarted = () => {
    console.log('[DemoStep3] User clicked Get Started - redirecting to registration');
    setLocation('/register');
  };

  const handleBackToLogin = () => {
    console.log('[DemoStep3] User clicked Back to Login');
    setLocation('/login');
  };
  
  return (
    <div className="h-[760px] flex flex-col">
      {/* TOP SPACER */}
      <div className="flex-shrink-0 py-6"></div>
      
      {/* HEADER SECTION */}
      <div className="flex-shrink-0 space-y-2">
        {/* Icon + Chips */}
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600">
              <path d="M2.3134 6.81482H4.54491V9.03704H2.3134V6.81482Z" fill="currentColor"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M13.7685 8C13.7685 11.191 11.1709 13.7778 7.96656 13.7778C5.11852 13.7778 2.74691 11.7323 2.25746 9.03704H0C0.510602 12.9654 3.88272 16 7.96656 16C12.4033 16 16 12.4183 16 8C16 3.58172 12.4033 0 7.96656 0C3.9342 0 0.595742 2.95856 0.0206721 6.81482H2.28637C2.83429 4.19289 5.17116 2.22222 7.96656 2.22222C11.1709 2.22222 13.7685 4.80902 13.7685 8Z" fill="currentColor"/>
            </svg>
          </div>
          <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-md text-sm font-medium">
            Demo Login Setup
          </div>
          <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-md text-sm font-medium">
            Step 3 of 3
          </div>
        </div>
        
        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900">
          Demo Complete - Get Started
        </h1>
        <p className="text-lg text-muted-foreground">
          Ready to explore the full platform capabilities
        </p>
      </div>
      
      {/* MIDDLE SPACER */}
      <div className="flex-shrink-0 py-6"></div>
      
      {/* MAIN BODY SECTION */}
      <div className="flex-1 space-y-8">
        {/* Success Header */}
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        
          <h1 className="text-3xl font-bold mb-3">
            Demo Complete!
          </h1>
          <p className="text-base text-muted-foreground">
            You've seen how the platform works for your selected persona.
          </p>
        </div>

      {/* Results Summary */}
      <Card className="p-6 border-green-200 bg-green-50/30">
        <h3 className="text-xl font-semibold mb-4 text-green-800">What You've Seen:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            "Comprehensive risk assessment tools",
            "Real-time analytics and dashboards", 
            "Automated compliance workflows",
            "Enterprise-grade security features"
          ].map((feature, index) => (
            <motion.div
              key={index}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span className="text-green-800 font-medium">{feature}</span>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Navigation */}
      <DemoNavigation
        onBack={onBack}
        showNext={false}
      />
      </div>
      
      {/* BUTTON SECTION */}
      <div className="flex-shrink-0">
        <div className="flex flex-col gap-3">
          <Button 
            onClick={handleGetStarted}
            size="lg"
            className="px-8 py-3 text-base font-semibold"
          >
            Get Started Now
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          
          <Button 
            onClick={handleBackToLogin}
            variant="outline"
            size="lg"
            className="px-8 py-3 text-base font-semibold"
          >
            Back to Login
          </Button>
        </div>
      </div>
      
      {/* BOTTOM SPACER */}
      <div className="flex-shrink-0 py-6"></div>
    </div>
  );
};

// ========================================
// MAIN DEMO PAGE COMPONENT
// ========================================

/**
 * DemoPage Component
 * 
 * Main demo page orchestrating the three-step demo experience with
 * smooth transitions and comprehensive progress tracking.
 */
export default function DemoPage() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<AuthStep>(1);
  
  // ========================================
  // DEMO FLOW STATE MANAGEMENT
  // ========================================
  
  /**
   * Shared persona selection state across demo steps
   * Enables consistent data flow from step 1 selection to step 2 display and step 3 actions
   */
  const [selectedPersona, setSelectedPersona] = useState<DemoPersona | null>(null);
  
  console.log(`[DemoPage] Rendering step ${currentStep}/3`, { selectedPersona: selectedPersona?.id });

  // ========================================
  // NAVIGATION HANDLERS
  // ========================================

  const handleNextStep = useCallback(() => {
    if (currentStep < 3) {
      const nextStep = (currentStep + 1) as AuthStep;
      console.log(`[DemoPage] Advancing to step ${nextStep}`);
      setCurrentStep(nextStep);
    }
  }, [currentStep]);

  const handlePreviousStep = useCallback(() => {
    const prevStep = Math.max(1, currentStep - 1) as AuthStep;
    console.log(`[DemoPage] Going back to step ${prevStep}`);
    setCurrentStep(prevStep);
  }, [currentStep]);

  const handleBackToLogin = useCallback(() => {
    console.log('[DemoPage] Returning to login page');
    setLocation('/login');
  }, [setLocation]);

  // ========================================
  // STEP CONTENT RENDERING
  // ========================================

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <DemoStep1 
            onNext={handleNextStep} 
            selectedPersona={selectedPersona}
            onPersonaSelect={setSelectedPersona}
          />
        );
      case 2:
        return (
          <DemoStep2 
            onNext={handleNextStep} 
            onBack={handlePreviousStep}
            selectedPersona={selectedPersona}
          />
        );
      case 3:
        return (
          <DemoStep3 
            onBack={handlePreviousStep}
            selectedPersona={selectedPersona}
          />
        );
      default:
        return (
          <DemoStep1 
            onNext={handleNextStep} 
            selectedPersona={selectedPersona}
            onPersonaSelect={setSelectedPersona}
          />
        );
    }
  };

  // ========================================
  // MAIN RENDER
  // ========================================

  return (
    <AuthLayout
      mode="demo"
      currentStep={currentStep}
      totalSteps={3}
      onBack={handleBackToLogin}
    >
      {renderStepContent()}
    </AuthLayout>
  );
}