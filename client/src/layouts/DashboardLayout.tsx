import { useLocation, useRoute } from "wouter";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useEffect } from "react";
import { WelcomeModal } from "@/components/modals/WelcomeModal";

interface Company {
  id: number;
  available_tabs: string[];
  category?: string;
}

interface Task {
  id: number;
  company_id: number;
  assigned_to?: number;
  created_by: number;
  task_scope: 'user' | 'company';
  status: string;
  task_type: string;
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isExpanded, toggleExpanded } = useSidebarStore();
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [, taskCenterParams] = useRoute('/task-center*');

  // Add refetchInterval to automatically check for updates
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Add refetchInterval to automatically check for company updates
  const { data: currentCompany, isLoading: isLoadingCompany } = useQuery<Company>({
    queryKey: ["/api/companies/current"],
    refetchInterval: 5000, // Refetch every 5 seconds to catch tab updates
  });

  const relevantTasks = tasks.filter(task => {
    if (task.company_id !== currentCompany?.id) {
      return false;
    }

    return (
      task.assigned_to === user?.id ||
      (task.task_scope === "company" && task.company_id === currentCompany?.id) ||
      (task.created_by === user?.id && (!task.assigned_to || task.assigned_to !== user?.id))
    );
  });

  const getCurrentTab = () => {
    const path = location.split('/')[1] || 'dashboard';
    return path === '' ? 'dashboard' : path;
  };

  const isRouteAccessible = () => {
    if (isLoadingCompany || !currentCompany) return true; // Wait for company data
    const availableTabs = currentCompany.available_tabs;
    const currentTab = getCurrentTab();

    console.log('[DashboardLayout] Checking route access:', {
      currentTab,
      availableTabs,
      isLoadingCompany
    });

    // Dashboard should always be accessible if it's in available_tabs
    if (currentTab === 'dashboard' && availableTabs.includes('dashboard')) {
      return true;
    }

    return currentTab === 'task-center' || availableTabs.includes(currentTab);
  };

  useEffect(() => {
    // Skip navigation if company data is not yet loaded
    if (isLoadingCompany || !currentCompany) {
      console.log('[DashboardLayout] Waiting for company data...');
      return;
    }

    const currentTab = getCurrentTab();
    // Only redirect if the current route is not accessible AND it's not the dashboard
    if (currentTab !== 'dashboard' && currentTab !== 'task-center' && !isRouteAccessible()) {
      console.log('[DashboardLayout] Route not accessible, redirecting to task-center');
      navigate('/task-center');
    }
  }, [location, currentCompany?.available_tabs, navigate, isLoadingCompany]);

  if (!isRouteAccessible() && getCurrentTab() !== 'task-center') {
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
    <div className="min-h-screen bg-[hsl(220,33%,97%)] relative">
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out",
          isExpanded ? "w-64" : "w-20"
        )}
      >
        <div className="h-full bg-background border-r flex flex-col">
          <Sidebar
            isExpanded={isExpanded}
            onToggleExpanded={toggleExpanded}
            notificationCount={relevantTasks.length}
            showInvelaTabs={false}
            isPlayground={false}
            variant="default"
            availableTabs={currentCompany?.available_tabs || ['task-center']}
            category={currentCompany?.category}
          />
        </div>
      </aside>

      <div
        className={cn(
          "min-h-screen flex flex-col transition-all duration-300 ease-in-out",
          isExpanded ? "ml-64" : "ml-20"
        )}
      >
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b">
          <TopNav />
        </header>

        <main className="flex-1 relative overflow-auto">
          <div className={cn(
            "px-8 py-4",
            "transition-all duration-300 ease-in-out",
            "container mx-auto max-w-7xl"
          )}>
            {children}
          </div>
        </main>
      </div>

      <WelcomeModal />
    </div>
  );
}