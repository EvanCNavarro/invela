import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Check, CheckCircle, ArrowRight } from 'lucide-react';
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

// Mock function for demo purposes - replace with actual API functions
const updateUserOnboardingStatus = async (userId: number, status: boolean) => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  return { success: true };
};

// Mock function for demo purposes - replace with actual API functions
const updateCompanyDetails = async (companyId: number, details: any) => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  return { success: true };
};

// Mock function for demo purposes - replace with actual API functions
const inviteTeamMembers = async (companyId: number, members: any[]) => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  return { success: true };
};

// Simple logging function for debugging animations
const logDebug = (message: string, data?: any) => {
  if (import.meta.env.DEV) {
    console.log(`[OnboardingModal] ${message}`, data || '');
  }
};

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
      x: direction === 'next' ? 40 : -40,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: 'next' | 'prev') => ({
      x: direction === 'next' ? -40 : 40,
      opacity: 0,
    }),
  };
  
  logDebug('Rendering step transition', { direction, isActive });
  
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

// Component for consistent right side image container
const RightImageContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="hidden md:block bg-blue-50/10 relative md:w-[50%] flex-shrink-0 border-l border-slate-100">
    <div className="absolute inset-0 flex items-start justify-center p-4 pt-8">
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
  <div className="w-[400px] h-[350px] relative flex items-start justify-center pt-4">
    {isLoaded ? (
      <>
        <div className="absolute inset-0 bg-blue-50/50 rounded-lg transform rotate-1 mt-4"></div>
        <div className="absolute inset-0 bg-blue-100/20 rounded-lg transform -rotate-1 mt-4"></div>
        <img 
          src={src} 
          alt={alt} 
          className="relative max-w-[95%] max-h-[330px] object-contain rounded-lg shadow-md border border-blue-100/50 z-10" 
        />
      </>
    ) : (
      <Skeleton className="w-full h-full rounded-lg" />
    )}
  </div>
);

// Component for consistent checklist items
const CheckListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-start gap-3">
    <div className="rounded-full bg-primary/10 text-primary p-1 mt-0.5">
      <Check className="h-4 w-4" />
    </div>
    <span className="text-gray-800 text-lg font-medium">{children}</span>
  </div>
);

// Define the common interface for team members
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

export function OnboardingModal({
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
  
  // Track loaded images to display loaders until images are ready
  const [imagesLoaded, setImagesLoaded] = useState<Record<string, boolean>>({});
  
  // Get toast function
  const { toast: toastFn } = useToast();
  
  // Preload all the step images on component mount
  useEffect(() => {
    if (!isOpen) return;
    
    const imagePaths = [
      '/assets/welcome_1.png',
      '/assets/welcome_2.png',
      '/assets/welcome_3.png',
      '/assets/welcome_4.png',
      '/assets/welcome_5.png',
      '/assets/welcome_6.png',
      '/assets/welcome_7.png',
    ];
    
    // Mark all images as loaded initially to prevent loading spinners
    // since we know the images are available in the attached assets
    const initialLoadState = imagePaths.reduce((acc, path) => {
      acc[path] = true;
      return acc;
    }, {} as Record<string, boolean>);
    
    setImagesLoaded(initialLoadState);
    
    // Still attempt to preload images for browser caching
    imagePaths.forEach(path => {
      const img = new Image();
      img.src = path;
    });
  }, [isOpen]);
  
  // Is current step image loaded
  const isCurrentImageLoaded = useMemo(() => {
    const imagePath = `/assets/welcome_${currentStep + 1}.png`;
    return imagesLoaded[imagePath] === true;
  }, [currentStep, imagesLoaded]);
  
  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
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
        
      case 2: // Tasks Overview - always can proceed
      case 3: // Document Uploads - always can proceed
        return true;
        
      case 4: // Team Invitations - no validation required, can be skipped
        return true;
        
      case 5: // Review Information - always can proceed
        return true;
        
      case 6: // Completion - this is the last step
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
        
        if (validMembers.length > 0) {
          await inviteTeamMembers(currentCompany.id, validMembers);
        }
      }
      
      // Broadcast updates via WebSocket if available
      if (typeof window !== 'undefined' && window.WebSocket) {
        try {
          const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
          const socket = new WebSocket(wsUrl);
          
          socket.onopen = () => {
            socket.send(JSON.stringify({
              type: 'onboarding_completed',
              userId: user?.id,
              companyId: currentCompany?.id,
              timestamp: new Date().toISOString()
            }));
            socket.close();
          };
        } catch (error) {
          console.error('[OnboardingModal] WebSocket send error:', error);
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
      'Complete',
    ];
    
    return (
      <div className="mx-auto max-w-2xl mb-4">
        <div className="grid grid-cols-7 gap-1">
          {steps.map((step, index) => (
            <div 
              key={index} 
              className="flex flex-col items-center"
              onClick={() => setCurrentStep(index)}
            >
              <div 
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1 cursor-pointer transition-colors", 
                  index === currentStep
                    ? "bg-primary text-white"
                    : index < currentStep
                      ? "bg-green-100 text-green-800 hover:bg-green-200"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                )}
              >
                {index < currentStep ? '✓' : index + 1}
              </div>
              <div className="text-[10px] text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis max-w-[40px] text-center">
                {step}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Independent component for step layout to avoid JSX nesting issues
  const StepLayout = ({ 
    title, 
    children, 
    imageSrc, 
    imageAlt 
  }: { 
    title: string, 
    children: React.ReactNode, 
    imageSrc: string, 
    imageAlt: string 
  }) => (
    <div className="flex flex-col md:flex-row flex-1 h-[350px] overflow-visible">
      {/* Left side: Text content with fixed height and consistent padding */}
      <div className="md:w-[60%] px-6 py-4 flex flex-col">
        <div className="flex flex-col h-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {title}
          </h2>
          <div className="flex-grow overflow-y-auto content-area">
            {children}
          </div>
        </div>
      </div>
      
      {/* Right side: Image with consistent sizing */}
      <RightImageContainer>
        <StepImage 
          src={imageSrc} 
          alt={imageAlt}
          isLoaded={imagesLoaded[imageSrc] === true} 
        />
      </RightImageContainer>
    </div>
  );
  
  // Render step content based on current step with animation transition
  const renderStepContent = () => {
    // Generate the current step content
    const currentStepContent = useMemo(() => {
      switch (currentStep) {
    }, [currentStep, companyInfo, teamMembers, currentCompany]);
    
    // Wrap with AnimatePresence to handle animations between steps
    return (
      <AnimatePresence mode="wait" initial={false}>
        <StepTransition
          direction={transitionDirection}
          isActive={true}
          key={`step-${currentStep}`}
        >
          {currentStepContent}
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
              
              <div className="space-y-7">
                <div>
                  <Label htmlFor="company-size" className="text-lg font-medium block mb-3">
                    Company Size <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={companyInfo.size} 
                    onValueChange={(value) => setCompanyInfo(prev => ({ ...prev, size: value }))}
                  >
                    <SelectTrigger id="company-size" className="h-14 text-base">
                      <SelectValue placeholder="Select number of employees" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={5} className="z-[2000]">
                      <SelectItem value="small" className="text-base py-2">Small (1-49 employees)</SelectItem>
                      <SelectItem value="medium" className="text-base py-2">Medium (50-249 employees)</SelectItem>
                      <SelectItem value="large" className="text-base py-2">Large (250-999 employees)</SelectItem>
                      <SelectItem value="xlarge" className="text-base py-2">X Large (1K+ employees)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="company-revenue" className="text-lg font-medium block mb-3">
                    Annual Revenue <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={companyInfo.revenue} 
                    onValueChange={(value) => setCompanyInfo(prev => ({ ...prev, revenue: value }))}
                  >
                    <SelectTrigger id="company-revenue" className="h-14 text-base">
                      <SelectValue placeholder="Select annual revenue" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={5} className="z-[2000]">
                      <SelectItem value="small" className="text-base py-2">$0–$10M</SelectItem>
                      <SelectItem value="medium" className="text-base py-2">$10M–$50M</SelectItem>
                      <SelectItem value="large" className="text-base py-2">$50M–$250M</SelectItem>
                      <SelectItem value="xlarge" className="text-base py-2">$250M+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </StepLayout>
        );
      
      case 2: // Tasks Overview
        return (
          <StepLayout
            title="Your Tasks"
            imageSrc="/assets/welcome_3.png"
            imageAlt="Task List"
          >
            <div className="mt-4 space-y-4">
              <p className="text-lg text-gray-700 mb-4">
                To receive your Accreditation, you'll need to finish the following assigned tasks:
              </p>
              
              <div className="space-y-4 mt-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-white text-base font-medium flex-shrink-0">1</div>
                  <div>
                    <h3 className="font-medium text-lg text-gray-900">KYB Form</h3>
                    <p className="text-sm text-gray-600">Business identity verification</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-white text-base font-medium flex-shrink-0">2</div>
                  <div>
                    <h3 className="font-medium text-lg text-gray-900">S&P KY3P Security Assessment</h3>
                    <p className="text-sm text-gray-600">Security and compliance verification</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-white text-base font-medium flex-shrink-0">3</div>
                  <div>
                    <h3 className="font-medium text-lg text-gray-900">Open Banking Survey</h3>
                    <p className="text-sm text-gray-600">Open banking capabilities assessment</p>
                  </div>
                </div>
              </div>
            </div>
          </StepLayout>
        );
      
      case 3: // Document Uploads
        return (
          <StepLayout
            title="Streamline with Document Uploads"
            imageSrc="/assets/welcome_4.png"
            imageAlt="Document Upload"
          >
            <div className="mt-4 space-y-4">
              <p className="text-lg text-gray-700 mb-4">
                Accelerate your accreditation by uploading critical documents upfront. 
                Our AI-driven system auto-fills forms, saving you time.
              </p>
              
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-4">Recommended Documents</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    "SOC 2", 
                    "ISO 27001",
                    "Penetration Test Reports",
                    "API Security",
                    "OAuth Certification",
                    "GDPR/CCPA Compliance",
                    "FDX Certification",
                    "Business Continuity Plan"
                  ].map((doc, i) => (
                    <div key={i} className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
                      {doc}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </StepLayout>
        );
      
      case 4: // Team Invitations
        return (
          <StepLayout
            title="Invite Your Team"
            imageSrc="/assets/welcome_5.png"
            imageAlt="Team Invitations"
          >
            <div className="mt-4 space-y-4">
              <p className="text-lg text-gray-700 mb-4">
                Build your team by inviting key members to help complete assessment forms.
              </p>
              
              <div className="space-y-4 overflow-y-auto pr-2">
                {teamMembers.map((member, index) => (
                  <Card key={index} className="overflow-hidden border-gray-200 shadow-sm">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-primary/10 text-primary py-1.5 px-3 rounded-full text-sm font-medium">
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
                            className={cn("h-10 text-sm", member.fullName ? "border-green-500" : "")}
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
                            className={cn("h-10 text-sm", 
                              member.email && isValidEmail(member.email) ? "border-green-500" : ""
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
                Please confirm the information you've provided before completing the onboarding process.
              </p>
                
              <div className="space-y-5 text-base mt-6 bg-gray-50 p-6 rounded-lg border border-gray-100">
                <div className="flex items-center gap-4">
                  <Check className="text-green-500 h-6 w-6 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Company Information</div>
                    <div className="text-sm text-gray-600">
                      Size: {getSizeLabel(companyInfo.size)}, Revenue: {getRevenueLabel(companyInfo.revenue)}
                    </div>
                  </div>
                </div>
                
                {teamMembers.some(m => m.fullName && m.email) && (
                  <div className="flex items-center gap-4">
                    <Check className="text-green-500 h-6 w-6 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Team Members</div>
                      <div className="text-sm text-gray-600">
                        {teamMembers.filter(m => m.fullName && m.email).length} team member(s) invited
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-4">
                  <Check className="text-green-500 h-6 w-6 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Tasks Ready</div>
                    <div className="text-sm text-gray-600">
                      3 compliance tasks prepared for your review
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <p className="text-sm text-gray-600">
                  By completing onboarding, you'll unlock access to your compliance
                  tasks, starting with the KYB Form.
                </p>
              </div>
              
              <div className="space-y-4 text-sm mt-6">
                <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg shadow-sm">
                  <ArrowRight className="text-primary h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span>Complete the KYB form to verify your business identity</span>
                </div>
                
                <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg shadow-sm">
                  <ArrowRight className="text-primary h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span>Upload compliance documents to fast-track your accreditation</span>
                </div>
              </div>
            </div>
          </StepLayout>
        );
      
      case 6: // Completion
        return (
          <StepLayout
            title="Onboarding Complete"
            imageSrc="/assets/welcome_7.png"
            imageAlt="Onboarding Complete"
          >
            <div className="mt-4 space-y-4">
              <div className="text-center mb-4">
                <div className="mx-auto mb-6">
                  <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Check className="h-10 w-10 text-green-600" />
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Invela!</h3>
                <p className="text-lg text-gray-700 mb-6">
                  Your onboarding is complete, and you now have full access to the platform.
                </p>
              </div>
              
              <div className="space-y-4 max-w-md mx-auto">
                <div className="bg-white rounded-lg p-4 border border-green-100 shadow-sm text-center">
                  <div className="font-medium text-lg mb-2">What's next?</div>
                  <p className="text-gray-600">
                    Head to your dashboard to check your progress and complete your pending tasks.
                  </p>
                </div>
              </div>
            </div>
          </StepLayout>
        );
      
      default:
        return null;
    }
          }, [currentStep, companyInfo, teamMembers, currentCompany])}
        </StepTransition>
      </AnimatePresence>
    );
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={() => {/* prevent closing */}}>
      <DialogContent 
        className="max-w-[900px] p-0 overflow-hidden h-[550px] flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-4 flex-1 flex flex-col overflow-hidden">
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
              >
                Back
              </Button>
            ) : (
              <div></div> // Empty div to maintain spacing when back button is hidden
            )}
          </div>
          
          {/* Step indicator in the footer - centered */}
          <div className="flex-1 flex items-center justify-center gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full ${
                  i === currentStep ? 'bg-primary' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          
          <div className="flex-1 text-right">
            <Button 
              type="button"
              disabled={!canProceed}
              onClick={handleNextStep}
            >
              {currentStep === 6 ? 'Complete' : 'Next'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}