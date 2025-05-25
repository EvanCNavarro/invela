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
  Settings,
  Check,
  Shuffle
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
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
  nextText = "Continue",
  nextIcon
}: {
  onBack?: () => void;
  onNext?: () => void;
  showBack?: boolean;
  showNext?: boolean;
  nextDisabled?: boolean;
  nextText?: string;
  nextIcon?: React.ReactNode;
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
            {nextIcon || <ArrowRight className="w-5 h-5 ml-2" />}
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

// ========================================
// DEMO CUSTOMIZATION TYPES & INTERFACES
// ========================================

/**
 * Form field control types for demo customization
 * Defines how each field can be controlled by the user
 */
type FieldControlType = 'locked' | 'random' | 'custom';

/**
 * Demo customization form state interface
 * Manages all user preferences for the demo experience
 */
interface DemoCustomizationForm {
  persona: string;
  companyName: string;
  companyNameControl: 'random' | 'custom';
  userFullName: string;
  userFullNameControl: 'random' | 'custom';
  userEmail: string;
  emailInviteEnabled: boolean;
  isDemoCompany: boolean;
}

/**
 * Random data generators for demo values
 * Provides realistic sample data for the demo experience
 */
const DEMO_DATA_GENERATORS = {
  companyNames: [
    "WealthWave Financial",
    "SecureVault Capital", 
    "TrustLink Partners",
    "NextGen Banking",
    "RiskShield Analytics"
  ],
  firstNames: [
    "Alex", "Jordan", "Casey", "Morgan", "Riley",
    "Taylor", "Cameron", "Jamie", "Quinn", "Sage"
  ],
  lastNames: [
    "Anderson", "Chen", "Johnson", "Williams", "Brown",
    "Davis", "Miller", "Wilson", "Moore", "Taylor"
  ]
} as const;

/**
 * Step 2: Interactive Demo Customization
 * 
 * Comprehensive form for personalizing the demo experience based on
 * the selected persona from Step 1. Implements field-level control
 * with random/custom toggles and persona-specific options.
 */
const DemoStep2 = ({ onNext, onBack, selectedPersona }: DemoStepProps) => {
  console.log('[DemoStep2] Rendering interactive demo', { selectedPersona: selectedPersona?.id });
  
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  
  /**
   * Form state management with proper TypeScript typing
   * Includes default values and persona-specific configurations
   */
  const [formData, setFormData] = useState<DemoCustomizationForm>(() => {
    // Helper function needs to be defined before use
    function generateEmailFromDataInit(firstName: string, lastName: string, companyName: string): string {
      const firstLetter = firstName.charAt(0).toLowerCase();
      const cleanLastName = lastName.toLowerCase();
      const cleanCompany = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/financial|capital|partners|banking|analytics/g, '')
        .trim();
      
      return `${firstLetter}${cleanLastName}@${cleanCompany}.com`;
    }
    const randomCompany = DEMO_DATA_GENERATORS.companyNames[
      Math.floor(Math.random() * DEMO_DATA_GENERATORS.companyNames.length)
    ];
    const randomFirstName = DEMO_DATA_GENERATORS.firstNames[
      Math.floor(Math.random() * DEMO_DATA_GENERATORS.firstNames.length)
    ];
    const randomLastName = DEMO_DATA_GENERATORS.lastNames[
      Math.floor(Math.random() * DEMO_DATA_GENERATORS.lastNames.length)
    ];
    
    return {
      persona: selectedPersona?.title || '',
      companyName: randomCompany,
      companyNameControl: 'random',
      userFullName: `${randomFirstName} ${randomLastName}`,
      userFullNameControl: 'random',
      userEmail: generateEmailFromDataInit(randomFirstName, randomLastName, randomCompany),
      emailInviteEnabled: false, // Default to off for persona-specific features
      isDemoCompany: true        // Default to on as specified
    };
  });
  
  // ========================================
  // UTILITY FUNCTIONS
  // ========================================
  
  /**
   * Generates email address from user name and company
   * Follows the pattern: firstletter + lastname @ companydomain.com
   * 
   * @param firstName - User's first name
   * @param lastName - User's last name  
   * @param companyName - Company name for domain generation
   * @returns Generated email address
   */
  function generateEmailFromData(firstName: string, lastName: string, companyName: string): string {
    const firstLetter = firstName.charAt(0).toLowerCase();
    const cleanLastName = lastName.toLowerCase();
    const cleanCompany = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/financial|capital|partners|banking|analytics/g, '')
      .trim();
    
    return `${firstLetter}${cleanLastName}@${cleanCompany}.com`;
  }
  
  /**
   * Generates new random values for specified fields
   * Updates form state with fresh random data
   */
  function generateRandomValues(fields: Array<'companyName' | 'userFullName'>): void {
    const updates: Partial<DemoCustomizationForm> = {};
    
    if (fields.includes('companyName')) {
      updates.companyName = DEMO_DATA_GENERATORS.companyNames[
        Math.floor(Math.random() * DEMO_DATA_GENERATORS.companyNames.length)
      ];
    }
    
    if (fields.includes('userFullName')) {
      const firstName = DEMO_DATA_GENERATORS.firstNames[
        Math.floor(Math.random() * DEMO_DATA_GENERATORS.firstNames.length)
      ];
      const lastName = DEMO_DATA_GENERATORS.lastNames[
        Math.floor(Math.random() * DEMO_DATA_GENERATORS.lastNames.length)
      ];
      updates.userFullName = `${firstName} ${lastName}`;
    }
    
    setFormData(prev => {
      const newData = { ...prev, ...updates };
      
      // Auto-update email when name or company changes
      if (updates.companyName || updates.userFullName) {
        const [firstName, lastName] = newData.userFullName.split(' ');
        newData.userEmail = generateEmailFromData(firstName, lastName, newData.companyName);
      }
      
      return newData;
    });
  }
  
  /**
   * Determines if persona-specific fields should be displayed
   * Different personas have different available options
   */
  function shouldShowPersonaSpecificField(fieldName: 'emailInvite' | 'demoCompany'): boolean {
    if (!selectedPersona) return false;
    
    // All personas currently support both fields
    // This can be customized based on persona requirements
    return true;
  }
  
  // ========================================
  // EVENT HANDLERS
  // ========================================
  
  /**
   * Handles field control type changes (random/custom toggles)
   * Manages the transition between random and custom field states
   */
  const handleControlTypeChange = (
    field: 'companyNameControl' | 'userFullNameControl',
    newType: 'random' | 'custom'
  ) => {
    setFormData(prev => {
      const updates = { ...prev, [field]: newType };
      
      // When switching to custom, clear the field for user input
      if (newType === 'custom') {
        if (field === 'companyNameControl') {
          updates.companyName = '';
        } else if (field === 'userFullNameControl') {
          updates.userFullName = '';
        }
      }
      // When switching to random, generate new random value
      else if (newType === 'random') {
        if (field === 'companyNameControl') {
          generateRandomValues(['companyName']);
          return prev; // generateRandomValues will update state
        } else if (field === 'userFullNameControl') {
          generateRandomValues(['userFullName']);
          return prev; // generateRandomValues will update state
        }
      }
      
      return updates;
    });
  };
  
  /**
   * Handles direct field value changes for custom inputs
   * Updates form state and auto-generates dependent fields
   */
  const handleFieldChange = (field: keyof DemoCustomizationForm, value: string | boolean) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-update email when name or company changes
      if (field === 'companyName' || field === 'userFullName') {
        const [firstName, lastName] = newData.userFullName.split(' ');
        if (firstName && lastName) {
          newData.userEmail = generateEmailFromData(firstName, lastName, newData.companyName);
        }
      }
      
      return newData;
    });
  };
  
  // ========================================
  // RENDER
  // ========================================
  
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
          <div className="space-y-6">
            {/* Demo Customization Form - Clean 4-Column Layout */}
            <div className="bg-white/40 backdrop-blur-sm rounded-lg border border-gray-100/50 overflow-hidden">
              
              {/* Header Row */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50/30 border-b border-gray-100/50 text-xs font-medium text-gray-600 uppercase tracking-wide">
                <div className="col-span-3">Field</div>
                <div className="col-span-2">Source</div>
                <div className="col-span-6">Value</div>
                <div className="col-span-1"></div>
              </div>
              
              {/* 1. Persona Field (System Generated) */}
              <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-100/30 hover:bg-gray-50/20 transition-colors">
                <div className="col-span-3 flex items-center">
                  <span className="text-sm font-medium text-gray-700">Selected Persona</span>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-xs text-gray-500 bg-gray-100/50 px-2 py-1 rounded-full border border-gray-200/40">System</span>
                </div>
                <div className="col-span-6 flex items-center">
                  <div className="relative w-full">
                    <input
                      type="text"
                      value={formData.persona}
                      disabled
                      className="w-full px-3 py-2 text-sm border border-gray-200/60 rounded-md bg-gray-50/50 text-gray-600 cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Lock className="h-3 w-3 text-gray-400" />
                    </div>
                  </div>
                </div>
                <div className="col-span-1"></div>
              </div>
              
              {/* 2. Company Name Field */}
              <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-100/30 hover:bg-gray-50/20 transition-colors">
                <div className="col-span-3 flex items-center">
                  <span className="text-sm font-medium text-gray-700">Company Name</span>
                </div>
                <div className="col-span-2 flex items-center">
                  <div className="relative">
                    <select
                      value={formData.companyNameControl}
                      onChange={(e) => handleControlTypeChange('companyNameControl', e.target.value as 'random' | 'custom')}
                      className="text-xs px-2 py-1 rounded-full border border-gray-200/60 bg-white/80 text-gray-700 hover:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer appearance-none pr-6"
                    >
                      <option value="random">Random (default)</option>
                      <option value="custom">Custom</option>
                    </select>
                    <div className="absolute right-1 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="col-span-6 flex items-center">
                  <div className="relative w-full">
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => handleFieldChange('companyName', e.target.value)}
                      disabled={formData.companyNameControl === 'random'}
                      placeholder={formData.companyNameControl === 'custom' ? "Enter company name..." : ""}
                      className={cn(
                        "w-full px-3 py-2 text-sm border rounded-md transition-all",
                        formData.companyNameControl === 'random' 
                          ? "border-gray-200/60 bg-gray-50/50 text-gray-600 cursor-not-allowed" 
                          : "border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      )}
                    />
                    {formData.companyNameControl === 'random' && (
                      <button
                        type="button"
                        onClick={() => generateRandomValues(['companyName'])}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Shuffle className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="col-span-1"></div>
              </div>
              
              {/* 3. User Full Name Field */}
              <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-100/30 hover:bg-gray-50/20 transition-colors">
                <div className="col-span-3 flex items-center">
                  <span className="text-sm font-medium text-gray-700">User Full Name</span>
                </div>
                <div className="col-span-2 flex items-center">
                  <div className="relative">
                    <select
                      value={formData.userFullNameControl}
                      onChange={(e) => handleControlTypeChange('userFullNameControl', e.target.value as 'random' | 'custom')}
                      className="text-xs px-2 py-1 rounded-full border border-gray-200/60 bg-white/80 text-gray-700 hover:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer appearance-none pr-6"
                    >
                      <option value="random">Random (default)</option>
                      <option value="custom">Custom</option>
                    </select>
                    <div className="absolute right-1 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="col-span-6 flex items-center">
                  <div className="relative w-full">
                    <input
                      type="text"
                      value={formData.userFullName}
                      onChange={(e) => handleFieldChange('userFullName', e.target.value)}
                      disabled={formData.userFullNameControl === 'random'}
                      placeholder={formData.userFullNameControl === 'custom' ? "Enter full name..." : ""}
                      className={cn(
                        "w-full px-3 py-2 text-sm border rounded-md transition-all",
                        formData.userFullNameControl === 'random' 
                          ? "border-gray-200/60 bg-gray-50/50 text-gray-600 cursor-not-allowed" 
                          : "border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      )}
                    />
                    {formData.userFullNameControl === 'random' && (
                      <button
                        type="button"
                        onClick={() => generateRandomValues(['userFullName'])}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Shuffle className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="col-span-1"></div>
              </div>
              
              {/* 4. User Email Field */}
              <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-100/30 hover:bg-gray-50/20 transition-colors">
                <div className="col-span-3 flex items-center">
                  <span className="text-sm font-medium text-gray-700">User Email</span>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-xs text-gray-500 bg-gray-100/50 px-2 py-1 rounded-full border border-gray-200/40">System</span>
                </div>
                <div className="col-span-6 flex items-center">
                  <div className="relative w-full">
                    <input
                      type="email"
                      value={formData.userEmail}
                      disabled
                      className="w-full px-3 py-2 text-sm border border-gray-200/60 rounded-md bg-gray-50/50 text-gray-600 cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Lock className="h-3 w-3 text-gray-400" />
                    </div>
                  </div>
                </div>
                <div className="col-span-1"></div>
              </div>
              
              {/* 5. Email Invite Toggle */}
              {shouldShowPersonaSpecificField('emailInvite') && (
                <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-100/30 hover:bg-gray-50/20 transition-colors">
                  <div className="col-span-3 flex items-center">
                    <span className="text-sm font-medium text-gray-700">Send Email Invite</span>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <span className="text-xs text-gray-500 bg-gray-100/50 px-2 py-1 rounded-full border border-gray-200/40">User Choice</span>
                  </div>
                  <div className="col-span-6 flex items-center">
                    <div className="flex items-center space-x-3">
                      <Switch
                        checked={formData.emailInviteEnabled}
                        onCheckedChange={(checked) => handleFieldChange('emailInviteEnabled', checked)}
                      />
                      <span className="text-sm text-gray-500">
                        {formData.emailInviteEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-1"></div>
                </div>
              )}
              
              {/* 6. Demo Company Toggle */}
              {shouldShowPersonaSpecificField('demoCompany') && (
                <div className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50/20 transition-colors">
                  <div className="col-span-3 flex items-center">
                    <span className="text-sm font-medium text-gray-700">Use Demo Company</span>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <span className="text-xs text-gray-500 bg-gray-100/50 px-2 py-1 rounded-full border border-gray-200/40">User Choice</span>
                  </div>
                  <div className="col-span-6 flex items-center">
                    <div className="flex items-center space-x-3">
                      <Switch
                        checked={formData.isDemoCompany}
                        onCheckedChange={(checked) => handleFieldChange('isDemoCompany', checked)}
                      />
                      <span className="text-sm text-gray-500">
                        {formData.isDemoCompany ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-1"></div>
                </div>
              )}
              
            </div>
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
  
  const handleBackToLogin = () => {
    console.log('[DemoStep3] User clicked Login');
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
          Review Demo Setup
        </h1>
        <p className="text-base text-gray-600">
          {selectedPersona ? (
            <>Your demo is configured for <span className="font-semibold text-gray-900">{selectedPersona.title}</span>. Sign in to explore the platform.</>
          ) : (
            "Your demo is ready. Sign in to explore the platform."
          )}
        </p>
      </div>
      
      {/* MIDDLE SPACER */}
      <div className="flex-shrink-0 py-6"></div>
      
      {/* MAIN BODY SECTION */}
      <div className="flex-1 space-y-6">
        {selectedPersona ? (
          <div className="space-y-4">
            {/* Space for demo summary and review components */}
          </div>
        ) : (
          <Card className="p-6">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Demo Configuration</h3>
              <p className="text-gray-600 text-sm">
                Please go back to Step 1 to configure your demo experience
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* BUTTON SECTION */}
      <div className="flex-shrink-0">
        <DemoNavigation
          onBack={onBack}
          showNext={true}
          onNext={handleBackToLogin}
          nextText="Sign In"
          nextIcon={<Check className="w-4 h-4 ml-2" />}
        />
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
            onNext={handleBackToLogin}
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