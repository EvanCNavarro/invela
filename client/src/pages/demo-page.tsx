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

import React, { useState, useCallback, useEffect } from "react";
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
  Shuffle,
  ChevronDown,
  Building2,
  Eye,
  Rocket
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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
  bgColor: string;
  iconColor: string;
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
  onFormDataChange?: (formData: any) => void;
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
    color: "gray",
    bgColor: "bg-gray-100",
    iconColor: "text-gray-500"
  },
  {
    id: "accredited-data-recipient", 
    title: "Accredited Data Recipient",
    description: "Experience advanced data management capabilities",
    icon: Award,
    color: "green",
    bgColor: "bg-green-100",
    iconColor: "text-green-600"
  },
  {
    id: "data-provider",
    title: "Data Provider",
    description: "Discover data sharing and compliance features",
    icon: Database,
    color: "purple",
    bgColor: "bg-purple-100",
    iconColor: "text-purple-600"
  },
  {
    id: "invela-admin",
    title: "Invela Admin",
    description: "Discover administrative and compliance management features",
    icon: Shield,
    color: "blue",
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600"
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
  backDisabled = false,
  nextText = "Continue",
  nextIcon = 'arrow'
}: {
  onBack?: () => void;
  onNext?: () => void;
  showBack?: boolean;
  showNext?: boolean;
  nextDisabled?: boolean;
  backDisabled?: boolean;
  nextText?: string;
  nextIcon?: 'arrow' | 'check' | 'spinner';
}) => {
  // Render the appropriate icon based on state
  const renderNextIcon = () => {
    switch (nextIcon) {
      case 'check':
        return <Check className="w-5 h-5 ml-2" />;
      case 'spinner':
        return (
          <div className="w-5 h-5 ml-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        );
      case 'arrow':
      default:
        return <ArrowRight className="w-5 h-5 ml-2" />;
    }
  };

  return (
    <div className="flex justify-between items-center pt-8">
      {/* Back Button */}
      <div className="flex-1">
        {showBack && onBack && (
          <Button 
            variant="outline" 
            onClick={onBack}
            disabled={backDisabled}
            size="lg"
            className="px-8 py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
            {renderNextIcon()}
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
 * Demo customization form data structure
 * Extended to include risk profile and company size fields for advanced persona capabilities
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
  // Risk Profile field - specific to Accredited Data Recipients
  riskProfile: number;
  riskProfileControl: 'random' | 'custom';
  // Company Size field - specific to Accredited Data Recipients
  companySize: 'small' | 'medium' | 'large';
}

/**
 * Random data generators for demo values
 * Provides 100 diverse, professional options for realistic demo experiences
 * Focused on financial services, consulting, and enterprise sectors
 */
const DEMO_DATA_GENERATORS = {
  companyNames: [
    // Original favorites
    "WealthWave Financial", "SecureVault Capital", "TrustLink Partners", "NextGen Banking", "RiskShield Analytics",
    
    // Financial Services (25 total)
    "Apex Capital Management", "Sterling Trust Solutions", "Meridian Wealth Advisors", "Cornerstone Financial Group", "Pinnacle Investment Partners",
    "Quantum Risk Management", "Elite Capital Ventures", "Sovereign Asset Management", "Premier Banking Solutions", "Vanguard Credit Union",
    "Precision Lending Group", "Optimal Finance Partners", "Dynamic Capital Holdings", "Strategic Investment Bank", "Integrity Financial Services",
    "Summit Wealth Management", "Horizon Capital Group", "Catalyst Investment Partners", "Nexus Financial Solutions", "Premier Trust Company",
    
    // Technology & Analytics (25 total)
    "DataVault Technologies", "CloudSecure Systems", "InnovateTech Solutions", "DigitalEdge Analytics", "CyberGuard Technologies",
    "AlphaTech Innovations", "SmartData Corporation", "TechFlow Solutions", "DataBridge Analytics", "SecureCloud Partners",
    "IntelliSoft Systems", "NexGen Data Solutions", "ProTech Analytics", "DataSync Technologies", "TechVantage Group",
    "QuantumTech Solutions", "DataForge Corporation", "CyberShield Systems", "InnoData Technologies", "TechCore Solutions",
    "DataPlex Analytics", "CloudWave Technologies", "TechNova Solutions", "DataStream Corporation", "CyberTech Partners",
    
    // Consulting & Advisory (25 total)
    "Strategic Consulting Group", "Elite Advisory Partners", "Pinnacle Business Solutions", "Summit Strategy Advisors", "Vanguard Consulting",
    "Meridian Advisory Group", "Cornerstone Consulting", "Apex Business Partners", "Premier Strategy Group", "Quantum Advisory Solutions",
    "Dynamic Consulting Partners", "Strategic Solutions Group", "Elite Business Advisors", "Pinnacle Strategy Partners", "Nexus Consulting",
    "Optimal Advisory Group", "Sterling Business Solutions", "Catalyst Consulting Partners", "Horizon Strategy Advisors", "Premier Advisory",
    "Summit Business Group", "Vanguard Strategy Partners", "Meridian Consulting Solutions", "Cornerstone Advisory Group", "Apex Strategy",
    
    // Healthcare & Life Sciences (25 total)
    "MedTech Innovations", "HealthSecure Systems", "BioVantage Solutions", "MedCore Technologies", "LifeScience Partners",
    "HealthGuard Analytics", "MedData Corporation", "BioTech Solutions Group", "HealthTech Innovations", "MedSecure Systems",
    "LifeTech Analytics", "HealthVault Technologies", "MedPlex Solutions", "BioSecure Systems", "HealthTech Partners",
    "MedFlow Corporation", "LifeGuard Technologies", "HealthCore Solutions", "MedVantage Group", "BioTech Analytics",
    "HealthStream Systems", "MedTech Partners", "LifeSecure Solutions", "HealthTech Corporation", "MedGuard Analytics"
  ],
  
  firstNames: [
    // Classic Professional Names (50 total)
    "Alex", "Jordan", "Casey", "Morgan", "Riley", "Taylor", "Cameron", "Jamie", "Quinn", "Sage",
    "Michael", "Jennifer", "David", "Sarah", "Robert", "Lisa", "Christopher", "Michelle", "Matthew", "Amanda",
    "Daniel", "Elizabeth", "Andrew", "Jessica", "Ryan", "Ashley", "Jonathan", "Emily", "Nicholas", "Nicole",
    "Anthony", "Stephanie", "Kevin", "Rachel", "Steven", "Lauren", "Joshua", "Megan", "Brandon", "Samantha",
    "Benjamin", "Hannah", "Samuel", "Victoria", "Gregory", "Olivia", "Patrick", "Emma", "Frank", "Grace",
    
    // Modern Professional Names (50 total) 
    "Aiden", "Sophia", "Lucas", "Isabella", "Mason", "Ava", "Noah", "Mia", "Ethan", "Charlotte",
    "Oliver", "Amelia", "William", "Harper", "James", "Evelyn", "Liam", "Abigail", "Henry", "Ella",
    "Sebastian", "Madison", "Jack", "Scarlett", "Owen", "Victoria", "Theodore", "Aria", "Caleb", "Chloe",
    "Nathan", "Layla", "Isaac", "Penelope", "Eli", "Riley", "Thomas", "Zoey", "Charles", "Nora",
    "Connor", "Lily", "Jeremiah", "Eleanor", "Cameron", "Hannah", "Adrian", "Lillian", "Christian", "Addison"
  ],
  
  lastNames: [
    // Original classics
    "Anderson", "Chen", "Johnson", "Williams", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor",
    
    // European Heritage (30 total)
    "Thompson", "Garcia", "Martinez", "Robinson", "Clark", "Rodriguez", "Lewis", "Lee", "Walker", "Hall",
    "Allen", "Young", "Hernandez", "King", "Wright", "Lopez", "Hill", "Scott", "Green", "Adams",
    "Baker", "Gonzalez", "Nelson", "Carter", "Mitchell", "Perez", "Roberts", "Turner", "Phillips", "Campbell",
    
    // International Professional (30 total)
    "Zhang", "Kumar", "Patel", "Singh", "Kim", "Liu", "Wang", "Nakamura", "Tanaka", "Suzuki",
    "Rahman", "Hassan", "Ali", "Ahmad", "Mohammed", "Hussein", "Malik", "Shah", "Khan", "Gupta",
    "Sharma", "Mehta", "Joshi", "Agarwal", "Verma", "Kapoor", "Bhatia", "Chopra", "Sinha", "Mishra",
    
    // Modern American (30 total)
    "Parker", "Cooper", "Reed", "Bailey", "Bell", "Murphy", "Rivera", "Cook", "Rogers", "Morgan",
    "Peterson", "Cox", "Ward", "Richardson", "Watson", "Brooks", "Chavez", "Wood", "James", "Bennett",
    "Gray", "Mendoza", "Ruiz", "Hughes", "Price", "Alvarez", "Castillo", "Sanders", "Patel", "Myers"
  ]
} as const;

/**
 * Step 2: Interactive Demo Customization
 * 
 * Comprehensive form for personalizing the demo experience based on
 * the selected persona from Step 1. Implements field-level control
 * with random/custom toggles and persona-specific options.
 */
const DemoStep2 = ({ onNext, onBack, selectedPersona, onFormDataChange }: DemoStepProps) => {
  console.log('[DemoStep2] Rendering interactive demo', { selectedPersona: selectedPersona?.id });
  
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  
  // Dropdown states for custom UI components
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [userNameDropdownOpen, setUserNameDropdownOpen] = useState(false);
  const [riskProfileDropdownOpen, setRiskProfileDropdownOpen] = useState(false);
  
  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setCompanyDropdownOpen(false);
        setUserNameDropdownOpen(false);
        setRiskProfileDropdownOpen(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);
  
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
    
    // Invela Admin gets locked company name
    const finalCompanyName = selectedPersona?.id === 'invela-admin' ? 'Invela' : randomCompany;
    
    // Generate random risk profile (0-100) for initial state
    const randomRiskProfile = Math.floor(Math.random() * 101);
    
    const initialData = {
      persona: selectedPersona?.title || '',
      companyName: finalCompanyName,
      companyNameControl: 'random' as 'random' | 'custom',
      userFullName: `${randomFirstName} ${randomLastName}`,
      userFullNameControl: 'random' as 'random' | 'custom',
      userEmail: generateEmailFromDataInit(randomFirstName, randomLastName, finalCompanyName),
      emailInviteEnabled: false, // Default to off for persona-specific features
      isDemoCompany: true,       // Default to on as specified
      riskProfile: randomRiskProfile,
      riskProfileControl: 'random' as 'random' | 'custom',
      companySize: 'medium' as const // Default company size for accredited recipients
    };
    
    // Immediately notify parent of initial form data
    setTimeout(() => onFormDataChange?.(initialData), 0);
    
    return initialData;
  });
  
  // ========================================
  // UTILITY FUNCTIONS
  // ========================================
  
  /**
   * Validates individual field values and returns validation status
   * Real-time validation that responds to actual form state changes
   */
  const getFieldValidationStatus = (fieldName: string): 'valid' | 'invalid' | 'in-progress' => {
    console.log(`[DemoStep2] Validating field: ${fieldName}`, { 
      value: formData[fieldName as keyof DemoCustomizationForm],
      formData 
    });

    switch (fieldName) {
      case 'persona':
        const personaValid = formData.persona && formData.persona.length > 0;
        console.log(`[DemoStep2] Persona validation: ${personaValid ? 'valid' : 'invalid'}`);
        return personaValid ? 'valid' : 'invalid';
        
      case 'companyName':
        const companyName = formData.companyName?.trim() || '';
        if (companyName.length === 0) {
          console.log(`[DemoStep2] Company name validation: invalid (empty)`);
          return 'invalid';
        }
        if (companyName.length < 2) {
          console.log(`[DemoStep2] Company name validation: in-progress (${companyName.length} chars)`);
          return 'in-progress';
        }
        console.log(`[DemoStep2] Company name validation: valid (${companyName.length} chars)`);
        return 'valid';
        
      case 'userFullName':
        const fullName = formData.userFullName?.trim() || '';
        if (fullName.length === 0) {
          console.log(`[DemoStep2] Full name validation: invalid (empty)`);
          return 'invalid';
        }
        const nameParts = fullName.split(' ').filter(part => part.length > 0);
        if (fullName.length < 3 || nameParts.length < 2) {
          console.log(`[DemoStep2] Full name validation: in-progress (${fullName.length} chars, ${nameParts.length} parts)`);
          return 'in-progress';
        }
        console.log(`[DemoStep2] Full name validation: valid (${fullName.length} chars, ${nameParts.length} parts)`);
        return 'valid';
        
      case 'userEmail':
        const email = formData.userEmail?.trim() || '';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email.length === 0) {
          console.log(`[DemoStep2] Email validation: invalid (empty)`);
          return 'invalid';
        }
        if (email.includes('@') && emailRegex.test(email)) {
          console.log(`[DemoStep2] Email validation: valid (${email})`);
          return 'valid';
        }
        console.log(`[DemoStep2] Email validation: in-progress (${email})`);
        return 'in-progress';
        
      default:
        console.log(`[DemoStep2] Unknown field validation: ${fieldName} - defaulting to invalid`);
        return 'invalid';
    }
  };
  
  /**
   * Checks if the entire form is valid for progression
   * Uses real-time validation status for all required fields
   */
  const isFormValid = (): boolean => {
    const validationResults = {
      persona: getFieldValidationStatus('persona'),
      companyName: getFieldValidationStatus('companyName'),
      userFullName: getFieldValidationStatus('userFullName'),
      userEmail: getFieldValidationStatus('userEmail')
    };
    
    const allValid = Object.values(validationResults).every(status => status === 'valid');
    
    console.log('[DemoStep2] Form validation check:', {
      validationResults,
      allValid,
      formData: {
        persona: formData.persona,
        companyName: formData.companyName,
        userFullName: formData.userFullName,
        userEmail: formData.userEmail
      }
    });
    
    return allValid;
  };
  
  /**
   * Renders validation indicator icon
   */
  const ValidationIcon = ({ status }: { status: 'valid' | 'invalid' | 'in-progress' }) => {
    if (status === 'valid') {
      return (
        <div className="flex items-center justify-center w-4 h-4 rounded-full bg-green-100">
          <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      );
    }
    
    if (status === 'in-progress') {
      return (
        <div className="flex items-center justify-center w-4 h-4 rounded-full bg-yellow-100 border border-yellow-200">
          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
        </div>
      );
    }
    
    if (status === 'invalid') {
      return (
        <div className="flex items-center justify-center w-4 h-4 rounded-full bg-yellow-100 border border-yellow-200">
          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
        </div>
      );
    }
    
    return null;
  };
  
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
    // Handle undefined or empty values safely
    if (!firstName || !lastName || !companyName) {
      return '';
    }
    
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
   * Updates form state with fresh random data and triggers validation
   */
  function generateRandomValues(fields: Array<'companyName' | 'userFullName' | 'riskProfile'>): void {
    console.log(`[DemoStep2] Generating random values for fields:`, fields);
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
    
    if (fields.includes('riskProfile')) {
      // Generate random risk score between 0-100
      updates.riskProfile = Math.floor(Math.random() * 101);
      console.log(`[DemoStep2] Generated random risk profile: ${updates.riskProfile}`);
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
   * Field-to-persona mapping configuration
   * Each field can have multiple persona tags for flexible control
   */
  const FIELD_PERSONA_MAPPING = {
    // Core fields - always show (tagged as 'default')
    persona: ['default'],
    companyName: ['default'],
    userFullName: ['default'],
    userEmail: ['default'],
    
    // Persona-specific fields with multiple tags
    emailInvite: ['new-data-recipient', 'accredited-data-recipient', 'data-provider', 'invela-admin'],
    demoCompany: ['new-data-recipient'],  // Removed accredited-data-recipient
    riskProfile: ['accredited-data-recipient'],  // Risk assessment exclusive to advanced data recipients
    companySize: ['accredited-data-recipient']   // Company size selection for accredited recipients
  };

  /**
   * Determines if a field should be locked (non-editable) for specific personas
   */
  function isFieldLocked(fieldName: string): boolean {
    if (!selectedPersona) return false;
    
    // Invela Admin has locked company name (umbrella company)
    if (fieldName === 'companyName' && selectedPersona.id === 'invela-admin') {
      return true;
    }
    
    // Persona field is always locked
    if (fieldName === 'persona') {
      return true;
    }
    
    return false;
  }

  /**
   * Gets the locked value for a field if it should be locked
   */
  function getLockedFieldValue(fieldName: string): string {
    if (!selectedPersona) return '';
    
    if (fieldName === 'companyName' && selectedPersona.id === 'invela-admin') {
      return 'Invela';
    }
    
    if (fieldName === 'persona') {
      return selectedPersona.title;
    }
    
    return '';
  }

  /**
   * Determines if any field should be displayed based on persona tags
   * Uses flexible tagging system for granular control
   */
  function shouldShowField(fieldName: keyof typeof FIELD_PERSONA_MAPPING): boolean {
    if (!selectedPersona) return false;
    
    const fieldTags = FIELD_PERSONA_MAPPING[fieldName] || [];
    const personaId = selectedPersona.id;
    
    // Show field if it's tagged as 'default' OR if current persona is in the field's tag list
    const shouldShow = fieldTags.includes('default') || fieldTags.includes(personaId);
    
    console.log(`[DemoStep2] Field visibility check: ${fieldName} for ${personaId} = ${shouldShow}`, {
      fieldTags,
      personaId,
      isDefault: fieldTags.includes('default'),
      hasPersonaTag: fieldTags.includes(personaId),
      shouldShow
    });
    
    return shouldShow;
  }

  /**
   * Legacy function for persona-specific fields (backwards compatibility)
   */
  function shouldShowPersonaSpecificField(fieldName: 'emailInvite' | 'demoCompany' | 'riskProfile' | 'companySize'): boolean {
    return shouldShowField(fieldName);
  }
  
  // ========================================
  // EVENT HANDLERS
  // ========================================
  
  /**
   * Handles field control type changes (random/custom toggles)
   * Manages the transition between random and custom field states
   */
  const handleControlTypeChange = (
    field: 'companyNameControl' | 'userFullNameControl' | 'riskProfileControl',
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
        } else if (field === 'riskProfileControl') {
          // For risk profile, start at mid-range (50) for custom mode
          updates.riskProfile = 50;
          console.log('[DemoStep2] Risk profile switched to custom mode, set to default 50');
        }
      }
      // When switching to random, generate new random value
      else if (newType === 'random') {
        if (field === 'companyNameControl') {
          const randomCompany = DEMO_DATA_GENERATORS.companyNames[
            Math.floor(Math.random() * DEMO_DATA_GENERATORS.companyNames.length)
          ];
          updates.companyName = randomCompany;
          
          // Also update email if needed
          const firstPart = updates.userFullName.split(' ')[0] || '';
          const lastPart = updates.userFullName.split(' ')[1] || '';
          if (firstPart && lastPart) {
            updates.userEmail = generateEmailFromData(firstPart, lastPart, randomCompany);
          }
        } else if (field === 'userFullNameControl') {
          const randomFirstName = DEMO_DATA_GENERATORS.firstNames[
            Math.floor(Math.random() * DEMO_DATA_GENERATORS.firstNames.length)
          ];
          const randomLastName = DEMO_DATA_GENERATORS.lastNames[
            Math.floor(Math.random() * DEMO_DATA_GENERATORS.lastNames.length)
          ];
          updates.userFullName = `${randomFirstName} ${randomLastName}`;
          
          // Also update email
          updates.userEmail = generateEmailFromData(randomFirstName, randomLastName, updates.companyName);
        } else if (field === 'riskProfileControl') {
          // Generate new random risk profile value
          updates.riskProfile = Math.floor(Math.random() * 101);
          console.log(`[DemoStep2] Risk profile switched to random mode, generated: ${updates.riskProfile}`);
        }
      }
      
      return updates;
    });
  };
  
  /**
   * Handles direct field value changes for custom inputs
   * Updates form state and auto-generates dependent fields
   * Triggers real-time validation updates
   */
  const handleFieldChange = (field: keyof DemoCustomizationForm, value: string | boolean | number) => {
    console.log(`[DemoStep2] Field change: ${field} = ${value}`);
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-update email when name or company changes
      if (field === 'companyName' || field === 'userFullName') {
        const [firstName, lastName] = newData.userFullName.split(' ');
        if (firstName && lastName) {
          newData.userEmail = generateEmailFromData(firstName, lastName, newData.companyName);
          console.log(`[DemoStep2] Auto-generated email: ${newData.userEmail}`);
        }
      }
      
      // Log the updated form state for validation tracking
      console.log(`[DemoStep2] Form state updated:`, {
        field,
        newValue: value,
        updatedFormData: newData
      });
      
      // Notify parent component of form data changes
      onFormDataChange?.(newData);
      
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
          Configure your demo settings and preferences below.
        </p>
      </div>
      
      {/* MIDDLE SPACER - 75% of standard spacing */}
      <div className="flex-shrink-0 py-4"></div>
      
      {/* MAIN BODY SECTION */}
      <div className="flex-1 space-y-6">
        {selectedPersona ? (
          <div className="space-y-6">
            {/* Demo Customization Form - Clean Layout */}
            <div className="bg-white/40 backdrop-blur-sm rounded-lg border border-gray-100/50 overflow-hidden">
              
              {/* 1. Persona Field (System Generated) */}
              <div className="grid grid-cols-12 gap-3 pr-6 border-b border-gray-200/50 hover:bg-gray-50/30 transition-colors h-[64px]">
                <div className="col-span-4 flex items-center justify-end pr-2 space-x-2">
                  <span className="text-sm font-medium text-gray-700">Selected Persona</span>
                  <ValidationIcon status={getFieldValidationStatus('persona')} />
                </div>
                <div className="col-span-8 flex items-center">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={formData.persona}
                      disabled
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-gray-100 text-gray-600 cursor-not-allowed h-[32px]"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Lock className="h-3 w-3 text-gray-500" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 2. Company Name Field */}
              <div className="grid grid-cols-12 gap-3 pr-6 border-b border-gray-200/50 hover:bg-gray-50/30 transition-colors h-[64px]">
                <div className="col-span-4 flex items-center justify-end pr-2 space-x-2">
                  <span className="text-sm font-medium text-gray-700">Company Name</span>
                  <ValidationIcon status={getFieldValidationStatus('companyName')} />
                </div>
                <div className="col-span-8 flex items-center">
                  {isFieldLocked('companyName') ? (
                    /* Completely locked field like persona - no dropdown, no controls */
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={formData.companyName}
                        disabled
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-gray-100 text-gray-600 cursor-not-allowed h-[32px]"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Lock className="h-3 w-3 text-gray-500" />
                      </div>
                    </div>
                  ) : (
                    /* Normal field with dropdown and controls for other personas */
                    <div className="flex items-center space-x-2 w-full">
                      <div className="relative dropdown-container">
                        <button
                          type="button"
                          onClick={() => setCompanyDropdownOpen(!companyDropdownOpen)}
                          className="text-xs px-3 py-2 rounded border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer h-[32px] shadow-sm flex items-center justify-between min-w-[80px]"
                        >
                          <span>{formData.companyNameControl === 'random' ? 'Random' : 'Custom'}</span>
                          <svg className={`h-3 w-3 text-gray-400 transition-transform duration-200 ml-1 ${companyDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m6 9 6 6 6-6" />
                          </svg>
                        </button>
                        {companyDropdownOpen && (
                          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-10 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => {
                                handleControlTypeChange('companyNameControl', 'random');
                                setCompanyDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-xs text-left hover:bg-blue-50 transition-colors flex items-center justify-between ${formData.companyNameControl === 'random' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                            >
                              Random
                              {formData.companyNameControl === 'random' && (
                                <svg className="h-3 w-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleControlTypeChange('companyNameControl', 'custom');
                                setCompanyDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-xs text-left hover:bg-blue-50 transition-colors flex items-center justify-between ${formData.companyNameControl === 'custom' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                            >
                              Custom
                              {formData.companyNameControl === 'custom' && (
                                <svg className="h-3 w-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={formData.companyName}
                          onChange={(e) => handleFieldChange('companyName', e.target.value)}
                          disabled={formData.companyNameControl === 'random'}
                          placeholder={formData.companyNameControl === 'custom' ? "Enter company name..." : ""}
                          className={cn(
                            "w-full px-3 py-2 text-sm border rounded transition-all h-[32px]",
                            formData.companyNameControl === 'random' 
                              ? "border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed" 
                              : "border-blue-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          )}
                        />
                      </div>
                      {formData.companyNameControl === 'random' && (
                        <button
                          type="button"
                          onClick={() => generateRandomValues(['companyName'])}
                          className="px-2 py-2 h-[32px] border border-gray-300 rounded bg-white hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
                        >
                          <Shuffle className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* 3. User Full Name Field */}
              <div className="grid grid-cols-12 gap-3 pr-6 border-b border-gray-200/50 hover:bg-gray-50/30 transition-colors h-[64px]">
                <div className="col-span-4 flex items-center justify-end pr-2 space-x-2">
                  <span className="text-sm font-medium text-gray-700">User Full Name</span>
                  <ValidationIcon status={getFieldValidationStatus('userFullName')} />
                </div>
                <div className="col-span-8 flex items-center space-x-2">
                  {/* Custom dropdown button */}
                  <div className="relative dropdown-container">
                    <button
                      type="button"
                      onClick={() => setUserNameDropdownOpen(!userNameDropdownOpen)}
                      className="text-xs px-3 py-2 rounded border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer h-[32px] shadow-sm flex items-center justify-between min-w-[80px]"
                    >
                      <span>{formData.userFullNameControl === 'random' ? 'Random' : 'Custom'}</span>
                      <svg className={`h-3 w-3 text-gray-400 transition-transform duration-200 ml-1 ${userNameDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                    {userNameDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-10 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            handleControlTypeChange('userFullNameControl', 'random');
                            setUserNameDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-xs text-left hover:bg-blue-50 transition-colors flex items-center justify-between ${formData.userFullNameControl === 'random' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                        >
                          Random
                          {formData.userFullNameControl === 'random' && (
                            <svg className="h-3 w-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleControlTypeChange('userFullNameControl', 'custom');
                            setUserNameDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-xs text-left hover:bg-blue-50 transition-colors flex items-center justify-between ${formData.userFullNameControl === 'custom' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                        >
                          Custom
                          {formData.userFullNameControl === 'custom' && (
                            <svg className="h-3 w-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Input field - increased space */}
                  <input
                    type="text"
                    value={formData.userFullName}
                    onChange={(e) => handleFieldChange('userFullName', e.target.value)}
                    disabled={formData.userFullNameControl === 'random'}
                    placeholder={formData.userFullNameControl === 'custom' ? "Enter full name..." : ""}
                    className={cn(
                      "flex-1 px-3 py-2 text-sm border rounded transition-all h-[32px]",
                      formData.userFullNameControl === 'random' 
                        ? "border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed" 
                        : "border-blue-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    )}
                  />
                  {/* Separate randomize button */}
                  {formData.userFullNameControl === 'random' && (
                    <button
                      type="button"
                      onClick={() => generateRandomValues(['userFullName'])}
                      className="px-2 py-2 h-[32px] border border-gray-300 rounded bg-white hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
                    >
                      <Shuffle className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* 4. User Email Field */}
              <div className="grid grid-cols-12 gap-3 pr-6 border-b border-gray-200/50 hover:bg-gray-50/30 transition-colors h-[64px]">
                <div className="col-span-4 flex items-center justify-end pr-2 space-x-2">
                  <span className="text-sm font-medium text-gray-700">User Email</span>
                  <ValidationIcon status={getFieldValidationStatus('userEmail')} />
                </div>
                <div className="col-span-8 flex items-center">
                  <div className="relative flex-1">
                    <input
                      type="email"
                      value={formData.userEmail}
                      disabled
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-gray-100 text-gray-600 cursor-not-allowed h-[32px]"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Lock className="h-3 w-3 text-gray-500" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 5. Risk Profile Field - Accredited Data Recipients Only */}
              {shouldShowPersonaSpecificField('riskProfile') && (
                <div className="grid grid-cols-12 gap-3 pr-6 border-b border-gray-200/50 hover:bg-gray-50/30 transition-colors h-[64px]">
                  <div className="col-span-4 flex items-center justify-end pr-2 space-x-2">
                    <span className="text-sm font-medium text-gray-700">Risk Profile</span>
                    <ValidationIcon status="valid" />
                  </div>
                  <div className="col-span-8 flex items-center space-x-3">
                    {/* Risk Profile Value Input - Editable */}
                    <input
                      type="text"
                      value={formData.riskProfile}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only numeric input up to 3 digits
                        if (/^\d{0,3}$/.test(value)) {
                          const numValue = Math.min(parseInt(value) || 0, 100);
                          handleFieldChange('riskProfile', numValue);
                          console.log(`[DemoStep2] Risk profile value typed: ${numValue}`);
                        }
                      }}
                      className="w-12 h-[32px] text-center text-sm font-medium text-gray-700 border border-blue-300 rounded bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      maxLength={3}
                      placeholder="0"
                    />
                    
                    {/* Interactive Slider - Horizontally Aligned */}
                    <div className="flex-1 h-[32px] flex items-center px-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={formData.riskProfile}
                        onChange={(e) => handleFieldChange('riskProfile', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${formData.riskProfile}%, #e5e7eb ${formData.riskProfile}%, #e5e7eb 100%)`
                        }}
                      />
                    </div>
                    
                    {/* Shuffle Button - Always Present */}
                    <button
                      type="button"
                      onClick={() => generateRandomValues(['riskProfile'])}
                      className="px-2 py-2 h-[32px] border border-gray-300 rounded bg-white hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
                    >
                      <Shuffle className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
              
              {/* 6. Company Size Toggle - Accredited Data Recipients Only */}
              {shouldShowPersonaSpecificField('companySize') && (
                <div className="grid grid-cols-12 gap-3 pr-6 border-b border-gray-200/50 hover:bg-gray-50/30 transition-colors h-[64px]">
                  <div className="col-span-4 flex items-center justify-end pr-2 space-x-2">
                    <span className="text-sm font-medium text-gray-700">Company Size</span>
                    <ValidationIcon status="valid" />
                  </div>
                  <div className="col-span-8 flex items-center">
                    <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                      {[
                        { value: 'small', label: 'Small' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'large', label: 'Large' },
                        { value: 'extra-large', label: 'XL' }
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleFieldChange('companySize', option.value)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                            formData.companySize === option.value
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-transparent text-gray-600 hover:bg-white hover:shadow-sm'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* 7. Email Invite Toggle */}
              {shouldShowPersonaSpecificField('emailInvite') && (
                <div className="grid grid-cols-12 gap-3 pr-6 border-b border-gray-200/50 hover:bg-gray-50/30 transition-colors h-[64px]">
                  <div className="col-span-4 flex items-center justify-end pr-2 space-x-2">
                    <span className="text-sm font-medium text-gray-700">Send Email Invite</span>
                    <ValidationIcon status="valid" />
                  </div>
                  <div className="col-span-8 flex items-center">
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
                </div>
              )}
              
              {/* 6. Demo Company Toggle */}
              {shouldShowPersonaSpecificField('demoCompany') && (
                <div className="grid grid-cols-12 gap-3 pr-6 hover:bg-gray-50/30 transition-colors h-[64px]">
                  <div className="col-span-4 flex items-center justify-end pr-2 space-x-2">
                    <span className="text-sm font-medium text-gray-700">Use Demo Company</span>
                    <ValidationIcon status="valid" />
                  </div>
                  <div className="col-span-8 flex items-center">
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
          nextDisabled={!isFormValid()}
        />
      </div>
      
      {/* BOTTOM SPACER */}
      <div className="flex-shrink-0 py-6"></div>
    </div>
  );
};

/**
 * Step 3: Demo Configuration Review & Preparation
 */
const DemoStep3 = ({ onBack, selectedPersona, formData, onWizardStepChange }: DemoStepProps & { formData?: any; onWizardStepChange?: (step: 'review' | 'setup' | 'launch') => void }) => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [wizardStep, setWizardStep] = useState<'review' | 'setup' | 'launch'>('review');
  
  console.log('[DemoStep3] Rendering results and next steps');
  
  // Dynamic API action configuration based on user selections
  const getDemoActions = (formData: any, selectedPersona: any) => {
    const actions = [];

    // 1. Company Creation Action
    actions.push({
      id: 'create-company',
      label: `Creating "${formData?.companyName}" organization`,
      category: 'company',
      targetField: 'companyName',
      apiEndpoint: '/api/demo/company/create',
      payload: {
        name: formData?.companyName,
        type: selectedPersona?.id === 'new-data-recipient' && formData?.isDemoCompany ? 'demo' : 'live',
        persona: selectedPersona?.id,
        ...(selectedPersona?.id === 'accredited-data-recipient' && {
          riskProfile: formData?.riskProfile,
          companySize: formData?.companySize
        })
      },
      estimatedDuration: 2000,
      description: 'Setting up organizational structure and preferences'
    });

    // 2. User Account Creation Action
    actions.push({
      id: 'create-user',
      label: `Creating account for ${formData?.userFullName}`,
      category: 'user',
      targetField: 'userFullName',
      apiEndpoint: '/api/demo/user/create',
      payload: {
        fullName: formData?.userFullName,
        email: formData?.userEmail,
        role: selectedPersona?.title,
        permissions: selectedPersona?.id,
        companyId: 'COMPANY_ID_FROM_STEP_1' // Will be replaced with actual ID from previous step
      },
      estimatedDuration: 1500,
      description: 'Setting up user profile and access permissions'
    });

    // 3. Authentication Setup Action
    actions.push({
      id: 'setup-auth',
      label: 'Configuring authentication',
      category: 'auth',
      targetField: 'userEmail',
      apiEndpoint: '/api/demo/auth/setup',
      payload: {
        userId: 'USER_ID_FROM_STEP_2', // Will be replaced with actual ID from previous step
        email: formData?.userEmail,
        generateCredentials: true
      },
      estimatedDuration: 1000,
      description: 'Setting up secure access credentials'
    });

    // 4. Optional Email Invitation Action
    if (formData?.emailInviteEnabled) {
      actions.push({
        id: 'send-invitation',
        label: 'Sending welcome email invitation',
        category: 'notification',
        targetField: 'emailInvitation',
        apiEndpoint: '/api/demo/email/send-invitation',
        payload: {
          userEmail: formData?.userEmail,
          userName: formData?.userFullName,
          companyName: formData?.companyName,
          loginCredentials: 'CREDENTIALS_FROM_STEP_3' // Will be replaced with actual credentials
        },
        estimatedDuration: 800,
        description: 'Delivering access credentials via email'
      });
    }

    // 5. Final Environment Preparation
    actions.push({
      id: 'finalize-environment',
      label: 'Finalizing demo environment',
      category: 'system',
      targetField: null,
      apiEndpoint: '/api/demo/environment/finalize',
      payload: {
        userId: 'USER_ID_FROM_STEP_2',
        companyId: 'COMPANY_ID_FROM_STEP_1',
        demoType: selectedPersona?.id
      },
      estimatedDuration: 1200,
      description: 'Preparing platform access and demo data'
    });

    return actions;
  };

  // API execution state
  const [actionResults, setActionResults] = useState<Record<string, any>>({});
  const [currentActionId, setCurrentActionId] = useState<string | null>(null);

  // Get the currently active target field for highlighting
  const getCurrentTargetField = () => {
    const actions = getDemoActions(formData, selectedPersona);
    const currentAction = actions[loadingStep - 1];
    return currentAction?.targetField || null;
  };

  // Execute individual API action with real backend integration
  const executeAction = async (action: any, previousResults: Record<string, any>) => {
    try {
      setCurrentActionId(action.id);
      console.log(`[DemoAPI] Executing: ${action.label}`, action);

      // Replace placeholder values with actual IDs from previous steps
      let payload = { ...action.payload };
      if (payload.companyId === 'COMPANY_ID_FROM_STEP_1' && previousResults['create-company']) {
        payload.companyId = previousResults['create-company'].companyId;
      }
      if (payload.userId === 'USER_ID_FROM_STEP_2' && previousResults['create-user']) {
        payload.userId = previousResults['create-user'].userId;
      }
      if (payload.loginCredentials === 'CREDENTIALS_FROM_STEP_3' && previousResults['setup-auth']) {
        payload.loginCredentials = previousResults['setup-auth'].credentials;
      }

      // Real API call - Ready for backend integration
      try {
        const response = await fetch(action.apiEndpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            // Add authentication headers as needed
            // 'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log(`[DemoAPI] Success: ${action.label}`, result);
        return result;

      } catch (apiError) {
        // NO MORE SIMULATIONS - Force real API calls only
        console.error(`[DemoAPI] REAL API FAILED for: ${action.label}`, apiError);
        throw new Error(`Demo API failed: ${apiError.message}`);

        // Generate realistic mock response based on action type
        const mockResult = {
          success: true,
          timestamp: new Date().toISOString(),
          actionId: action.id,
          ...(action.id === 'create-company' && { 
            companyId: `comp_${Date.now()}`,
            companyData: { name: payload.name, type: payload.type, persona: payload.persona }
          }),
          ...(action.id === 'create-user' && { 
            userId: `user_${Date.now()}`,
            userData: { fullName: payload.fullName, email: payload.email, role: payload.role }
          }),
          ...(action.id === 'setup-auth' && { 
            credentials: { loginUrl: '/login', tempPassword: 'demo123', setupComplete: true }
          }),
          ...(action.id === 'send-invitation' && { 
            emailSent: true, 
            messageId: `msg_${Date.now()}`,
            recipientEmail: payload.userEmail
          }),
          ...(action.id === 'finalize-environment' && { 
            demoReady: true, 
            accessUrl: '/dashboard',
            environmentId: `env_${Date.now()}`
          })
        };

        return mockResult;
      }

    } catch (error) {
      console.error(`[DemoAPI] Error executing ${action.label}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        actionId: action.id,
        timestamp: new Date().toISOString()
      };
    } finally {
      setCurrentActionId(null);
    }
  };
  
  const handleStartDemo = async () => {
    console.log('[DemoStep3] Starting demo preparation with real API actions');
    const actions = getDemoActions(formData, selectedPersona);
    const results: any = {};
    
    setIsLoading(true);
    setLoadingStep(0);
    setWizardStep('setup');
    onWizardStepChange?.('setup'); // ✅ FIX: Communicate stage change to parent
    setActionResults({});
    
    // Add initial delay for smoother visual loading
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Execute each action sequentially, passing results to subsequent actions
    for (let i = 0; i < actions.length; i++) {
      setLoadingStep(i + 1);
      const action = actions[i];
      
      // Add delay before starting each action for better visual pacing
      await new Promise(resolve => setTimeout(resolve, 600));
      
      try {
        const result = await executeAction(action, results);
        (results as any)[action.id] = result;
        setActionResults(prev => ({ ...prev, [action.id]: result }));
        
        // If any action fails, stop the process
        if (!result.success) {
          console.error(`[DemoStep3] Action failed: ${action.label}`);
          return;
        }
        
      } catch (error) {
        console.error(`[DemoStep3] Failed to execute action: ${action.label}`, error);
        return;
      }
    }
    
    // Add final step: Demo Environment Ready
    setLoadingStep(actions.length + 1);
    setWizardStep('launch');
    onWizardStepChange?.('launch'); // ✅ FIX: Communicate launch stage to parent
    
    // Show success toast when launch stage begins
    console.log('[DemoStep3] Demo setup completed successfully - showing success toast');
    toast({
      title: "Demo Setup Complete",
      description: "Logging you in now...",
      variant: "success",
      duration: 4000, // Auto-dismiss after 4 seconds
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced to 1 second
    
    // All actions completed successfully - automatically proceed to dashboard
    console.log('[DemoStep3] All demo actions completed successfully', results);
    
    // Extract finalization result to check authentication status
    const finalizationResult = results['finalize-environment'];
    const isAuthenticated = finalizationResult?.authenticated === true;
    const loginRequired = finalizationResult?.loginRequired === true;
    const accessUrl = finalizationResult?.accessUrl || '/';
    
    console.log('[DemoStep3] Authentication analysis:', {
      isAuthenticated,
      loginRequired,
      accessUrl,
      finalizationResult: finalizationResult ? 'present' : 'missing'
    });
    
    // ========================================
    // INTELLIGENT ROUTING WITH CACHE SYNCHRONIZATION
    // ========================================
    
    if (isAuthenticated && !loginRequired) {
      // SUCCESS: Automatic authentication worked - refresh auth cache and redirect
      console.log('[DemoStep3] Auto-login successful - synchronizing authentication state');
      
      /**
       * Critical: Invalidate React Query auth cache to synchronize frontend state
       * Backend authentication succeeded but frontend cache still shows "not authenticated"
       * This forces immediate refetch of /api/user to update authentication state
       */
      setTimeout(async () => {
        try {
          // Use comprehensive authentication synchronization utility
          const { performAuthSync } = await import('@/lib/auth-sync-utils');
          
          console.log('[DemoStep3] Initiating comprehensive authentication state synchronization');
          
          // Perform complete authentication synchronization workflow
          const syncResult = await performAuthSync({
            retryAttempts: 2,
            delayMs: 300, // Slightly longer delay for demo stability
            fallbackNavigation: true,
          });
          
          if (syncResult.success) {
            console.log('[DemoStep3] Authentication synchronization successful - navigating to dashboard', {
              action: syncResult.action,
              duration: syncResult.duration,
            });
            
            // Navigate to authenticated dashboard with synchronized state
            setTimeout(() => {
              console.log('[DemoStep3] Navigating to authenticated dashboard with refreshed state');
              setLocation(accessUrl);
            }, 100);
            
          } else {
            // Graceful fallback with detailed error logging
            console.warn('[DemoStep3] Authentication synchronization failed, using fallback navigation:', {
              error: syncResult.error,
              action: syncResult.action,
              fallbackRoute: accessUrl,
            });
            
            // Still attempt navigation as fallback
            setLocation(accessUrl);
          }
          
        } catch (syncError) {
          // Ultimate fallback: If entire sync utility fails, still attempt navigation
          console.error('[DemoStep3] Authentication sync utility failed, proceeding with direct navigation:', {
            error: syncError instanceof Error ? syncError.message : 'Unknown sync utility error',
            fallbackAction: 'Direct navigation to dashboard',
          });
          
          setLocation(accessUrl);
        }
      }, 1500);
      
    } else {
      // FALLBACK: Manual login required - redirect to login page
      console.log('[DemoStep3] Manual login required - redirecting to login page');
      
      setTimeout(() => {
        console.log('[DemoStep3] Navigating to login page for manual authentication');
        setLocation('/login');
      }, 1500);
    }
  };
  
  return (
    <div className="h-[760px] flex flex-col">
      {/* TOP SPACER */}
      <div className="flex-shrink-0 py-6"></div>
      
      {/* HEADER SECTION - fades out early in launch stage */}
      <motion.div 
        className="flex-shrink-0 space-y-2"
        initial={{ opacity: 1, y: 0 }}
        animate={wizardStep === 'launch' ? { opacity: 0, y: -20 } : { opacity: 1, y: 0 }}
        transition={{ delay: wizardStep === 'launch' ? 0.2 : 0, duration: 0.8, ease: "easeOut" }}
      >
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
          Review Demo Configuration
        </h1>
        <p className="text-sm text-gray-600">
          Verify your settings below, then sign in to launch your personalized demo experience.
        </p>
      </motion.div>
      
      {/* MAIN CONTENT AREA - Two Section Layout */}
      <motion.div 
        className="flex-1 flex flex-col space-y-3 pt-6"
        initial={{ opacity: 1 }}
        animate={wizardStep === 'launch' ? { opacity: 0 } : { opacity: 1 }}
        transition={{ delay: wizardStep === 'launch' ? 0.7 : 0, duration: 0.3, ease: "easeOut" }}
      >
        
        {/* THREE-TIERED STEP WIZARD */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-3">
            <div className="flex items-center w-full">
              {/* Step 1: Review - Left */}
              <div className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                wizardStep === 'review' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 
                wizardStep === 'setup' || wizardStep === 'launch' ? 'bg-green-100 text-green-700 border border-green-200' : 
                'bg-gray-100 text-gray-600 border border-gray-200'
              }`}>
                Review
              </div>

              {/* Left Connector - Fills space */}
              <div className={`h-0.5 flex-1 mx-4 transition-colors ${
                wizardStep === 'setup' || wizardStep === 'launch' ? 'bg-green-300' : 'bg-gray-300'
              }`}></div>

              {/* Step 2: System Setup - Center */}
              <div className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                wizardStep === 'setup' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 
                wizardStep === 'launch' ? 'bg-green-100 text-green-700 border border-green-200' : 
                'bg-gray-100 text-gray-600 border border-gray-200'
              }`}>
                System Setup
              </div>

              {/* Right Connector - Fills space */}
              <div className={`h-0.5 flex-1 mx-4 transition-colors ${
                wizardStep === 'launch' ? 'bg-green-300' : 'bg-gray-300'
              }`}></div>

              {/* Step 3: Launch - Right */}
              <div className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                wizardStep === 'launch' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}>
                <Rocket className="w-3.5 h-3.5" />
                <span>Launch</span>
              </div>
            </div>
          </div>
        </div>

        {/* DYNAMIC CONTENT SECTION */}
        <div className="flex-1 min-h-0 mt-3">
          {wizardStep === 'review' ? (
            // Review Stage - Show Configuration Details
            selectedPersona && formData ? (
              <div className="bg-white rounded-lg border border-gray-200 h-full overflow-auto">
                <div className="p-3 space-y-3">
                  {/* Persona Summary with larger icon */}
                  <div className="flex items-center space-x-3 pb-3 border-b border-gray-200">
                    <div className={`w-8 h-8 ${selectedPersona.bgColor} rounded flex items-center justify-center`}>
                      <selectedPersona.icon className={`w-4 h-4 ${selectedPersona.iconColor}`} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{selectedPersona.title}</h3>
                      <p className="text-sm text-gray-500">{selectedPersona.description}</p>
                    </div>
                  </div>

                  {/* Configuration Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Company Section */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1 mb-2">
                      <Building2 className="w-3 h-3 text-gray-500" />
                      <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">Company</h4>
                    </div>
                    
                    <div className={`rounded p-2 border transition-all duration-500 ${
                      isLoading && getCurrentTargetField() === 'companyName' 
                        ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' 
                        : loadingStep > 0 && getDemoActions(formData, selectedPersona).findIndex(action => action.targetField === 'companyName') < loadingStep - 1
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-100'
                    }`}>
                      <div className="text-xs text-gray-500 mb-1">Organization</div>
                      <div className="text-sm font-medium text-gray-900">{formData.companyName}</div>
                    </div>
                    
                    {/* Company Size for Accredited Data Recipients */}
                    {selectedPersona.id === 'accredited-data-recipient' && (
                      <>
                        <div className={`rounded p-2 border transition-all duration-500 ${
                          isLoading && getCurrentTargetField() === 'companySize' 
                            ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' 
                            : loadingStep > 0 && getDemoActions(formData, selectedPersona).findIndex(action => action.targetField === 'companySize') < loadingStep - 1
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50 border-gray-100'
                        }`}>
                          <div className="text-xs text-gray-500 mb-1">Size</div>
                          <div className="text-sm font-medium text-gray-900 capitalize">{formData.companySize?.replace('-', ' ')}</div>
                        </div>
                        <div className={`rounded p-2 border transition-all duration-500 ${
                          isLoading && getCurrentTargetField() === 'riskProfile' 
                            ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' 
                            : loadingStep > 0 && getDemoActions(formData, selectedPersona).findIndex(action => action.targetField === 'riskProfile') < loadingStep - 1
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50 border-gray-100'
                        }`}>
                          <div className="text-xs text-gray-500 mb-1">Risk Profile</div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">{formData.riskProfile}/100</span>
                            <div className="flex-1 h-1.5 bg-gray-200 rounded">
                              <div 
                                className="h-1.5 bg-blue-500 rounded transition-all duration-500" 
                                style={{ width: `${formData.riskProfile}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* Demo Company for New Data Recipients */}
                    {selectedPersona.id === 'new-data-recipient' && (
                      <div className={`rounded p-2 border transition-all duration-500 ${
                        isLoading && getCurrentTargetField() === 'demoData' 
                          ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' 
                          : loadingStep > 0 && getDemoActions(formData, selectedPersona).findIndex(action => action.targetField === 'demoData') < loadingStep - 1
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-100'
                      }`}>
                        <div className="text-xs text-gray-500 mb-1">Demo Data</div>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          formData.isDemoCompany ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {formData.isDemoCompany ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* User Section */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1 mb-2">
                      <User className="w-3 h-3 text-gray-500" />
                      <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">User</h4>
                    </div>
                    
                    <div className={`rounded p-2 border transition-all duration-500 ${
                      isLoading && getCurrentTargetField() === 'userFullName' 
                        ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' 
                        : loadingStep > 0 && getDemoActions(formData, selectedPersona).findIndex(action => action.targetField === 'userFullName') < loadingStep - 1
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-100'
                    }`}>
                      <div className="text-xs text-gray-500 mb-1">Full Name</div>
                      <div className="text-sm font-medium text-gray-900">{formData.userFullName}</div>
                    </div>
                    
                    <div className={`rounded p-2 border transition-all duration-500 ${
                      isLoading && getCurrentTargetField() === 'userEmail' 
                        ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' 
                        : loadingStep > 0 && getDemoActions(formData, selectedPersona).findIndex(action => action.targetField === 'userEmail') < loadingStep - 1
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-100'
                    }`}>
                      <div className="text-xs text-gray-500 mb-1">Email</div>
                      <div className="text-sm font-medium text-gray-900 break-all">{formData.userEmail}</div>
                    </div>
                    
                    <div className={`rounded p-2 border transition-all duration-500 ${
                      isLoading && getCurrentTargetField() === 'accessLevel' 
                        ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' 
                        : loadingStep > 0 && getDemoActions(formData, selectedPersona).findIndex(action => action.targetField === 'accessLevel') < loadingStep - 1
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-100'
                    }`}>
                      <div className="text-xs text-gray-500 mb-1">Access Level</div>
                      <div className="text-sm font-medium text-gray-900">{selectedPersona.title}</div>
                    </div>
                    
                    <div className={`rounded p-2 border transition-all duration-500 ${
                      isLoading && getCurrentTargetField() === 'emailInvitation' 
                        ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' 
                        : loadingStep > 0 && getDemoActions(formData, selectedPersona).findIndex(action => action.targetField === 'emailInvitation') < loadingStep - 1
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-100'
                    }`}>
                      <div className="text-xs text-gray-500 mb-1">Email Invitation</div>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        formData.emailInviteEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {formData.emailInviteEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Demo Configuration</h3>
                  <p className="text-gray-600 text-sm">
                    Please go back to configure your demo experience
                  </p>
                </div>
              </Card>
            )
          ) : wizardStep === 'setup' ? (
            // System Setup Stage - Enhanced with launch GIF and elegant animations
            <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
              <div className="p-4 flex-1 flex">
                {/* Left Side - Progress Actions */}
                <div className="flex-1 pr-4">
                  <div className="space-y-3">
                    {getDemoActions(formData, selectedPersona).map((action: any, index: number) => (
                      <motion.div 
                        key={action.id} 
                        className={`flex items-center space-x-3 transition-all duration-500 px-3 py-2 rounded-lg ${
                          index < loadingStep ? 'opacity-100 bg-green-50 border border-green-200' : 
                          index === loadingStep ? 'opacity-100 bg-blue-50 border border-blue-200' : 
                          'opacity-50 bg-gray-50 border border-gray-200'
                        }`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                          index < loadingStep ? 'bg-green-500' : 
                          index === loadingStep ? 'bg-blue-500' : 
                          'bg-gray-300'
                        }`}>
                          {index < loadingStep ? (
                            <Check className="w-2.5 h-2.5 text-white" />
                          ) : index === loadingStep ? (
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                          ) : null}
                        </div>
                        <div className={`text-sm font-medium ${
                          index === loadingStep ? 'text-blue-900' : 
                          index < loadingStep ? 'text-green-800' : 'text-gray-500'
                        }`}>{action.label}</div>
                      </motion.div>
                    ))}
                  </div>
                </div>
                

              </div>
            </div>
          ) : (
            // Launch Stage - Beautiful staggered fade-out animations
            <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col overflow-hidden">
              <div className="p-4 flex-1 flex flex-col items-center justify-center space-y-6">
                {/* Launch Icon - fades out first (0.2s) */}
                <motion.div
                  className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center"
                  initial={{ scale: 1, opacity: 1 }}
                  animate={{ scale: 0.9, opacity: 0 }}
                  transition={{ delay: 0.1, duration: 0.2, ease: "easeOut" }}
                >
                  <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
                
                {/* Launch Text - fades out second (0.4s) */}
                <motion.div
                  className="text-center space-y-2"
                  initial={{ y: 0, opacity: 1 }}
                  animate={{ y: -10, opacity: 0 }}
                  transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
                >
                  <h3 className="text-xl font-semibold text-gray-800">Demo Environment Ready</h3>
                  <p className="text-sm text-gray-600">Launching your personalized experience...</p>
                </motion.div>
              </div>
            </div>
          )}
        </div>

      </motion.div>

      {/* BUTTON SECTION - fades out last */}
      <motion.div 
        className="flex-shrink-0"
        initial={{ opacity: 1, y: 0 }}
        animate={wizardStep === 'launch' ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
        transition={{ delay: wizardStep === 'launch' ? 0.8 : 0, duration: 0.2, ease: "easeOut" }}
      >
        <DemoNavigation
          onBack={onBack}
          onNext={handleStartDemo}
          nextText={wizardStep === 'review' ? 'Sign In' : wizardStep === 'setup' ? 'Setting Up...' : 'Launching...'}
          nextDisabled={isLoading}
          backDisabled={wizardStep === 'setup' || wizardStep === 'launch'}
          nextIcon={wizardStep === 'review' ? 'check' : wizardStep === 'setup' ? 'spinner' : 'arrow'}
        />
      </motion.div>
      
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
  const [step2FormData, setStep2FormData] = useState<any>(null);
  
  // Enhanced: Track Step 3 wizard state for system setup visual integration
  const [step3WizardStep, setStep3WizardStep] = useState<'review' | 'setup' | 'launch'>('review');
  
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
            onFormDataChange={setStep2FormData}
          />
        );
      case 3:
        return (
          <DemoStep3 
            onNext={handleBackToLogin}
            onBack={handlePreviousStep}
            selectedPersona={selectedPersona}
            formData={step2FormData}
            onWizardStepChange={setStep3WizardStep}
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
    <motion.div
      initial={{ opacity: 1 }}
      animate={currentStep === 3 && step3WizardStep === 'launch' ? { opacity: 0 } : { opacity: 1 }}
      transition={{ 
        delay: currentStep === 3 && step3WizardStep === 'launch' ? 0 : 0, 
        duration: 1.0, 
        ease: "easeOut" 
      }}
    >
      <AuthLayout
      mode="demo"
      currentStep={currentStep}
      totalSteps={3}
      onBack={handleBackToLogin}
      isSystemSetup={currentStep === 3 && step3WizardStep === 'setup'}
      step3WizardStage={step3WizardStep}
    >
      {renderStepContent()}
    </AuthLayout>
    </motion.div>
  );
}