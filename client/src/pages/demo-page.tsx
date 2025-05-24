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
import { DemoHeader } from "@/components/auth/DemoHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowRight, 
  Play, 
  CheckCircle, 
  BarChart3, 
  Shield, 
  Users,
  TrendingUp,
  FileText,
  Lock
} from "lucide-react";

// Temporary inline types until path resolution is fixed
type AuthStep = 1 | 2 | 3 | 4 | 5;

// ========================================
// DEMO STEP CONTENT COMPONENTS
// ========================================

/**
 * Step 1: Platform Overview
 */
const DemoStep1 = ({ onNext }: { onNext: () => void }) => {
  console.log('[DemoStep1] Rendering platform overview');
  
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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <img
            src="/invela-logo.svg"
            alt="Invela"
            className="h-14 w-14 mb-6"
          />
          <h1 className="text-3xl font-bold mb-3">
            Welcome to Invela Trust Network
          </h1>
          <p className="text-lg text-muted-foreground">
            Experience our comprehensive risk assessment platform through this interactive demo
          </p>
        </motion.div>
      </div>

      {/* Feature Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <div>
                <CardTitle className="text-lg">Risk Assessment</CardTitle>
                <CardDescription>Comprehensive KYB, KY3P & Open Banking</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-green-600" />
              <div>
                <CardTitle className="text-lg">Real-time Analytics</CardTitle>
                <CardDescription>Dynamic dashboards and reporting</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-purple-600" />
              <div>
                <CardTitle className="text-lg">Team Collaboration</CardTitle>
                <CardDescription>Multi-user workflow management</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Lock className="w-8 h-8 text-orange-600" />
              <div>
                <CardTitle className="text-lg">Enterprise Security</CardTitle>
                <CardDescription>Bank-grade security and compliance</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Action Button */}
      <motion.div
        className="flex justify-center pt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <Button 
          onClick={onNext}
          size="lg"
          className="px-8 py-3 text-base font-semibold"
        >
          <Play className="w-5 h-5 mr-2" />
          Start Interactive Demo
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </motion.div>
    </motion.div>
  );
};

/**
 * Step 2: Interactive Demo Experience
 */
const DemoStep2 = ({ onNext }: { onNext: () => void }) => {
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

      {/* Action Button */}
      <motion.div
        className="flex justify-center pt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <Button 
          onClick={onNext}
          size="lg"
          className="px-8 py-3 text-base font-semibold"
        >
          View Results & Next Steps
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </motion.div>
    </motion.div>
  );
};

/**
 * Step 3: Results and Next Steps
 */
const DemoStep3 = () => {
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
        <p className="text-lg text-muted-foreground">
          You've experienced the power of Invela Trust Network
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

      {/* Action Buttons */}
      <motion.div
        className="flex flex-col sm:flex-row gap-4 justify-center"
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
        return <DemoStep2 onNext={handleNextStep} />;
      case 3:
        return <DemoStep3 />;
      default:
        return <DemoStep1 onNext={handleNextStep} />;
    }
  };

  // ========================================
  // MAIN RENDER
  // ========================================

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Demo Header with Back to Login */}
      <div className="w-full flex justify-center pt-8">
        <div className="w-full px-4 mb-4 transition-all duration-350 ease-out" style={{ maxWidth: '980px' }}>
          <DemoHeader />
        </div>
      </div>

      {/* Main Demo Content */}
      <AuthLayout
        mode="demo"
        currentStep={currentStep}
        totalSteps={3}
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
    </div>
  );
}