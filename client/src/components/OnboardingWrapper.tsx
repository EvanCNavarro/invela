import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { AnimatedOnboardingModal } from "@/components/modals/AnimatedOnboardingModal";
import { useQuery } from "@tanstack/react-query";

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
  
  // State for showing the onboarding modal - with localStorage backup
  const [showModal, setShowModal] = React.useState(false);
  // Fetch current company data only for display purposes
  const { data: currentCompany } = useQuery({
    queryKey: ['/api/companies/current'],
    enabled: !!user && showModal, // Only fetch if we need to show the modal
  });
  
  // Simpler approach: Check localStorage first on initial render
  // This prevents the modal from showing if the user has completed onboarding
  // in this browser before - even if the session data hasn't been updated
  React.useEffect(() => {
    if (!user) return;
    
    try {
      // Get completed status from localStorage
      const hasCompletedOnboarding = localStorage.getItem(`onboarding_completed_${user.id}`) === 'true';
      
      if (hasCompletedOnboarding) {
        console.log('[ONBOARDING DEBUG] User already completed onboarding according to localStorage');
        // If localStorage says onboarding is complete, never show the modal
        setShowModal(false);
      } else if (!user.onboarding_user_completed) {
        // Only show if user object says onboarding is incomplete AND localStorage doesn't override
        console.log('[ONBOARDING DEBUG] Showing onboarding modal - not completed according to user object and localStorage');
        setShowModal(true);
      }
    } catch (err) {
      console.error('[ONBOARDING DEBUG] Error checking localStorage:', err);
      // Fallback to user object if localStorage fails
      setShowModal(!user.onboarding_user_completed);
    }
  }, [user]);
  
  // Function to manually mark onboarding as completed via form submission
  // This will be exposed for external use (e.g. from KYB form completion)
  const markOnboardingCompleted = React.useCallback(() => {
    if (!user) return;
    
    console.log('[ONBOARDING DEBUG] Manually marking onboarding as completed');
    
    // Update localStorage to prevent future modal displays
    try {
      localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
    } catch (err) {
      console.error('[ONBOARDING DEBUG] Failed to update localStorage:', err);
    }
    
    // Close modal immediately
    setShowModal(false);
  }, [user]);
  
  // Expose the markOnboardingCompleted function via window for form callbacks
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).markOnboardingCompleted = markOnboardingCompleted;
    }
    
    return () => {
      // Cleanup
      if (typeof window !== 'undefined') {
        delete (window as any).markOnboardingCompleted;
      }
    };
  }, [markOnboardingCompleted]);

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