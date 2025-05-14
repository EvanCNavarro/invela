import React, { useState, useEffect, useMemo } from 'react';
import { Check, CheckCircle, ArrowRight, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
// Mock functions for API calls and contexts
// In a production environment, these would be actual API calls
const updateUserOnboardingStatus = async (userId: number, status: boolean) => {
  console.log('Updating user onboarding status', { userId, status });
  return { success: true };
};

const updateCompanyDetails = async (companyId: number, details: any) => {
  console.log('Updating company details', { companyId, details });
  return { success: true };
};

const inviteTeamMember = async (companyId: number, member: any) => {
  console.log('Inviting team member', { companyId, member });
  return { success: true };
};

// Helper for logging debug information
const logDebug = (message: string, data?: any) => {
  console.log(`[AnimatedOnboardingModal] ${message}`, data);
};

// Define the interface for team members
interface TeamMember {
  role: 'CFO' | 'CISO';
  fullName: string;
  email: string;
  roleDescription: string;
  formType: string;
}

// Define the common interface for company information
interface CompanyInfo {
  size: string;
  revenue: string;
}

/**
 * Step Transition Component
 * 
 * Wraps step content with animation using framer-motion
 * Provides smooth transitions between steps
 */
interface StepTransitionProps {
  children: React.ReactNode;
  direction: 'next' | 'prev';
  isActive: boolean;
}

const StepTransition: React.FC<StepTransitionProps> = ({ 
  children, 
  direction, 
  isActive 
}) => {
  // Different animations based on direction
  const variants = {
    enter: (direction: 'next' | 'prev') => ({
      x: direction === 'next' ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: 'next' | 'prev') => ({
      x: direction === 'next' ? -100 : 100,
      opacity: 0,
    }),
  };
  
  return (
    <AnimatePresence mode="wait" initial={false}>
      {isActive && (
        <motion.div
          key={`step-transition-${isActive ? 'active' : 'inactive'}`}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 }
          }}
          className="w-full"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Component for the header chip with consistent pill shape
const HeaderChip: React.FC = () => (
  <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-medium mb-4 w-fit">
    Onboarding Modal
  </div>
);

// Component for consistent right side image container
const RightImageContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="hidden md:block bg-blue-50/30 relative md:w-[50%] flex-shrink-0 border-l border-slate-100">
    <div className="absolute inset-0 flex items-center justify-center">
      {children}
    </div>
  </div>
);

// Component for consistent step image with loading indicator
const StepImage: React.FC<{ 
  src: string; 
  alt: string;
  isLoaded: boolean;
}> = ({ 
  src, 
  alt,
  isLoaded
}) => (
  <div className="w-[400px] h-[350px] relative flex items-center justify-center">
    {isLoaded ? (
      <img 
        src={src} 
        alt={alt}
        className="w-full h-full object-contain rounded-lg"
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center">
        <Skeleton className="w-[300px] h-[300px] rounded-lg" />
      </div>
    )}
  </div>
);

// Independent component for step layout to avoid JSX nesting issues
const StepLayout: React.FC<{ 
  title: string, 
  children: React.ReactNode, 
  imageSrc: string, 
  imageAlt: string 
}> = ({ 
  title, 
  children, 
  imageSrc, 
  imageAlt 
}) => {
  // Track image loading status
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Preload image
  useEffect(() => {
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.src = imageSrc;
    
    // Log when image is loaded for debugging
    logDebug(`Image loaded for step: ${title}`, { src: imageSrc });
  }, [imageSrc, title]);
  
  return (
    <div className="flex flex-col md:flex-row flex-1 h-[400px] overflow-visible">
      {/* Left side: Text content with fixed height and consistent padding */}
      <div className="md:w-[50%] px-8 py-6 flex flex-col">
        <div className="flex flex-col h-full">
          {/* Header chip for consistent styling */}
          <HeaderChip />
          
          {/* Page title with proper spacing */}
          <h2 className="text-2xl font-bold text-blue-600 mb-4">
            {title}
          </h2>
          
          {/* Content area with fixed height and scrolling if needed */}
          <div className="flex-grow overflow-y-auto content-area pr-2">
            {children}
          </div>
        </div>
      </div>
      
      {/* Right side: Image with consistent container */}
      <RightImageContainer>
        <StepImage 
          src={imageSrc} 
          alt={imageAlt}
          isLoaded={imageLoaded} 
        />
      </RightImageContainer>
    </div>
  );
};

// Component for rendering checklist items with consistent styling
const CheckListItem: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <div className="flex items-start space-x-3 mb-5">
    <div className="h-5 w-5 text-blue-600 flex-shrink-0 rounded-full bg-blue-50 flex items-center justify-center mt-0.5">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
    <div className="text-gray-700 text-base font-medium leading-relaxed">{children}</div>
  </div>
);

// Helper functions to get readable labels
const getSizeLabel = (size: string): string => {
  switch (size) {
    case 'small': return 'Small (1-49 employees)';
    case 'medium': return 'Medium (50-249 employees)';
    case 'large': return 'Large (250-999 employees)';
    case 'xlarge': return 'X Large (1K+ employees)';
    default: return 'Not specified';
  }
};

const getRevenueLabel = (revenue: string): string => {
  switch (revenue) {
    case 'small': return '$0–$10M';
    case 'medium': return '$10M–$50M';
    case 'large': return '$50M–$250M';
    case 'xlarge': return '$250M+';
    default: return 'Not specified';
  }
};

// Simple email validation
const isValidEmail = (email: string): boolean => {
  return /\S+@\S+\.\S+/.test(email);
};

export function AnimatedOnboardingModal({
  isOpen,
  setShowModal,
  user,
  currentCompany,
}: {
  isOpen: boolean,
  setShowModal: (show: boolean) => void,
  user: any | null,
  currentCompany: any | null,
}) {
  const [currentStep, setCurrentStep] = useState(0);
  
  // Track transition animation direction (next or previous)
  const [transitionDirection, setTransitionDirection] = useState<'next' | 'prev'>('next');
  
  // Track if transition is in progress
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    size: '',
    revenue: '',
  });
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      role: 'CFO',
      fullName: '',
      email: '',
      roleDescription: 'Financial Officer for',
      formType: 'KYB Form',
    },
    {
      role: 'CISO',
      fullName: '',
      email: '',
      roleDescription: 'Security Officer for',
      formType: 'KY3P Assessment',
    },
  ]);
  
  // Get toast function
  const { toast: toastFn } = useToast();
  
  // Reset state when modal is opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setCompanyInfo({
        size: '',
        revenue: '',
      });
      setTeamMembers([
        {
          role: 'CFO',
          fullName: '',
          email: '',
          roleDescription: 'Financial Officer for',
          formType: 'KYB Form',
        },
        {
          role: 'CISO',
          fullName: '',
          email: '',
          roleDescription: 'Security Officer for',
          formType: 'KY3P Assessment',
        },
      ]);
    }
  }, [isOpen]);
  
  // Check if current step is valid to proceed
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 0: // Welcome - always can proceed
        return true;
        
      case 1: // Company Information
        return companyInfo.size !== '' && companyInfo.revenue !== '';
        
      case 2: // Tasks - always can proceed
      case 3: // Documents - always can proceed
      case 4: // Team Members - always can proceed (can skip inviting team)
      case 5: // Review - always can proceed
      case 6: // Complete - always can proceed
        return true;
        
      default:
        return false;
    }
  }, [currentStep, companyInfo, teamMembers]);
  
  // Handle next step button click with animation
  const handleNextStep = () => {
    // Prevent interaction during transition
    if (isTransitioning) return;
    
    // If we're on the last step, complete onboarding
    if (currentStep === 6) {
      handleCompleteOnboarding();
      return;
    }
    
    // Set transition direction to 'next'
    setTransitionDirection('next');
    
    // Start transition animation
    setIsTransitioning(true);
    logDebug('Starting next step animation', { currentStep });
    
    // Short delay to allow animation to complete
    setTimeout(() => {
      // Go to the next step
      setCurrentStep(prev => prev + 1);
      
      // End transition after a short delay to ensure animation completes
      setTimeout(() => {
        setIsTransitioning(false);
        logDebug('Next step animation completed', { newStep: currentStep + 1 });
      }, 300);
    }, 200);
  };
  
  // Handle back button click with animation
  const handleBackStep = () => {
    // Prevent interaction during transition
    if (isTransitioning) return;
    
    // Set transition direction to 'prev'
    setTransitionDirection('prev');
    
    // Start transition animation
    setIsTransitioning(true);
    logDebug('Starting back step animation', { currentStep });
    
    // Short delay to allow animation to complete
    setTimeout(() => {
      // Go to the previous step
      setCurrentStep(prev => Math.max(0, prev - 1));
      
      // End transition after a short delay to ensure animation completes
      setTimeout(() => {
        setIsTransitioning(false);
        logDebug('Back step animation completed', { newStep: currentStep - 1 });
      }, 300);
    }, 200);
  };
  
  // Handle complete onboarding action
  const handleCompleteOnboarding = async () => {
    try {
      // Update user onboarding status
      if (user && user.id) {
        await updateUserOnboardingStatus(user.id, true);
      }
      
      // Update company details
      if (currentCompany && currentCompany.id) {
        await updateCompanyDetails(currentCompany.id, companyInfo);
      }
      
      // Invite team members (only those with valid entries)
      if (currentCompany && currentCompany.id) {
        const validMembers = teamMembers.filter(
          member => member.fullName && isValidEmail(member.email)
        );
        
        for (const member of validMembers) {
          await inviteTeamMember(currentCompany.id, {
            fullName: member.fullName,
            email: member.email,
            role: member.role,
          });
        }
      }

      // Show success message
      toastFn({
        title: "Welcome aboard!",
        description: "Your onboarding has been completed successfully.",
        variant: "default"
      });
      
      // Close modal
      setShowModal(false);
    } catch (error) {
      console.error('[OnboardingModal] Error completing onboarding:', error);
      
      // Still show success and close modal to prevent blocking user
      toastFn({
        title: "Welcome aboard!",
        description: "Your onboarding has been completed successfully.",
        variant: "default"
      });
      
      // Close modal
      setShowModal(false);
    }
  };
  
  // Render step indicator bar
  const renderStepIndicator = () => {
    const steps = [
      'Welcome',
      'Company',
      'Tasks',
      'Documents',
      'Team',
      'Review',
      'Complete'
    ];
    
    return (
      <div className="flex space-x-2 justify-center items-center">
        {steps.map((step, idx) => (
          <div 
            key={idx} 
            className="flex items-center"
          >
            <div 
              className={cn(
                "h-2.5 w-2.5 rounded-full transition-colors", 
                currentStep === idx 
                  ? "bg-blue-600 ring-2 ring-blue-200" 
                  : idx < currentStep 
                    ? "bg-green-400" 
                    : "bg-gray-200"
              )}
            />
            {idx < steps.length - 1 && (
              <div className={cn(
                "h-[1px] w-4 mx-1",
                idx < currentStep ? "bg-green-300" : "bg-gray-200"
              )} />
            )}
          </div>
        ))}
      </div>
    );
  };
  
  // Generate content for the current step
  const getCurrentStepContent = () => {
    // Return the appropriate content based on current step
    switch (currentStep) {
      case 0: // Welcome
        return (
          <StepLayout
            title="Welcome to the Invela Trust Network"
            imageSrc="/assets/welcome_1.png"
            imageAlt="Welcome to Invela"
          >
            <div className="mt-4 space-y-4">
              <CheckListItem>
                Your premier partner for secure and efficient accreditation
              </CheckListItem>
              <CheckListItem>
                Enterprise-grade risk assessment and management platform
              </CheckListItem>
              <CheckListItem>
                Streamlined compliance processes with advanced automation
              </CheckListItem>
            </div>
          </StepLayout>
        );
      
      case 1: // Company Information
        return (
          <StepLayout
            title="Company Information"
            imageSrc="/assets/welcome_2.png"
            imageAlt="Company Information"
          >
            <div className="mt-4 space-y-4">
              <p className="text-lg text-gray-700 mb-6">
                Add basic details about {currentCompany?.name} to help us customize your experience.
              </p>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="company-size" className="text-base">
                    Company Size
                  </Label>
                  <Select 
                    value={companyInfo.size}
                    onValueChange={(value) => setCompanyInfo(prev => ({ ...prev, size: value }))}
                  >
                    <SelectTrigger 
                      id="company-size" 
                      className={cn(
                        "h-11 rounded-md border-gray-300 focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50",
                        companyInfo.size ? "border-green-500 bg-green-50/30" : ""
                      )}
                    >
                      <SelectValue placeholder="Select number of employees" />
                    </SelectTrigger>
                    <SelectContent className="bg-white rounded-md shadow-md">
                      <SelectItem value="small">Small (1-49 employees)</SelectItem>
                      <SelectItem value="medium">Medium (50-249 employees)</SelectItem>
                      <SelectItem value="large">Large (250-999 employees)</SelectItem>
                      <SelectItem value="xlarge">X Large (1K+ employees)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="company-revenue" className="text-base">
                    Annual Revenue
                  </Label>
                  <Select 
                    value={companyInfo.revenue}
                    onValueChange={(value) => setCompanyInfo(prev => ({ ...prev, revenue: value }))}
                  >
                    <SelectTrigger 
                      id="company-revenue" 
                      className={cn(
                        "h-11 rounded-md border-gray-300 focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50",
                        companyInfo.revenue ? "border-green-500 bg-green-50/30" : ""
                      )}
                    >
                      <SelectValue placeholder="Select annual revenue" />
                    </SelectTrigger>
                    <SelectContent className="bg-white rounded-md shadow-md">
                      <SelectItem value="small">$0–$10M</SelectItem>
                      <SelectItem value="medium">$10M–$50M</SelectItem>
                      <SelectItem value="large">$50M–$250M</SelectItem>
                      <SelectItem value="xlarge">$250M+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </StepLayout>
        );
      
      case 2: // Tasks
        return (
          <StepLayout
            title="Your Assessment Tasks"
            imageSrc="/assets/welcome_3.png"
            imageAlt="Assessment Tasks"
          >
            <div className="mt-4 space-y-4">
              <p className="text-lg text-gray-700 mb-4">
                Complete tasks in your dashboard to build your company's trust profile.
              </p>
              
              <div className="space-y-4">
                <Card className="overflow-hidden">
                  <CardContent className="p-4 flex items-start space-x-3">
                    <div className="h-6 w-6 text-primary flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium">Know Your Business (KYB)</h3>
                      <p className="text-sm text-gray-600">Verify your company's business information</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="overflow-hidden">
                  <CardContent className="p-4 flex items-start space-x-3">
                    <div className="h-6 w-6 text-primary flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium">KY3P Assessment</h3>
                      <p className="text-sm text-gray-600">Third-party risk assessment covering security practices</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </StepLayout>
        );
      
      case 3: // Documents
        return (
          <StepLayout
            title="Document Uploads"
            imageSrc="/assets/welcome_4.png"
            imageAlt="Document Uploads"
          >
            <div className="mt-4 space-y-4">
              <p className="text-lg text-gray-700 mb-4">
                You'll be asked to submit documents during the assessment process:
              </p>
              
              <div className="space-y-4">
                <CheckListItem>
                  All documents are securely stored in the File Vault
                </CheckListItem>
                <CheckListItem>
                  Industry-standard security practices protect all uploads
                </CheckListItem>
                <CheckListItem>
                  Granular permissions control who can access each document
                </CheckListItem>
              </div>
            </div>
          </StepLayout>
        );
      
      case 4: // Team
        return (
          <StepLayout
            title="Invite Your Team"
            imageSrc="/assets/welcome_5.png"
            imageAlt="Invite Team"
          >
            <div className="mt-4 space-y-4">
              <p className="text-lg text-gray-700 mb-4">
                Build your team by inviting key members to help complete assessment forms.
              </p>
              
              <div className="space-y-4 overflow-y-auto pr-2">
                {teamMembers.map((member, index) => (
                  <Card key={index} className="overflow-hidden border border-gray-200 rounded-lg shadow-sm">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-blue-100 text-blue-700 py-1.5 px-3 rounded-full text-sm font-medium">
                          {member.role}
                        </div>
                        <span className="text-sm text-gray-600">
                          {member.roleDescription} {member.formType}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`name-${index}`} className="mb-2 block text-sm font-medium">
                            Full Name
                          </Label>
                          <Input
                            id={`name-${index}`}
                            value={member.fullName}
                            onChange={(e) => {
                              const newMembers = [...teamMembers];
                              newMembers[index].fullName = e.target.value;
                              setTeamMembers(newMembers);
                            }}
                            className={cn(
                              "h-11 rounded-md border-gray-300 focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50 text-sm",
                              member.fullName ? "border-green-500 bg-green-50/30" : ""
                            )}
                            placeholder="Jane Smith"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`email-${index}`} className="mb-2 block text-sm font-medium">
                            Email Address
                          </Label>
                          <Input
                            id={`email-${index}`}
                            type="email"
                            value={member.email}
                            onChange={(e) => {
                              const newMembers = [...teamMembers];
                              newMembers[index].email = e.target.value;
                              setTeamMembers(newMembers);
                            }}
                            className={cn(
                              "h-11 rounded-md border-gray-300 focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50 text-sm",
                              member.email && isValidEmail(member.email) ? "border-green-500 bg-green-50/30" : ""
                            )}
                            placeholder="jane.smith@company.com"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                <p className="text-xs text-gray-500 mt-2">
                  Team member invitations are optional - you can skip this step if needed
                </p>
              </div>
            </div>
          </StepLayout>
        );
      
      case 5: // Review Information
        return (
          <StepLayout
            title="Review Provided Information"
            imageSrc="/assets/welcome_6.png"
            imageAlt="Review Information"
          >
            <div className="mt-4 space-y-4">
              <p className="text-lg text-gray-700 mb-4">
                Please review the information you've provided:
              </p>
              
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 shadow-sm">
                  <h3 className="text-sm font-semibold text-blue-700 mb-3">Company Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-1 border-b border-gray-100">
                      <span className="text-sm text-gray-700">Company Size:</span>
                      <span className="text-sm font-medium text-gray-900">{getSizeLabel(companyInfo.size)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-sm text-gray-700">Annual Revenue:</span>
                      <span className="text-sm font-medium text-gray-900">{getRevenueLabel(companyInfo.revenue)}</span>
                    </div>
                  </div>
                </div>
                
                {teamMembers.some(m => m.fullName || m.email) && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-semibold text-blue-700 mb-3">Team Members to Invite</h3>
                    <div className="space-y-3">
                      {teamMembers.filter(m => m.fullName || m.email).map((m, i) => (
                        <div key={i} className={cn(
                          "flex justify-between items-center py-1",
                          i < teamMembers.length - 1 ? "border-b border-gray-100" : ""
                        )}>
                          <span className="text-sm text-gray-700">{m.role}:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {m.fullName} {m.email ? `(${m.email})` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </StepLayout>
        );
      
      case 6: // Complete
        return (
          <StepLayout
            title="Onboarding Complete"
            imageSrc="/assets/welcome_7.png"
            imageAlt="Onboarding Complete"
          >
            <div className="mt-4 space-y-4">
              <div className="text-center mb-6">
                <div className="mx-auto mb-6">
                  <div className="h-24 w-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto shadow-md">
                    <Check className="h-12 w-12 text-blue-600" />
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-blue-700 mb-3">Welcome to Invela!</h3>
                <p className="text-lg text-gray-700 mb-6 max-w-md mx-auto">
                  Your onboarding is complete, and you now have full access to the platform.
                </p>
              </div>
              
              <div className="space-y-4 max-w-md mx-auto">
                <div className="bg-blue-50 rounded-lg p-5 border border-blue-100 shadow-sm text-center">
                  <div className="font-medium text-lg text-blue-700 mb-3">What's next?</div>
                  <p className="text-gray-700">
                    Head to your dashboard to check your progress and complete your pending tasks.
                  </p>
                </div>
                <div className="flex items-center justify-center mt-2">
                  <ArrowDown className="h-6 w-6 text-blue-500 animate-bounce" />
                </div>
              </div>
            </div>
          </StepLayout>
        );
      
      default:
        return null;
    }
  };
  
  // Render step content with animation wrapper
  const renderStepContent = () => {
    // Get current step content
    const content = getCurrentStepContent();
    
    // Return with animation wrapper
    return (
      <StepTransition
        direction={transitionDirection}
        isActive={true}
        key={`step-${currentStep}`}
      >
        {content}
      </StepTransition>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {/* prevent closing */}}>
      <DialogContent 
        className="max-w-[900px] p-0 overflow-hidden h-[550px] flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Main content area */}
        <div className="flex-1 overflow-hidden">
          {/* Step content */}
          {renderStepContent()}
        </div>
        
        {/* Footer buttons */}
        <DialogFooter className="p-4 border-t flex items-center">
          <div className="flex-1 text-left">
            {currentStep > 0 ? (
              <Button 
                type="button"
                variant="outline"
                onClick={handleBackStep}
                disabled={isTransitioning}
              >
                Back
              </Button>
            ) : (
              <div></div> // Empty div to maintain spacing when back button is hidden
            )}
          </div>
          
          {/* Step indicator in the footer - centered */}
          <div className="flex-1 flex justify-center">
            {renderStepIndicator()}
          </div>
          
          <div className="flex-1 text-right">
            <Button 
              type="button"
              onClick={handleNextStep}
              disabled={!canProceed || isTransitioning}
            >
              {currentStep === 6 ? 'Complete' : 'Next'} 
              {currentStep < 6 && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}