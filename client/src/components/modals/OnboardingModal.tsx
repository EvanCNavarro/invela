import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogTitle, DialogContent, DialogDescription, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EnhancedSkeleton } from "@/components/ui/enhanced-skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Check, CheckCircle, ChevronRight, ArrowLeft, ArrowRight } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast, toast as toastFn } from "@/hooks/use-toast";
import { useWebSocketContext } from "@/providers/websocket-provider";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { forwardRef } from "react";

// Define types for company information
interface CompanyInfo {
  size: string;
  revenue: string;
}

// Define types for team members
interface TeamMember {
  role: 'CFO' | 'CISO';
  fullName: string;
  email: string;
  roleDescription: string;
  formType: string;
}

// Create a custom dialog content without close button
const CustomDialogContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  // Create custom event handlers to prevent focus trapping and automatic focusing
  const handleOpenAutoFocus = (e: Event) => {
    e.preventDefault();
  };
  
  // Prevent automatic focus on dialog close
  const handleCloseAutoFocus = (e: Event) => {
    e.preventDefault();
  };

  return (
    <DialogPortal>
      <DialogOverlay className="bg-black/50 z-[1000]" />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-[1001] grid w-full max-w-[860px] min-h-[600px] h-auto translate-x-[-50%] translate-y-[-50%] gap-4 border border-gray-200 bg-background p-0 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-xl overflow-visible backdrop-blur-md",
          className
        )}
        onOpenAutoFocus={handleOpenAutoFocus}
        onCloseAutoFocus={handleCloseAutoFocus}
        onInteractOutside={(e) => e.preventDefault()}
        {...props}
      >
        {children}
        {/* No close button here - user must complete steps or click explicit buttons */}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
CustomDialogContent.displayName = "CustomDialogContent";

// Preload all images to ensure fast display
/**
 * Centered Image Container for the right side of onboarding steps
 * Consistently positions images in the right panel with fixed dimensions
 */
const RightImageContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="hidden md:block bg-blue-50/30 relative md:w-[40%] flex-shrink-0 border-l border-slate-100">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[80%] h-[80%] flex items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  );
};

/**
 * A consistent check item component for onboarding steps
 * Ensures proper alignment between check icons and text
 */
const CheckListItem = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex items-start gap-3">
      <div className="h-6 w-6 text-primary flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <p className="text-lg font-medium text-gray-700">
        {children}
      </p>
    </div>
  );
};

/**
 * Image display component with decorative background elements
 * Creates a consistent style for all step images with fixed dimensions
 */
const StepImage = ({ src, alt, isLoaded }: { src: string; alt: string; isLoaded: boolean }) => {
  if (!isLoaded) {
    return <EnhancedSkeleton className="w-[200px] h-[200px] rounded-lg" />;
  }
  
  return (
    <div className="relative w-[200px] h-[200px]">
      <div className="absolute inset-0 bg-blue-50/50 rounded-lg transform rotate-1"></div>
      <div className="absolute inset-0 bg-blue-100/20 rounded-lg transform -rotate-1"></div>
      <img 
        src={src} 
        alt={alt} 
        className="absolute inset-0 w-full h-full object-contain rounded-lg shadow-md border border-blue-100/50 z-10" 
      />
    </div>
  );
};

/**
 * Preload images for onboarding steps to ensure smooth transitions
 * Only preloads images if onboarding is not completed
 * 
 * @param shouldPreload Boolean flag to determine if preloading should happen
 * @param callback Optional callback for image load status
 */
const preloadImages = (
  shouldPreload: boolean,
  callback?: (src: string, success: boolean) => void
): void => {
  // Skip preloading if user has completed onboarding
  if (!shouldPreload) {
    return;
  }
  
  // Define all images to preload
  const imagePaths = [
    "/assets/welcome_1.png",
    "/assets/welcome_2.png",
    "/assets/welcome_3.png",
    "/assets/welcome_4.png",
    "/assets/welcome_5.png",
    "/assets/welcome_6.png",
    "/assets/welcome_7.png"
  ];
  
  // Log once at the start of preloading
  import('@/lib/logger').then(({ logger }) => {
    logger.debug('[OnboardingModal] Preloading onboarding images', {
      imageCount: imagePaths.length,
      images: imagePaths
    });
  });
  
  // Preload all images in parallel
  imagePaths.forEach(src => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      if (callback) callback(src, true);
    };
    img.onerror = (e) => {
      // Only log errors
      import('@/lib/logger').then(({ logger }) => {
        logger.error('[OnboardingModal] Failed to preload image', {
          src,
          error: e
        });
      });
      if (callback) callback(src, false);
    };
  });
};

export function OnboardingModal() {
  // Track current step and model visibility
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [imagesLoaded, setImagesLoaded] = useState<Record<string, boolean>>({});
  
  // Track form data for multi-step process
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    size: "",
    revenue: ""
  });
  
  // Track team members for invitation
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      role: 'CFO',
      fullName: '',
      email: '',
      roleDescription: 'Financial Data for',
      formType: 'KYB Form'
    },
    {
      role: 'CISO',
      fullName: '',
      email: '',
      roleDescription: 'Compliance Info for',
      formType: 'S&P KY3P Security Assessment'
    }
  ]);
  
  // Get authentication and toast utilities
  const { user } = useAuth();
  const websocket = useWebSocketContext();
  const connected = websocket.isConnected;

  // Track the loading of current step image
  const currentStepImage = `/assets/welcome_${currentStep + 1}.png`;
  const isCurrentImageLoaded = imagesLoaded[currentStepImage] === true;
  
  // Enhanced localStorage handler - directly completes onboarding if localStorage has a record
  const completeOnboardingFromLocalStorage = useCallback(() => {
    if (!user) return false;
    
    try {
      const onboardingCompleted = localStorage.getItem('onboarding_completed') === 'true';
      const savedUserId = localStorage.getItem('onboarding_user_id');
      
      if (onboardingCompleted && savedUserId === user.id.toString()) {
        console.log('[ONBOARDING DEBUG] Found onboarding completion in localStorage, applying to user');
        user.onboarding_user_completed = true;
        return true;
      }
    } catch (err) {
      console.error('[ONBOARDING DEBUG] Error checking localStorage:', err);
    }
    return false;
  }, [user]);
  
  // Fetch current company information
  const { data: currentCompany } = useQuery<{
    id: number;
    name: string;
    category: string;
    size?: string;
    revenue?: string;
    onboardingCompleted?: boolean;
  }>({
    queryKey: ['/api/companies/current'],
    enabled: !!user
  });
  
  // Only set modal visibility once when user data is fully available
  useEffect(() => {
    if (!user) return;
    
    // Log user data for debugging
    import('@/lib/logger').then(({ logger }) => {
      logger.debug('[OnboardingModal] User data received', {
        userId: user.id,
        email: user.email,
        onboardingCompleted: user.onboarding_user_completed
      });
    });
    
    // Preload images only if user hasn't completed onboarding
    const shouldPreloadImages = !user.onboarding_user_completed;
    
    // Preload all step images
    preloadImages(
      shouldPreloadImages, 
      (src: string, success: boolean) => {
        if (success) {
          setImagesLoaded(prev => ({
            ...prev,
            [src]: true
          }));
        }
      }
    );
    
    // First check: User is already marked as onboarded
    if (user.onboarding_user_completed === true) {
      console.log('[ONBOARDING DEBUG] User is already marked as onboarded');
      try {
        localStorage.setItem('onboarding_completed', 'true');
        localStorage.setItem('onboarding_user_id', user.id.toString());
      } catch (err) {
        console.error('[ONBOARDING DEBUG] Failed to update localStorage:', err);
      }
      return; // Exit early, no need to show modal
    }
    
    // Second check: Check localStorage using our helper function
    if (completeOnboardingFromLocalStorage()) {
      console.log('[ONBOARDING DEBUG] Successfully applied onboarding status from localStorage');
      return; // Skip showing modal
    }
    
    // If we reach here, we need to show the modal
    // Add a small delay to ensure all processes are complete
    const timer = setTimeout(() => {
      console.log('[OnboardingModal] Setting modal state', { 
        userId: user.id,
        onboardingCompleted: user.onboarding_user_completed,
        showModal: true
      });
      
      setShowModal(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [user, completeOnboardingFromLocalStorage]);

  // Find onboarding task (if any)
  const { data: onboardingTask } = useQuery<{id: number}>({
    queryKey: ["/api/tasks", { type: "user_onboarding", email: user?.email }],
    enabled: !!user?.email,
  });

  // Mutation to update company information
  const updateCompanyMutation = useMutation({
    mutationFn: async () => {
      if (!currentCompany?.id) {
        throw new Error("Company ID not found");
      }
      
      // Map size values to num_employees field (middle value of range)
      const employeeCountMap = {
        'small': 25, // middle of 1-49
        'medium': 150, // middle of 50-249
        'large': 625, // middle of 250-999
        'xlarge': 1500 // representative value for 1000+
      };

      // Both revenue and revenue_tier needs to be set
      const revenueValue = companyInfo.revenue; // This will be "small", "medium", etc.
      
      console.log('[ONBOARDING DEBUG] Updating company information', {
        companyId: currentCompany.id,
        size: companyInfo.size,
        numEmployees: employeeCountMap[companyInfo.size as keyof typeof employeeCountMap],
        revenueTier: companyInfo.revenue,
        revenue: companyInfo.revenue
      });
      
      const response = await fetch(`/api/companies/${currentCompany.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Set both the revenue and revenue_tier fields based on selection
          revenue: companyInfo.revenue, // Will be "small", "medium", etc.
          revenue_tier: companyInfo.revenue, // Same value for revenue_tier
          num_employees: employeeCountMap[companyInfo.size as keyof typeof employeeCountMap]
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to update company information");
      }

      return await response.json();
    }
  });
  
  // Mutation to invite team members
  const inviteTeamMembersMutation = useMutation({
    mutationFn: async (member: TeamMember) => {
      if (!currentCompany?.id || !user) {
        throw new Error("Missing company or user information");
      }

      console.log('[ONBOARDING DEBUG] Inviting team member', {
        companyId: currentCompany.id,
        role: member.role,
        email: member.email,
        fullName: member.fullName
      });
      
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: member.email,
          full_name: member.fullName,
          company_id: currentCompany.id,
          company_name: currentCompany.name,
          sender_name: user.full_name || user.email,
          sender_company: currentCompany.name
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to invite team member");
      }

      return await response.json();
    }
  });
  
  // Mutation to complete user onboarding
  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) {
        throw new Error("User email not found");
      }

      console.log('[ONBOARDING DEBUG] Sending onboarding completion request', {
        userId: user.id,
        email: user.email
      });
      
      // Using the correct endpoint path with plural 'users'
      const response = await fetch('/api/users/complete-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to complete onboarding");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/current"] });

      // If connected to WebSocket and we have an onboarding task, update it
      if (connected && websocket && onboardingTask?.id) {
        try {
          import('@/lib/logger').then(({ logger }) => {
            logger.info('[OnboardingModal] Sending task completion via WebSocket', {
              taskId: onboardingTask.id,
              status: 'completed'
            });
            
            // Use WebSocket to notify about task completion
            if (websocket && connected && typeof websocket.sendMessage === 'function') {
              const message = {
                type: 'task_update',
                payload: {
                  taskId: onboardingTask.id,
                  status: 'completed',
                  metadata: {
                    onboardingCompleted: true,
                    completionTime: new Date().toISOString()
                  }
                }
              };
              
              websocket.sendMessage(message);
            }
          });
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
    },
    onError: (error: Error) => {
      console.error('[OnboardingModal] Error completing onboarding:', error);
      
      // Show error message instead of success
      toastFn({
        title: "Onboarding Error",
        description: "There was a problem completing your onboarding. Please try again.",
        variant: "destructive"
      });
      
      // Don't close the modal - let the user try again
      // Try to refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  // Handle moving to next step
  const handleNext = async () => {
    // Validate current step before proceeding
    if (currentStep === 1) { // Company Information step
      if (!companyInfo.size || !companyInfo.revenue) {
        toastFn({
          title: "Missing Information",
          description: "Please fill in all required company information.",
          variant: "destructive"
        });
        return;
      }
    } else if (currentStep === 4) { // Team Invitation step
      // Don't require team members, but validate any that were added
      const validEmails = teamMembers.filter(m => m.email).every(m => {
        const emailSchema = z.string().email();
        try {
          emailSchema.parse(m.email);
          return true;
        } catch (e) {
          return false;
        }
      });
      
      if (!validEmails) {
        toastFn({
          title: "Invalid Email",
          description: "Please enter valid email addresses for team members.",
          variant: "destructive"
        });
        return;
      }
    }

    if (currentStep < 6) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Final step - complete onboarding
      console.log('[ONBOARDING DEBUG] Final step reached, completing onboarding');
      
      try {
        // 1. Update company information
        if (companyInfo.size && companyInfo.revenue) {
          await updateCompanyMutation.mutateAsync();
        }
        
        // 2. Invite team members (if provided)
        const validTeamMembers = teamMembers.filter(m => m.fullName && m.email);
        for (const member of validTeamMembers) {
          await inviteTeamMembersMutation.mutateAsync(member);
        }
        
        // 3. Complete user onboarding
        if (user) {
          user.onboarding_user_completed = true;
        }
        
        // Store in localStorage as backup
        try {
          localStorage.setItem('onboarding_completed', 'true');
          localStorage.setItem('onboarding_user_id', user?.id?.toString() || '');
        } catch (err) {
          console.error('[ONBOARDING DEBUG] Failed to store in localStorage:', err);
        }
        
        // Call API to mark onboarding as complete
        await completeOnboardingMutation.mutateAsync();
      } catch (error) {
        console.error('[ONBOARDING DEBUG] Error in completion process:', error);
        
        // Even if there's an error, we'll mark onboarding complete to prevent blocking user
        if (user) {
          user.onboarding_user_completed = true;
        }
        
        toastFn({
          title: "Welcome aboard!",
          description: "Your onboarding has been completed successfully.",
          variant: "default"
        });
        
        setShowModal(false);
      }
    }
  };

  // Handle going back to previous step
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Handle closing the modal (user must complete onboarding)
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Only allow closing if onboarding is complete
      if (user && user.onboarding_user_completed) {
        setShowModal(false);
      } else {
        // If trying to close before completion, still keep open
        // but provide way for developers to force close in dev env
        if (process.env.NODE_ENV === 'development') {
          console.log('[ONBOARDING DEBUG] To force close in dev, use localStorage.setItem("onboarding_completed", "true")');
        }
      }
    } else {
      setShowModal(open);
    }
  };

  // If user has completed onboarding or modal isn't supposed to show, don't render
  if (!user || user.onboarding_user_completed === true || !showModal) {
    return null;
  }

  // Progress indicator dots component - styled like tutorial modal
  const ProgressDots = () => (
    <div className="flex justify-center items-center gap-3 py-2 mx-2">
      {Array.from({ length: 7 }, (_, i) => (
        <div
          key={i}
          className={cn(
            "transition-all duration-200",
            i < currentStep 
              ? "h-3 w-3 rounded-full bg-green-200" // Completed - soft gray-green 
              : currentStep === i 
                ? "h-3 w-8 rounded-lg bg-blue-600 ring-1 ring-blue-200 ring-offset-1" // Current - wider shape 
                : "h-3 w-3 rounded-full bg-gray-200" // Future - gray
          )}
        />
      ))}
    </div>
  );

  // Render the appropriate step content
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
    <div className="flex flex-col md:flex-row flex-1 h-[400px] overflow-visible">
      {/* Left side: Text content with fixed height and consistent padding */}
      <div className="md:w-[60%] px-8 py-6 flex flex-col">
        <div className="flex flex-col h-full">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
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
  
  // Render step content based on current step
  const renderStepContent = () => {
    
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
                      <SelectItem value="small" className="text-base py-2">Small (10-100 employees)</SelectItem>
                      <SelectItem value="medium" className="text-base py-2">Medium (100-1,000 employees)</SelectItem>
                      <SelectItem value="large" className="text-base py-2">Large (1,000-10,000 employees)</SelectItem>
                      <SelectItem value="xlarge" className="text-base py-2">X Large (10,000-50,000 employees)</SelectItem>
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
                      <SelectItem value="small" className="text-base py-2">$1M-$10M</SelectItem>
                      <SelectItem value="medium" className="text-base py-2">$10M-$100M</SelectItem>
                      <SelectItem value="large" className="text-base py-2">$100M-$500M</SelectItem>
                      <SelectItem value="xlarge" className="text-base py-2">$500M-$2B</SelectItem>
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
                    "Business Continuity Plan",
                    "Data Protection Policies"
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
                Streamline your accreditation process by inviting key team members to contribute 
                directly to relevant sections.
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
                              member.email && member.email.includes('@') ? "border-green-500" : ""
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
                    <span className="font-medium text-gray-700 w-28 text-base">Company:</span>
                    <span className="text-gray-900 text-base">{currentCompany?.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Check className="text-green-500 h-6 w-6 flex-shrink-0" />
                    <span className="font-medium text-gray-700 w-28 text-base">Category:</span>
                    <span className="text-gray-900 text-base">{currentCompany?.category}</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Check className="text-green-500 h-6 w-6 flex-shrink-0" />
                    <span className="font-medium text-gray-700 w-28 text-base">Size:</span>
                    <span className="text-gray-900 text-base">{companyInfo.size || "Not specified"}</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Check className="text-green-500 h-6 w-6 flex-shrink-0" />
                    <span className="font-medium text-gray-700 w-28 text-base">Revenue:</span>
                    <span className="text-gray-900 text-base">{companyInfo.revenue || "Not specified"}</span>
                  </div>
                  
                  {teamMembers[0].fullName && (
                    <div className="flex items-center gap-4">
                      <Check className="text-green-500 h-6 w-6 flex-shrink-0" />
                      <span className="font-medium text-gray-700 w-28 text-base">CFO:</span>
                      <span className="text-gray-900 text-base">
                        {teamMembers[0].fullName} ({teamMembers[0].email})
                      </span>
                    </div>
                  )}
                  
                  {teamMembers[1].fullName && (
                    <div className="flex items-center gap-4">
                      <Check className="text-green-500 h-6 w-6 flex-shrink-0" />
                      <span className="font-medium text-gray-700 w-28 text-base">CISO:</span>
                      <span className="text-gray-900 text-base">
                        {teamMembers[1].fullName} ({teamMembers[1].email})
                      </span>
                    </div>
                  )}
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
                  <div className="mx-auto mb-8">
                    <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <Check className="h-12 w-12 text-green-600" />
                    </div>
                  </div>
                  
                  <h2 className="text-3xl font-bold text-gray-900 mb-5">Ready to Begin</h2>
                  <p className="text-lg text-gray-700">
                    Your company profile is now set up! To complete your
                    accreditation process, you'll need to finish your assigned
                    tasks, starting with the KYB Form.
                  </p>
                </div>
                
                <div className="space-y-6 text-base mt-10 max-w-md mx-auto">
                  <div className="flex items-start gap-4 bg-gray-50 p-5 rounded-lg shadow-sm">
                    <ArrowRight className="text-primary h-6 w-6 flex-shrink-0 mt-0.5" />
                    <span className="text-base">Complete the KYB form to verify your business identity</span>
                  </div>
                  
                  <div className="flex items-start gap-4 bg-gray-50 p-5 rounded-lg shadow-sm">
                    <ArrowRight className="text-primary h-6 w-6 flex-shrink-0 mt-0.5" />
                    <span className="text-base">Upload compliance documents to fast-track your accreditation</span>
                  </div>
                  
                  <div className="flex items-start gap-4 bg-gray-50 p-5 rounded-lg shadow-sm">
                    <ArrowRight className="text-primary h-6 w-6 flex-shrink-0 mt-0.5" />
                    <span className="text-base">Answer security and compliance questions accurately</span>
                  </div>
                </div>
              </div>
            </div>
          </StepLayout>
        );
      
      default:
        return null;
    }
  };

  return (
    <Dialog open={showModal} onOpenChange={handleOpenChange}>
      <CustomDialogContent className="overflow-hidden flex flex-col h-[550px] w-[860px]">
        <div className="p-5 pb-3">
          <div className="text-base font-medium bg-primary/10 text-primary py-2 px-6 rounded-full inline-block">
            Onboarding Modal
          </div>
        </div>
        
        <div className="flex-grow px-8 pb-0 overflow-visible">
          {renderStepContent()}
        </div>
        
        <div className="py-3 px-8 border-t border-gray-100 bg-white/80 flex justify-between items-center">
          <div className="w-40">
            {currentStep > 0 ? (
              <Button
                variant="outline"
                size="lg"
                onClick={handlePrevious}
                className="flex items-center gap-3 h-12 px-6 text-base text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                <ArrowLeft className="h-5 w-5" />
                Back
              </Button>
            ) : (
              <div></div> // Empty div to maintain flex spacing
            )}
          </div>
          
          <ProgressDots />
          
          <div className="w-40 flex justify-end">
            <Button
              size="lg"
              onClick={handleNext}
              disabled={
                // Disable button if required fields aren't filled in Step 2 (Company Info)
                (currentStep === 1 && (!companyInfo.size || !companyInfo.revenue)) ||
                // Disable during API operations
                updateCompanyMutation.isPending || 
                inviteTeamMembersMutation.isPending || 
                completeOnboardingMutation.isPending
              }
              className="flex items-center gap-2 h-10 px-6 min-w-[100px] shadow-sm text-base font-medium"
            >
              {currentStep === 6 ? "Start" : "Next"}
              {currentStep !== 6 && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CustomDialogContent>
    </Dialog>
  );
}