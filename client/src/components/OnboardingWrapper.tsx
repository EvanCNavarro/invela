import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface OnboardingWrapperProps {
  children: React.ReactNode;
}

export function OnboardingWrapper({ children }: OnboardingWrapperProps) {
  const { user } = useAuth();

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}

export function shouldShowTask(task: any, userId: number, activeTab: string = 'my-tasks'): boolean {
  // Always show company-wide tasks (like KYB) in My Tasks if they belong to user's company
  if (task.task_scope === 'company' && activeTab === 'my-tasks') {
    return true;
  }

  // For user-specific tasks
  if (activeTab === 'my-tasks') {
    return task.assigned_to === userId || task.user_email?.toLowerCase() === user?.email?.toLowerCase();
  }

  // For "For Others" tab, show tasks not assigned to current user
  if (activeTab === 'for-others') {
    return task.assigned_to !== userId && task.task_scope !== 'company';
  }

  return false;
}