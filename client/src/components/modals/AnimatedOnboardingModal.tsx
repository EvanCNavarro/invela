import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertCircle, 
  Check, 
  CheckCircle, 
  ArrowRight, 
  ArrowDown, 
  Loader2,
  Shield,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { useUnifiedToast } from '@/hooks/use-unified-toast.tsx';
import { ProgressiveImage } from '@/components/ui/ProgressiveImage';

// Global image cache for preloading and instant access
const globalImageCache = new Map<string, HTMLImageElement>();

// Preload images into cache
const preloadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    if (globalImageCache.has(src)) {
      resolve(globalImageCache.get(src)!);
      return;
    }

    const img = new Image();
    img.onload = () => {
      globalImageCache.set(src, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
};

// Type definitions for better type safety
interface User {
  id: number;
  email: string;
  full_name: string;
  onboarding_user_completed: boolean;
}

interface Company {
  id: number;
  name: string;
  category?: string;
  onboarding_company_completed: boolean;
}

interface CompanyInfo {
  size: string;
  revenue: string;
}

interface TeamMember {
  fullName: string;
  email: string;
  role: string;
  roleDescription?: string;
  formType?: string;
}

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
import { Dialog, DialogContent, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/no-close-dialog';


// Revenue formatting utilities - updated to match demo system format
const formatRevenue = (amount: number): string => {
  if (amount >= 1_000_000_000) {
    const billions = amount / 1_000_000_000;
    return `$${parseFloat(billions.toFixed(1))}B`;
  } else if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `$${parseFloat(millions.toFixed(1))}M`;
  } else if (amount >= 1_000) {
    const thousands = amount / 1_000;
    return `$${parseFloat(thousands.toFixed(1))}K`;
  } else {
    return `$${amount}`;
  }
};

// Map company size values to employee count
const employeeCountMap = {
  'small': 25, // middle of 1-49
  'medium': 150, // middle of 50-249
  'large': 625, // middle of 250-999
  'xlarge': 1500 // representative value for 1000+
};

/**
 * Update user onboarding status in the database and localStorage
 * This function handles both database update and localStorage update for consistency
 * 
 * @param userId The ID of the user to update
 * @param status Boolean indicating if onboarding is complete (true) or not (false)
 * @returns Response data from the API
 */
const updateUserOnboardingStatus = async (userId: number, status: boolean) => {
  logDebug('Updating user onboarding status', { userId, status });
  
  // First, update localStorage immediately for better user experience
  try {
    // Use consistent localStorage key format for all onboarding status checks
    const localStorageKey = `onboarding_completed_${userId}`;
    localStorage.setItem(localStorageKey, status.toString());
    logDebug('Successfully updated localStorage onboarding status', { userId, localStorageKey });
  } catch (err) {
    // Non-blocking - just log the error
    logDebug('Failed to update localStorage for onboarding status', { userId, error: err });
  }
  
  // Then update the database for persistence across sessions/devices
  try {
    // Using the correct endpoint path with plural 'users'
    const response = await fetch('/api/users/complete-onboarding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logDebug('Failed to update user onboarding status in database', { 
        userId, 
        status, 
        errorData, 
        statusCode: response.status 
      });
      throw new Error(errorData.message || 'Failed to update user onboarding status');
    }
    
    const data = await response.json();
    logDebug('Successfully updated user onboarding status in database', { userId, data });
    return data;
  } catch (error) {
    logDebug('Error updating user onboarding status in database', { userId, error });
    throw error;
  }
};

/**
 * Update company details in the database
 * Saves company information collected during onboarding
 * 
 * @param companyId The ID of the company to update
 * @param details Object containing company details (size, revenue)
 * @returns Response data from the API
 */
// Revenue mapping from text descriptions to numeric values (in dollars)
// Updated to match demo system format for consistency
const revenueValueMap: Record<string, number> = {
  small: 1750000,     // $1.75M - matches demo system format
  medium: 17500000,   // $17.5M - matches demo system format  
  large: 87500000,    // $87.5M - matches demo system format
  xlarge: 175000000   // $175M - matches demo system format
};

const updateCompanyDetails = async (companyId: number, details: CompanyInfo) => {
  // Map size to employee count if available
  const numEmployees = details.size ? 
    employeeCountMap[details.size as keyof typeof employeeCountMap] : 
    undefined;
  
  // Map revenue tier to numeric value
  const revenueValue = details.revenue ? 
    revenueValueMap[details.revenue as keyof typeof revenueValueMap] : 
    undefined;
  
  logDebug('Updating company details', { 
    companyId, 
    details,
    mappedEmployeeCount: numEmployees,
    mappedRevenueValue: revenueValue
  });
  
  try {
    // Using the service/company endpoint to update company details
    const response = await fetch(`/api/companies/current`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Set fields in the format expected by the server
        revenue: revenueValue,            // Numeric value in dollars
        revenue_tier: details.revenue,    // Keep the text description for display purposes
        num_employees: numEmployees
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logDebug('Failed to update company details', { 
        companyId, 
        details, 
        errorData, 
        statusCode: response.status 
      });
      throw new Error(errorData.message || 'Failed to update company details');
    }
    
    const data = await response.json();
    logDebug('Successfully updated company details', { companyId, data });
    return data;
  } catch (error) {
    logDebug('Error updating company details', { companyId, details, error });
    throw error;
  }
};

/**
 * Invite a team member to join the company
 * Creates an invitation record in the database and sends an email
 * 
 * @param companyId The ID of the company
 * @param member Object containing team member details (fullName, email, role)
 * @returns Response data from the API
 */
const inviteTeamMember = async (companyId: number, member: any) => {
  logDebug('Inviting team member', { companyId, member });
  
  try {
    // Get the current user and company name for the invitation
    const userResponse = await fetch('/api/user');
    const companyResponse = await fetch('/api/companies/current');
    
    if (!userResponse.ok || !companyResponse.ok) {
      throw new Error('Failed to get user or company information');
    }
    
    const userData = await userResponse.json();
    const companyData = await companyResponse.json();
    
    const response = await fetch('/api/users/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: member.email,
        full_name: member.fullName,
        company_id: companyId,
        company_name: companyData.name,
        sender_name: userData.full_name || userData.email,
        sender_company: companyData.name
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logDebug('Failed to invite team member', { 
        companyId, 
        member, 
        errorData, 
        statusCode: response.status 
      });
      throw new Error(errorData.message || `Failed to invite ${member.email}`);
    }
    
    const data = await response.json();
    logDebug('Successfully invited team member', { companyId, member, data });
    return data;
  } catch (error) {
    logDebug('Error inviting team member', { companyId, member, error });
    throw error;
  }
};

// Helper for logging debug information
const logDebug = (message: string, data?: any) => {
  console.log(`[AnimatedOnboardingModal] ${message}`, data);
};

// Define the interface for team members (consolidated definition)
interface TeamMemberDefinition {
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



// Component for the header chip with consistent pill shape
const HeaderChip: React.FC = () => (
  <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 w-fit">
    Onboarding Modal
  </div>
);

// Component for consistent right side image container
const RightImageContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="hidden md:block bg-primary/5 relative md:w-[50%] flex-shrink-0 border-l border-slate-100">
    <div className="absolute inset-0 flex items-center justify-center">
      {children}
    </div>
  </div>
);

// Component for consistent step image with loading indicator and professional styling
const StepImage: React.FC<{ 
  src: string | undefined; 
  alt: string | undefined;
  isLoaded: boolean;
}> = ({ 
  src, 
  alt = 'Onboarding step image',
  isLoaded
}) => (
  <div className="w-[360px] h-[360px] relative flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-slate-100">
    {src ? (
      <ProgressiveImage
        src={src}
        alt={alt || 'Onboarding step image'}
        className="w-full h-full object-cover rounded-xl shadow-lg border border-slate-200/60"
        skeletonVariant="neutral"
        priority="eager"
        enableLogging={true}
        onError={(error) => console.warn(`Onboarding image load failed: ${error}`)}
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center">
        <Skeleton className="w-full h-full rounded-xl animate-pulse bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200" />
      </div>
    )}
  </div>
);

// Independent component for step layout to avoid JSX nesting issues
const StepLayout: React.FC<{ 
  title: string, 
  children: React.ReactNode, 
  imageSrc?: string, 
  imageAlt?: string,
  headerChip?: string,
  description?: string,
  rightImageSrc?: string
}> = ({ 
  title, 
  children, 
  imageSrc, 
  imageAlt,
  headerChip,
  description,
  rightImageSrc
}) => {
  // Track image loading status
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Determine which image source to use
  const imgSrc = rightImageSrc || imageSrc;
  
  // Use cached image or preload with optimized loading strategy
  useEffect(() => {
    if (!imgSrc) {
      setImageLoaded(true); // No image to load
      return;
    }
    
    setImageLoaded(false); // Reset loading state
    
    // Use cached image or preload
    if (globalImageCache.has(imgSrc)) {
      setImageLoaded(true);
    } else {
      preloadImage(imgSrc)
        .then(() => setImageLoaded(true))
        .catch(() => {
          console.warn(`[AnimatedOnboardingModal] Failed to load image: ${imgSrc}`);
          setImageLoaded(true); // Show content even if image fails
        });
    }
  }, [imgSrc]);
  
  return (
    <div className="flex flex-col md:flex-row flex-1 h-[450px] overflow-visible">
      {/* Left side: Text content with fixed height and consistent padding */}
      <div className="md:w-[50%] px-8 py-6 flex flex-col">
        <div className="flex flex-col h-full">
          {/* Header chip for consistent styling */}
          <HeaderChip />
          
          {/* Page title with proper spacing */}
          <h2 className="text-2xl font-bold text-primary mb-4">
            {title}
          </h2>
          
          {/* Description text for consistency across steps */}
          {description && (
            <p className="text-lg text-gray-700 mb-4">
              {description}
            </p>
          )}
          
          {/* Content area with fixed height and no scrolling */}
          <div className="flex-grow content-area pr-2">
            {children}
          </div>
        </div>
      </div>
      
      {/* Right side: Image with consistent container */}
      <RightImageContainer>
        {imgSrc && (
          <StepImage 
            src={imgSrc} 
            alt={imageAlt || title}
            isLoaded={imageLoaded} 
          />
        )}
      </RightImageContainer>
    </div>
  );
};

// Component for rendering checklist items with consistent styling
const CheckListItem: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <div className="flex items-start space-x-3 mb-5">
    <div className="h-5 w-5 text-primary flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
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
  user: User | null,
  currentCompany: Company | null,
}) {
  const [currentStep, setCurrentStep] = useState(0);
  
  // Track transition animation direction (next or previous)
  const [transitionDirection, setTransitionDirection] = useState<'next' | 'prev'>('next');
  
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    size: '',
    revenue: '',
  });

  // Preload all onboarding step images when modal opens
  useEffect(() => {
    if (isOpen) {
      const imagesToPreload = [
        "/images/onboarding/step1-welcome.jpg",
        "/images/onboarding/step2-company.jpg", 
        "/images/onboarding/step3-team.jpg",
        "/images/onboarding/step4-tasks.jpg"
      ];
    
      imagesToPreload.forEach(src => {
        preloadImage(src).catch(console.warn);
      });
    }
  }, [isOpen]);
  
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
  
  // Get unified toast function
  const { success: successToast, error: errorToast } = useUnifiedToast();
  
  // Get query client for invalidating queries after completing onboarding
  const queryClient = useQueryClient();
  
  // Track loading state for operations
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [operationErrors, setOperationErrors] = useState<{
    userStatus?: string;
    companyDetails?: string;
    teamInvites?: string[];
  }>({});

  // Track invitation success for validation styling
  const [invitationStatus, setInvitationStatus] = useState<{[key: string]: 'pending' | 'success' | 'error'}>({});
  
  // Track field validation states for color scheme
  const [fieldStates, setFieldStates] = useState<{
    [role: string]: {
      focused: boolean;
      touched: boolean;
      nameComplete: boolean;
      emailComplete: boolean;
      hasBeenFocused: boolean;
    }
  }>({
    CFO: { focused: false, touched: false, nameComplete: false, emailComplete: false, hasBeenFocused: false },
    CISO: { focused: false, touched: false, nameComplete: false, emailComplete: false, hasBeenFocused: false }
  });
  
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
      // Reset field states
      setFieldStates({
        CFO: { focused: false, touched: false, nameComplete: false, emailComplete: false, hasBeenFocused: false },
        CISO: { focused: false, touched: false, nameComplete: false, emailComplete: false, hasBeenFocused: false }
      });
      logDebug('Modal opened - reset all states');
    }
  }, [isOpen]);

  // Field state update functions
  const updateFieldState = (role: string, updates: Partial<typeof fieldStates.CFO>) => {
    setFieldStates(prev => ({
      ...prev,
      [role]: { ...prev[role], ...updates }
    }));
    logDebug(`Updated field state for ${role}`, { role, updates });
  };

  const handleFieldFocus = (role: string) => {
    updateFieldState(role, { focused: true, hasBeenFocused: true });
    logDebug(`Field focused for ${role}`, { role });
  };

  const handleFieldBlur = (role: string) => {
    updateFieldState(role, { focused: false, touched: true });
    logDebug(`Field blurred for ${role}`, { role });
  };

  const updateFieldCompletion = (role: string, fieldType: 'name' | 'email', value: string) => {
    const isComplete = value.trim() !== '';
    const updates = fieldType === 'name' 
      ? { nameComplete: isComplete }
      : { emailComplete: isComplete };
    
    updateFieldState(role, updates);
    logDebug(`Field completion updated for ${role}.${fieldType}`, { role, fieldType, isComplete, value: value ? '[REDACTED]' : 'empty' });
  };

  // Determine block color state based on validation rules
  const getBlockColorState = (role: string): 'gray' | 'blue' | 'green' | 'yellow' => {
    const state = fieldStates[role];
    const inviteSuccess = invitationStatus[role] === 'success';
    
    // Green: invitation sent successfully OR both fields complete
    if (inviteSuccess || (state.nameComplete && state.emailComplete)) {
      logDebug(`Block state: GREEN for ${role}`, { inviteSuccess, nameComplete: state.nameComplete, emailComplete: state.emailComplete });
      return 'green';
    }
    
    // Blue: currently focused on any field in this block
    if (state.focused) {
      logDebug(`Block state: BLUE for ${role}`, { focused: state.focused });
      return 'blue';
    }
    
    // Yellow: has been focused before, touched, but incomplete (only if at least one field has content)
    if (state.hasBeenFocused && state.touched && (!state.nameComplete || !state.emailComplete)) {
      // Only show yellow if user has started filling (at least one field has content)
      const hasAnyContent = state.nameComplete || state.emailComplete;
      if (hasAnyContent) {
        logDebug(`Block state: YELLOW for ${role}`, { hasBeenFocused: state.hasBeenFocused, touched: state.touched, nameComplete: state.nameComplete, emailComplete: state.emailComplete });
        return 'yellow';
      }
    }
    
    // Gray: default state (not touched or not focused yet)
    logDebug(`Block state: GRAY for ${role}`, { state });
    return 'gray';
  };

  // Get CSS classes for block based on color state
  const getBlockClasses = (role: string): string => {
    const colorState = getBlockColorState(role);
    const baseClasses = "p-5 rounded-xl shadow-[5px_5px_10px_rgba(0,0,0,0.05),_-5px_-5px_10px_rgba(255,255,255,0.9)] border transition-all duration-200";
    
    switch (colorState) {
      case 'green':
        return `${baseClasses} bg-green-50 border-green-200`;
      case 'blue':
        return `${baseClasses} bg-blue-50 border-blue-200`;
      case 'yellow':
        return `${baseClasses} bg-yellow-50 border-yellow-200`;
      case 'gray':
      default:
        return `${baseClasses} bg-gray-50 border-gray-200`;
    }
  };

  // Get CSS classes for role chip based on validation state
  const getChipClasses = (role: string): string => {
    const colorState = getBlockColorState(role);
    const baseClasses = "py-1 px-4 rounded-lg text-sm font-medium mr-2 shadow-[2px_2px_4px_rgba(0,0,0,0.05),_-2px_-2px_4px_rgba(255,255,255,0.7)] border transition-all duration-200";
    
    switch (colorState) {
      case 'green':
        return `${baseClasses} bg-green-100 text-green-700 border-green-200`;
      case 'blue':
        return `${baseClasses} bg-blue-100 text-blue-700 border-blue-200`;
      case 'yellow':
        return `${baseClasses} bg-yellow-100 text-yellow-700 border-yellow-200`;
      case 'gray':
      default:
        return `${baseClasses} bg-gray-100 text-gray-700 border-gray-200`;
    }
  };
  
  // Check if current step is valid to proceed
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 0: // Welcome - always can proceed
        return true;
        
      case 1: // Company Information
        return companyInfo.size !== '' && companyInfo.revenue !== '';
        
      case 2: // Tasks - always can proceed
      case 3: // Documents - always can proceed
        return true;
        
      case 4: // Team Members - validate partial entries
        // Can proceed if no team members entered, OR if all entries are complete
        const hasPartialEntries = teamMembers.some(member => {
          const hasName = member.fullName && member.fullName.trim() !== '';
          const hasEmail = member.email && member.email.trim() !== '';
          // Partial entry = has one field but not both
          return (hasName && !hasEmail) || (!hasName && hasEmail);
        });
        return !hasPartialEntries;
        
      case 5: // Review - always can proceed
      case 6: // Complete - always can proceed
        return true;
        
      default:
        return false;
    }
  }, [currentStep, companyInfo, teamMembers]);
  
  // Handle next step button click with framer-motion
  const handleNextStep = () => {
    // If we're on the last step, complete onboarding
    if (currentStep === 6) {
      handleCompleteOnboarding();
      return;
    }
    
    // Set transition direction for framer-motion
    setTransitionDirection('next');
    logDebug('Starting next step animation', { currentStep });
    
    // Let framer-motion handle the transition naturally
    setCurrentStep(prev => prev + 1);
    logDebug('Next step animation completed', { newStep: currentStep + 1 });
  };
  
  // Handle back button click with framer-motion
  const handleBackStep = () => {
    // Set transition direction for framer-motion
    setTransitionDirection('prev');
    logDebug('Starting back step animation', { currentStep });
    
    // Let framer-motion handle the transition naturally
    setCurrentStep(prev => Math.max(0, prev - 1));
    logDebug('Back step animation completed', { newStep: currentStep - 1 });
  };
  
  // Handle complete onboarding action
  const handleCompleteOnboarding = async () => {
    // Don't proceed if already submitting
    if (isSubmitting) return;
    
    // Reset previous errors
    setOperationErrors({});
    
    // Start submission process
    setIsSubmitting(true);
    
    // Track if any operation failed
    let hasErrors = false;
    
    // Log the process for easier debugging
    logDebug('Starting onboarding completion process', { 
      hasUser: !!user, 
      hasCompany: !!currentCompany,
      companyInfo,
      teamMembersCount: teamMembers.filter(m => m.fullName && isValidEmail(m.email)).length
    });
    
    try {
      // 1. Update localStorage immediately for better UX
      // This ensures the modal won't show up if there are errors with the API call
      if (user && user.id) {
        try {
          const localStorageKey = `onboarding_completed_${user.id}`;
          localStorage.setItem(localStorageKey, 'true');
          logDebug('Successfully set localStorage onboarding status', { key: localStorageKey });
        } catch (err) {
          // Non-blocking error - just log it
          logDebug('Failed to update localStorage for onboarding', { error: err });
        }
        
        // 2. Update user onboarding status in database
        try {
          await updateUserOnboardingStatus(user.id, true);
          logDebug('User onboarding status updated successfully in database', { userId: user.id });
        } catch (error) {
          logDebug('Failed to update user onboarding status in database', { error });
          setOperationErrors(prev => ({ 
            ...prev, 
            userStatus: 'Failed to update user onboarding status. Please try again.' 
          }));
          hasErrors = true;
        }
      }
      
      // 2. Update company details
      if (currentCompany && currentCompany.id) {
        try {
          await updateCompanyDetails(currentCompany.id, companyInfo);
          logDebug('Company details updated successfully', { companyId: currentCompany.id });
        } catch (error) {
          logDebug('Failed to update company details', { error });
          setOperationErrors(prev => ({ 
            ...prev, 
            companyDetails: 'Failed to save company information. Please try again.' 
          }));
          hasErrors = true;
        }
      }
      
      // 3. Invite team members (only those with valid entries)
      if (currentCompany && currentCompany.id) {
        const validMembers = teamMembers.filter(
          member => member.fullName && isValidEmail(member.email)
        );
        
        const inviteErrors: string[] = [];
        
        let successfulInvites = 0;
        
        for (const member of validMembers) {
          try {
            await inviteTeamMember(currentCompany.id, {
              fullName: member.fullName,
              email: member.email,
              role: member.role,
            });
            logDebug('Team member invited successfully', { 
              email: member.email, 
              role: member.role 
            });
            successfulInvites++;
          } catch (error) {
            logDebug('Failed to invite team member', { 
              member: member.email,
              error 
            });
            inviteErrors.push(`Failed to invite ${member.email}. Please try again.`);
            hasErrors = true;
          }
        }
        
        // Show success toast for successful invitations
        if (successfulInvites > 0) {
          successToast(
            "Team invitations sent",
            `Successfully sent ${successfulInvites} team member invitation${successfulInvites > 1 ? 's' : ''}.`
          );
        }
        
        if (inviteErrors.length > 0) {
          setOperationErrors(prev => ({ 
            ...prev, 
            teamInvites: inviteErrors 
          }));
        }
      }

      // Check if we had any errors with company details or team member invites
      // Note: User onboarding errors are less critical since localStorage is already updated
      if (hasErrors) {
        // Still show success message even with errors
        // This prevents the user from getting stuck in the onboarding flow
        successToast(
          "Onboarding completed",
          "Your onboarding is complete, but some optional details could not be saved. You can update them later."
        );
        
        // Log detailed information about errors for debugging
        logDebug('Onboarding completed with some errors', { 
          operationErrors,
          hasErrors
        });
      } else {
        // Show success message for complete success
        successToast(
          "Welcome aboard!",
          "Your onboarding has been completed successfully."
        );
      }
      
      // Close the modal regardless of company/team errors
      // The localStorage flag will ensure the modal doesn't show again
      setShowModal(false);
    } catch (error) {
      // Handle any unexpected errors
      logDebug('Unexpected error completing onboarding', { error });
      
      // Still show success to prevent user from getting stuck
      // The localStorage is already updated, so the modal won't show again
      successToast(
        "Welcome aboard!",
        "Your onboarding has been completed, but some details could not be saved."
      );
      
      // Close the modal even with unexpected errors
      // User can update details later if needed
      setShowModal(false);
    } finally {
      // Always set submitting to false when done
      setIsSubmitting(false);
      
      // Ensure we invalidate cached data to reflect the onboarding completion
      try {
        // Use the already initialized queryClient 
        if (queryClient) {
          logDebug('Invalidating relevant queries after onboarding completion');
          
          // This will trigger fetching fresh data in the app
          // Using the proper React Query V5 object syntax
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
          queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
          
          logDebug('Successfully invalidated user and company data queries');
        }
      } catch (err) {
        // Non-blocking - just log the error
        logDebug('Error invalidating queries', { error: err });
      }
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
                  ? "bg-primary ring-2 ring-primary/20" 
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
            <div className="mt-0 space-y-4">
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
            <div className="mt-0 space-y-4">
              <p className="text-lg text-gray-700 mb-4">
                Add basic details about {currentCompany?.name} to help us customize your experience.
              </p>
              
              <div className="space-y-4">
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
            title="A Few Tasks Ahead"
            imageSrc="/assets/welcome_3.png"
            imageAlt="Assessment Tasks"
          >
            <div className="mt-0 space-y-4">
              <p className="text-lg text-gray-700 mb-4">
                To complete your accreditation application, you'll need to work through the following tasks:
              </p>
              
              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-white text-sm font-semibold flex-shrink-0 shadow-md transition-all duration-200 hover:scale-105">1</div>
                  <div>
                    <h3 className="font-medium text-base text-gray-900">Know Your Business (KYB) Form</h3>
                    <p className="text-xs text-gray-500">Verify your company's business information</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-white text-sm font-semibold flex-shrink-0 shadow-md transition-all duration-200 hover:scale-105">2</div>
                  <div>
                    <h3 className="font-medium text-base text-gray-900">S&P KY3P Security Assessment</h3>
                    <p className="text-xs text-gray-500">Third-party risk assessment for security practices</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-white text-sm font-semibold flex-shrink-0 shadow-md transition-all duration-200 hover:scale-105">3</div>
                  <div>
                    <h3 className="font-medium text-base text-gray-900">Open Banking Survey</h3>
                    <p className="text-xs text-gray-500">API access and data sharing assessment</p>
                  </div>
                </div>
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
            <div className="mt-0 space-y-4">
              <p className="text-lg text-gray-700 mb-4">
                Upload compliance documents to auto-fill forms and accelerate your assessment.
              </p>
              
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg border">
                  <h4 className="font-medium text-sm text-gray-900 mb-4">Suggested Files to Upload:</h4>
                  <div className="flex flex-wrap gap-2">
                    <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-200 whitespace-nowrap">
                      SOC 2 Audit
                    </div>
                    <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-200 whitespace-nowrap">
                      ISO/IEC 27001 Certification
                    </div>
                    <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-200 whitespace-nowrap">
                      Penetration Test Report
                    </div>
                    <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-200 whitespace-nowrap">
                      Business Continuity Plan (BCP)
                    </div>
                    <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-200 whitespace-nowrap">
                      GDPR/CCPA Compliance Assessment
                    </div>
                    <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-200 whitespace-nowrap">
                      API Security Review
                    </div>
                    <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-200 whitespace-nowrap">
                      Data Protection Controls Assessment
                    </div>
                    <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-200 whitespace-nowrap">
                      OAuth Security Certification
                    </div>
                    <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-200 whitespace-nowrap">
                      FDX (Financial Data Exchange) Certification
                    </div>
                  </div>
                </div>
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
            <div className="mt-0 space-y-4">
              <div className={getBlockClasses('CFO')}>
                <div className="flex items-center mb-2">
                  <div className={getChipClasses('CFO')}>
                    CFO
                  </div>
                  <span className="text-sm">Financial Data for</span>
                  <span className="text-sm font-medium ml-1">KYB Form</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cfo-name" className="mb-2 block text-sm">
                      Full Name
                    </Label>
                    <Input
                      id="cfo-name"
                      value={teamMembers[0].fullName}
                      onFocus={() => handleFieldFocus('CFO')}
                      onBlur={() => handleFieldBlur('CFO')}
                      onChange={(e) => {
                        const newMembers = [...teamMembers];
                        newMembers[0].fullName = e.target.value;
                        setTeamMembers(newMembers);
                        updateFieldCompletion('CFO', 'name', e.target.value);
                      }}
                      className="h-10 rounded-md bg-white/80 border-blue-100/50 focus:border-blue-300 focus:ring-1 focus:ring-blue-300 shadow-[inset_2px_2px_5px_rgba(163,180,235,0.2),_inset_-2px_-2px_5px_rgba(255,255,255,0.7)]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cfo-email" className="mb-2 block text-sm">
                      Email Address
                    </Label>
                    <Input
                      id="cfo-email"
                      type="email"
                      value={teamMembers[0].email}
                      onFocus={() => handleFieldFocus('CFO')}
                      onBlur={() => handleFieldBlur('CFO')}
                      onChange={(e) => {
                        const newMembers = [...teamMembers];
                        newMembers[0].email = e.target.value;
                        setTeamMembers(newMembers);
                        updateFieldCompletion('CFO', 'email', e.target.value);
                      }}
                      className="h-10 rounded-md bg-white/80 border-blue-100/50 focus:border-blue-300 focus:ring-1 focus:ring-blue-300 shadow-[inset_2px_2px_5px_rgba(163,180,235,0.2),_inset_-2px_-2px_5px_rgba(255,255,255,0.7)]"
                    />
                  </div>
                </div>
              </div>
              
              <div className={getBlockClasses('CISO')}>
                <div className="flex items-center mb-2">
                  <div className={getChipClasses('CISO')}>
                    CISO
                  </div>
                  <div>
                    <span className="text-sm">Compliance Info for</span>
                    <span className="text-sm block font-medium">S&P KY3P Security Assessment</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ciso-name" className="mb-2 block text-sm">
                      Full Name
                    </Label>
                    <Input
                      id="ciso-name"
                      value={teamMembers[1].fullName}
                      onFocus={() => handleFieldFocus('CISO')}
                      onBlur={() => handleFieldBlur('CISO')}
                      onChange={(e) => {
                        const newMembers = [...teamMembers];
                        newMembers[1].fullName = e.target.value;
                        setTeamMembers(newMembers);
                        updateFieldCompletion('CISO', 'name', e.target.value);
                      }}
                      className="h-10 rounded-md bg-white/80 border-blue-100/50 focus:border-blue-300 focus:ring-1 focus:ring-blue-300 shadow-[inset_2px_2px_5px_rgba(163,180,235,0.2),_inset_-2px_-2px_5px_rgba(255,255,255,0.7)]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ciso-email" className="mb-2 block text-sm">
                      Email Address
                    </Label>
                    <Input
                      id="ciso-email"
                      type="email"
                      value={teamMembers[1].email}
                      onFocus={() => handleFieldFocus('CISO')}
                      onBlur={() => handleFieldBlur('CISO')}
                      onChange={(e) => {
                        const newMembers = [...teamMembers];
                        newMembers[1].email = e.target.value;
                        setTeamMembers(newMembers);
                        updateFieldCompletion('CISO', 'email', e.target.value);
                      }}
                      className="h-10 rounded-md bg-white/80 border-blue-100/50 focus:border-blue-300 focus:ring-1 focus:ring-blue-300 shadow-[inset_2px_2px_5px_rgba(163,180,235,0.2),_inset_-2px_-2px_5px_rgba(255,255,255,0.7)]"
                    />
                  </div>
                </div>
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
            <div className="mt-0 space-y-3">
              {/* Company Information Section */}
              <div className="bg-primary/5 p-4 rounded-xl shadow-[5px_5px_10px_rgba(0,0,0,0.05),_-5px_-5px_10px_rgba(255,255,255,0.9)] border border-primary/10 mb-3">
                <h3 className="text-primary font-medium mb-2.5 text-base">Company Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/10 text-green-500 flex items-center justify-center">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">Company</span>
                      <span className="text-sm font-medium">{currentCompany?.name || 'Not specified'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/10 text-green-500 flex items-center justify-center">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">Category</span>
                      <span className="text-sm font-medium">{currentCompany?.category || 'Not specified'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/10 text-green-500 flex items-center justify-center">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">Size</span>
                      <span className="text-sm font-medium">{companyInfo.size ? getSizeLabel(companyInfo.size) : 'Not specified'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/10 text-green-500 flex items-center justify-center">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">Revenue</span>
                      <span className="text-sm font-medium">
                        {companyInfo.revenue ? 
                          formatRevenue(revenueValueMap[companyInfo.revenue as keyof typeof revenueValueMap]) : 
                          'Not specified'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Team Members Section */}
              <div className="bg-primary/5 p-4 rounded-xl shadow-[5px_5px_10px_rgba(0,0,0,0.05),_-5px_-5px_10px_rgba(255,255,255,0.9)] border border-primary/10">
                <h3 className="text-primary font-medium mb-2.5 text-base">Team Members to Invite</h3>
                <div className="space-y-3">
                  {teamMembers.filter(member => member.fullName && isValidEmail(member.email)).length > 0 ? (
                    // Show team members that have both name and valid email
                    teamMembers.map((member, index) => (
                      member.fullName && isValidEmail(member.email) ? (
                        <div key={index} className="flex gap-3 items-center">
                          <div className="bg-primary/15 text-primary py-1 px-4 rounded-lg text-sm font-medium shadow-[2px_2px_4px_rgba(0,0,0,0.05),_-2px_-2px_4px_rgba(255,255,255,0.7)] border border-primary/10">
                            {member.role}
                          </div>
                          <div className="flex-1">
                            <span className="text-sm font-medium">{member.fullName}</span>
                            <span className="text-xs text-gray-500 ml-2">({member.email})</span>
                          </div>
                        </div>
                      ) : null
                    ))
                  ) : (
                    // If no valid members, show a message
                    <div className="text-sm text-gray-500 italic">No team members added</div>
                  )}
                </div>
              </div>
            </div>
          </StepLayout>
        );
      
      case 6: // Complete
        return (
          <StepLayout
            title="Join the Invela Trust Network"
            description="Click the Start button to begin your Accreditation process."
            imageSrc="/assets/welcome_7.png"
            imageAlt="Join the Invela Trust Network"
          >
            <div className="mt-0 space-y-4">
              <div className="space-y-3">
                <CheckListItem>
                  Complete your assigned company tasks
                </CheckListItem>
                <CheckListItem>
                  Provide documentation
                </CheckListItem>
                <CheckListItem>
                  Manage your S&P Data Access Risk Score and Accreditation Status
                </CheckListItem>
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
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: transitionDirection === 'next' ? 50 : -50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: transitionDirection === 'next' ? -50 : 50 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="w-full h-full"
        >
          {getCurrentStepContent()}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {/* prevent closing */}}>
      <DialogContent 
        className="max-w-4xl w-[950px] p-0 overflow-hidden h-[550px] flex flex-col onboarding-modal"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Invela Onboarding Modal</DialogTitle>
        <DialogDescription className="sr-only">Complete the onboarding process to get started with the Invela platform</DialogDescription>
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
                disabled={false}
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
              disabled={!canProceed || (currentStep === 6 && isSubmitting)}
              className={currentStep === 6 ? "bg-green-600 hover:bg-green-700 text-white px-6" : ""}
            >
              {currentStep === 6 ? (
                isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    Start 
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )
              ) : (
                <>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}