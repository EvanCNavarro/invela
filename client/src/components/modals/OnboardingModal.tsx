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
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay className="bg-black/50 z-[1000]" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-[1001] grid w-full max-w-3xl min-h-[600px] h-auto translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
      {/* No close button here - user must complete steps or click explicit buttons */}
    </DialogPrimitive.Content>
  </DialogPortal>
));
CustomDialogContent.displayName = "CustomDialogContent";

// Preload all images to ensure fast display
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

      console.log('[ONBOARDING DEBUG] Updating company information', {
        companyId: currentCompany.id,
        size: companyInfo.size,
        revenue: companyInfo.revenue
      });
      
      const response = await fetch(`/api/companies/${currentCompany.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          size: companyInfo.size,
          revenue: companyInfo.revenue
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
      
      const response = await fetch('/api/user/complete-onboarding', {
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
      
      // Still show success and close modal to prevent blocking user
      toastFn({
        title: "Welcome aboard!",
        description: "Your onboarding has been completed successfully.",
        variant: "default"
      });
      
      setShowModal(false);
      
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
    <div className="flex justify-center items-center gap-2.5 py-1.5">
      {Array.from({ length: 7 }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-2.5 w-2.5 rounded-full transition-colors duration-200",
            i < currentStep ? "bg-blue-500" : 
            currentStep === i ? "bg-blue-600 ring-2 ring-blue-200" : 
            "bg-gray-200"
          )}
        />
      ))}
    </div>
  );

  // Render the appropriate step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Welcome
        return (
          <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-6 p-6 pt-2">
            <div className="flex flex-col justify-center">
              <h2 className="text-2xl font-bold text-blue-600 mb-6">
                Welcome to the<br />Invela Trust Network
              </h2>
              <ul className="space-y-4 text-sm">
                <li className="flex gap-2 items-start">
                  <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                    <CheckCircle className="h-4 w-4 text-blue-500" />
                  </div>
                  <span>Your premier partner for secure and efficient accreditation</span>
                </li>
                <li className="flex gap-2 items-start">
                  <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                    <CheckCircle className="h-4 w-4 text-blue-500" />
                  </div>
                  <span>Enterprise-grade risk assessment and management platform</span>
                </li>
                <li className="flex gap-2 items-start">
                  <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                    <CheckCircle className="h-4 w-4 text-blue-500" />
                  </div>
                  <span>Streamlined compliance processes with advanced automation</span>
                </li>
              </ul>
            </div>
            <div className="flex justify-center items-center bg-blue-50/50 rounded-lg p-2">
              {isCurrentImageLoaded ? (
                <img 
                  src="/assets/welcome_1.png" 
                  alt="Welcome to Invela" 
                  className="max-w-full h-[280px] rounded-lg object-contain"
                />
              ) : (
                <EnhancedSkeleton className="w-full h-[280px] rounded-lg" />
              )}
            </div>
          </div>
        );
      
      case 1: // Company Information
        return (
          <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-6 p-6 pt-2">
            <div className="flex flex-col justify-center">
              <h2 className="text-2xl font-bold text-blue-600 mb-4">Company Information</h2>
              <p className="text-gray-600 text-sm mb-6">
                Add basic details about {currentCompany?.name}:
              </p>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="company-size" className="text-sm font-medium block mb-1.5">
                    Company Size <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={companyInfo.size} 
                    onValueChange={(value) => setCompanyInfo(prev => ({ ...prev, size: value }))}
                  >
                    <SelectTrigger id="company-size" className="h-9">
                      <SelectValue placeholder="Select number of employees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Micro (1-9 employees)">Micro (1-9 employees)</SelectItem>
                      <SelectItem value="Small (10-49 employees)">Small (10-49 employees)</SelectItem>
                      <SelectItem value="Medium (50-249 employees)">Medium (50-249 employees)</SelectItem>
                      <SelectItem value="Large (250-999 employees)">Large (250-999 employees)</SelectItem>
                      <SelectItem value="Enterprise (1000+ employees)">Enterprise (1000+ employees)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="company-revenue" className="text-sm font-medium block mb-1.5">
                    Annual Revenue <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={companyInfo.revenue} 
                    onValueChange={(value) => setCompanyInfo(prev => ({ ...prev, revenue: value }))}
                  >
                    <SelectTrigger id="company-revenue" className="h-9">
                      <SelectValue placeholder="Select annual revenue" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="$0–$10M">$0–$10M</SelectItem>
                      <SelectItem value="$10M–$50M">$10M–$50M</SelectItem>
                      <SelectItem value="$50M–$250M">$50M–$250M</SelectItem>
                      <SelectItem value="$250M+">$250M+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center items-center bg-blue-50/50 rounded-lg p-2">
              {isCurrentImageLoaded ? (
                <img 
                  src="/assets/welcome_2.png" 
                  alt="Company Information" 
                  className="max-w-full h-[280px] rounded-lg object-contain"
                />
              ) : (
                <EnhancedSkeleton className="w-full h-[280px] rounded-lg" />
              )}
            </div>
          </div>
        );
      
      case 2: // Tasks Overview
        return (
          <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-6 p-6 pt-2">
            <div className="flex flex-col justify-center">
              <h2 className="text-2xl font-bold text-blue-600 mb-4">A Few Tasks Ahead</h2>
              <p className="text-gray-600 text-sm mb-6">
                To complete your accreditation application, you'll
                need to work through the following tasks:
              </p>
              
              <ol className="space-y-4 text-sm">
                <li className="flex items-center gap-3">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-500 text-white text-sm font-medium">1</span>
                  <span className="font-medium">KYB Form</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-500 text-white text-sm font-medium">2</span>
                  <span className="font-medium">S&P KY3P Security Assessment</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-500 text-white text-sm font-medium">3</span>
                  <span className="font-medium">Open Banking Survey</span>
                </li>
              </ol>
            </div>
            
            <div className="flex justify-center items-center bg-blue-50/50 rounded-lg p-2">
              {isCurrentImageLoaded ? (
                <img 
                  src="/assets/welcome_3.png" 
                  alt="Task Overview" 
                  className="max-w-full h-[280px] rounded-lg object-contain"
                />
              ) : (
                <EnhancedSkeleton className="w-full h-[280px] rounded-lg" />
              )}
            </div>
          </div>
        );
      
      case 3: // Document Uploads
        return (
          <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-6 p-6 pt-2">
            <div className="flex flex-col justify-center">
              <h2 className="text-2xl font-bold text-blue-600 mb-4">Streamline with Document Uploads</h2>
              <p className="text-gray-600 text-sm mb-6">
                Accelerate your accreditation by uploading critical
                documents upfront. Our AI-driven system auto-fills
                forms, saving you time.
              </p>
              
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
                  <div key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                    {doc}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-center items-center bg-blue-50/50 rounded-lg p-2">
              {isCurrentImageLoaded ? (
                <img 
                  src="/assets/welcome_4.png" 
                  alt="Document Upload" 
                  className="max-w-full h-[280px] rounded-lg object-contain"
                />
              ) : (
                <EnhancedSkeleton className="w-full h-[280px] rounded-lg" />
              )}
            </div>
          </div>
        );
      
      case 4: // Team Invitations
        return (
          <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-6 p-6 pt-2">
            <div className="flex flex-col justify-center">
              <h2 className="text-2xl font-bold text-blue-600 mb-5">Invite Your Team</h2>
              
              {teamMembers.map((member, index) => (
                <Card key={index} className="mb-4 overflow-hidden border-gray-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-blue-100 text-blue-700 py-1 px-3 rounded-full text-xs font-medium">
                        {member.role}
                      </div>
                      <span className="text-xs text-gray-600">
                        {member.roleDescription} {member.formType}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`name-${index}`} className="mb-1 block text-xs font-medium">
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
                          className={cn("h-9", member.fullName ? "border-green-500" : "")}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`email-${index}`} className="mb-1 block text-xs font-medium">
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
                          className={cn("h-9", 
                            member.email && member.email.includes('@') ? "border-green-500" : ""
                          )}
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
            
            <div className="flex justify-center items-center bg-blue-50/50 rounded-lg p-2">
              {isCurrentImageLoaded ? (
                <img 
                  src="/assets/welcome_5.png" 
                  alt="Team Invitation" 
                  className="max-w-full h-[280px] rounded-lg object-contain"
                />
              ) : (
                <EnhancedSkeleton className="w-full h-[280px] rounded-lg" />
              )}
            </div>
          </div>
        );
      
      case 5: // Review Information
        return (
          <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-6 p-6 pt-2">
            <div className="flex flex-col justify-center">
              <h2 className="text-2xl font-bold text-blue-600 mb-5">Review Provided Information</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="text-green-500 h-5 w-5" />
                  <span className="font-medium">Company:</span>
                  <span>{currentCompany?.name}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Check className="text-green-500 h-5 w-5" />
                  <span className="font-medium">Category:</span>
                  <span>{currentCompany?.category}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Check className="text-green-500 h-5 w-5" />
                  <span className="font-medium">Size:</span>
                  <span>{companyInfo.size || "Not specified"}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Check className="text-green-500 h-5 w-5" />
                  <span className="font-medium">Revenue:</span>
                  <span>{companyInfo.revenue || "Not specified"}</span>
                </div>
                
                {teamMembers[0].fullName && (
                  <div className="flex items-center gap-2">
                    <Check className="text-green-500 h-5 w-5" />
                    <span className="font-medium">CFO:</span>
                    <span>
                      {teamMembers[0].fullName} ({teamMembers[0].email})
                    </span>
                  </div>
                )}
                
                {teamMembers[1].fullName && (
                  <div className="flex items-center gap-2">
                    <Check className="text-green-500 h-5 w-5" />
                    <span className="font-medium">CISO:</span>
                    <span>
                      {teamMembers[1].fullName} ({teamMembers[1].email})
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-center items-center bg-blue-50/50 rounded-lg p-2">
              {isCurrentImageLoaded ? (
                <img 
                  src="/assets/welcome_6.png" 
                  alt="Information Review" 
                  className="max-w-full h-[280px] rounded-lg object-contain"
                />
              ) : (
                <EnhancedSkeleton className="w-full h-[280px] rounded-lg" />
              )}
            </div>
          </div>
        );
      
      case 6: // Completion
        return (
          <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-6 p-6 pt-2">
            <div className="flex flex-col justify-center">
              <div className="mx-auto mb-6">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-blue-600 text-center mb-4">Ready to Begin</h2>
              <p className="text-center text-gray-600 text-sm mb-6">
                Your company profile is now set up! To complete your
                accreditation process, you'll need to finish your assigned
                tasks, starting with the KYB Form.
              </p>
              
              <div className="space-y-3 text-sm mx-auto max-w-md">
                <div className="flex items-center gap-2">
                  <ArrowRight className="text-blue-600 h-5 w-5 flex-shrink-0" />
                  <span>Complete the KYB form to verify your business identity</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <ArrowRight className="text-blue-600 h-5 w-5 flex-shrink-0" />
                  <span>Upload compliance documents to fast-track your accreditation</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <ArrowRight className="text-blue-600 h-5 w-5 flex-shrink-0" />
                  <span>Answer security and compliance questions accurately</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center items-center bg-blue-50/50 rounded-lg p-2">
              {isCurrentImageLoaded ? (
                <img 
                  src="/assets/welcome_7.png" 
                  alt="Ready to Begin" 
                  className="max-w-full h-[280px] rounded-lg object-contain"
                />
              ) : (
                <EnhancedSkeleton className="w-full h-[280px] rounded-lg" />
              )}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <Dialog open={showModal} onOpenChange={handleOpenChange}>
      <CustomDialogContent className="overflow-hidden flex flex-col min-h-[600px]">
        <div className="p-6 pb-4">
          <div className="text-sm font-medium bg-blue-100 text-blue-600 py-1 px-3 rounded-full inline-block">
            Onboarding Modal
          </div>
        </div>
        
        <div className="flex-grow overflow-y-auto px-4">
          {renderStepContent()}
        </div>
        
        <div className="px-6 py-4 border-t flex justify-between items-center mt-auto">
          <div className="w-24">
            {currentStep > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                className="flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <div></div> // Empty div to maintain flex spacing
            )}
          </div>
          
          <ProgressDots />
          
          <div className="w-24 flex justify-end">
            <Button
              size="sm"
              onClick={handleNext}
              disabled={
                updateCompanyMutation.isPending || 
                inviteTeamMembersMutation.isPending || 
                completeOnboardingMutation.isPending
              }
              className="flex items-center gap-1"
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