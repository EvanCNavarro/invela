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
  TrendingUp,
  FileText,
  Lock,
  User,
  Award,
  Database
} from "lucide-react";
import { cn } from "@/lib/utils";

// Temporary inline types until path resolution is fixed
type AuthStep = 1 | 2 | 3 | 4 | 5;

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
  showNext = true 
}: {
  onBack?: () => void;
  onNext?: () => void;
  showBack?: boolean;
  showNext?: boolean;
}) => (
  <div className="flex justify-between items-center pt-6">
    {showBack && onBack ? (
      <Button 
        onClick={onBack}
        variant="outline"
        size="lg"
        className="px-6 py-3 text-base font-semibold"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back
      </Button>
    ) : (
      <div />
    )}
    
    {showNext && onNext ? (
      <Button 
        onClick={onNext}
        size="lg"
        className="px-6 py-3 text-base font-semibold"
      >
        Next
        <ArrowRight className="w-5 h-5 ml-2" />
      </Button>
    ) : (
      <div />
    )}
  </div>
);

// ========================================
// DEMO STEP 1: PERSONA SELECTION
// ========================================

/**
 * First step: Interactive persona selection with visual feedback
 */
const DemoStep1 = ({ onNext }: { onNext: () => void }) => {
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  
  console.log('[DemoStep1] Rendering persona selection step');

  const personas = [
    {
      id: 'new-recipient',
      title: 'New Data Recipient',
      description: 'Starting your compliance journey with basic verification needs',
      icon: User,
      color: 'gray',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      textColor: 'text-gray-700',
      iconColor: 'text-gray-600'
    },
    {
      id: 'accredited-recipient',
      title: 'Accredited Data Recipient',
      description: 'Established organization with proven compliance track record',
      icon: Award,
      color: 'green',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
      iconColor: 'text-green-600'
    },
    {
      id: 'data-provider',
      title: 'Data Provider',
      description: 'Financial institution sharing customer data securely',
      icon: Database,
      color: 'purple',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-700',
      iconColor: 'text-purple-600'
    },
    {
      id: 'invela-admin',
      title: 'Invela Admin',
      description: 'Platform administrator managing the trust network',
      icon: Shield,
      color: 'blue',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      iconColor: 'text-blue-600'
    }
  ];

  const handlePersonaSelect = (personaId: string) => {
    console.log(`[DemoStep1] Selected persona: ${personaId}`);
    setSelectedPersona(personaId);
  };

  const handleContinue = () => {
    if (selectedPersona) {
      console.log(`[DemoStep1] Continuing with persona: ${selectedPersona}`);
      onNext();
    }
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
            Demo Persona Selection
          </div>
          <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-md text-sm font-medium">
            Step 1 of 3
          </div>
        </div>
        
        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900">
          Choose Your Experience
        </h1>
        <p className="text-lg text-muted-foreground">
          Select the persona that best matches your role to see a customized demo
        </p>
      </div>
      
      {/* MIDDLE SPACER */}
      <div className="flex-shrink-0 py-6"></div>
      
      {/* MAIN BODY SECTION */}
      <div className="flex-1 space-y-6">
        {/* Persona Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {personas.map((persona) => {
            const Icon = persona.icon;
            const isSelected = selectedPersona === persona.id;
            
            return (
              <motion.div
                key={persona.id}
                className={cn(
                  "relative p-6 rounded-lg border-2 cursor-pointer transition-all duration-200",
                  "hover:shadow-md hover:scale-[1.02]",
                  isSelected 
                    ? `${persona.borderColor} ${persona.bgColor} shadow-md` 
                    : "border-gray-200 bg-white hover:border-gray-300"
                )}
                onClick={() => handlePersonaSelect(persona.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Selection Indicator */}
                {isSelected && (
                  <motion.div
                    className="absolute top-4 right-4"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", persona.bgColor)}>
                      <CheckCircle className={cn("w-5 h-5", persona.iconColor)} />
                    </div>
                  </motion.div>
                )}
                
                {/* Content */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center",
                      isSelected ? persona.bgColor : "bg-gray-50"
                    )}>
                      <Icon className={cn(
                        "w-6 h-6",
                        isSelected ? persona.iconColor : "text-gray-600"
                      )} />
                    </div>
                    <div>
                      <h3 className={cn(
                        "text-lg font-semibold",
                        isSelected ? persona.textColor : "text-gray-900"
                      )}>
                        {persona.title}
                      </h3>
                    </div>
                  </div>
                  
                  <p className={cn(
                    "text-sm leading-relaxed",
                    isSelected ? persona.textColor : "text-gray-600"
                  )}>
                    {persona.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      
      {/* MIDDLE SPACER */}
      <div className="flex-shrink-0 py-6"></div>
      
      {/* BUTTON SECTION */}
      <div className="flex-shrink-0">
        <div className="flex justify-end">
          <Button 
            onClick={handleContinue}
            disabled={!selectedPersona}
            size="lg"
            className="px-8 py-3 text-base font-semibold"
          >
            Continue with Demo
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
      
      {/* BOTTOM SPACER */}
      <div className="flex-shrink-0 py-6"></div>
    </div>
  );
};

// ========================================
// DEMO STEP 2: PLATFORM OVERVIEW
// ========================================

/**
 * Second step: Platform capabilities overview with interactive elements
 */
const DemoStep2 = ({ onNext, onBack }: { onNext: () => void; onBack: () => void }) => {
  console.log('[DemoStep2] Rendering platform overview step');

  const features = [
    {
      icon: BarChart3,
      title: "Risk Analytics",
      description: "Real-time risk assessment with intelligent monitoring"
    },
    {
      icon: Shield,
      title: "Security First",
      description: "Enterprise-grade security and compliance controls"
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Seamless workflows for distributed teams"
    },
    {
      icon: TrendingUp,
      title: "Business Intelligence",
      description: "Actionable insights from comprehensive data analysis"
    }
  ];

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
            Platform Overview
          </div>
          <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-md text-sm font-medium">
            Step 2 of 3
          </div>
        </div>
        
        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900">
          Platform Capabilities
        </h1>
        <p className="text-lg text-muted-foreground">
          Discover the comprehensive features designed for your workflow
        </p>
      </div>
      
      {/* MIDDLE SPACER */}
      <div className="flex-shrink-0 py-6"></div>
      
      {/* MAIN BODY SECTION */}
      <div className="flex-1 space-y-8">
        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            
            return (
              <motion.div
                key={index}
                className="group p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ scale: 1.02, y: -2 }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Demo Preview Card */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <Play className="w-5 h-5" />
              Interactive Demo Preview
            </CardTitle>
            <CardDescription className="text-blue-700">
              Experience the platform in action with real-world scenarios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                "Live Risk Dashboard",
                "Compliance Workflows", 
                "Team Collaboration"
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-white/50 rounded-lg"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <span className="text-blue-800 font-medium">{item}</span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* MIDDLE SPACER */}
      <div className="flex-shrink-0 py-6"></div>
      
      {/* BUTTON SECTION */}
      <div className="flex-shrink-0">
        <DemoNavigation
          onBack={onBack}
          onNext={onNext}
        />
      </div>
      
      {/* BOTTOM SPACER */}
      <div className="flex-shrink-0 py-6"></div>
    </div>
  );
};

// ========================================
// DEMO STEP 3: COMPLETION & NEXT STEPS
// ========================================

/**
 * Third step: Demo completion with call-to-action
 */
const DemoStep3 = ({ onBack }: { onBack: () => void }) => {
  const [, setLocation] = useLocation();
  
  console.log('[DemoStep3] Rendering completion step');

  const handleGetStarted = () => {
    console.log('[DemoStep3] User clicked Get Started');
    setLocation('/dashboard');
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
            Demo Complete
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
      </div>

      {/* MIDDLE SPACER */}
      <div className="flex-shrink-0 py-6"></div>
      
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
  
  console.log(`[DemoPage] Rendering step ${currentStep}/3`);

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
        return <DemoStep1 onNext={handleNextStep} />;
      case 2:
        return <DemoStep2 onNext={handleNextStep} onBack={handlePreviousStep} />;
      case 3:
        return <DemoStep3 onBack={handlePreviousStep} />;
      default:
        return <DemoStep1 onNext={handleNextStep} />;
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