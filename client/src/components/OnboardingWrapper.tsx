import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { AnimatedOnboardingModal } from "@/components/modals/AnimatedOnboardingModal";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useUnifiedWebSocket } from "@/hooks/use-unified-websocket";

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
  const { isConnected, subscribe, unsubscribe } = useUnifiedWebSocket();
  
  // State for showing the onboarding modal - with localStorage backup
  const [showModal, setShowModal] = React.useState(false);
  // Fetch current company data only for display purposes
  const { data: currentCompany } = useQuery({
    queryKey: ['/api/companies/current'],
    enabled: !!user && showModal, // Only fetch if we need to show the modal
  });
  
  // WebSocket connection status monitoring - only log actual changes
  const prevConnectedRef = React.useRef(isConnected);
  React.useEffect(() => {
    if (prevConnectedRef.current !== isConnected) {
      console.log(`[OnboardingWrapper] WebSocket ${isConnected ? 'connected' : 'disconnected'} - modal rendering ${isConnected ? 'enabled' : 'disabled'}`);
      prevConnectedRef.current = isConnected;
    }
  }, [isConnected]);

  // Enhanced onboarding check with demo persona session refresh
  React.useEffect(() => {
    if (!user) return;
    
    const handleOnboardingCheck = async () => {
      try {
        // Use a single consistent localStorage key format for all onboarding status checks
        const localStorageKey = `onboarding_completed_${user.id}`;
        const hasCompletedOnboardingLocal = localStorage.getItem(localStorageKey) === 'true';
        
        // Log detailed information about the onboarding status check
        console.log('[OnboardingWrapper] Checking onboarding status', {
          userId: user.id,
          databaseStatus: user.onboarding_user_completed ? 'completed' : 'not completed',
          localStorageStatus: hasCompletedOnboardingLocal ? 'completed' : 'not stored or not completed',
          showModal: !user.onboarding_user_completed && !hasCompletedOnboardingLocal
        });
        
        // For demo users: Check if there's a database/session data mismatch and refresh if needed
        if (!user.onboarding_user_completed && (user as any).is_demo_user && (user as any).demo_persona_type !== 'new-data-recipient') {
          console.log('[OnboardingWrapper] Detected potential session cache issue for demo persona - refreshing user data');
          
          // Invalidate and refetch user data to get fresh onboarding status from database
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
          
          // Brief delay to allow the refetch to complete
          await new Promise(resolve => setTimeout(resolve, 500));
          return; // Exit early to let the refreshed data trigger this effect again
        }
        
        // Clear decision logic: 
        // 1. If user is marked as onboarded in database, never show modal
        // 2. If user has completed onboarding according to localStorage, never show modal
        // 3. Otherwise, show the modal
        const shouldShowModal = !user.onboarding_user_completed && !hasCompletedOnboardingLocal;
        setShowModal(shouldShowModal);
      } catch (err) {
        console.error('[OnboardingWrapper] Error checking localStorage:', err);
        // Fallback to just the database flag if localStorage access fails
        setShowModal(!user.onboarding_user_completed);
      }
    };
    
    handleOnboardingCheck();
  }, [user, currentCompany]);
  
  // Function to manually mark onboarding as completed via form submission
  // This function can be called from other components, forms, or exposed to window
  const markOnboardingCompleted = React.useCallback(async () => {
    if (!user) return;
    
    console.log('[OnboardingWrapper] Manually marking onboarding as completed', {
      userId: user.id,
      method: 'manual',
    });
    
    // First update localStorage with our standard key format
    try {
      const localStorageKey = `onboarding_completed_${user.id}`;
      localStorage.setItem(localStorageKey, 'true');
      console.log('[OnboardingWrapper] Successfully updated localStorage onboarding status');
    } catch (err) {
      console.error('[OnboardingWrapper] Failed to update localStorage:', err);
    }
    
    // Also call the API endpoint to ensure database is updated
    // This is important for cross-device consistency
    try {
      const response = await fetch('/api/users/complete-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        console.log('[OnboardingWrapper] Successfully updated onboarding status in database');
      } else {
        console.error('[OnboardingWrapper] API call to complete onboarding failed:', 
          await response.text());
      }
    } catch (err) {
      console.error('[OnboardingWrapper] Error calling complete-onboarding API:', err);
    }
    
    // Close modal immediately regardless of API call result
    // The localStorage flag will prevent showing the modal on next load
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
      
      {/* Include the onboarding modal for all pages - only render when WebSocket is connected to prevent race conditions */}
      {isConnected && (
        <AnimatedOnboardingModal 
          isOpen={showModal}
          setShowModal={setShowModal}
          user={user as any}
          currentCompany={(currentCompany || { id: 1, name: "Your Company", onboarding_company_completed: false }) as any}
        />
      )}
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