import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { AnimatedOnboardingModal } from "@/components/modals/AnimatedOnboardingModal";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface OnboardingWrapperProps {
  children: React.ReactNode;
}

/**
 * OnboardingWrapper component
 * 
 * Wraps content and provides onboarding functionality through modal
 * Ensures onboarding modal is available throughout the application
 */
export function OnboardingWrapper({ children }: OnboardingWrapperProps) {
  const { user } = useAuth();

  // State for showing the onboarding modal
  const [showModal, setShowModal] = React.useState(false);
  // Fetch current company data to get accurate onboarding status
  const { data: currentCompany } = useQuery({
    queryKey: ['/api/companies/current'],
    enabled: !!user,
  });

  // Debug logging for onboarding status
  React.useEffect(() => {
    if (user && currentCompany) {
      console.log('[ONBOARDING DEBUG] Checking onboarding status in wrapper:', {
        userId: user.id,
        userOnboardingInSession: user.onboarding_user_completed,
        companyOnboardingFromApi: currentCompany.onboardingCompleted,
        shouldShowModal: !user.onboarding_user_completed && !currentCompany.onboardingCompleted,
        timestamp: new Date().toISOString()
      });
    }
  }, [user, currentCompany]);

  // Enhanced check for onboarding status - checks both user object and company data
  React.useEffect(() => {
    // Check both user session data AND company data from the API
    // This ensures we show the modal only if BOTH indicate onboarding is incomplete
    const userNeedsOnboarding = user && !user.onboarding_user_completed;
    const companyDataSaysNotOnboarded = currentCompany && !currentCompany.onboardingCompleted;
    
    // If we have company data and it contradicts user session data, refresh user data
    if (user && currentCompany && !user.onboarding_user_completed && currentCompany.onboardingCompleted) {
      console.log('[ONBOARDING DEBUG] Detected onboarding status mismatch, refreshing user data', {
        userSessionStatus: user.onboarding_user_completed,
        companyApiStatus: currentCompany.onboardingCompleted
      });
      
      // Refresh user data to get the latest onboarding status
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      // Only refresh user data, return early to avoid showing modal
      return;
    }
    
    // Only show modal if user needs onboarding according to ALL data sources
    if (userNeedsOnboarding && companyDataSaysNotOnboarded) {
      setShowModal(true);
    } else {
      // Ensure modal is closed if user is onboarded
      setShowModal(false);
    }
  }, [user, currentCompany]);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1">
        {children}
      </div>
      
      {/* Include the onboarding modal for all pages */}
      <AnimatedOnboardingModal 
        isOpen={showModal}
        setShowModal={setShowModal}
        user={user}
        currentCompany={currentCompany || { id: 1, name: "Your Company" }}
      />
    </div>
  );
}

interface TaskFilterParams {
  task: any;
  userId: number;
  userEmail: string;
  activeTab?: string;
}

/**
 * Utility function to determine if a task should be shown to the user
 * based on task assignment and active tab
 */
export function shouldShowTask({ task, userId, userEmail, activeTab = 'my-tasks' }: TaskFilterParams): boolean {
  // Always show company-wide tasks (like KYB) in My Tasks if they belong to user's company
  if (task.task_scope === 'company' && activeTab === 'my-tasks') {
    return true;
  }

  // For user-specific tasks
  if (activeTab === 'my-tasks') {
    return task.assigned_to === userId || 
           (task.user_email && task.user_email.toLowerCase() === userEmail.toLowerCase());
  }

  // For "For Others" tab, show tasks not assigned to current user
  if (activeTab === 'for-others') {
    return task.assigned_to !== userId && task.task_scope !== 'company';
  }

  return false;
}