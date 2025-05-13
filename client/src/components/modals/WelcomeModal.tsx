import React, { useState, useEffect, forwardRef, useCallback, useRef, useMemo, Fragment } from "react";
import { Dialog, DialogTitle, DialogDescription, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useWebSocketContext } from "@/providers/websocket-provider";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { Info, AlertTriangle, DollarSign, Shield, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

// Constants for form selections with specific value mappings to appropriate database values
// Database has 'num_employees' as INTEGER and 'revenue_tier' as ENUM('small','medium','large','xlarge')
// So for employee count, we use numerical values, and for revenue tiers we use the enum values
const EMPLOYEE_COUNTS = [
  { value: 25, label: "Small (1-49 employees)" },       // Approx. midpoint of 1-49
  { value: 150, label: "Medium (50–249 employees)" },   // Approx. midpoint of 50-249
  { value: 625, label: "Large (250–999 employees)" },   // Approx. midpoint of 250-999
  { value: 5000, label: "X Large (1K+ employees)" },    // Representative value for 1000+
];

// For revenue tiers, we use the enum values from the database
const REVENUE_TIERS = [
  { value: "small", label: "$0–$10M" },
  { value: "medium", label: "$10M–$50M" },
  { value: "large", label: "$50M–$250M" },
  { value: "xlarge", label: "$250M+" },
];

// Create a custom dialog content without close button
const CustomDialogContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay className="backdrop-blur-[2px] bg-black/20" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      {/* No close button here */}
    </DialogPrimitive.Content>
  </DialogPortal>
));
CustomDialogContent.displayName = "CustomDialogContent";

// Define the type for carousel content items
interface CarouselItem {
  src: string;
  alt: string;
  title: string;
  subtitle: string;
  bulletPoints?: string[];
}

interface TeamMemberInvite {
  role: string;
  fullName: string;
  email: string;
  taskType: string;
  // API fields
  full_name?: string;
  company_id?: number;
  company_name?: string;
  sender_name?: string;
}

// New carousel content with the expanded 7 steps
const carouselContent: CarouselItem[] = [
  {
    src: "/attached_assets/welcome_1.png",
    alt: "Welcome to Invela Trust Network",
    title: "Welcome to the\nInvela Trust Network",
    subtitle: "", // Removing subtitle as requested, using bullet points instead
    bulletPoints: [
      "Your premier partner for secure and efficient accreditation",
      "Enterprise-grade risk assessment and management platform",
      "Streamlined compliance processes with advanced automation"
    ]
  },
  {
    src: "/attached_assets/welcome_2.png",
    alt: "Company Information",
    title: "Company Information",
    subtitle: "Let's start with some basic details about <b>DevTest30</b>:",
    bulletPoints: [
      "Company Name",
      "Organization Size",
      "Annual Revenue"
    ]
  },
  {
    src: "/attached_assets/welcome_3.png",
    alt: "A Few Tasks Ahead",
    title: "A Few Tasks Ahead",
    subtitle: "To complete your accreditation application, you'll need to work through the following tasks:",
    bulletPoints: [
      "KYB Form",
      "S&P KY3P Security Assessment",
      "Open Banking Survey"
    ]
  },
  {
    src: "/attached_assets/welcome_4.png",
    alt: "Streamline with Document Uploads", 
    title: "Streamline with Document Uploads",
    subtitle: "Accelerate your accreditation by uploading critical documents upfront. Our AI-driven system auto-fills forms, saving you time.",
    bulletPoints: [
      "SOC 2",
      "ISO 27001",
      "Penetration Test Reports",
      "API Security",
      "OAuth Certification",
      "GDPR/CCPA Compliance",
      "FDX Certification",
      "Business Continuity Plan",
      "Data Protection Policies"
    ]
  },
  {
    src: "/attached_assets/welcome_5.png",
    alt: "Invite Your Team",
    title: "Invite Your Team",
    subtitle: "",
    bulletPoints: [
      "CFO for KYB Financials",
      "CISO for Security Assessments",
      "CTO or Legal for Open Banking Requirements"
    ]
  },
  {
    src: "/attached_assets/welcome_6.png",
    alt: "Review Provided Information",
    title: "Review Provided Information",
    subtitle: "", // Removed subtitle as requested
    bulletPoints: [] // Removed bullet points as requested
  },
  {
    src: "/attached_assets/welcome_7.png",
    alt: "Ready to Begin",
    title: "Ready to Begin",
    subtitle: "Your company profile is now set up! To complete your accreditation process, you'll need to finish your assigned tasks, starting with the KYB Form."
  }
];

// Preload all images to ensure fast display
/**
 * Preload images for carousel to ensure smooth transitions
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
  
  // Track which images we're preloading for debugging
  const preloadingImages = carouselContent.map(item => item.src);
  
  // Log once at the start of preloading instead of per image
  import('@/lib/logger').then(({ logger }) => {
    logger.debug('[WelcomeModal] Preloading onboarding carousel images', {
      imageCount: preloadingImages.length,
      images: preloadingImages
    });
  });
  
  // Preload all images in parallel
  carouselContent.forEach(item => {
    const img = new Image();
    img.src = item.src;
    img.onload = () => {
      if (callback) callback(item.src, true);
    };
    img.onerror = (e) => {
      // Only log errors
      import('@/lib/logger').then(({ logger }) => {
        logger.error('[WelcomeModal] Failed to preload image', {
          src: item.src,
          error: e
        });
      });
      if (callback) callback(item.src, false);
    };
  });
};

// Define type for team member invites
interface TeamMemberInvite {
  role: string;
  fullName: string;
  email: string;
  taskType: string;
}

export function WelcomeModal() {
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [showModal, setShowModal] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState<Record<string, boolean>>({});
  const [imageOpacity, setImageOpacity] = useState(0);
  const [employeeCount, setEmployeeCount] = useState<number | null>(null);
  const [revenueTier, setRevenueTier] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Team member invitation states
  const [cfoName, setCfoName] = useState<string>("");
  const [cfoEmail, setCfoEmail] = useState<string>("");
  const [cisoName, setCisoName] = useState<string>("");
  const [cisoEmail, setCisoEmail] = useState<string>("");
  const [teamInvites, setTeamInvites] = useState<TeamMemberInvite[]>([]);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const websocket = useWebSocketContext();
  const connected = websocket.isConnected;
  
  // Fetch current company data to ensure we have it for team invites
  const { data: companyData, isLoading: isLoadingCompany } = useQuery({
    queryKey: ['/api/companies/current'],
    enabled: !!user?.id,
  });
  
  // Use a ref to track previous slide for determining animation direction
  const prevSlideRef = useRef(currentSlide);
  
  // Calculate animation direction (1 for forward, -1 for backward)
  const animationDirection = useMemo(() => {
    const direction = currentSlide >= prevSlideRef.current ? 1 : -1;
    prevSlideRef.current = currentSlide;
    return direction;
  }, [currentSlide]);
  
  // Mutation for updating company data
  const updateCompanyMutation = useMutation({
    mutationFn: async (data: { numEmployees?: string; revenueTier?: string }) => {
      console.log('[ONBOARDING DEBUG] Sending update with data:', data);
      
      // Use a direct fetch call with specific headers to ensure proper handling
      const response = await fetch('/api/companies/current', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-HTTP-Method-Override': 'PATCH'
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ONBOARDING DEBUG] Error response:', response.status, errorText);
        throw new Error(errorText || 'Failed to update company information');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
      console.log('[ONBOARDING DEBUG] Successfully updated company information');
    }
  });
  
  // Mutation for inviting team members
  const inviteTeamMemberMutation = useMutation({
    mutationFn: async (data: {
      email: string;
      full_name: string;
      company_id: number;
      company_name: string;
      sender_name: string;
    }) => {
      console.log('[ONBOARDING DEBUG] Inviting team member:', data);
      
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ONBOARDING DEBUG] Error inviting user:', response.status, errorText);
        throw new Error(errorText || 'Failed to invite team member');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log('[ONBOARDING DEBUG] Successfully invited team member:', data);
      toast({
        title: "Invitation sent",
        description: "Team member invitation has been sent successfully",
        duration: 2500
      });
    },
    onError: (error) => {
      console.error('[ONBOARDING DEBUG] Failed to invite team member:', error);
      toast({
        title: "Invitation failed",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
        duration: 2500
      });
    }
  });

  /**
   * Process team member invitations asynchronously
   * Sends invitations for CFO and CISO if both name and email are provided
   * Updates UI state to reflect sent invitations
   * Logs detailed information for debugging and auditing
   * 
   * @returns {Promise<boolean>} Promise that resolves to true if invitations were sent, false otherwise
   * @throws {Error} If there's an issue with sending the invitations that shouldn't be ignored
   */
  const processTeamInvites = async () => {
    // Dynamically import logger to use in this function
    const { logger } = await import('@/lib/logger');
    
    // Enhanced validation with detailed logging to diagnose issues
    const validationResults = {
      hasUser: !!user,
      userHasId: user?.id !== undefined,
      userHasEmail: !!user?.email,
      userHasFullName: !!user?.full_name,
      userHasCompany: !!user?.company,
      companyHasId: user?.company?.id !== undefined,
      companyHasName: !!user?.company?.name
    };
    
    logger.info('[WelcomeModal] Team invitation validation check', validationResults);
    
    // Validate required data is available with more detailed error
    if (!user || !user.company || !user.company.id) {
      const errorMessage = 'Cannot invite team members without user or company data';
      const detailedError = `${errorMessage}. Missing: ${!user ? 'user' : !user.company ? 'company' : 'company.id'}`;
      
      logger.error('[WelcomeModal] ' + detailedError, validationResults);
      console.error('[ONBOARDING DEBUG] ' + detailedError, validationResults);
      
      // Attempt to use data from our own component state
      try {
        const companyId = companyData?.id || user?.company?.id;
        const companyName = companyData?.name || user?.company?.name;
        const senderName = user?.full_name || user?.email || 'Invela User';
        
        logger.debug('[WelcomeModal] Attempted recovery with component state data', {
          hasCompanyId: !!companyId,
          hasCompanyName: !!companyName,
          hasSenderName: !!senderName
        });
        
        // If we can't recover minimum data needed, throw error
        if (!companyId || !companyName) {
          throw new Error(detailedError);
        }
        
        // Use the recovered data for invitations
        logger.info('[WelcomeModal] Recovered with component state data', {
          companyId,
          companyName,
          senderName
        });
        
        // Create minimal recovery objects with the essential fields
        const recoveredUser = {
          id: user?.id,
          full_name: senderName,
          email: user?.email || 'user@invela.com'
        };
        
        const recoveredCompany = {
          id: companyId,
          name: companyName
        };
        
        // Create invitations with recovered data
        const invitations = [];
        
        // Process CFO invitation if both name and email are provided
        if (cfoName && cfoEmail) {
          invitations.push({
            email: cfoEmail,
            full_name: cfoName,
            company_id: recoveredCompany.id,
            company_name: recoveredCompany.name,
            sender_name: recoveredUser.full_name || recoveredUser.email,
            role: 'CFO'
          });
        }
        
        // Process CISO invitation if both name and email are provided
        if (cisoName && cisoEmail) {
          invitations.push({
            email: cisoEmail,
            full_name: cisoName,
            company_id: recoveredCompany.id,
            company_name: recoveredCompany.name,
            sender_name: recoveredUser.full_name || recoveredUser.email,
            role: 'CISO'
          });
        }
        
        // Return early with the new invitations
        return processInvitationsList(invitations, logger);
      } catch (recoveryError) {
        // If recovery failed, throw the original error
        throw new Error(detailedError);
      }
    }
    
    logger.debug('[WelcomeModal] Starting team invitation process', {
      hasCfo: !!(cfoName && cfoEmail),
      hasCiso: !!(cisoName && cisoEmail),
      companyId: user.company.id,
      companyName: user.company.name
    });
    
    const invitations = [];
    
    // Process CFO invitation if both name and email are provided
    if (cfoName && cfoEmail) {
      invitations.push({
        email: cfoEmail,
        full_name: cfoName,
        company_id: user.company.id,
        company_name: user.company.name,
        sender_name: user.full_name || user.email,
        role: 'CFO'
      });
    }
    
    // Process CISO invitation if both name and email are provided
    if (cisoName && cisoEmail) {
      invitations.push({
        email: cisoEmail,
        full_name: cisoName,
        company_id: user.company.id,
        company_name: user.company.name,
        sender_name: user.full_name || user.email,
        role: 'CISO'
      });
    }
    
    // If no invitations to process, return early
    if (invitations.length === 0) {
      logger.debug('[WelcomeModal] No team invitations to process');
      return false;
    }
    
    logger.info('[WelcomeModal] Processing team invitations', { 
      count: invitations.length,
      emails: invitations.map(inv => inv.email) 
    });
    
    // Process all invitations in parallel
    try {
      // Track any failed invitations to report them
      interface FailedInvitation {
        email: string;
        role: string;
        error: string;
      }
      
      const failedInvitations: FailedInvitation[] = [];
      
      // Process each invitation and collect results
      await Promise.all(
        invitations.map(async invite => {
          try {
            logger.debug('[WelcomeModal] Sending invitation', { 
              email: invite.email, 
              role: invite.role 
            });
            
            // Send the invitation via API
            const result = await inviteTeamMemberMutation.mutateAsync({
              email: invite.email,
              full_name: invite.full_name,
              company_id: invite.company_id,
              company_name: invite.company_name,
              sender_name: invite.sender_name
            });
            
            logger.debug('[WelcomeModal] Invitation sent successfully', { 
              email: invite.email,
              role: invite.role,
              result 
            });
            
            // Track this invitation in UI state for the review screen
            setTeamInvites(prev => [...prev, {
              role: invite.role,
              fullName: invite.full_name,
              email: invite.email,
              taskType: invite.role === "CFO" ? "KYB Form" : "KY3P Security Assessment"
            }]);
            
            return result;
          } catch (error) {
            logger.error('[WelcomeModal] Failed to send invitation', { 
              email: invite.email,
              role: invite.role,
              error 
            });
            console.error('[ONBOARDING DEBUG] Failed to send invitation to', invite.email, error);
            
            // Track the failure but don't block other invitations
            failedInvitations.push({
              email: invite.email,
              role: invite.role,
              error: error instanceof Error ? error.message : String(error)
            });
            
            return null;
          }
        })
      );
      
      // If we had any failures, report them but continue
      if (failedInvitations.length > 0) {
        logger.warn('[WelcomeModal] Some team invitations failed', { 
          failedCount: failedInvitations.length,
          totalCount: invitations.length,
          failures: failedInvitations
        });
        
        // If ALL invitations failed, throw an error to trigger the error handling flow
        if (failedInvitations.length === invitations.length) {
          throw new Error(`All ${invitations.length} team invitations failed to send`);
        }
      }
      
      // Return true to indicate we processed invitations (even if some failed)
      return true;
    } catch (error) {
      logger.error('[WelcomeModal] Critical error in team invitation process', { error });
      console.error('[ONBOARDING DEBUG] Critical team invitation error:', error);
      
      // Propagate the error to be handled by the caller
      throw error;
    }
  };

  const isLastSlide = currentSlide === carouselContent.length - 1;
  const isCurrentImageLoaded = imagesLoaded[carouselContent[currentSlide]?.src] === true;

  // Enhanced localStorage handler - directly completes onboarding if localStorage has a record and syncs with server
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
  
  // Only set modal visibility once when user data is fully available
  useEffect(() => {
    if (!user) return;
    
    // DEBUGGING: Add detailed info about the user object and onboarding status
    console.log('[ONBOARDING DEBUG] WelcomeModal user data received:', { 
      userId: user.id,
      email: user.email,
      onboardingCompleted: user.onboarding_user_completed,
      userObject: JSON.stringify(user, null, 2).substring(0, 500) // Limit string length
    });
    
    // Preload images only if user hasn't completed onboarding
    const shouldPreloadImages = !user.onboarding_user_completed;
    
    // Update with correct typing
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
    
    // First step: Check if user is already marked as onboarded
    if (user.onboarding_user_completed === true) {
      console.log('[ONBOARDING DEBUG] User is already marked as onboarded in user object');
      // Double-verify in localStorage
      try {
        localStorage.setItem('onboarding_completed', 'true');
        localStorage.setItem('onboarding_user_id', user.id.toString());
      } catch (err) {
        console.error('[ONBOARDING DEBUG] Failed to update localStorage:', err);
      }
      return; // Exit early, no need to show modal
    }
    
    // Second step: Check localStorage using our helper function
    if (completeOnboardingFromLocalStorage()) {
      console.log('[ONBOARDING DEBUG] Successfully applied onboarding status from localStorage');
      return; // Skip showing modal
    }
    
    // If we reach here, we need to show the modal
    // Use a small delay to ensure all auth processes are complete
    const timer = setTimeout(() => {
      console.log('[WelcomeModal] Setting modal state:', { 
        userId: user.id,
        onboardingCompleted: user.onboarding_user_completed,
        showModal: true
      });
      
      setShowModal(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [user, completeOnboardingFromLocalStorage]);

  // Get current company data
  // Use the company data we already fetched above via companyData

  const { data: onboardingTask } = useQuery<{id: number}>({
    queryKey: ["/api/tasks", { type: "user_onboarding", email: user?.email }],
    enabled: !!user?.email,
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) {
        throw new Error("User email not found");
      }

      console.log('[ONBOARDING DEBUG] Sending onboarding completion request for user:', {
        userId: user.id,
        email: user.email,
        currentOnboardingStatus: user.onboarding_user_completed,
        endpoint: '/api/user/complete-onboarding', // CORRECTED ENDPOINT
        timestamp: new Date().toISOString()
      });
      
      // Fixing the endpoint to match server definition (singular "user" not plural "users")
      const response = await fetch('/api/user/complete-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('[ONBOARDING DEBUG] Onboarding completion response:', {
        status: response.status,
        ok: response.ok,
        url: response.url,
        timestamp: new Date().toISOString()
      });

      if (!response.ok) {
        // Let's try to get more detailed error information
        try {
          const errorData = await response.json();
          console.error('[ONBOARDING DEBUG] Error response body:', errorData);
          throw new Error(errorData.message || "Failed to complete onboarding");
        } catch (parseError) {
          console.error('[ONBOARDING DEBUG] Could not parse error response:', parseError);
          throw new Error("Failed to complete onboarding: " + response.statusText);
        }
      }

      const responseData = await response.json();
      console.log('[ONBOARDING DEBUG] Completion response data:', responseData);
      return responseData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });

      if (connected && websocket && onboardingTask?.id) {
        try {
          // Use dynamic import for logging without bundling the entire logger
          import('@/lib/logger').then(({ logger }) => {
            logger.info('[WelcomeModal] Sending task completion via WebSocket', {
              taskId: onboardingTask.id,
              status: 'completed'
            });
            
            // Use the WebSocket API based on the useWebSocket hook implementation
            if (websocket && connected && typeof websocket.sendMessage === 'function') {
              try {
                // Create a properly formatted message object
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
                
                // Send the message using the context's sendMessage method
                websocket.sendMessage(message);
                
                logger.info('[WelcomeModal] Successfully sent task completion via WebSocket');
              } catch (innerError) {
                logger.error('[WelcomeModal] Error sending WebSocket message', { error: innerError });
              }
            } else {
              // WebSocket not available or not connected
              logger.warn('[WelcomeModal] WebSocket unavailable, skipping update', {
                connected,
                hasWebsocket: !!websocket,
                hasSendMethod: !!(websocket && typeof websocket.sendMessage === 'function')
              });
            }
          });
        } catch (error) {
          console.error('[WelcomeModal] WebSocket send error:', error);
        }
      }

      // Only show the toast if we're completing from the handleNext function (last step)
      // This ensures the toast only shows when the user finishes the onboarding process
      if (currentSlide === carouselContent.length - 1) {
        toast({
          variant: "success",
          title: "Welcome aboard!",
          description: "Your onboarding has been completed successfully."
        });
      }

      // Close modal after successful completion
      setShowModal(false);
    },
    onError: (error: Error) => {
      console.error('[WelcomeModal] Error completing onboarding:', error);
      
      // Only show the toast if we're completing from the handleNext function (last step)
      // This ensures the toast only shows when the user finishes the onboarding flow
      // NOT when they click outside the modal
      if (currentSlide === carouselContent.length - 1) {
        toast({
          variant: "success",
          title: "Welcome aboard!",
          description: "Your onboarding has been completed successfully."
        });
      }
      
      // Still need to close the modal to prevent a bad UX where the modal gets stuck
      setShowModal(false);
      
      // Invalidate queries to try to refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  /**
   * Validates that team invitation fields are either both filled or both empty
   * Shows validation UI and toast notifications for incomplete invitations
   * 
   * @returns {boolean} True if validation passes, false otherwise
   */
  const validateTeamInvites = (): boolean => {
    // Check if CFO has one field filled but not the other
    const cfoNameFilled = !!cfoName && cfoName.trim().length > 0;
    const cfoEmailFilled = !!cfoEmail && cfoEmail.trim().length > 0;
    
    // Check if CISO has one field filled but not the other
    const cisoNameFilled = !!cisoName && cisoName.trim().length > 0;
    const cisoEmailFilled = !!cisoEmail && cisoEmail.trim().length > 0;
    
    // Track if we have any validation errors
    let hasValidationErrors = false;
    
    // Validate CFO fields
    if ((cfoNameFilled && !cfoEmailFilled) || (!cfoNameFilled && cfoEmailFilled)) {
      hasValidationErrors = true;
      
      // Show toast for CFO validation error
      toast({
        title: "Please complete CFO invitation",
        description: "You must provide both name and email, or leave both fields empty.",
        variant: "destructive",
        duration: 2500
      });
      
      // Log for debugging purposes
      import('@/lib/logger').then(({ logger }) => {
        logger.debug('[WelcomeModal] CFO invitation validation failed', {
          hasName: cfoNameFilled,
          hasEmail: cfoEmailFilled
        });
      });
    }
    
    // Validate CISO fields
    if ((cisoNameFilled && !cisoEmailFilled) || (!cisoNameFilled && cisoEmailFilled)) {
      hasValidationErrors = true;
      
      // Only show CISO toast if we didn't already show CFO toast to avoid multiple toasts
      if (!(cfoNameFilled && !cfoEmailFilled) && !(!cfoNameFilled && cfoEmailFilled)) {
        toast({
          title: "Please complete CISO invitation",
          description: "You must provide both name and email, or leave both fields empty.",
          variant: "destructive",
          duration: 2500
        });
      }
      
      // Log for debugging purposes
      import('@/lib/logger').then(({ logger }) => {
        logger.debug('[WelcomeModal] CISO invitation validation failed', {
          hasName: cisoNameFilled,
          hasEmail: cisoEmailFilled
        });
      });
    }
    
    return !hasValidationErrors;
  };
  
  /**
   * Helper function to process a list of team invitations
   * This extracted function can be used with both normal and recovered user data
   * 
   * @param invitations - List of invitation objects to process
   * @param logger - Logger instance for consistent logging
   * @returns Promise that resolves to true if invitations were processed
   * @throws Error if there's an issue with sending the invitations that shouldn't be ignored
   */
  const processInvitationsList = async (
    invitations: TeamMemberInvite[], 
    logger: { 
      info: (message: string, data?: any) => void;
      debug: (message: string, data?: any) => void;
      error: (message: string, data?: any) => void;
      warn: (message: string, data?: any) => void;
    }
  ): Promise<boolean> => {
    if (!invitations || invitations.length === 0) {
      logger.debug('[WelcomeModal] No team invitations to process in helper');
      return false;
    }
    
    logger.info('[WelcomeModal] Processing team invitations in helper', { 
      count: invitations.length,
      emails: invitations.map(inv => inv.email)
    });
    
    // Process all invitations in parallel
    try {
      // Track any failed invitations to report them
      interface FailedInvitation {
        email: string;
        role: string;
        error: string;
      }
      
      const failedInvitations: FailedInvitation[] = [];
      
      // Process each invitation and collect results
      await Promise.all(
        invitations.map(async invite => {
          try {
            logger.debug('[WelcomeModal] Sending invitation', { 
              email: invite.email, 
              role: invite.role 
            });
            
            // Create API payload from TeamMemberInvite model
            // We need to handle both cases - either the fields are directly on the object
            // or we need to use the UI fields (fullName) and map them to API fields (full_name)
            const apiPayload = {
              email: invite.email,
              full_name: invite.full_name || invite.fullName,
              company_id: invite.company_id || companyData?.id,
              company_name: invite.company_name || companyData?.name,
              sender_name: invite.sender_name || user?.full_name || user?.email,
              role: invite.role
            };
            
            // Make sure we have all required fields before making the API call
            const requiredFields = ['email', 'full_name', 'company_id', 'company_name', 'sender_name'];
            const missingFields = requiredFields.filter(field => !apiPayload[field]);
            
            if (missingFields.length > 0) {
              throw new Error(`Missing required fields for invitation: ${missingFields.join(', ')}`);
            }
            
            // Send the invitation via API
            const result = await inviteTeamMemberMutation.mutateAsync({
              email: invite.email,
              full_name: invite.full_name,
              company_id: invite.company_id,
              company_name: invite.company_name,
              sender_name: invite.sender_name
            });
            
            logger.debug('[WelcomeModal] Invitation sent successfully', { 
              email: invite.email,
              role: invite.role,
              result 
            });
            
            // Track this invitation in UI state for the review screen
            setTeamInvites(prev => [...prev, {
              role: invite.role,
              fullName: invite.full_name,
              email: invite.email,
              taskType: invite.role === "CFO" ? "KYB Form" : "KY3P Security Assessment"
            }]);
            
            return result;
          } catch (error) {
            logger.error('[WelcomeModal] Failed to send invitation', { 
              email: invite.email,
              role: invite.role,
              error 
            });
            console.error('[ONBOARDING DEBUG] Failed to send invitation to', invite.email, error);
            
            // Track the failure but don't block other invitations
            failedInvitations.push({
              email: invite.email,
              role: invite.role,
              error: error instanceof Error ? error.message : String(error)
            });
            
            return null;
          }
        })
      );
      
      // If we had any failures, report them but continue
      if (failedInvitations.length > 0) {
        logger.warn('[WelcomeModal] Some team invitations failed', { 
          failedCount: failedInvitations.length,
          totalCount: invitations.length,
          failures: failedInvitations
        });
        
        // If ALL invitations failed, throw an error to trigger the error handling flow
        if (failedInvitations.length === invitations.length) {
          throw new Error(`All ${invitations.length} team invitations failed to send`);
        }
      }
      
      // Return true to indicate that invitations were processed
      return true;
    } catch (error) {
      logger.error('[WelcomeModal] Error processing team invitations in helper', { error });
      console.error('[ONBOARDING DEBUG] Error sending team invitations from helper:', error);
      throw error;
    }
  };

  /**
   * Stores company information locally to be submitted at the end of the flow
   * Tracks whether we have pending company data changes that need to be submitted
   */
  const [pendingCompanyData, setPendingCompanyData] = useState<boolean>(false);

  /**
   * Submits the company updates to the server with robust error handling
   * This function is called when the onboarding flow is completed and stored company
   * information needs to be persisted on the server
   * 
   * @returns {Promise<boolean>} Promise that resolves to true if updates were saved successfully
   * @throws {Error} If there's an unrecoverable issue with saving company data
   */
  const submitCompanyUpdates = async (): Promise<boolean> => {
    // Dynamically import logger to use in this function
    const { logger } = await import('@/lib/logger');
    
    // If no pending company data to submit, just return success
    if (!pendingCompanyData || !employeeCount || !revenueTier) {
      logger.debug('[WelcomeModal] No pending company data to submit');
      return true;
    }
    
    logger.info('[WelcomeModal] Submitting company updates', {
      numEmployees: employeeCount,
      revenueTier: revenueTier,
      companyId: user?.company?.id
    });
    
    try {
      // Prepare data for the API call
      const companyData = {
        numEmployees: employeeCount.toString(),
        revenueTier: revenueTier
      };
      
      // Use mutateAsync to properly handle the promise
      const result = await updateCompanyMutation.mutateAsync(companyData);
      
      logger.info('[WelcomeModal] Company updates submitted successfully', {
        result,
        companyId: result?.id
      });
      
      // Show success toast
      toast({
        title: "Company information saved",
        description: "Your company details have been updated successfully.",
        variant: "success",
        duration: 2500
      });
      
      // Mark company data as submitted
      setPendingCompanyData(false);
      
      return true;
    } catch (error) {
      logger.error('[WelcomeModal] Failed to submit company updates', { error });
      
      // Show error toast
      toast({
        title: "Error saving company information",
        description: "There was a problem saving your company details. Please try again.",
        variant: "destructive",
        duration: 2500
      });
      
      console.error('[ONBOARDING DEBUG] Error saving company information:', error);
      
      // Propagate the error to be handled by the caller
      throw error;
    }
  };
  
  // Map revenue tier to readable string for display in review
  const getRevenueTierLabel = (tier: string): string => {
    const found = REVENUE_TIERS.find(option => option.value === tier);
    return found ? found.label : tier;
  };
  
  // Map employee count to readable string for display in review
  const getEmployeeCountLabel = (count: number | null): string => {
    if (count === null) return "Not provided";
    const found = EMPLOYEE_COUNTS.find(option => Number(option.value) === count);
    return found ? found.label : count.toString();
  };

  const handleNext = async () => {
    // Add enhanced console logging for debugging
    console.log('[ONBOARDING DEBUG] Handle Next called for slide', currentSlide, {
      employeeCount,
      revenueTier,
      pendingCompanyData,
      teamInvites: teamInvites.filter(invite => invite.fullName && invite.email)
    });
    
    // For step 2 (index 1), check if both form fields are filled out
    if (currentSlide === 1) {
      if (!employeeCount || !revenueTier) {
        // Display toast if form is incomplete
        toast({
          title: "Please complete all fields",
          description: "Both company size and annual revenue are required to continue.",
          variant: "destructive",
          duration: 2500
        });
        console.log('[ONBOARDING DEBUG] Company information incomplete, preventing advance');
        return;
      }
      
      // Log the company information for debugging purposes
      import('@/lib/logger').then(({ logger }) => {
        logger.debug('[WelcomeModal] Storing company information locally', {
          numEmployees: employeeCount,
          revenueTier: revenueTier,
          employeeLabel: getEmployeeCountLabel(employeeCount),
          revenueLabel: getRevenueTierLabel(revenueTier)
        });
      });
      
      // Log to console for immediate visibility
      console.log('[ONBOARDING DEBUG] Company information stored locally:', {
        numEmployees: employeeCount,
        revenueTier: revenueTier,
        employeeLabel: getEmployeeCountLabel(employeeCount),
        revenueLabel: getRevenueTierLabel(revenueTier),
        pendingFlag: true
      });
      
      // Mark that we have pending company data to be submitted at the end
      setPendingCompanyData(true);
      
      // Simply advance to the next slide without submitting to API yet
      setCurrentSlide(prev => prev + 1);
      return;
    }
    
    // For team invitation slide (index 4), validate that inputs are properly filled
    if (currentSlide === 4) {
      // Validate that invitation fields are either both filled or both empty
      if (!validateTeamInvites()) {
        // If validation failed, don't proceed to the next slide
        return;
      }
    }
    
    // For review slide (index 5), submit company data if we have pending changes
    if (currentSlide === 5 && pendingCompanyData) {
      setIsSubmitting(true);
      
      // First, save the company data using our robust function
      try {
        // Use the enhanced submit function with proper logging and error handling
        await submitCompanyUpdates();
        
        // Continue to the next slide after successful submission
        setCurrentSlide(prev => prev + 1);
        setIsSubmitting(false);
        return;
      } catch (error) {
        // Error handling is already done in submitCompanyUpdates
        setIsSubmitting(false);
        
        // Import logger to document the failure at this level
        import('@/lib/logger').then(({ logger }) => {
          logger.error('[WelcomeModal] Review page company data submission failed', { error });
        });
        
        // We already showed a toast in the submitCompanyUpdates function
        return;
      }
    }
    
    // For other slides, just advance to the next one
    if (currentSlide < carouselContent.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      console.log('[ONBOARDING DEBUG] Final slide reached, completing onboarding');
      setIsSubmitting(true);
      
      // Import logger for enhanced debugging
      import('@/lib/logger').then(async ({ logger }) => {
        logger.info('[WelcomeModal] Starting final onboarding completion process', {
          hasTeamInvites: !!(cfoName && cfoEmail) || !!(cisoName && cisoEmail),
          hasPendingCompanyData: pendingCompanyData,
          userId: user?.id,
          email: user?.email
        });
        
        // Track overall operation success for proper modal closure
        let operationSucceeded = true;
        
        // STEP 1: Submit any pending company data if needed
        try {
          if (pendingCompanyData) {
            logger.debug('[WelcomeModal] Processing pending company data updates');
            await submitCompanyUpdates();
            logger.info('[WelcomeModal] Company data updates processed successfully');
            // Toast is already shown by submitCompanyUpdates function
          } else {
            logger.debug('[WelcomeModal] No pending company data to process');
          }
        } catch (error) {
          logger.error('[WelcomeModal] Error submitting company data', { error });
          // Toast is already shown by submitCompanyUpdates function
          
          // This is a critical error, so we'll mark the operation as failed
          operationSucceeded = false;
        }
        
        // If company data update failed, don't proceed with other operations
        if (!operationSucceeded) {
          logger.warn('[WelcomeModal] Company data update failed, aborting onboarding completion');
          setIsSubmitting(false);
          return;
        }
        
        // STEP 2: Process team invitations if needed
        try {
          if ((cfoName && cfoEmail) || (cisoName && cisoEmail)) {
            logger.debug('[WelcomeModal] Processing team invitations');
            await processTeamInvites();
            logger.info('[WelcomeModal] Team invitations processed successfully');
            
            // Show success toast for team invitations
            toast({
              title: "Team invitations sent",
              description: "Your team members have been invited to join.",
              variant: "success",
              duration: 2500
            });
          } else {
            logger.debug('[WelcomeModal] No team invitations to process');
          }
        } catch (error) {
          logger.error('[WelcomeModal] Error sending team invitations', { error });
          console.error('[ONBOARDING DEBUG] Error sending team invitations:', error);
          
          // Show error toast for team invitations
          toast({
            title: "Team invitation failed",
            description: "We couldn't send team invitations. Please try again.",
            variant: "destructive",
            duration: 2500
          });
          
          // This is a critical error, so we'll mark the operation as failed
          operationSucceeded = false;
          
          // Exit the onboarding completion process
          setIsSubmitting(false);
          return;
        }
        
        // STEP 3: Set local flags to prevent the modal from showing again
        if (user) {
          user.onboarding_user_completed = true;
        }
        
        // STEP 4: Store completion in localStorage as a fail-safe backup
        try {
          localStorage.setItem('onboarding_completed', 'true');
          localStorage.setItem('onboarding_user_id', user?.id?.toString() || '');
          logger.debug('[WelcomeModal] Stored onboarding completion in localStorage');
        } catch (err) {
          logger.error('[WelcomeModal] Failed to store in localStorage', { error: err });
          console.error('[ONBOARDING DEBUG] Failed to store in localStorage:', err);
          // Continue despite localStorage errors - not critical
        }
        
        // STEP 5: Make the API call to update the server
        try {
          logger.debug('[WelcomeModal] Making API call to complete onboarding');
          
          // Use mutateAsync instead of mutate to properly await the result
          const result = await completeOnboardingMutation.mutateAsync();
          
          logger.info('[WelcomeModal] Server-side onboarding completion successful', { result });
          
          // Show success toast for completion
          toast({
            title: "Welcome aboard!",
            description: "Your onboarding has been completed successfully.",
            variant: "success",
            duration: 2500
          });
        } catch (error) {
          logger.error('[WelcomeModal] Error completing onboarding on server', { error });
          console.error('[ONBOARDING DEBUG] Server-side onboarding completion failed:', error);
          
          // Show error toast
          toast({
            title: "Onboarding completion issue",
            description: "There was a problem completing your onboarding. Please try again.",
            variant: "destructive",
            duration: 2500
          });
          
          // Mark operation as failed - keep modal open
          operationSucceeded = false;
        }
        
        // Only close the modal if all critical operations succeeded
        if (operationSucceeded) {
          logger.info('[WelcomeModal] All operations successful, closing modal');
          setShowModal(false);
        } else {
          logger.warn('[WelcomeModal] Operation failed, keeping modal open');
          setIsSubmitting(false); // Re-enable the button to try again
        }
      });
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  // The modal can only be closed by completing the onboarding process
  // We don't need a separate handleOpenChange function since we're 
  // preventing modal closure via outside clicks directly in the Dialog component

  // Debounced effect to log only once per session (or when state changes)
  useEffect(() => {
    // We only want to log this once per session
    const hasLoggedKey = 'has_logged_modal_hidden';
    if (!user || user.onboarding_user_completed === true || !showModal) {
      // Check if we've already logged this state
      const hasLogged = sessionStorage.getItem(hasLoggedKey);
      if (!hasLogged) {
        // Import logger dynamically to avoid bundling it unnecessarily
        import('@/lib/logger').then(({ logger }) => {
          logger.debug('[WelcomeModal] Not rendering modal because', {
            noUser: !user,
            onboardingCompleted: user?.onboarding_user_completed === true,
            modalHidden: !showModal,
            timestamp: new Date().toISOString()
          });
        });
        // Mark that we've logged this state
        try {
          sessionStorage.setItem(hasLoggedKey, 'true');
        } catch (e) {
          // Ignore storage errors
        }
      }
    }
  }, [user, showModal]);
  
  // TEMPORARY FOR TESTING: Force modal to show regardless of onboarding status
  // We'll uncomment the conditional return after testing
  
  // if (!user || user.onboarding_user_completed === true || !showModal) {
  //   return null;
  // }
  
  // Modal should only be shown based on user's onboarding status

  return (
    <Dialog 
      open={showModal} // Use the state variable to control modal visibility
      onOpenChange={(open) => {
        // Do nothing when trying to close - prevent outside clicks from closing the modal
        if (open === false) {
          return; // Ignore attempts to close via outside clicks
        }
        setShowModal(open);
      }}
      modal={true} // Force modal behavior
    >
      <CustomDialogContent className="sm:max-w-4xl p-0 overflow-hidden rounded-xl bg-background border-none max-h-[80vh]">
        <DialogTitle className="sr-only">{carouselContent[currentSlide].title}</DialogTitle>
        <DialogDescription className="sr-only">{carouselContent[currentSlide].subtitle}</DialogDescription>
        
        {/* Main content container */}
        <div className="flex flex-col h-full overflow-hidden" style={{ height: 'min(calc(100vh - 12rem), 550px)' }}>
          {/* Content container - side by side layout */}
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Left side: Text content - added will-change and hidden overflow to prevent flickering */}
            <div className="px-8 py-8 flex-1 flex flex-col justify-between overflow-hidden will-change-transform">
              {/* Content with title and subtitle */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`content-${currentSlide}`}
                  initial={{ 
                    opacity: 0, 
                    x: animationDirection * 30 
                  }}
                  animate={{ 
                    opacity: 1, 
                    x: 0 
                  }}
                  exit={{ 
                    opacity: 0, 
                    x: animationDirection * -30 
                  }}
                  transition={{ 
                    duration: 0.4, 
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="mb-5 h-full flex flex-col transform-gpu"
                  style={{ willChange: 'transform, opacity' }}
                >
                  <div className="flex">
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="inline-flex px-4 py-1 text-sm font-medium bg-primary/10 text-primary rounded-full mb-4 w-auto mx-0"
                    >
                      Onboarding Modal
                    </motion.div>
                  </div>
                  
                  {currentSlide === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <motion.h2 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 200, 
                          damping: 15,
                          delay: 0.2 
                        }}
                        className="text-3xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-primary to-blue-700 bg-clip-text text-transparent leading-tight"
                      >
                        {carouselContent[currentSlide].title.split('\n').map((line, i) => (
                          <React.Fragment key={i}>
                            {line}
                            {i < carouselContent[currentSlide].title.split('\n').length - 1 && <br />}
                          </React.Fragment>
                        ))}
                      </motion.h2>
                      
                      <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 150, 
                          damping: 15,
                          delay: 0.3 
                        }}
                        className="text-lg text-gray-700 leading-relaxed"
                      >
                        {Number(currentSlide) === 1 ? (
                          <>Add basic details about <span className="font-bold">{companyData?.name || 'your company'}</span>:</>
                        ) : (
                          carouselContent[currentSlide]?.subtitle || ""
                        )}
                      </motion.p>
                    </motion.div>
                  ) : currentSlide === 5 ? (
                    /* Skip showing default title for step 6 (review page) since it has its own title */
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                      {/* Intentionally empty - no title for review page here */}
                    </motion.div>
                  ) : currentSlide === 6 ? (
                    /* Custom treatment for final step (Ready to Begin) */
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      transition={{ delay: 0.2 }}
                      className="text-center mb-2"
                    >
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                        className="mx-auto mt-1 mb-6 flex items-center justify-center"
                      >
                        <div className="relative">
                          {/* Animated glow effect */}
                          <div className="absolute inset-0 -mx-3 -my-3 rounded-full bg-green-400/20 animate-pulse blur-md"></div>
                          
                          {/* Success checkmark */}
                          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-green-100 to-green-50 border-4 border-green-200 flex items-center justify-center shadow-md relative z-10">
                            <CheckCircle2 className="h-12 w-12 text-green-600" strokeWidth={2.5} />
                          </div>
                        </div>
                      </motion.div>
                      <motion.h2 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="text-2xl font-bold text-gray-900 mb-3"
                      >
                        {carouselContent[currentSlide].title}
                      </motion.h2>
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="text-base text-gray-600 max-w-md mx-auto"
                      >
                        {carouselContent[currentSlide].subtitle}
                      </motion.p>
                      

                    </motion.div>
                  ) : (
                    <>
                      <motion.h2 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className={cn(
                          "text-2xl font-bold text-gray-900 leading-tight",
                          currentSlide === 2 ? "mb-3" : "mb-4"
                        )}
                      >
                        {carouselContent[currentSlide].title.split('\n').map((line, i) => (
                          <React.Fragment key={i}>
                            {line}
                            {i < carouselContent[currentSlide].title.split('\n').length - 1 && <br />}
                          </React.Fragment>
                        ))}
                      </motion.h2>
                      
                      <motion.p 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className={cn(
                          "text-lg text-gray-700",
                          currentSlide === 2 ? "mb-2" : currentSlide === 3 ? "mb-0" : "mb-3"
                        )}
                      >
                        {Number(currentSlide) === 1 ? (
                          <>Add basic details about <span className="font-bold">{companyData?.name || 'your company'}</span>:</>
                        ) : (
                          carouselContent[currentSlide]?.subtitle || ""
                        )}
                      </motion.p>
                    </>
                  )}

                  {/* Form fields for step 2 */}
                  {currentSlide === 1 && (
                    <motion.div
                      className="mt-8 space-y-5 transform-gpu"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      style={{ willChange: 'opacity', overflow: 'hidden' }}
                    >
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="employeeCount" className="text-base font-medium">
                            Company Size <span className="text-red-500">*</span>
                          </Label>
                          <Select 
                            value={employeeCount !== null ? employeeCount.toString() : undefined} 
                            onValueChange={(value) => setEmployeeCount(Number(value))}
                            disabled={isSubmitting}
                          >
                            <SelectTrigger 
                              id="employeeCount" 
                              className={cn(
                                "w-[360px] overflow-visible transition-all duration-200",
                                employeeCount ? "border-green-500 bg-green-50/30" : ""
                              )}
                            >
                              <SelectValue placeholder="Select number of employees" className="text-gray-400" />
                            </SelectTrigger>
                            <SelectContent className="overflow-visible">
                              {EMPLOYEE_COUNTS.map(option => (
                                <SelectItem 
                                  key={option.value} 
                                  value={option.value.toString()}
                                  className="hover:bg-gray-100 transition-colors duration-150"
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="revenueTier" className="text-base font-medium">
                            Annual Revenue <span className="text-red-500">*</span>
                          </Label>
                          <Select 
                            value={revenueTier} 
                            onValueChange={setRevenueTier} 
                            disabled={isSubmitting}
                          >
                            <SelectTrigger 
                              id="revenueTier" 
                              className={cn(
                                "w-[360px] overflow-visible transition-all duration-200",
                                revenueTier ? "border-green-500 bg-green-50/30" : ""
                              )}
                            >
                              <SelectValue placeholder="Select annual revenue" className="text-gray-400" />
                            </SelectTrigger>
                            <SelectContent className="overflow-visible">
                              {REVENUE_TIERS.map(option => (
                                <SelectItem 
                                  key={option.value} 
                                  value={option.value}
                                  className="hover:bg-gray-100 transition-colors duration-150"
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Team member invitation form for step 5 */}
                  {currentSlide === 4 && (
                    <motion.div
                      className="mt-1 space-y-4 transform-gpu" /* Reduced space between title and content */
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      style={{ willChange: 'opacity', overflow: 'hidden' }}
                    >
                      {/* CFO Invitation */}
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100"> {/* Changed to a soft blue-gray background */}
                        <div className="mb-1 flex items-center">
                          <span className="px-3 py-1 rounded-md bg-gray-200 text-gray-700 text-sm font-medium mr-2">CFO</span>
                          <Label className="text-base font-semibold inline">Financial Data for <span className="rounded-md px-2 py-0.5 bg-gray-100 text-gray-800 whitespace-nowrap">KYB Form</span></Label>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          <div className="space-y-1 col-span-2">
                            <Label htmlFor="cfoName" className="text-sm">
                              Full Name
                            </Label>
                            <Input
                              id="cfoName"
                              placeholder="John Doe"
                              value={cfoName}
                              onChange={(e) => setCfoName(e.target.value)}
                              className={`transition-all duration-200 ${
                                cfoName 
                                  ? "border-green-500 bg-green-50/30" 
                                  : cfoEmail ? "border-red-500" : ""
                              }`}
                            />
                          </div>
                          <div className="space-y-1 col-span-3">
                            <Label htmlFor="cfoEmail" className="text-sm">
                              Email Address
                            </Label>
                            <Input
                              id="cfoEmail"
                              placeholder="cfo@company.com"
                              type="email"
                              value={cfoEmail}
                              onChange={(e) => setCfoEmail(e.target.value)}
                              className={`transition-all duration-200 ${
                                cfoEmail 
                                  ? "border-green-500 bg-green-50/30" 
                                  : cfoName ? "border-red-500" : ""
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* CISO Invitation */}
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100"> {/* Changed to a soft blue-gray background */}
                        <div className="mb-1 flex items-center">
                          <span className="px-3 py-1 rounded-md bg-gray-200 text-gray-700 text-sm font-medium mr-2">CISO</span>
                          <Label className="text-base font-semibold inline">Compliance Info for <span className="rounded-md px-2 py-0.5 bg-gray-100 text-gray-800 whitespace-nowrap">S&P KY3P Security Assessment</span></Label>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          <div className="space-y-1 col-span-2">
                            <Label htmlFor="cisoName" className="text-sm">
                              Full Name
                            </Label>
                            <Input
                              id="cisoName"
                              placeholder="Jane Smith"
                              value={cisoName}
                              onChange={(e) => setCisoName(e.target.value)}
                              className={`transition-all duration-200 ${
                                cisoName 
                                  ? "border-green-500 bg-green-50/30" 
                                  : cisoEmail ? "border-red-500" : ""
                              }`}
                            />
                          </div>
                          <div className="space-y-1 col-span-3">
                            <Label htmlFor="cisoEmail" className="text-sm">
                              Email Address
                            </Label>
                            <Input
                              id="cisoEmail"
                              placeholder="ciso@company.com"
                              type="email"
                              value={cisoEmail}
                              onChange={(e) => setCisoEmail(e.target.value)}
                              className={`transition-all duration-200 ${
                                cisoEmail 
                                  ? "border-green-500 bg-green-50/30" 
                                  : cisoName ? "border-red-500" : ""
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Review Information (step 6) */}
                  {currentSlide === 5 && (
                    <motion.div
                      className="mt-3 transform-gpu" 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      style={{ willChange: 'opacity' }}
                    >
                      {/* Simple title with standard format */}
                      <div className="mb-3">
                        <h3 className="text-xl font-semibold text-gray-800">Review Provided Information</h3>
                      </div>
                    
                      {/* Add structured logging using utility logger */}
                      {(() => {
                        // Use dynamic import to avoid bundling logger if not used
                        import('@/lib/logger').then(({ logger }) => {
                          logger.debug('[WelcomeModal] Rendering review page with data', {
                            company: companyData, 
                            employeeCount, 
                            revenueTier, 
                            pendingCompanyData,
                            teamInvites: [
                              cfoName && cfoEmail ? { role: 'CFO', name: cfoName, email: cfoEmail } : null,
                              cisoName && cisoEmail ? { role: 'CISO', name: cisoName, email: cisoEmail } : null
                            ].filter(Boolean)
                          });
                        });
                        // Also keep console log for immediate visibility during development
                        console.log('[ONBOARDING DEBUG] Rendering review page with data:', {
                          company: companyData, 
                          employeeCount, 
                          revenueTier, 
                          pendingCompanyData,
                          teamInvites: [
                            cfoName && cfoEmail ? { role: 'CFO', name: cfoName, email: cfoEmail } : null,
                            cisoName && cisoEmail ? { role: 'CISO', name: cisoName, email: cisoEmail } : null
                          ].filter(Boolean)
                        });
                        return null;
                      })()}
                      
                      {/* Horizontal review data layout with checkmarks */}
                      <div className="mt-3">
                        {/* Display in a horizontal flow layout */}
                        <div className="flex flex-wrap gap-2">
                          {/* Company information with checkmarks */}
                          <div className="bg-white py-2 px-3 rounded-md border border-blue-50 flex items-center">
                            <CheckCircle2 className="w-4 h-4 text-green-500 mr-1.5 flex-shrink-0" />
                            <span className="text-xs font-medium text-gray-500 mr-1">Company:</span>
                            <span className="text-sm font-medium text-gray-900">{companyData?.name || "Not provided"}</span>
                          </div>
                          
                          <div className="bg-white py-2 px-3 rounded-md border border-blue-50 flex items-center">
                            <CheckCircle2 className="w-4 h-4 text-green-500 mr-1.5 flex-shrink-0" />
                            <span className="text-xs font-medium text-gray-500 mr-1">Category:</span>
                            <span className="text-sm font-medium text-gray-900">{companyData?.category || "Not provided"}</span>
                          </div>
                          
                          <div className="bg-white py-2 px-3 rounded-md border border-blue-50 flex items-center">
                            <CheckCircle2 className="w-4 h-4 text-green-500 mr-1.5 flex-shrink-0" />
                            <span className="text-xs font-medium text-gray-500 mr-1">Size:</span>
                            <span className="text-sm font-medium text-gray-900">{employeeCount ? getEmployeeCountLabel(employeeCount) : "Not provided"}</span>
                          </div>
                          
                          <div className="bg-white py-2 px-3 rounded-md border border-blue-50 flex items-center">
                            <CheckCircle2 className="w-4 h-4 text-green-500 mr-1.5 flex-shrink-0" />
                            <span className="text-xs font-medium text-gray-500 mr-1">Revenue:</span>
                            <span className="text-sm font-medium text-gray-900">{revenueTier ? getRevenueTierLabel(revenueTier) : "Not provided"}</span>
                          </div>

                          {/* Team invitations */}
                          {cfoName && cfoEmail && (
                            <div className="bg-white py-2 px-3 rounded-md border border-blue-50 flex items-center">
                              <CheckCircle2 className="w-4 h-4 text-green-500 mr-1.5 flex-shrink-0" />
                              <span className="text-xs font-medium text-gray-500 mr-1">CFO:</span>
                              <span className="text-sm font-medium text-gray-900">{cfoName}</span>
                              <span className="text-xs text-gray-500 ml-1">({cfoEmail})</span>
                            </div>
                          )}
                          
                          {cisoName && cisoEmail && (
                            <div className="bg-white py-2 px-3 rounded-md border border-blue-50 flex items-center">
                              <CheckCircle2 className="w-4 h-4 text-green-500 mr-1.5 flex-shrink-0" />
                              <span className="text-xs font-medium text-gray-500 mr-1">CISO:</span>
                              <span className="text-sm font-medium text-gray-900">{cisoName}</span>
                              <span className="text-xs text-gray-500 ml-1">({cisoEmail})</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Bullet points section - special styling for step 3 */}
                  {carouselContent[currentSlide].bulletPoints && currentSlide !== 1 && currentSlide !== 4 && (
                    <div className={currentSlide === 2 ? "mt-2" : "mt-8"}>
                      {currentSlide === 2 ? (
                        // Special numbered list with neumorphic design for step 3
                        <div className="space-y-2 mt-1">
                          {carouselContent[currentSlide].bulletPoints?.map((point, index) => (
                            <motion.div 
                              key={index} 
                              className="flex py-3 px-5 bg-gray-50 rounded-xl border border-gray-100 shadow-lg transform-gpu"
                              style={{
                                boxShadow: '6px 6px 12px rgba(166, 180, 200, 0.1), -6px -6px 12px rgba(255, 255, 255, 0.8), inset 1px 1px 1px rgba(255, 255, 255, 0.4)'
                              }}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.4 + (index * 0.15) }}
                            >
                              <div className="flex items-center w-full">
                                <div className="h-8 w-8 text-white flex-shrink-0 rounded-full bg-primary flex items-center justify-center mr-5 font-semibold text-sm shadow-md">
                                  {index + 1}
                                </div>
                                <p className="text-lg font-medium text-gray-700">
                                  {point}
                                </p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        // Custom styling for document list in step 4 or standard bullets for other slides
                        <div className={currentSlide === 3 ? "flex flex-wrap gap-1.5 mt-1" : "space-y-5"}>
                          {carouselContent[currentSlide].bulletPoints?.map((point, index) => (
                            currentSlide === 3 ? (
                              // Document type chips with soft rounded corners for step 4
                              <motion.div 
                                key={index} 
                                className="py-1 px-3 bg-gray-100 rounded-lg border border-gray-200 transform-gpu"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 + (index * 0.04) }}
                              >
                                <p className="text-sm font-medium text-gray-600 whitespace-nowrap">
                                  {point}
                                </p>
                              </motion.div>
                            ) : (
                              // Standard bullets for other slides
                              <motion.div 
                                key={index} 
                                className="flex items-start space-x-3"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + (index * 0.15) }}
                              >
                                {currentSlide === 0 ? (
                                  <div className="mt-1 h-7 w-7 text-primary flex-shrink-0 rounded-full bg-gradient-to-br from-primary/20 to-blue-400/20 flex items-center justify-center shadow-sm border border-primary/10">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </div>
                                ) : (
                                  <div className="mt-1 h-6 w-6 text-primary flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </div>
                                )}
                                <p className={cn(
                                  "text-lg font-medium",
                                  currentSlide === 0 ? "text-gray-800" : "text-gray-700"
                                )}>
                                  {point}
                                </p>
                              </motion.div>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            
            {/* Right side: Image container */}
            <div className="hidden md:block bg-blue-50/30 relative md:w-[45%] max-w-[450px] min-h-[400px] flex-shrink-0 border-l border-slate-100">
              {/* Image with loading state */}
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Skeleton during loading */}
                {!imagesLoaded[carouselContent[currentSlide].src] && (
                  <motion.div
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: 1 }}
                    transition={{ 
                      duration: 0.8, 
                      repeat: Infinity, 
                      repeatType: "reverse" 
                    }}
                    className="w-[90%] aspect-square rounded-lg mx-auto"
                  >
                    <Skeleton className="w-full h-full rounded-lg" />
                  </motion.div>
                )}
                
                {/* Animated image with transitions */}
                <AnimatePresence mode="wait">
                  {imagesLoaded[carouselContent[currentSlide].src] && (
                    <motion.div
                      key={`image-${currentSlide}`}
                      initial={{ 
                        opacity: 0,
                        scale: 0.95,
                        y: animationDirection * 10 
                      }}
                      animate={{ 
                        opacity: 1,
                        scale: 1,
                        y: 0
                      }}
                      exit={{ 
                        opacity: 0,
                        scale: 0.95,
                        y: animationDirection * -10
                      }}
                      transition={{ 
                        duration: 0.5,
                        ease: [0.22, 1, 0.36, 1]
                      }}
                      className="relative p-6 w-full h-full flex items-center justify-center transform-gpu"
                      style={{ willChange: 'transform, opacity' }}
                    >
                      <motion.div 
                        className="relative w-full h-full flex items-center justify-center transform-gpu"
                        initial={{ rotate: animationDirection * -1 }}
                        animate={{ rotate: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        style={{ willChange: 'transform' }}
                      >
                        <motion.div 
                          className="absolute inset-4 bg-blue-50/50 rounded-lg transform-gpu"
                          initial={{ rotate: animationDirection * 2 }}
                          animate={{ rotate: 1 }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          style={{ willChange: 'transform' }}
                        />
                        <motion.div 
                          className="absolute inset-4 bg-blue-100/20 rounded-lg transform-gpu"
                          initial={{ rotate: animationDirection * -2 }}
                          animate={{ rotate: -1 }}
                          transition={{ duration: 0.7, ease: "easeOut" }}
                          style={{ willChange: 'transform' }}
                        />
                        <img 
                          src={carouselContent[currentSlide].src} 
                          alt={carouselContent[currentSlide].alt} 
                          className="max-w-[95%] max-h-[95%] object-contain rounded-lg shadow-md border border-blue-100/50 z-10"
                          onError={(e) => {
                            // Use dynamic import to avoid bundling logger in case it's not used
                            import('@/lib/logger').then(({ logger }) => {
                              logger.error('[WelcomeModal] Failed to load carousel image', {
                                src: carouselContent[currentSlide].src,
                                slide: currentSlide,
                                error: e
                              });
                            });
                          }}
                          onLoad={() => {
                            // Mark this image as loaded without excessive logging
                            setImagesLoaded(prev => ({
                              ...prev,
                              [carouselContent[currentSlide].src]: true
                            }));
                            // Fade in the image
                            setImageOpacity(1);
                          }}
                        />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          
          {/* Navigation buttons with step indicators */}
          <div className="flex items-center justify-between p-6 border-t">
            {/* Back button - hidden on first slide */}
            <div className="min-w-[100px]">
              <AnimatePresence>
                {currentSlide > 0 && currentSlide !== 6 && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Button
                      variant="outline"
                      onClick={handlePrevious}
                      className="px-6 py-2 h-auto text-base"
                    >
                      Back
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Step indicators in the middle */}
            <div className="flex gap-2 mx-4">
              {carouselContent.map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1,
                    width: index === currentSlide ? "2rem" : "1rem",
                  }}
                  transition={{ 
                    duration: 0.4,
                    delay: 0.05 * index,
                    width: { duration: 0.3 }
                  }}
                  className={`h-2.5 rounded-full ${
                    index === currentSlide
                      ? "bg-primary"
                      : "bg-primary/20"
                  }`}
                />
              ))}
            </div>

            {/* Next/Start button with pulsing animation on final step */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Button
                onClick={handleNext}
                disabled={isSubmitting || (Number(currentSlide) === 1 && (!employeeCount || !revenueTier))}
                className={cn(
                  "px-6 py-2 h-auto text-base bg-primary text-primary-foreground hover:bg-primary/90 rounded-md",
                  isLastSlide && "pulse-border-animation font-bold bg-green-600 hover:bg-green-700 px-10 shadow-md"
                )}
              >
                {isSubmitting ? "Saving..." : isLastSlide ? (
                  <span className="flex items-center">
                    Start <ArrowRight className="ml-2 h-4 w-4" />
                  </span>
                ) : "Next"}
              </Button>
            </motion.div>
          </div>
        </div>
      </CustomDialogContent>
    </Dialog>
  );
}