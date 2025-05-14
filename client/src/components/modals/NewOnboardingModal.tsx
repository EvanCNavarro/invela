import { useState, useEffect, useCallback, useRef, memo } from "react";
import { Dialog, DialogTitle, DialogContent, DialogContentWithoutCloseButton } from "@/components/ui/dialog";
import { MemoizedDialog } from "@/components/ui/memoized-dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { MemoizedSelect } from "@/components/ui/memoized-select";
import { logger } from "@/lib/logger";
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

/**
 * Image container for step layouts
 */
const ImageContainer = memo(({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex-shrink-0 flex items-center justify-center mb-6 w-full h-60">
      {children}
    </div>
  );
});

/**
 * Step image component that shows loading state until image is loaded
 */
const StepImage = ({ src, alt, isLoaded = true }: { src: string; alt: string; isLoaded?: boolean }) => {
  const [loaded, setLoaded] = useState(isLoaded);
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {!loaded && (
        <div className="w-full h-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
          <span className="text-gray-500">Loading...</span>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          "max-w-full max-h-full object-contain rounded-lg transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};

/**
 * Consistent check item component for onboarding steps
 */
const CheckListItem = memo(({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-1 flex-shrink-0 bg-green-100 rounded-full p-0.5">
        <Check className="h-3.5 w-3.5 text-green-600" />
      </div>
      <span className="text-gray-700">{children}</span>
    </div>
  );
});

/**
 * Form input with validation feedback
 */
const FormInput = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  error,
  required = false
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void; 
  placeholder: string;
  error?: string;
  required?: boolean;
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={label.toLowerCase().replace(/\s+/g, '-')}>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Input
        id={label.toLowerCase().replace(/\s+/g, '-')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={error ? "border-red-500" : ""}
      />
      {error && (
        <div className="flex items-center text-red-500 text-sm mt-1">
          <AlertCircle className="h-3.5 w-3.5 mr-1" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

/**
 * Main onboarding modal component
 */
export function NewOnboardingModal() {
  // User authentication context
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Modal state
  const [open, setOpen] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({ size: '', revenue: '' });
  const [companyErrors, setCompanyErrors] = useState<Partial<Record<keyof CompanyInfo, string>>>({});
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamMemberErrors, setTeamMemberErrors] = useState<Record<number, Partial<Record<keyof TeamMember, string>>>>({});
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form references
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const companyInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  
  // Total number of steps in the onboarding process
  const totalSteps = 7;
  
  // Get company info
  const { data: company } = useQuery({
    queryKey: ['/api/companies/current'],
    onSuccess: (data) => {
      // Initialize loaded state after fetching company
      setLoaded(true);
      logger.component.debug("Company data loaded", data);
    },
    onError: (error) => {
      logger.component.error("Error loading company data", error);
    }
  });
  
  // Check onboarding completion status
  useEffect(() => {
    if (company?.onboardingCompleted) {
      // If onboarding is completed, close the modal
      setOpen(false);
    }
  }, [company]);
  
  // Mutation for completing onboarding
  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      // Simulate API call - we'll replace with actual backend call
      const response = await fetch('/api/companies/complete-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyInfo,
          teamMembers
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to complete onboarding');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh company data
      queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      
      // Close modal
      setOpen(false);
      
      // Show success toast
      toast({
        title: "Onboarding completed",
        description: "Your account is now ready to use",
        variant: "success"
      });
    },
    onError: (error) => {
      // Show error toast
      toast({
        title: "Error completing onboarding",
        description: error.message || "Please try again",
        variant: "destructive"
      });
      setSubmitting(false);
    }
  });
  
  // Get user onboarding task if it exists
  const { data: tasks } = useQuery({
    queryKey: ['/api/tasks'],
    onSuccess: (tasks) => {
      logger.component.debug("Tasks loaded", tasks);
      // Find user onboarding task
      const onboardingTask = tasks.find(task => task.task_type === 'user_onboarding');
      if (onboardingTask) {
        logger.component.debug("Found onboarding task", onboardingTask);
      }
    }
  });
  
  // Reset onboarding state if modal is closed
  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    
    // Only reset if closing and not submitted
    if (!isOpen && !submitting) {
      setCurrentStep(0);
    }
  }, [submitting]);
  
  // Validate form fields for a specific step
  const validateStep = useCallback((step: number): boolean => {
    switch (step) {
      case 1: // Company Information
        const companyErrors: Partial<Record<keyof CompanyInfo, string>> = {};
        
        if (!companyInfo.size) {
          companyErrors.size = 'Please select your company size';
        }
        
        if (!companyInfo.revenue) {
          companyErrors.revenue = 'Please select your revenue tier';
        }
        
        setCompanyErrors(companyErrors);
        return Object.keys(companyErrors).length === 0;
        
      case 4: // Team Members
        const teamErrors: Record<number, Partial<Record<keyof TeamMember, string>>> = {};
        let isValid = true;
        
        teamMembers.forEach((member, index) => {
          const errors: Partial<Record<keyof TeamMember, string>> = {};
          
          if (!member.fullName) {
            errors.fullName = 'Full name is required';
            isValid = false;
          }
          
          if (!member.email) {
            errors.email = 'Email is required';
            isValid = false;
          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) {
            errors.email = 'Please enter a valid email';
            isValid = false;
          }
          
          if (Object.keys(errors).length > 0) {
            teamErrors[index] = errors;
          }
        });
        
        setTeamMemberErrors(teamErrors);
        return isValid;
        
      default:
        return true;
    }
  }, [companyInfo, teamMembers]);
  
  // Navigate to the next step
  const handleNext = useCallback(() => {
    // Validate current step
    if (!validateStep(currentStep)) {
      return;
    }
    
    // If this is the last step, complete onboarding
    if (currentStep === totalSteps - 1) {
      setSubmitting(true);
      completeOnboardingMutation.mutate();
      return;
    }
    
    // Move to next step
    setCurrentStep(prev => prev + 1);
    
    // Log for debugging
    logger.component.debug(`Moving to step ${currentStep + 1}`);
  }, [currentStep, totalSteps, validateStep, completeOnboardingMutation]);
  
  // Navigate to the previous step
  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      logger.component.debug(`Moving back to step ${currentStep - 1}`);
    }
  }, [currentStep]);
  
  // Handle company info changes with logging
  const handleCompanyInfoChangeWithLogging = useCallback((field: keyof CompanyInfo, value: string) => {
    logger.select.debug(`Company ${field} changed to: ${value}`);
    
    setCompanyInfo(prev => {
      return { ...prev, [field]: value };
    });
    
    // Clear validation error for this field if it exists
    if (companyErrors[field]) {
      setCompanyErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  }, [companyErrors]);

  // Update team member fields with validation using useCallback to prevent re-renders
  const handleTeamMemberChange = useCallback((index: number, field: keyof TeamMember, value: string) => {
    logger.select.debug(`Team member ${index} ${field} changed to: ${value}`);
    
    setTeamMembers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    
    // Clear validation error for this field if it exists using functional update
    setTeamMemberErrors(prev => {
      if (prev[index] && prev[index][field]) {
        const updatedErrors = { ...prev };
        updatedErrors[index] = { ...updatedErrors[index], [field]: '' };
        return updatedErrors;
      }
      return prev;
    });
  }, []);

  // Add a team member - memoized to prevent re-renders
  const handleAddTeamMember = useCallback((role: 'CFO' | 'CISO', formType: string, roleDescription: string) => {
    logger.component.debug(`Adding team member with role: ${role}`);
    setTeamMembers(prev => [
      ...prev,
      { role, fullName: '', email: '', formType, roleDescription }
    ]);
  }, []);

  // Remove a team member - memoized to prevent re-renders
  const handleRemoveTeamMember = useCallback((index: number) => {
    logger.component.debug(`Removing team member at index: ${index}`);
    
    setTeamMembers(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
    
    // Remove any errors for this index using functional update
    setTeamMemberErrors(prev => {
      if (prev[index]) {
        const updatedErrors = { ...prev };
        delete updatedErrors[index];
        return updatedErrors;
      }
      return prev;
    });
  }, []);

  // Step layout component with animations
  const StepLayout = memo(({ 
    title, 
    imageSrc, 
    imageAlt, 
    children,
    contentClassName
  }: { 
    title: string; 
    imageSrc?: string; 
    imageAlt?: string; 
    children: React.ReactNode;
    contentClassName?: string;
  }) => {
    return (
      <div className="flex flex-col items-center mx-auto px-4 py-2 max-w-lg">
        <h2 className="text-2xl font-semibold mb-6 text-center">{title}</h2>
        
        {imageSrc && (
          <ImageContainer>
            <StepImage src={imageSrc} alt={imageAlt || title} />
          </ImageContainer>
        )}
        
        <div className={cn("w-full", contentClassName)}>
          {children}
        </div>
      </div>
    );
  });

  // Handle Enter key press in form fields
  const handleEnterKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (nextButtonRef.current) {
        nextButtonRef.current.click();
      }
    }
  }, []);

  // Handle dialog auto-focus
  const handleDialogOpenAutoFocus = useCallback((e: Event) => {
    e.preventDefault();
    // We're preventing the autofocus to have better control
    if (currentStep === 4 && emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, [currentStep, emailInputRef]);

  // Render step content based on current step
  const renderStepContent = () => {
    return (
      <div className="step-content">
        {currentStep === 0 && (
          <div key="step-0">
            <StepLayout
              title="Welcome to the Invela Trust Network"
              imageSrc="/assets/welcome_1.png"
              imageAlt="Welcome to Invela"
            >
              <div className="mt-4 space-y-4">
                <div>
                  <CheckListItem>
                    Your premier partner for secure and efficient accreditation
                  </CheckListItem>
                </div>
                <div>
                  <CheckListItem>
                    Enterprise-grade risk assessment and management
                  </CheckListItem>
                </div>
                <div>
                  <CheckListItem>
                    Streamlined compliance processes with advanced automation
                  </CheckListItem>
                </div>
              </div>
            </StepLayout>
          </div>
        )}
        
        {currentStep === 1 && (
          <div key="step-1">
            <StepLayout
              title="Company Information"
              imageSrc="/assets/welcome_2.png"
              imageAlt="Company Information"
            >
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label htmlFor="company-size">
                    Company Size <span className="text-red-500">*</span>
                  </Label>
                  <MemoizedSelect
                    value={companyInfo.size}
                    onValueChange={(value) => handleCompanyInfoChangeWithLogging('size', value)}
                    error={companyErrors.size}
                  >
                    <SelectTrigger id="company-size" className={companyErrors.size ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-50">1-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-500">201-500 employees</SelectItem>
                      <SelectItem value="501-1000">501-1000 employees</SelectItem>
                      <SelectItem value="1001+">1001+ employees</SelectItem>
                    </SelectContent>
                  </MemoizedSelect>
                  {companyErrors.size && (
                    <div className="flex items-center text-red-500 text-sm mt-1">
                      <AlertCircle className="h-3.5 w-3.5 mr-1" />
                      <span>{companyErrors.size}</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <Label htmlFor="revenue-tier">
                    Revenue Tier <span className="text-red-500">*</span>
                  </Label>
                  <MemoizedSelect
                    value={companyInfo.revenue}
                    onValueChange={(value) => handleCompanyInfoChangeWithLogging('revenue', value)}
                    error={companyErrors.revenue}
                  >
                    <SelectTrigger id="revenue-tier" className={companyErrors.revenue ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select revenue tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="under-1m">Under $1 million</SelectItem>
                      <SelectItem value="1m-10m">$1 million - $10 million</SelectItem>
                      <SelectItem value="10m-50m">$10 million - $50 million</SelectItem>
                      <SelectItem value="50m-100m">$50 million - $100 million</SelectItem>
                      <SelectItem value="100m+">Over $100 million</SelectItem>
                    </SelectContent>
                  </MemoizedSelect>
                  {companyErrors.revenue && (
                    <div className="flex items-center text-red-500 text-sm mt-1">
                      <AlertCircle className="h-3.5 w-3.5 mr-1" />
                      <span>{companyErrors.revenue}</span>
                    </div>
                  )}
                </div>
              </div>
            </StepLayout>
          </div>
        )}
        
        {currentStep === 2 && (
          <div key="step-2">
            <StepLayout
              title="Tasks and Assessments"
              imageSrc="/assets/welcome_4.png"
              imageAlt="Tasks Overview"
            >
              <div className="space-y-6">
                <p className="text-center text-gray-700">
                  The Invela platform organizes your work through a structured task system:
                </p>
                
                <div className="space-y-6 mt-4">
                  <div>
                    <CheckListItem>
                      Complete compliance tasks assigned to your company
                    </CheckListItem>
                  </div>
                  
                  <div>
                    <CheckListItem>
                      Fill out standardized assessment forms with easy-to-use interfaces
                    </CheckListItem>
                  </div>
                  
                  <div>
                    <CheckListItem>
                      Track progress and manage deadlines through your dashboard
                    </CheckListItem>
                  </div>
                  
                  <div>
                    <CheckListItem>
                      Receive notifications for important task updates and deadlines
                    </CheckListItem>
                  </div>
                </div>
              </div>
            </StepLayout>
          </div>
        )}
        
        {currentStep === 3 && (
          <div key="step-3">
            <StepLayout
              title="Document Repository"
              imageSrc="/assets/welcome_1.png"
              imageAlt="Document Repository"
            >
              <div className="space-y-6">
                <p className="text-center text-gray-700">
                  Securely store and manage all your compliance documentation:
                </p>
                
                <div className="space-y-6 mt-4">
                  <div>
                    <CheckListItem>
                      Upload documents directly through intuitive forms
                    </CheckListItem>
                  </div>
                  
                  <div>
                    <CheckListItem>
                      Documents are securely stored with enterprise-grade encryption
                    </CheckListItem>
                  </div>
                  
                  <div>
                    <CheckListItem>
                      Access a centralized repository of all submitted materials
                    </CheckListItem>
                  </div>
                  
                  <div>
                    <CheckListItem>
                      Share documentation securely with authorized partners
                    </CheckListItem>
                  </div>
                </div>
              </div>
            </StepLayout>
          </div>
        )}
        
        {currentStep === 4 && (
          <div key="step-4">
            <StepLayout
              title="Invite Team Members"
              imageSrc="/assets/welcome_2.png"
              imageAlt="Team Collaboration"
              contentClassName="space-y-6"
            >
              <div className="space-y-6">
                <div className="flex justify-center space-x-4">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => handleAddTeamMember('CFO', 'financial', 'Chief Financial Officer')}
                    className="flex items-center"
                  >
                    <span className="mr-2">Add CFO</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => handleAddTeamMember('CISO', 'security', 'Chief Information Security Officer')}
                    className="flex items-center"
                  >
                    <span className="mr-2">Add CISO</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {teamMembers.map((member, index) => (
                    <Card key={index} className="relative">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="font-medium">{member.roleDescription}</h3>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveTeamMember(index)}
                            >
                              Remove
                            </Button>
                          </div>
                          
                          <FormInput
                            label="Full Name"
                            value={member.fullName}
                            onChange={(value) => handleTeamMemberChange(index, 'fullName', value)}
                            placeholder="Enter full name"
                            error={teamMemberErrors[index]?.fullName}
                            required
                          />
                          
                          <FormInput
                            label="Email Address"
                            value={member.email}
                            onChange={(value) => handleTeamMemberChange(index, 'email', value)}
                            placeholder="Enter email address"
                            error={teamMemberErrors[index]?.email}
                            required
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {teamMembers.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    You can add team members now or invite them later
                  </div>
                )}
              </div>
            </StepLayout>
          </div>
        )}
        
        {currentStep === 5 && (
          <div key="step-5">
            <StepLayout
              title="Review Information"
              imageSrc="/assets/welcome_4.png"
              imageAlt="Review Information"
            >
              <div className="space-y-6">
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-4">Company Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Company Name:</span>
                        <span className="font-medium">{company?.name || "Not provided"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Company Size:</span>
                        <span className="font-medium">{companyInfo.size || "Not provided"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Revenue Tier:</span>
                        <span className="font-medium">{companyInfo.revenue || "Not provided"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Category:</span>
                        <span className="font-medium">{company?.category || "Not provided"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {teamMembers.length > 0 && (
                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="font-semibold mb-4">Team Members</h3>
                      <div className="space-y-4">
                        {teamMembers.map((member, index) => (
                          <div key={index} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Role:</span>
                              <span className="font-medium">{member.roleDescription}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Name:</span>
                              <span className="font-medium">{member.fullName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Email:</span>
                              <span className="font-medium">{member.email}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </StepLayout>
          </div>
        )}
        
        {currentStep === 6 && (
          <div key="step-6">
            <StepLayout
              title="Setup Complete"
              imageSrc="/assets/welcome_1.png"
              imageAlt="Setup Complete"
            >
              <div className="mt-4 space-y-6">
                <div className="bg-green-50 border border-green-100 rounded-lg p-6 flex flex-col items-center justify-center text-center">
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
                </div>
              </div>
            </StepLayout>
          </div>
        )}
      </div>
    );
  };

  return (
    <MemoizedDialog
      open={open}
      onOpenChange={handleOpenChange}
      onOpenAutoFocus={handleDialogOpenAutoFocus}
    >
      <DialogContentWithoutCloseButton
        className="sm:max-w-[600px] p-0 gap-0"
        onKeyDown={handleEnterKeyPress}
      >
        {/* Progress bar */}
        <div className="relative h-2 w-full bg-gray-100">
          <div 
            className="absolute left-0 top-0 bottom-0 bg-green-500 transition-all duration-300 ease-in-out"
            style={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }}
          />
        </div>
        
        {/* Main content */}
        <div className="p-6 flex flex-col min-h-[65vh]">
          {/* Step content */}
          <div className="flex-grow">
            {loaded ? renderStepContent() : (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-16 h-16 border-4 border-t-green-500 border-gray-200 rounded-full animate-spin" />
                <p className="mt-4 text-gray-500">Loading...</p>
              </div>
            )}
          </div>
          
          {/* Navigation buttons */}
          <div className="mt-8 flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0 || submitting}
              className={currentStep === 0 ? "invisible" : ""}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <Button
              ref={nextButtonRef}
              type="button"
              onClick={handleNext}
              disabled={submitting}
            >
              {currentStep === totalSteps - 1 ? (
                submitting ? "Completing..." : "Complete"
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
          
          {/* Step indicator */}
          <div className="mt-4 flex justify-center gap-2">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full",
                  index === currentStep ? "bg-green-500" : "bg-gray-200"
                )}
              />
            ))}
          </div>
        </div>
      </DialogContentWithoutCloseButton>
    </MemoizedDialog>
  );
}