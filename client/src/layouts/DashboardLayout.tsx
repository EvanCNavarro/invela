import { useLocation, useRoute, useNavigate } from "wouter";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useEffect } from "react";
import { WelcomeModal } from "@/components/modals/WelcomeModal";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isExpanded, toggleExpanded } = useSidebarStore();
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [, taskCenterParams] = useRoute('/task-center');
  const isTaskCenter = taskCenterParams !== null;

  // Fetch tasks for notification count
  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
  });

  // New user who hasn't completed onboarding
  const isNewUser = user?.onboardingCompleted === false;

  // Handle navigation for new users
  useEffect(() => {
    if (isNewUser) {
      // List of locked routes for new users
      const lockedRoutes = ['/', '/network', '/file-vault', '/insights'];

      // If user is on a locked route, redirect to task center
      if (lockedRoutes.includes(location)) {
        navigate('/task-center');
      }

      // If user just logged in and lands on dashboard (root), redirect to task center
      if (location === '/') {
        navigate('/task-center');
      }
    }
  }, [isNewUser, location, navigate]);

  // Only allow task center for new users
  if (isNewUser && !isTaskCenter) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4 px-4">
          <Lock className="w-12 h-12 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-semibold">Section Locked</h1>
          <p className="text-muted-foreground max-w-md">
            Complete your onboarding tasks in the Task Center to unlock all features.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[hsl(220,33%,97%)]">
      <aside className={cn(
        "shrink-0 sticky top-0 z-40 h-screen transition-all duration-300 ease-in-out",
        isExpanded ? "w-64" : "w-20"
      )}>
        <Sidebar 
          isExpanded={isExpanded}
          onToggleExpanded={toggleExpanded}
          isNewUser={isNewUser}
          notificationCount={tasks.length}
          showInvelaTabs={false}
          isPlayground={false}
        />
      </aside>

      <div className="flex-1 flex flex-col min-h-screen relative">
        <div className={cn(
          "fixed top-0 right-0 z-30 backdrop-blur-sm bg-background/80",
          "transition-all duration-300 ease-in-out",
          isExpanded 
            ? "left-64" 
            : "left-20"
        )}>
          <TopNav />
        </div>

        <main className="flex-1 pt-16">
          <div className="px-6 md:px-8 py-4 w-full overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>

      <WelcomeModal />
    </div>
  );
}