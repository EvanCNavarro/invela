import React, { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogTitle, DialogContent, DialogContentWithoutCloseButton } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Check, CheckCircle, ChevronRight, ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";

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

// Create a memoized stable component for the company info step to prevent blinking
const StableMotionDiv = React.memo(({ companyInfo, companyInfoErrors, handleCompanyInfoChange, formRefs }: {
  companyInfo: CompanyInfo;
  companyInfoErrors: Record<string, string>;
  handleCompanyInfoChange: (field: keyof CompanyInfo, value: string) => void;
  formRefs: any; // Using any type to avoid TypeScript errors
}) => {
  return (
    <motion.div
      key="step-1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <div className="flex flex-col items-center text-center">
        <h2 className="text-2xl font-semibold mb-2">Company Information</h2>
        
        <div className="relative w-64 h-48 mt-4 mb-6">
          <img
            src="/assets/welcome_2.png"
            alt="Company Information"
            className="w-full h-full object-contain"
          />
        </div>
        
        <div className="mt-4 space-y-4 w-full text-left">
          <p className="text-gray-700 mb-4">
            Help us understand your company's profile to better customize your experience.
          </p>
          
          <div>
            <Label htmlFor="company-size">Company Size</Label>
            <div className="relative">
              <Select 
                value={companyInfo.size} 
                onValueChange={(value) => handleCompanyInfoChange('size', value)}
              >
                <SelectTrigger 
                  id="company-size"
                  className={cn(
                    "w-full transition-colors",
                    companyInfoErrors.size ? "border-red-500" : "",
                    companyInfo.size ? "border-green-500" : ""
                  )}
                  ref={formRefs.companySize}
                >
                  <SelectValue placeholder="Select company size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1-10 employees</SelectItem>
                  <SelectItem value="11-50">11-50 employees</SelectItem>
                  <SelectItem value="51-200">51-200 employees</SelectItem>
                  <SelectItem value="201-500">201-500 employees</SelectItem>
                  <SelectItem value="501+">501+ employees</SelectItem>
                </SelectContent>
              </Select>
              {companyInfo.size && (
                <div className="absolute right-8 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
              )}
            </div>
            {companyInfoErrors.size && (
              <p className="text-sm text-red-500 mt-1">{companyInfoErrors.size}</p>
            )}
          </div>
          
          <div className="mt-4">
            <Label htmlFor="revenue-tier">Annual Revenue</Label>
            <div className="relative">
              <Select 
                value={companyInfo.revenue} 
                onValueChange={(value) => handleCompanyInfoChange('revenue', value)}
              >
                <SelectTrigger 
                  id="revenue-tier"
                  className={cn(
                    "w-full transition-colors",
                    companyInfoErrors.revenue ? "border-red-500" : "",
                    companyInfo.revenue ? "border-green-500" : ""
                  )}
                  ref={formRefs.companyRevenue}
                >
                  <SelectValue placeholder="Select revenue range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Under $1M">Under $1M</SelectItem>
                  <SelectItem value="$1M - $10M">$1M - $10M</SelectItem>
                  <SelectItem value="$10M - $50M">$10M - $50M</SelectItem>
                  <SelectItem value="$50M - $100M">$50M - $100M</SelectItem>
                  <SelectItem value="$100M+">$100M+</SelectItem>
                </SelectContent>
              </Select>
              {companyInfo.revenue && (
                <div className="absolute right-8 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
              )}
            </div>
            {companyInfoErrors.revenue && (
              <p className="text-sm text-red-500 mt-1">{companyInfoErrors.revenue}</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// Validation schemas
const companyInfoSchema = z.object({
  size: z.string().min(1, "Please select a company size"),
  revenue: z.string().min(1, "Please select a revenue range")
});

const emailSchema = z.string().email("Please enter a valid email address");

/**
 * Image container for step layouts
 */
const RightImageContainer = ({ children }) => (
  <div className="hidden md:flex md:w-[40%] bg-primary-50 items-center justify-center">
    <div className="relative h-[280px] w-[280px]">
      {children}
    </div>
  </div>
);

/**
 * Step image component that shows loading state until image is loaded
 */
const StepImage = ({ src, alt, isLoaded }) => {
  if (!isLoaded) {
    return <div className="animate-pulse bg-gray-200 h-full w-full rounded-lg" />;
  }
  
  return (
    <img 
      src={src} 
      alt={alt} 
      className="h-full w-full object-contain"
    />
  );
};

/**
 * Consistent check item component for onboarding steps
 */
const CheckListItem = ({ children }) => (
  <div className="flex items-start gap-3">
    <div className="bg-primary-50 p-2 rounded-full shrink-0 mt-0.5">
      <Check className="h-4 w-4 text-primary" />
    </div>
    <p className="text-gray-700">{children}</p>
  </div>
);

/**
 * Form input with validation feedback
 */
const FormInput = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  isValid = true, 
  error = "", 
  autoFocus = false,
  inputRef = null
}) => (
  <div className="space-y-1 mb-4">
    <Label htmlFor={label.toLowerCase().replace(/\s/g, '-')}>{label}</Label>
    <div className="relative">
      <Input
        id={label.toLowerCase().replace(/\s/g, '-')}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(
          "transition-colors",
          !isValid && value 
            ? "border-red-500 focus-visible:ring-red-500" 
            : isValid && value 
              ? "border-green-500 focus-visible:ring-green-500" 
              : ""
        )}
        autoFocus={autoFocus}
        ref={inputRef}
      />
      {value && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          {isValid ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
        </div>
      )}
    </div>
    {!isValid && error && (
      <p className="text-sm text-red-500">{error}</p>
    )}
  </div>
);

export function NewOnboardingModal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 7;
  
  // Step-specific state
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({ size: '', revenue: '' });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [companyInfoErrors, setCompanyInfoErrors] = useState({ size: '', revenue: '' });
  const [teamMemberErrors, setTeamMemberErrors] = useState<Record<number, { fullName: string, email: string }>>({});
  
  // Image preloading state
  const [imagesLoaded, setImagesLoaded] = useState<Record<string, boolean>>({});
  
  // Form refs to manage focus
  const formRefs = {
    companySize: useRef<HTMLButtonElement>(null),
    companyRevenue: useRef<HTMLButtonElement>(null),
    teamMembers: [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]
  };

  // Prevent auto-focus on dialog opening
  const handleDialogOpenAutoFocus = useCallback((e: Event) => {
    e.preventDefault();
  }, []);

  // Load company data from API
  const { data: company } = useQuery({ 
    queryKey: ['/api/companies/current'], 
    enabled: open,
    refetchInterval: false
  });

  // Update company mutation
  const updateCompanyMutation = useMutation({
    mutationFn: async (updatedCompanyData) => {
      return await fetch('/api/companies/current', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCompanyData),
      }).then(res => {
        if (!res.ok) throw new Error('Failed to update company');
        return res.json();
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
      
      // No need for WebSocket broadcast, just update user onboarding status
      updateUserOnboardingStatus();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update company information",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Update user onboarding status
  const updateUserMutation = useMutation({
    mutationFn: async () => {
      // Update user's onboarding_user_completed status
      return await fetch('/api/users/current', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          onboarding_user_completed: true 
        }),
      }).then(res => {
        if (!res.ok) throw new Error('Failed to update user onboarding status');
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/current'] });
      
      // Now update the onboarding task status
      updateOnboardingTaskStatus();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update onboarding status",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Update the onboarding task status
  const updateTaskMutation = useMutation({
    mutationFn: async () => {
      // Find and update the onboarding task
      const tasks = await fetch('/api/tasks').then(res => res.json());
      const onboardingTask = tasks.find(task => 
        task.task_type === 'user_onboarding' && 
        task.user_email === user?.email
      );
      
      if (!onboardingTask) {
        throw new Error('Could not find onboarding task');
      }
      
      // Update the task status
      return await fetch(`/api/tasks/${onboardingTask.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          progress: 100
        }),
      }).then(res => {
        if (!res.ok) throw new Error('Failed to update task status');
        return res.json();
      });
    },
    onSuccess: () => {
      // Invalidate tasks query
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      
      // Complete onboarding
      completeOnboarding();
    },
    onError: (error: Error) => {
      // Still complete onboarding even if task update fails
      completeOnboarding();
      
      // Just log the error
      console.error('Failed to update task status:', error);
    }
  });
  
  // Update onboarding task status
  const updateOnboardingTaskStatus = () => {
    updateTaskMutation.mutate();
  };
  
  // Update user onboarding status and complete the process
  const updateUserOnboardingStatus = () => {
    updateUserMutation.mutate();
  };

  // Preload images for steps
  useEffect(() => {
    const imagePaths = [
      '/assets/welcome_1.png',
      '/assets/welcome_2.png',
      '/assets/welcome_3.png',
      '/assets/welcome_4.png'
    ];
    
    imagePaths.forEach(path => {
      const img = new Image();
      img.onload = () => {
        setImagesLoaded(prev => ({ ...prev, [path]: true }));
      };
      img.src = path;
    });
  }, []);

  // Show modal if user exists and onboarding isn't completed
  useEffect(() => {
    if (user && !user.onboarding_user_completed) {
      setOpen(true);
    }
  }, [user]);

  // Complete the onboarding process
  const completeOnboarding = () => {
    setOpen(false);
    toast({
      title: "Onboarding completed!",
      description: "Your account is now ready to use.",
    });
  };

  // Validate current step and move to next if valid
  const handleNextStep = () => {
    let isValid = true;
    
    // Validate based on current step
    if (currentStep === 1) {
      try {
        companyInfoSchema.parse(companyInfo);
        setCompanyInfoErrors({ size: '', revenue: '' });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errors = error.flatten().fieldErrors;
          setCompanyInfoErrors({
            size: errors.size?.[0] || '',
            revenue: errors.revenue?.[0] || ''
          });
          isValid = false;
        }
      }
    } else if (currentStep === 4) {
      // Validate team members
      const newErrors = {};
      
      teamMembers.forEach((member, index) => {
        let nameError = '';
        let emailError = '';
        
        if (!member.fullName) {
          nameError = "Name is required";
          isValid = false;
        }
        
        if (member.email) {
          try {
            emailSchema.parse(member.email);
          } catch (error) {
            emailError = "Please enter a valid email address";
            isValid = false;
          }
        }
        
        if (nameError || emailError) {
          newErrors[index] = { fullName: nameError, email: emailError };
        }
      });
      
      setTeamMemberErrors(newErrors);
    }
    
    if (isValid) {
      if (currentStep < totalSteps - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        // Final step - submit data
        const updatedCompanyData = {
          ...company,
          size: companyInfo.size,
          revenue_tier: companyInfo.revenue,
          onboardingCompleted: true
        };
        
        updateCompanyMutation.mutate(updatedCompanyData);
      }
    }
  };

  // Go back to previous step
  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Update company info fields with validation - using useCallback to memoize the function
  const handleCompanyInfoChange = useCallback((field: keyof CompanyInfo, value: string) => {
    // Use functional updates to ensure we're working with the latest state
    setCompanyInfo(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    setCompanyInfoErrors(prev => {
      if (prev[field]) {
        return { ...prev, [field]: '' };
      }
      return prev;
    });
  }, []);

  // Update team member fields with validation
  const handleTeamMemberChange = useCallback((index: number, field: keyof TeamMember, value: string) => {
    // Use functional updates to ensure we're working with the latest state
    setTeamMembers(prevMembers => {
      const updated = [...prevMembers];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    
    // Clear validation error for this field if it exists
    setTeamMemberErrors(prevErrors => {
      if (prevErrors[index] && prevErrors[index][field]) {
        const updatedErrors = { ...prevErrors };
        updatedErrors[index] = { ...updatedErrors[index], [field]: '' };
        return updatedErrors;
      }
      return prevErrors;
    });
  }, []);

  // Add a team member
  const handleAddTeamMember = (role: 'CFO' | 'CISO', formType: string, roleDescription: string) => {
    setTeamMembers([
      ...teamMembers,
      { role, fullName: '', email: '', formType, roleDescription }
    ]);
  };

  // Remove a team member
  const handleRemoveTeamMember = (index: number) => {
    const updated = [...teamMembers];
    updated.splice(index, 1);
    setTeamMembers(updated);
    
    // Remove any errors for this index
    if (teamMemberErrors[index]) {
      const updatedErrors = { ...teamMemberErrors };
      delete updatedErrors[index];
      setTeamMemberErrors(updatedErrors);
    }
  };

  // Step layout component with animations
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
          <motion.h2 
            className="text-3xl font-bold text-gray-900 mb-2"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            {title}
          </motion.h2>
          <motion.div 
            className="flex-grow overflow-y-auto content-area"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            {children}
          </motion.div>
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
    return (
      <AnimatePresence mode="wait">
        {currentStep === 0 && (
          <motion.div
            key="step-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <StepLayout
              title="Welcome to the Invela Trust Network"
              imageSrc="/assets/welcome_1.png"
              imageAlt="Welcome to Invela"
            >
              <div className="mt-4 space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <CheckListItem>
                    Your premier partner for secure and efficient accreditation
                  </CheckListItem>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                >
                  <CheckListItem>
                    Enterprise-grade risk assessment and management platform
                  </CheckListItem>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                >
                  <CheckListItem>
                    Streamlined compliance processes with advanced automation
                  </CheckListItem>
                </motion.div>
              </div>
            </StepLayout>
          </motion.div>
        )}
        
        {currentStep === 1 && (
          <StableMotionDiv
            companyInfo={companyInfo}
            companyInfoErrors={companyInfoErrors}
            handleCompanyInfoChange={handleCompanyInfoChange}
            formRefs={formRefs}
          />
        )}
      
        
        {currentStep === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <StepLayout
              title="Your Tasks"
              imageSrc="/assets/welcome_3.png"
              imageAlt="Task Management"
            >
              <div className="mt-4 space-y-4">
                <p className="text-gray-700">
                  Your custom task list is ready. Here's how it works:
                </p>
                
                <div className="space-y-6 mt-4">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    <CheckListItem>
                      Complete KYB (Know Your Business) forms to verify your company
                    </CheckListItem>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                  >
                    <CheckListItem>
                      Fill out KY3P (Third-Party Risk) assessments for better risk insights
                    </CheckListItem>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                  >
                    <CheckListItem>
                      Track progress with automatic status updates and notifications
                    </CheckListItem>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 }}
                  >
                    <CheckListItem>
                      Collaborate with team members to complete compliance requirements
                    </CheckListItem>
                  </motion.div>
                </div>
              </div>
            </StepLayout>
          </motion.div>
        )}
        
        {currentStep === 3 && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <StepLayout
              title="Document Management"
              imageSrc="/assets/welcome_4.png"
              imageAlt="Document Management"
            >
              <div className="mt-4 space-y-4">
                <p className="text-gray-700">
                  Securely manage all your compliance documents in one place:
                </p>
                
                <div className="space-y-6 mt-4">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    <CheckListItem>
                      Upload documents directly to specific tasks
                    </CheckListItem>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                  >
                    <CheckListItem>
                      Access your file vault for centralized document management
                    </CheckListItem>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                  >
                    <CheckListItem>
                      Secure encryption for all uploaded files
                    </CheckListItem>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 }}
                  >
                    <CheckListItem>
                      Automatic document categorization and organization
                    </CheckListItem>
                  </motion.div>
                </div>
              </div>
            </StepLayout>
          </motion.div>
        )}
        
        {currentStep === 4 && (
          <motion.div
            key="step-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <StepLayout
              title="Invite Team Members"
              imageSrc="/assets/welcome_2.png"
              imageAlt="Team Collaboration"
            >
              <div className="mt-2 space-y-4">
                <p className="text-gray-700 mb-4">
                  Invite key stakeholders to collaborate on compliance tasks.
                </p>
                
                <div className="space-y-4">
                  {teamMembers.map((member, index) => (
                    <Card key={index} className="p-4 relative">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => handleRemoveTeamMember(index)}
                      >
                        ×
                      </Button>
                      
                      <div className="font-medium mb-2">{member.roleDescription}</div>
                      
                      <div className="space-y-3">
                        <FormInput
                          label="Full Name"
                          value={member.fullName}
                          onChange={(e) => handleTeamMemberChange(index, 'fullName', e.target.value)}
                          placeholder="Enter full name"
                          isValid={!teamMemberErrors[index]?.fullName}
                          error={teamMemberErrors[index]?.fullName || ''}
                          autoFocus={index === teamMembers.length - 1}
                          inputRef={formRefs.teamMembers[index % 2]}
                        />
                        
                        <FormInput
                          label="Email Address"
                          value={member.email}
                          onChange={(e) => handleTeamMemberChange(index, 'email', e.target.value)}
                          placeholder="Enter email address"
                          isValid={!teamMemberErrors[index]?.email}
                          error={teamMemberErrors[index]?.email || ''}
                        />
                      </div>
                    </Card>
                  ))}
                  
                  {teamMembers.length === 0 && (
                    <p className="text-gray-500 text-center italic my-4">
                      No team members added yet.
                    </p>
                  )}
                  
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => handleAddTeamMember('CFO', 'kyb', 'Chief Financial Officer')}
                      className="flex-1"
                    >
                      <span className="flex items-center">
                        Add CFO <Plus className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => handleAddTeamMember('CISO', 'ky3p', 'Chief Information Security Officer')}
                      className="flex-1"
                    >
                      <span className="flex items-center">
                        Add CISO <Plus className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </div>
                </div>
              </div>
            </StepLayout>
          </motion.div>
        )}
        
        {currentStep === 5 && (
          <motion.div
            key="step-5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <StepLayout
              title="Review Information"
              imageSrc="/assets/welcome_3.png"
              imageAlt="Review Information"
            >
              <div className="mt-4 space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Company Details</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-sm text-gray-500">Company Name</p>
                        <p className="font-medium">{company?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Size</p>
                        <p className="font-medium">{companyInfo.size || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Industry</p>
                        <p className="font-medium">{company?.category || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Revenue</p>
                        <p className="font-medium">{companyInfo.revenue || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Team Members ({teamMembers.length})</h3>
                  {teamMembers.length > 0 ? (
                    <div className="space-y-2">
                      {teamMembers.map((member, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex justify-between">
                            <div>
                              <p className="font-medium">{member.fullName || 'Unnamed'}</p>
                              <p className="text-sm text-gray-500">{member.roleDescription}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-500">Email</p>
                              <p className="text-sm">{member.email || 'No email provided'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No team members added</p>
                  )}
                </div>
              </div>
            </StepLayout>
          </motion.div>
        )}
        
        {currentStep === 6 && (
          <motion.div
            key="step-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <StepLayout
              title="Ready to Begin"
              imageSrc="/assets/welcome_4.png"
              imageAlt="Ready to Begin"
            >
              <div className="mt-4 space-y-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="bg-green-50 border border-green-100 rounded-lg p-6 flex flex-col items-center justify-center text-center"
                >
                  <div className="bg-green-100 rounded-full p-3 mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Your account is ready!
                  </h3>
                  <p className="text-gray-700 mb-4">
                    You've completed the onboarding process and your account is now set up.
                  </p>
                  <p className="text-gray-600">
                    Click "Complete" to start using the Invela Trust Network.
                  </p>
                </motion.div>
              </div>
            </StepLayout>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContentWithoutCloseButton
        className="max-w-3xl p-0 overflow-hidden"
        onOpenAutoFocus={handleDialogOpenAutoFocus}
        aria-describedby="onboarding-description"
      >
        <DialogTitle className="sr-only">Complete your onboarding</DialogTitle>
        
        <div>
          {/* Main Content Area */}
          <div className="h-[400px]">
            {renderStepContent()}
          </div>
          
          {/* Step Indicators and Navigation Controls */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                {currentStep > 0 && (
                  <Button
                    variant="ghost"
                    onClick={handlePreviousStep}
                    className="flex items-center text-gray-600"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                )}
              </div>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-2 w-2 rounded-full transition-all",
                      i === currentStep
                        ? "bg-primary w-4"
                        : i < currentStep
                          ? "bg-primary opacity-70"
                          : "bg-gray-300"
                    )}
                  />
                ))}
              </div>
              
              <div>
                <Button
                  onClick={handleNextStep}
                  disabled={updateCompanyMutation.isPending}
                  className="flex items-center"
                >
                  {currentStep === totalSteps - 1 ? (
                    updateCompanyMutation.isPending ? "Completing..." : "Complete"
                  ) : (
                    <>
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContentWithoutCloseButton>
    </Dialog>
  );
}

// Missing component definition
const Plus = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);