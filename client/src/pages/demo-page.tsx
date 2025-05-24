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
  UserPlus,
  Award,
  Database,
  Settings
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
    <motion.div
      className="flex justify-between items-center pt-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.4 }}
    >
      {/* Back Button */}
      <div className="flex-1">
        {showBack && onBack && (
          <Button 
            variant="outline" 
            onClick={onBack}
            className="px-6 py-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
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
    </motion.div>
  );
};

// ========================================
// DEMO STEP CONTENT COMPONENTS
// ========================================

/**
 * Step 1: Platform Overview
 */
const DemoStep1 = ({ onNext }: { onNext: () => void }) => {
  console.log('[DemoStep1] Rendering platform overview');
  
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);

  const personas = [
    {
      id: "new-data-recipient",
      title: "New Data Recipient",
      description: "Explore initial onboarding and data access workflows",
      icon: UserPlus,
      color: "fintech" // Fintech user type
    },
    {
      id: "accredited-data-recipient", 
      title: "Accredited Data Recipient",
      description: "Experience advanced data management capabilities",
      icon: Award,
      color: "fintech" // Fintech user type
    },
    {
      id: "data-provider",
      title: "Data Provider",
      description: "Discover data sharing and compliance features",
      icon: Database,
      color: "bank" // Bank admin type
    },
    {
      id: "invela-admin",
      title: "Invela Admin",
      description: "Access administrative controls and system management",
      icon: Settings,
      color: "umbrella" // Umbrella admin type
    }
  ];

  const getColorClasses = (color: string, isSelected: boolean) => {
    const colorMap = {
      fintech: isSelected 
        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-offset-2" 
        : "border-gray-200 bg-gray-50/30 hover:border-blue-300",
      bank: isSelected 
        ? "border-purple-500 bg-purple-50 ring-2 ring-purple-500 ring-offset-2" 
        : "border-gray-200 bg-gray-50/30 hover:border-purple-300",
      umbrella: isSelected 
        ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600 ring-offset-2" 
        : "border-gray-200 bg-gray-50/30 hover:border-blue-400"
    };
    return colorMap[color as keyof typeof colorMap];
  };

  const getIconColor = (color: string) => {
    const colorMap = {
      fintech: "text-blue-600",
      bank: "text-purple-600", 
      umbrella: "text-blue-700"
    };
    return colorMap[color as keyof typeof colorMap];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* Compact Header */}
      <div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="space-y-3"
        >
          {/* Icon + Chip */}
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
          </div>
          
          {/* Compact Title */}
          <h1 className="text-2xl font-bold text-gray-900">
            Select Demo Persona
          </h1>
          
          {/* Single Sentence Subtext */}
          <p className="text-base text-gray-600">
            Pick a role to experience the platform from their perspective.
          </p>
        </motion.div>
      </div>

      {/* User Type Selection - Single Column */}
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        {personas.map((persona, index) => {
          const Icon = persona.icon;
          const isSelected = selectedPersona === persona.id;
          
          return (
            <motion.div
              key={persona.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.3 }}
            >
              <Card 
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-md",
                  getColorClasses(persona.color, isSelected)
                )}
                onClick={() => setSelectedPersona(persona.id)}
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
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="text-blue-600"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </motion.div>
                      ) : (
                        <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Navigation */}
      <DemoNavigation
        onNext={onNext}
        showBack={false}
        nextDisabled={!selectedPersona}
        nextText="Continue Demo"
      />
    </motion.div>
  );
};

/**
 * Step 2: Interactive Demo Experience
 */
const DemoStep2 = ({ onNext, onBack }: { onNext: () => void; onBack: () => void }) => {
  console.log('[DemoStep2] Rendering interactive demo');
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-3">
          Interactive Platform Demo
        </h1>
        <p className="text-lg text-muted-foreground">
          Explore key features with real-time simulated data
        </p>
      </div>

      {/* Interactive Elements */}
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Sample Company Assessment</h3>
            <div className="flex items-center gap-2 text-green-600">
              <TrendingUp className="w-5 h-5" />
              <span className="font-medium">92% Complete</span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">98%</div>
              <div className="text-sm text-gray-600">KYB Score</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">95%</div>
              <div className="text-sm text-gray-600">KY3P Score</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">91%</div>
              <div className="text-sm text-gray-600">Banking Score</div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Assessment Complete - Low Risk Profile</span>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {[
              { icon: FileText, text: "KYB documentation verified", time: "2 minutes ago" },
              { icon: Shield, text: "Risk assessment completed", time: "5 minutes ago" },
              { icon: Users, text: "Team member added review", time: "12 minutes ago" }
            ].map((item, index) => (
              <motion.div
                key={index}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <item.icon className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <span className="text-sm font-medium">{item.text}</span>
                  <div className="text-xs text-gray-500">{item.time}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      {/* Navigation */}
      <DemoNavigation
        onBack={onBack}
        onNext={onNext}
        nextText="View Results & Next Steps"
      />
    </motion.div>
  );
};

/**
 * Step 3: Results and Next Steps
 */
const DemoStep3 = ({ onBack }: { onBack: () => void }) => {
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* Success Header */}
      <div className="text-center">
        <motion.div
          className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
        >
          <CheckCircle className="w-12 h-12 text-green-600" />
        </motion.div>
        
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
      
      {/* Action Buttons */}
      <motion.div
        className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
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
      </motion.div>
    </motion.div>
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
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {renderStepContent()}
        </motion.div>
      </AnimatePresence>
    </AuthLayout>
  );
}