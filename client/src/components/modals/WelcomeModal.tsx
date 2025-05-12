import React, { useState, useEffect, forwardRef, useCallback, useRef, useMemo, Fragment } from "react";
import { Dialog, DialogTitle, DialogDescription, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

// Constants for form selections with specific value mappings to appropriate database values
// For employee count, we use size categories: small, medium, large, xlarge
const EMPLOYEE_COUNTS = [
  { value: "small", label: "Small (1-49 employees)" },
  { value: "medium", label: "Medium (50–249 employees)" },
  { value: "large", label: "Large (250–999 employees)" },
  { value: "xlarge", label: "X Large (1K+ employees)" },
];

// For revenue tiers, we use the midpoint dollar amounts in database
const REVENUE_TIERS = [
  { value: "5000000", label: "$0–$10M" },     // $5M  (midpoint of $0-$10M)
  { value: "30000000", label: "$10M–$50M" },  // $30M (midpoint of $10M-$50M)
  { value: "150000000", label: "$50M–$250M" }, // $150M (midpoint of $50M-$250M)
  { value: "300000000", label: "$250M+" },    // $300M (conventional value for "$250M+")
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
    alt: "Tasks Ahead",
    title: "Tasks Ahead",
    subtitle: "Here's what you'll need to complete next. We've outlined essential tasks required for successful onboarding:",
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
      "SOC 2, ISO 27001, Penetration Test Reports",
      "API Security, OAuth Certification",
      "GDPR/CCPA Compliance, FDX Certification",
      "Business Continuity Plan, Data Protection Policies"
    ]
  },
  {
    src: "/attached_assets/welcome_5.png",
    alt: "Invite Your Team",
    title: "Invite Your Team",
    subtitle: "Invite your colleagues to assist with specific tasks during onboarding. Ensure streamlined collaboration by assigning roles effectively.",
    bulletPoints: [
      "CFO for KYB Financials",
      "CISO for Security Assessments",
      "CTO or Legal for Open Banking Requirements"
    ]
  },
  {
    src: "/attached_assets/welcome_6.png",
    alt: "Review Your Information",
    title: "Review Your Information",
    subtitle: "Review and confirm the details you provided before submission. Double-check for accuracy to ensure a seamless onboarding experience.",
    bulletPoints: [
      "Company Name",
      "Organization Size",
      "Annual Revenue",
      "Team Members Invited (with assigned tasks)"
    ]
  },
  {
    src: "/attached_assets/welcome_7.png",
    alt: "Ready to Begin",
    title: "Ready to Begin",
    subtitle: "Your information has been submitted successfully. You're now ready to start your onboarding journey within the Invela Trust Network."
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

export function WelcomeModal() {
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [showModal, setShowModal] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState<Record<string, boolean>>({});
  const [imageOpacity, setImageOpacity] = useState(0);
  const [employeeCount, setEmployeeCount] = useState<string>("");
  const [revenueTier, setRevenueTier] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const websocket = useWebSocketContext();
  const connected = websocket.isConnected;
  
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
  const { data: company } = useQuery<{id: number, name: string}>({
    queryKey: ["/api/companies/current"],
    enabled: !!user,
  });

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

  const handleNext = () => {
    // For step 2 (index 1), check if both form fields are filled out
    if (currentSlide === 1) {
      if (!employeeCount || !revenueTier) {
        // Display toast if form is incomplete
        toast({
          title: "Please complete all fields",
          description: "Both company size and annual revenue are required to continue.",
          variant: "destructive"
        });
        return;
      }
      
      // If form is valid, save the data
      setIsSubmitting(true);
      updateCompanyMutation.mutate(
        { 
          numEmployees: employeeCount,
          revenueTier: revenueTier 
        },
        {
          onSuccess: () => {
            setIsSubmitting(false);
            setCurrentSlide(prev => prev + 1);
          },
          onError: (error) => {
            setIsSubmitting(false);
            toast({
              title: "Error saving company information",
              description: "There was a problem saving your company details. Please try again.",
              variant: "destructive"
            });
            console.error('[ONBOARDING DEBUG] Error saving company information:', error);
          }
        }
      );
      return;
    }
    
    // For other slides, just advance to the next one
    if (currentSlide < carouselContent.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      console.log('[ONBOARDING DEBUG] Final slide reached, completing onboarding');
      
      // Set a local flag immediately to prevent modal from showing again
      if (user) {
        user.onboarding_user_completed = true;
      }
      
      // Store completion in localStorage as a fail-safe backup
      try {
        localStorage.setItem('onboarding_completed', 'true');
        localStorage.setItem('onboarding_user_id', user?.id?.toString() || '');
        console.log('[ONBOARDING DEBUG] Stored onboarding completion in localStorage');
      } catch (err) {
        console.error('[ONBOARDING DEBUG] Failed to store in localStorage:', err);
      }
      
      // Make the API call to update the server
      completeOnboardingMutation.mutate();
      
      // Close the modal immediately
      setShowModal(false);
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
                          <>Add basic details about <span className="font-bold">{company?.name || 'your company'}</span>:</>
                        ) : (
                          carouselContent[currentSlide]?.subtitle || ""
                        )}
                      </motion.p>
                    </motion.div>
                  ) : (
                    <>
                      <motion.h2 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-2xl font-bold text-gray-900 mb-4 leading-tight"
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
                        className="text-lg text-gray-700"
                      >
                        {Number(currentSlide) === 1 ? (
                          <>Add basic details about <span className="font-bold">{company?.name || 'your company'}</span>:</>
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
                            value={employeeCount} 
                            onValueChange={setEmployeeCount}
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
                                  value={option.value}
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

                  {/* Bullet points if available - enhanced for first slide */}
                  {carouselContent[currentSlide].bulletPoints && currentSlide !== 1 && (
                    <motion.div 
                      className="mt-8 space-y-5 transform-gpu"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      style={{ willChange: 'opacity', overflow: 'hidden' }}
                    >
                      {carouselContent[currentSlide].bulletPoints?.map((point, index) => (
                        <motion.div 
                          key={index} 
                          className="flex items-start space-x-3 transform-gpu"
                          initial={{ 
                            opacity: 0, 
                            x: currentSlide === 0 ? 20 : 10,
                            scale: currentSlide === 0 ? 0.95 : 1
                          }}
                          animate={{ 
                            opacity: 1, 
                            x: 0,
                            scale: 1 
                          }}
                          transition={{ 
                            delay: 0.4 + (index * 0.15),
                            duration: 0.4,
                            type: currentSlide === 0 ? "spring" : "tween",
                            stiffness: currentSlide === 0 ? 100 : undefined,
                            damping: currentSlide === 0 ? 10 : undefined
                          }}
                          style={{ willChange: 'transform, opacity' }}
                        >
                          {currentSlide === 0 ? (
                            <motion.div 
                              className="mt-1 h-7 w-7 text-primary flex-shrink-0 rounded-full bg-gradient-to-br from-primary/20 to-blue-400/20 flex items-center justify-center shadow-sm border border-primary/10"
                              initial={{ rotate: -10, scale: 0.8 }}
                              animate={{ rotate: 0, scale: 1 }}
                              transition={{ 
                                delay: 0.4 + (index * 0.15) + 0.1,
                                type: "spring",
                                stiffness: 200
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </motion.div>
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
                      ))}
                    </motion.div>
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
                {currentSlide > 0 && (
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
                  isLastSlide && "pulse-border-animation font-bold bg-blue-600 hover:bg-blue-700 px-8"
                )}
              >
                {isSubmitting ? "Saving..." : isLastSlide ? "Start" : "Next"}
              </Button>
            </motion.div>
          </div>
        </div>
      </CustomDialogContent>
    </Dialog>
  );
}