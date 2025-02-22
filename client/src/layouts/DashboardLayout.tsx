import { useLocation, useRoute } from "wouter";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Lock } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useEffect } from "react";
import { WelcomeModal } from "@/components/modals/WelcomeModal";

interface Company {
  available_tabs: string[];
  id: number;
}

interface Task {
  id: number;
  company_id: number;
  assigned_to?: number;
  created_by: number;
  task_scope: 'user' | 'company';
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isExpanded, toggleExpanded } = useSidebarStore();
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [, taskCenterParams] = useRoute('/task-center*');
  const queryClient = useQueryClient();

  // Fetch tasks for notification count
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  // Fetch current company data
  const { data: currentCompany } = useQuery<Company>({
    queryKey: ["/api/companies/current"],
  });

  // Filter tasks for notification count
  const relevantTasks = tasks.filter(task => {
    // Only include tasks for the current company
    if (task.company_id !== currentCompany?.id) {
      return false;
    }

    // Include tasks that are either:
    // 1. Assigned to the current user
    // 2. Company-wide tasks for the user's company
    // 3. Created by the user but either unassigned or assigned to others
    return (
      task.assigned_to === user?.id || 
      (task.task_scope === "company" && task.company_id === currentCompany?.id) ||
      (task.created_by === user?.id && (!task.assigned_to || task.assigned_to !== user?.id))
    );
  });

  // Get the current route's tab name
  const getCurrentTab = () => {
    const path = location.split('/')[1] || 'dashboard';
    return path === '' ? 'dashboard' : path;
  };

  // Check if current route is accessible
  const isRouteAccessible = () => {
    if (!currentCompany?.available_tabs) return false;
    const currentTab = getCurrentTab();
    return currentCompany.available_tabs.includes(currentTab);
  };

  // Handle navigation for inaccessible routes
  useEffect(() => {
    const currentTab = getCurrentTab();
    if (currentTab !== 'task-center' && !isRouteAccessible()) {
      navigate('/task-center');
    }
  }, [location, currentCompany?.available_tabs, navigate]);

  // Show locked section if current route is not accessible
  if (!isRouteAccessible() && getCurrentTab() !== 'task-center') {
    console.log('[DashboardLayout] Showing locked section:', {
      location,
      currentTab: getCurrentTab(),
      availableTabs: currentCompany?.available_tabs
    });
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4 px-4">
          <Lock className="w-12 h-12 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-semibold">Section Locked</h1>
          <p className="text-muted-foreground max-w-md">
            Complete tasks in the Task Center to unlock more features.
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
          notificationCount={relevantTasks.length}
          showInvelaTabs={false}
          isPlayground={false}
          variant="default"
        />
      </aside>

      <div className="flex-1 flex flex-col min-h-screen relative">
        <div className={cn(
          "fixed top-0 right-0 z-30 backdrop-blur-sm bg-background/80",
          "transition-all duration-300 ease-in-out",
          isExpanded ? "left-64" : "left-20"
        )}>
          <TopNav />
        </div>

        <main className="flex-1 pt-16">
          <div className="px-8 py-4 w-full overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>

      <WelcomeModal />
    </div>
  );
}