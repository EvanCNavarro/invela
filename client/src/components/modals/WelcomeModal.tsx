import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedToast } from "@/hooks/use-unified-toast";
import { motion, AnimatePresence } from "framer-motion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Cross2Icon, PlusCircledIcon, PlusIcon, ReloadIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useSteps } from "@/hooks/use-steps";
import { useInvites } from "@/hooks/use-invite-list";
import { X, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { logger } from "@/lib/logger";
import { generateUserAgent } from '@/utils/user-agent';

// Custom dialog content with additional styling 
const CustomDialogContent = ({ className, ...props }: any) => (
  <Dialog.Content className={cn(
    "fixed left-[50%] top-[50%] z-50 grid w-[95vw] max-w-[1200px] max-h-[90vh] translate-x-[-50%] translate-y-[-50%] overflow-y-auto scrollbar-hide gap-4 border bg-background p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg",
    className
  )} {...props} />
);

// Define the different slides/steps in the welcome flow
const slides = [
  {
    title: "Welcome to Invela Trust Network",
    description: "Let's set up your account to get you started with our risk assessment platform.",
    image: "/welcome_1.png",
  },
  {
    title: "Tell us about your company",
    description: "This information helps us tailor the platform to your company's needs and risk profile.",
    image: "/welcome_2.png",
  },
  {
    title: "Invite your Chief Financial Officer",
    description: "Your CFO will need to complete the KYB Form which is a crucial part of the verification process. They'll receive a dedicated login to access this task.",
    image: "/welcome_3.png",
  },
  {
    title: "Invite your Chief Information Security Officer",
    description: "Your CISO will need to complete the Security Assessment which helps us evaluate your security controls and posture. They'll receive a dedicated login to access this task.",
    image: "/welcome_4.png",
  },
  {
    title: "Invite additional team members (optional)",
    description: "Your team members will receive an email with login instructions. They'll be able to view your company's profile and collaborate on tasks.",
    image: "/welcome_5.png",
  },
  {
    title: "Review your information",
    description: "Please review the information you've provided to ensure everything is correct.",
    image: "/welcome_6.png",
  },
  {
    title: "You're all set!",
    description: "Your account is now ready to use. You'll need to complete the accreditation process and start the KYB Form task to fully onboard your organization.",
    image: "/welcome_7.png",
  }
];

// Helper types for the component
interface CompanyData {
  name: string;
  industry: string;
  employeeCount: number | null;
  revenueTier: string;
  website: string;
}

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
  const [additionalNames, setAdditionalNames] = useState<string[]>([""]);
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([""]);
  
  // Company information
  const [companyName, setCompanyName] = useState<string>("");
  const [industry, setIndustry] = useState<string>("");
  const [website, setWebsite] = useState<string>("");
  
  // User information 
  const [currentUserName, setCurrentUserName] = useState<string>("");
  
  // Processed team invitations for review
  const [teamInvites, setTeamInvites] = useState<TeamMemberInvite[]>([]);
  
  // Keep track of component mounting state to prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  // Track pending async operations for cleanup
  const pendingOperations = useRef<AbortController[]>([]);
  
  // Location hook for redirecting after completion
  const [_, setLocation] = useLocation();
  
  // Toast notification hooks
  const { toast } = useToast();
  const unifiedToast = useUnifiedToast();
  
  // Get current user information
  const { data: userData } = useQuery({
    queryKey: ['/api/users/me'],
    refetchOnWindowFocus: false,
    enabled: showModal,
  });
  
  // For real Employee Count values
  const employeeCountMapping: Record<string, number> = {
    "Small (1-49)": 25,
    "Medium (50-249)": 150, 
    "Large (250-999)": 625,
    "X Large (1K+)": 5000
  };
  
  // For revenue tier mapping
  const revenueTierMapping: Record<string, string> = {
    "$0-$10M": "small",
    "$10M-$50M": "medium",
    "$50M-$250M": "large",
    "$250M+": "xlarge"
  };
  
  // Mutations for API interactions
  const createCompanyMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/companies', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
    },
  });
  
  const inviteTeamMemberMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/users/invite', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
  });
  
  // Component lifecycle
  useEffect(() => {
    // Set component mounted flag
    isMountedRef.current = true;
    
    // Show welcome modal only for first-time users
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      setShowModal(true);
    }
    
    // Cleanup function for component unmount
    return () => {
      // Set flag to prevent state updates after unmount
      isMountedRef.current = false;
      
      // Cancel any pending operations
      pendingOperations.current.forEach(controller => {
        try {
          controller.abort();
        } catch (error) {
          console.error("Error aborting pending operations:", error);
        }
      });
    };
  }, []);
  
  // Image preloading
  useEffect(() => {
    slides.forEach((slide, index) => {
      const img = new Image();
      img.src = slide.image;
      img.onload = () => {
        if (isMountedRef.current) {
          setImagesLoaded(prev => ({
            ...prev,
            [index]: true
          }));
        }
      };
    });
  }, []);
  
  // Image opacity animation
  useEffect(() => {
    if (imagesLoaded[currentSlide]) {
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          setImageOpacity(1);
        }
      }, 100);
      
      return () => clearTimeout(timer);
    } else {
      if (isMountedRef.current) {
        setImageOpacity(0);
      }
    }
  }, [currentSlide, imagesLoaded]);
  
  // Set user name if available
  useEffect(() => {
    if (userData && userData.full_name) {
      setCurrentUserName(userData.full_name);
    }
  }, [userData]);
  
  // Handle navigation between slides
  const handleNext = useCallback(async () => {
    if (currentSlide === slides.length - 1) {
      // This is the final slide, process completion
      try {
        setIsSubmitting(true);
        
        // Save hasSeenWelcome flag
        localStorage.setItem('hasSeenWelcome', 'true');
        
        // Close modal and navigate to dashboard
        setTimeout(() => {
          if (isMountedRef.current) {
            setShowModal(false);
            setLocation('/dashboard');
          }
        }, 500);
      } catch (error) {
        console.error("Error completing onboarding:", error);
        
        // Show error toast
        unifiedToast.error({
          title: "Onboarding Error",
          description: "There was a problem completing your onboarding. Please try again."
        });
        
        // Ensure we reset isSubmitting state
        if (isMountedRef.current) {
          setIsSubmitting(false);
        }
      }
    } else if (currentSlide === 1) {
      // Company info slide
      if (!employeeCount || !revenueTier) {
        unifiedToast.warning({
          title: "Required Information",
          description: "Please provide your company's employee count and revenue tier before continuing."
        });
        return;
      }
      
      try {
        // Create the company
        const companyData = {
          name: companyName,
          industry,
          employee_count: employeeCount,
          revenue_tier: revenueTier,
          website
        };
        
        // For now, just store locally - we'll submit at the end
        console.log("[ONBOARDING] Company data stored:", companyData);
        
        // Move to the next slide
        if (isMountedRef.current) {
          setCurrentSlide(currentSlide + 1);
        }
      } catch (error) {
        console.error("Error storing company data:", error);
        
        // Show error toast
        unifiedToast.error({
          title: "Company Info Error",
          description: "There was a problem saving your company information. Please try again."
        });
      }
    } else if (currentSlide === 2) {
      // CFO invitation slide
      if (!cfoName || !cfoEmail) {
        unifiedToast.warning({
          title: "Required Information",
          description: "Please provide your CFO's name and email before continuing."
        });
        return;
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cfoEmail)) {
        unifiedToast.warning({
          title: "Invalid Email",
          description: "Please provide a valid email address for your CFO."
        });
        return;
      }
      
      // Move to the next slide
      if (isMountedRef.current) {
        setCurrentSlide(currentSlide + 1);
      }
    } else if (currentSlide === 3) {
      // CISO invitation slide
      if (!cisoName || !cisoEmail) {
        unifiedToast.warning({
          title: "Required Information",
          description: "Please provide your CISO's name and email before continuing."
        });
        return;
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cisoEmail)) {
        unifiedToast.warning({
          title: "Invalid Email",
          description: "Please provide a valid email address for your CISO."
        });
        return;
      }
      
      // Move to the next slide
      if (isMountedRef.current) {
        setCurrentSlide(currentSlide + 1);
      }
    } else if (currentSlide === 5) {
      // Review slide - this is where we process everything
      try {
        setIsSubmitting(true);
        
        // First, create the company
        logger.debug('[WelcomeModal] Creating company', {
          name: companyName,
          industry,
          employeeCount,
          revenueTier
        });
        
        // Create company
        const companyResponse = await createCompanyMutation.mutateAsync({
          name: companyName,
          industry,
          employee_count: employeeCount,
          revenue_tier: revenueTier,
          website
        });
        
        if (!companyResponse || !companyResponse.id) {
          throw new Error('Failed to create company - no ID returned');
        }
        
        const companyId = companyResponse.id;
        logger.info('[WelcomeModal] Company created successfully', { 
          companyId,
          companyName: companyResponse.name
        });
        
        // Now process team invitations
        const invitations = [];
        
        // Add CFO
        if (cfoName && cfoEmail) {
          invitations.push({
            email: cfoEmail,
            full_name: cfoName,
            company_id: companyId,
            company_name: companyName,
            sender_name: currentUserName,
            role: "CFO"
          });
        }
        
        // Add CISO
        if (cisoName && cisoEmail) {
          invitations.push({
            email: cisoEmail,
            full_name: cisoName,
            company_id: companyId,
            company_name: companyName,
            sender_name: currentUserName,
            role: "CISO"
          });
        }
        
        // Add additional team members (if any)
        for (let i = 0; i < additionalNames.length; i++) {
          const name = additionalNames[i];
          const email = additionalEmails[i];
          
          if (name && email) {
            invitations.push({
              email: email,
              full_name: name,
              company_id: companyId,
              company_name: companyName,
              sender_name: currentUserName,
              role: "Team Member"
            });
          }
        }
        
        // Process invitations one at a time to minimize race conditions
        for (const invite of invitations) {
          try {
            logger.debug('[WelcomeModal] Sending invitation', { 
              email: invite.email, 
              role: invite.role 
            });
            
            // Await each invitation to be sent
            await inviteTeamMemberMutation.mutateAsync({
              email: invite.email,
              full_name: invite.full_name,
              company_id: invite.company_id,
              company_name: invite.company_name,
              sender_name: invite.sender_name
            });
            
            logger.debug('[WelcomeModal] Invitation sent successfully', { 
              email: invite.email,
              role: invite.role
            });
          } catch (error) {
            logger.error('[WelcomeModal] Failed to send invitation', { 
              email: invite.email,
              role: invite.role,
              error
            });
            
            // We'll continue with other invitations
            console.error(`Failed to send invitation to ${invite.email}:`, error);
          }
        }
        
        // Show success toast
        unifiedToast.success({
          title: "Setup Complete",
          description: "Your organization has been created and team invitations have been sent."
        });
        
        // Move to the confirmation slide
        if (isMountedRef.current) {
          setCurrentSlide(currentSlide + 1);
          setIsSubmitting(false);
        }
      } catch (error) {
        console.error("Error processing setup:", error);
        logger.error('[WelcomeModal] Error processing setup', { error });
        
        // Show error toast
        unifiedToast.error({
          title: "Setup Error",
          description: "There was a problem completing your setup. Please try again or contact support."
        });
        
        // Reset submitting state
        if (isMountedRef.current) {
          setIsSubmitting(false);
        }
      }
    } else {
      // Standard navigation to next slide
      if (isMountedRef.current) {
        setCurrentSlide(currentSlide + 1);
      }
    }
  }, [
    currentSlide, 
    navigate, 
    employeeCount, 
    revenueTier, 
    companyName, 
    industry, 
    website, 
    cfoName, 
    cfoEmail, 
    cisoName, 
    cisoEmail, 
    additionalNames, 
    additionalEmails,
    currentUserName, 
    createCompanyMutation, 
    inviteTeamMemberMutation,
    unifiedToast
  ]);
  
  const handlePrevious = useCallback(() => {
    if (currentSlide > 0 && isMountedRef.current) {
      setCurrentSlide(currentSlide - 1);
    }
  }, [currentSlide]);
  
  // Note: The processInvitationsList function is implemented later in this file.
  // This earlier version has been removed to prevent duplicate declarations.

  /**
   * Process team member invitations asynchronously
   * Sends invitations for CFO and CISO if both name and email are provided
   * 
   * @returns Promise that resolves when invitations are processed
   */
  const processTeamInvitations = async (companyId: any, companyName: any) => {
    try {
      // Check if component is still mounted before continuing
      if (!isMountedRef.current) {
        logger.debug('[WelcomeModal] Aborting team invitation processing - component unmounted');
        return;
      }
      
      // Prepare invitations
      const invitations = [];
      
      // Add CFO if provided
      if (cfoName && cfoEmail) {
        invitations.push({
          email: cfoEmail,
          full_name: cfoName, 
          company_id: companyId,
          company_name: companyName,
          sender_name: currentUserName,
          role: "CFO" 
        });
      }
      
      // Add CISO if provided
      if (cisoName && cisoEmail) {
        invitations.push({
          email: cisoEmail,
          full_name: cisoName,
          company_id: companyId, 
          company_name: companyName,
          sender_name: currentUserName,
          role: "CISO"
        });
      }
      
      // Add additional team members (if any)
      for (let i = 0; i < additionalNames.length; i++) {
        const name = additionalNames[i];
        const email = additionalEmails[i];
        
        if (name && email) {
          invitations.push({
            email: email,
            full_name: name,
            company_id: companyId,
            company_name: companyName,
            sender_name: currentUserName,
            role: "Team Member"
          });
        }
      }
      
      // Process invitations if we have any
      if (invitations.length > 0) {
        await processInvitationsList(invitations, logger);
        
        // Show success toast
        unifiedToast.success({
          title: "Team Invitations Sent",
          description: `${invitations.length} team member${invitations.length === 1 ? '' : 's'} invited successfully.`
        });
      } else {
        logger.debug('[WelcomeModal] No team invitations to process');
      }
    } catch (error) {
      logger.error('[WelcomeModal] Error processing team invitations', { error });
      console.error('[ONBOARDING DEBUG] Team invitation error:', error);
      
      // Propagate the error to be handled by the caller
      throw error;
    }
  };
  
  /**
   * Helper function to process a list of team invitations
   * 
   * @param invitations - List of invitation objects to process
   * @param logger - Logger instance for consistent logging
   * @returns Promise that resolves to true if invitations were processed
   */
  const processInvitationsList = async (invitations: any[], logger: any): Promise<boolean> => {
    // If no invitations to process, return early
    if (invitations.length === 0) {
      logger.debug('[WelcomeModal] No team invitations to process');
      return false;
    }
    
    // Check again for component mounting
    if (!isMountedRef.current) {
      logger.debug('[WelcomeModal] Aborting invitation processing - component unmounted');
      return false;
    }
    
    logger.info('[WelcomeModal] Processing team invitations', { 
      count: invitations.length,
      emails: invitations.map(inv => inv.email)
    });
    
    // Process all invitations sequentially to prevent race conditions
    try {
      // Track any failed invitations to report them
      interface FailedInvitation {
        email: string;
        role: string;
        error: string;
      }
      
      const failedInvitations: FailedInvitation[] = [];
      
      // Process each invitation sequentially with proper error handling
      for (const invite of invitations) {
        try {
          // Skip if component unmounted during processing
          if (!isMountedRef.current) {
            return false;
          }
          
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
          
          // Skip state updates if component unmounted during API call
          if (!isMountedRef.current) {
            return false;
          }
          
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
        } catch (error) {
          // Skip error processing if component unmounted
          if (!isMountedRef.current) {
            return false;
          }
          
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
        }
      }
      
      // If component unmounted during the for loop, exit early
      if (!isMountedRef.current) {
        logger.debug('[WelcomeModal] Component unmounted during invitation processing');
        return false;
      }
      
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
  
  // Handle adding a new team member input row
  const addTeamMemberField = useCallback(() => {
    if (isMountedRef.current) {
      setAdditionalNames([...additionalNames, '']);
      setAdditionalEmails([...additionalEmails, '']);
    }
  }, [additionalNames, additionalEmails]);
  
  // Handle removing a team member input row
  const removeTeamMemberField = useCallback((index: number) => {
    if (isMountedRef.current) {
      setAdditionalNames(additionalNames.filter((_, i) => i !== index));
      setAdditionalEmails(additionalEmails.filter((_, i) => i !== index));
    }
  }, [additionalNames, additionalEmails]);
  
  // Helper for updating additional member fields
  const updateAdditionalMember = useCallback((index: number, field: 'name' | 'email', value: string) => {
    if (isMountedRef.current) {
      if (field === 'name') {
        const newNames = [...additionalNames];
        newNames[index] = value;
        setAdditionalNames(newNames);
      } else {
        const newEmails = [...additionalEmails];
        newEmails[index] = value;
        setAdditionalEmails(newEmails);
      }
    }
  }, [additionalNames, additionalEmails]);
  
  // Determine if current slide is the last one
  const isLastSlide = currentSlide === slides.length - 1;
  
  // Helper to get readable employee count
  const getReadableEmployeeCount = useCallback((count: number | null) => {
    if (!count) return null;
    
    if (count <= 49) return "Small (1-49)";
    if (count <= 249) return "Medium (50-249)";
    if (count <= 999) return "Large (250-999)";
    return "X Large (1K+)";
  }, []);
  
  // Helper to get readable revenue tier
  const getReadableRevenueTier = useCallback((tier: string) => {
    const mapping: Record<string, string> = {
      'small': '$0-$10M',
      'medium': '$10M-$50M', 
      'large': '$50M-$250M',
      'xlarge': '$250M+'
    };
    
    return mapping[tier] || tier;
  }, []);
  
  // Close the modal if the user clicks outside
  const handleClose = useCallback(() => {
    // Only allow closing the modal if we're not submitting
    if (!isSubmitting && isMountedRef.current) {
      setShowModal(false);
      
      // Save that the user has seen the welcome modal
      localStorage.setItem('hasSeenWelcome', 'true');
      
      // Navigate to the dashboard
      setLocation('/dashboard');
    }
  }, [isSubmitting, navigate]);
  
  // If modal is not showing, don't render anything
  if (!showModal) return null;
  
  return (
    <Dialog open={showModal} onOpenChange={handleClose}>
      <CustomDialogContent className="p-0 max-h-[85vh] overflow-hidden flex flex-col">
        <div className="grid grid-cols-1 md:grid-cols-2 h-full overflow-hidden">
          {/* Content Column (Left) */}
          <div className="p-6 md:p-8 overflow-y-auto">
            <div className="flex flex-col h-full">
              <div className="mb-6">
                <motion.div
                  key={`title-${currentSlide}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-2"
                >
                  <h2 className="text-2xl font-bold">{slides[currentSlide].title}</h2>
                  <p className="text-muted-foreground">{slides[currentSlide].description}</p>
                </motion.div>
              </div>
              
              <div className="flex-grow">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`slide-${currentSlide}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="h-full"
                  >
                    {/* Slide 1: Welcome */}
                    {currentSlide === 0 && (
                      <div className="space-y-4">
                        <p>
                          Welcome to the Invela Trust Network! We're excited to have you join our platform.
                        </p>
                        <p>
                          In the next few steps, we'll help you set up your company profile and invite key team members
                          who will need to complete important verification tasks.
                        </p>
                        <p className="font-medium">
                          Click "Next" to begin setting up your account.
                        </p>
                      </div>
                    )}
                    
                    {/* Slide 2: Company Information */}
                    {currentSlide === 1 && (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="company-name">Company Name</Label>
                          <Input 
                            id="company-name" 
                            placeholder="Enter your company name" 
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="industry">Industry</Label>
                          <Input 
                            id="industry" 
                            placeholder="e.g. Financial Services, Healthcare" 
                            value={industry}
                            onChange={(e) => setIndustry(e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="website">Company Website</Label>
                          <Input 
                            id="website" 
                            placeholder="https://www.example.com" 
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Employee Count</Label>
                          <RadioGroup
                            value={employeeCount ? getReadableEmployeeCount(employeeCount) || '' : ''}
                            onValueChange={(value) => {
                              const mapping: Record<string, number> = {
                                "Small (1-49)": 25,
                                "Medium (50-249)": 150,
                                "Large (250-999)": 625,
                                "X Large (1K+)": 5000
                              };
                              setEmployeeCount(mapping[value] || null);
                            }}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                          >
                            <div>
                              <RadioGroupItem value="Small (1-49)" id="emp-small" className="peer sr-only" />
                              <Label
                                htmlFor="emp-small"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                              >
                                <span>Small (1-49)</span>
                              </Label>
                            </div>
                            
                            <div>
                              <RadioGroupItem value="Medium (50-249)" id="emp-medium" className="peer sr-only" />
                              <Label
                                htmlFor="emp-medium"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                              >
                                <span>Medium (50-249)</span>
                              </Label>
                            </div>
                            
                            <div>
                              <RadioGroupItem value="Large (250-999)" id="emp-large" className="peer sr-only" />
                              <Label
                                htmlFor="emp-large"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                              >
                                <span>Large (250-999)</span>
                              </Label>
                            </div>
                            
                            <div>
                              <RadioGroupItem value="X Large (1K+)" id="emp-xlarge" className="peer sr-only" />
                              <Label
                                htmlFor="emp-xlarge"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                              >
                                <span>X Large (1K+)</span>
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Annual Revenue</Label>
                          <RadioGroup
                            value={revenueTier ? getReadableRevenueTier(revenueTier) : ''}
                            onValueChange={(value) => {
                              const mapping: Record<string, string> = {
                                "$0-$10M": "small",
                                "$10M-$50M": "medium",
                                "$50M-$250M": "large",
                                "$250M+": "xlarge"
                              };
                              setRevenueTier(mapping[value] || "");
                            }}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                          >
                            <div>
                              <RadioGroupItem value="$0-$10M" id="rev-small" className="peer sr-only" />
                              <Label
                                htmlFor="rev-small"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                              >
                                <span>$0-$10M</span>
                              </Label>
                            </div>
                            
                            <div>
                              <RadioGroupItem value="$10M-$50M" id="rev-medium" className="peer sr-only" />
                              <Label
                                htmlFor="rev-medium"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                              >
                                <span>$10M-$50M</span>
                              </Label>
                            </div>
                            
                            <div>
                              <RadioGroupItem value="$50M-$250M" id="rev-large" className="peer sr-only" />
                              <Label
                                htmlFor="rev-large"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                              >
                                <span>$50M-$250M</span>
                              </Label>
                            </div>
                            
                            <div>
                              <RadioGroupItem value="$250M+" id="rev-xlarge" className="peer sr-only" />
                              <Label
                                htmlFor="rev-xlarge"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                              >
                                <span>$250M+</span>
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>
                    )}
                    
                    {/* Slide 3: CFO Invitation */}
                    {currentSlide === 2 && (
                      <div className="space-y-6">
                        <div className="p-4 bg-blue-50 rounded-md border border-blue-200 mb-4">
                          <p className="text-sm text-blue-700">
                            <InfoCircledIcon className="inline-block mr-1 h-4 w-4" />
                            Your CFO will need to complete the KYB Form which is a crucial part of the verification process.
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="cfo-name">CFO Full Name</Label>
                          <Input 
                            id="cfo-name" 
                            placeholder="John Smith" 
                            value={cfoName}
                            onChange={(e) => setCfoName(e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="cfo-email">CFO Email</Label>
                          <Input 
                            id="cfo-email" 
                            type="email"
                            placeholder="john.smith@example.com" 
                            value={cfoEmail}
                            onChange={(e) => setCfoEmail(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Slide 4: CISO Invitation */}
                    {currentSlide === 3 && (
                      <div className="space-y-6">
                        <div className="p-4 bg-blue-50 rounded-md border border-blue-200 mb-4">
                          <p className="text-sm text-blue-700">
                            <InfoCircledIcon className="inline-block mr-1 h-4 w-4" />
                            Your CISO will need to complete the Security Assessment which helps us evaluate your security controls and posture.
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="ciso-name">CISO Full Name</Label>
                          <Input 
                            id="ciso-name" 
                            placeholder="Jane Doe" 
                            value={cisoName}
                            onChange={(e) => setCisoName(e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="ciso-email">CISO Email</Label>
                          <Input 
                            id="ciso-email" 
                            type="email"
                            placeholder="jane.doe@example.com" 
                            value={cisoEmail}
                            onChange={(e) => setCisoEmail(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Slide 5: Additional Team Members */}
                    {currentSlide === 4 && (
                      <div className="space-y-6">
                        <p className="text-sm text-muted-foreground">
                          Add any additional team members who should have access to your company's profile. This is optional and you can add more people later.
                        </p>
                        
                        <div className="space-y-4">
                          {additionalNames.map((name, index) => (
                            <div key={`member-${index}`} className="flex items-start gap-2">
                              <div className="space-y-2 flex-1">
                                <Input 
                                  placeholder="Full Name" 
                                  value={name}
                                  onChange={(e) => updateAdditionalMember(index, 'name', e.target.value)}
                                  className="mb-2"
                                />
                                <Input 
                                  placeholder="Email" 
                                  type="email"
                                  value={additionalEmails[index] || ''}
                                  onChange={(e) => updateAdditionalMember(index, 'email', e.target.value)}
                                />
                              </div>
                              
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeTeamMemberField(index)}
                                disabled={additionalNames.length === 1 && index === 0}
                              >
                                <X className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addTeamMemberField}
                          className="mt-2"
                        >
                          <PlusIcon className="h-4 w-4 mr-2" />
                          Add Team Member
                        </Button>
                      </div>
                    )}
                    
                    {/* Slide 6: Review Information */}
                    {currentSlide === 5 && (
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Company Information</h3>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <div className="text-sm font-medium">Company Name:</div>
                            <div className="text-sm">{companyName || '-'}</div>
                            
                            <div className="text-sm font-medium">Industry:</div>
                            <div className="text-sm">{industry || '-'}</div>
                            
                            <div className="text-sm font-medium">Website:</div>
                            <div className="text-sm">{website || '-'}</div>
                            
                            <div className="text-sm font-medium">Employees:</div>
                            <div className="text-sm">{employeeCount ? getReadableEmployeeCount(employeeCount) : '-'}</div>
                            
                            <div className="text-sm font-medium">Annual Revenue:</div>
                            <div className="text-sm">{revenueTier ? getReadableRevenueTier(revenueTier) : '-'}</div>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Team Members</h3>
                          <div className="space-y-2">
                            {/* CFO */}
                            {cfoName && cfoEmail && (
                              <div className="p-3 bg-slate-50 rounded-md">
                                <div className="flex items-center gap-2">
                                  <div className="px-2 py-1 bg-slate-200 text-slate-700 text-xs font-medium rounded">
                                    CFO
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium">{cfoName}</div>
                                    <div className="text-sm text-muted-foreground">{cfoEmail}</div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* CISO */}
                            {cisoName && cisoEmail && (
                              <div className="p-3 bg-slate-50 rounded-md">
                                <div className="flex items-center gap-2">
                                  <div className="px-2 py-1 bg-slate-200 text-slate-700 text-xs font-medium rounded">
                                    CISO
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium">{cisoName}</div>
                                    <div className="text-sm text-muted-foreground">{cisoEmail}</div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Additional Team Members */}
                            {additionalNames.map((name, index) => (
                              name && additionalEmails[index] ? (
                                <div key={`review-member-${index}`} className="p-3 bg-slate-50 rounded-md">
                                  <div className="flex items-center gap-2">
                                    <div className="px-2 py-1 bg-slate-200 text-slate-700 text-xs font-medium rounded">
                                      Team
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-medium">{name}</div>
                                      <div className="text-sm text-muted-foreground">{additionalEmails[index]}</div>
                                    </div>
                                  </div>
                                </div>
                              ) : null
                            ))}
                            
                            {/* If no team members added */}
                            {!cfoName && !cisoName && additionalNames.every((name, i) => !name || !additionalEmails[i]) && (
                              <div className="p-3 bg-slate-50 rounded-md text-muted-foreground text-sm">
                                No team members added
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
                          <p className="text-sm text-blue-700">
                            <InfoCircledIcon className="inline-block mr-1 h-4 w-4" />
                            Please review your information before proceeding. You'll be able to make changes after setup.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Slide 7: Completion */}
                    {currentSlide === 6 && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="h-5 w-5" />
                          <h3 className="font-medium">Your account is ready!</h3>
                        </div>
                        
                        <p>
                          Your company has been created and team invitations have been sent. Here's what happens next:
                        </p>
                        
                        <div className="space-y-4">
                          <div className="p-3 bg-slate-50 rounded-md">
                            <h4 className="font-medium">1. Complete the Accreditation Process</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              Navigate to the Tasks tab and complete your accreditation to gain full platform access.
                            </p>
                          </div>
                          
                          <div className="p-3 bg-slate-50 rounded-md">
                            <h4 className="font-medium">2. Start the KYB Form</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              You or your CFO should complete the Know Your Business form to verify your company details.
                            </p>
                          </div>
                          
                          <div className="p-3 bg-slate-50 rounded-md">
                            <h4 className="font-medium">3. Complete the Security Assessment</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              Your CISO should complete the security assessment to evaluate your company's security controls.
                            </p>
                          </div>
                        </div>
                        
                        <p className="font-medium text-center mt-6">
                          Click "Start" to begin using the Invela Trust Network!
                        </p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
              
              <motion.div
                className="mt-8 flex items-center justify-between"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentSlide === 0 || isSubmitting}
                >
                  Back
                </Button>
                
                <Button
                  type="button"
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
          
          {/* Image Column (Right) */}
          <div className="hidden md:block bg-gray-50 relative">
            <motion.div
              key={`image-${currentSlide}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: imageOpacity }}
              transition={{ duration: 0.5 }}
              className="h-full"
            >
              {imagesLoaded[currentSlide] && (
                <img
                  src={slides[currentSlide].image}
                  alt={slides[currentSlide].title}
                  className="object-cover object-center w-full h-full"
                />
              )}
            </motion.div>
          </div>
        </div>
      </CustomDialogContent>
    </Dialog>
  );
}