import { useLocation, useRoute } from "wouter";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { queryClient, queryKeys, fetchCompanyData, registerCriticalQueries } from "@/lib/queryClient";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useEffect } from "react";
import { WelcomeModal } from "@/components/modals/WelcomeModal";

interface Company {
  id: number;
  available_tabs: string[];
  category?: string;
  name: string;
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

  // Ensure queries are properly registered when the layout mounts
  useEffect(() => {
    console.log('[DashboardLayout] Ensuring critical queries are registered');
    registerCriticalQueries();
  }, []);

  // Log detailed information about company data loading
  const isInitialRender = !queryClient.getQueryState(queryKeys.currentCompany())?.dataUpdateCount;
  if (isInitialRender || process.env.NODE_ENV !== 'production') {
    console.log('[DashboardLayout] ⏳ Attempting to load company data', {
      timestamp: new Date().toISOString(),
      userAuthenticated: !!user,
      userId: user?.id
    });
  }

  // Use the company data query with better options
  const { data: currentCompany, isLoading: isLoadingCompany } = useQuery<Company>({
    queryKey: queryKeys.currentCompany(),
    queryFn: fetchCompanyData,
    refetchInterval: process.env.NODE_ENV === 'production' ? 60000 : 5000, // Less frequent in production
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Handle refetching explicitly to avoid "Missing queryFn" errors
    refetchOnWindowFocus: true,
  });

  // Log when company data is loaded
  useEffect(() => {
    if (currentCompany && (isInitialRender || process.env.NODE_ENV !== 'production')) {
      console.log('[DashboardLayout] ✅ Company data loaded successfully', {
        timestamp: new Date().toISOString(),
        companyId: currentCompany.id,
        companyName: currentCompany.name,
        availableTabs: currentCompany.available_tabs,
        fromCache: !isInitialRender
      });
    }
  }, [currentCompany, isInitialRender]);

  const relevantTasks = tasks.filter(task => {
    if (!currentCompany || task.company_id !== currentCompany.id) {
      return false;
    }

    return (
      task.assigned_to === user?.id ||
      (task.task_scope === "company" && task.company_id === currentCompany.id) ||
      (task.created_by === user?.id && (!task.assigned_to || task.assigned_to !== user?.id))
    );
  });

  const getCurrentTab = () => {
    const path = location.split('/')[1] || 'dashboard';
    return path === '' ? 'dashboard' : path;
  };

  const isRouteAccessible = () => {
    if (isLoadingCompany || !currentCompany) return true; // Wait for company data
    const availableTabs = currentCompany.available_tabs || ['task-center'];
    const currentTab = getCurrentTab();

    console.log('[DashboardLayout] Checking route access:', {
      currentTab,
      availableTabs,
      isLoadingCompany
    });

    return currentTab === 'task-center' || availableTabs.includes(currentTab);
  };

  useEffect(() => {
    // Skip navigation if company data is not yet loaded
    if (isLoadingCompany || !currentCompany) {
      if (isInitialRender || process.env.NODE_ENV !== 'production') {
        console.log('[DashboardLayout] Waiting for company data...', {
          timestamp: new Date().toISOString(),
          isLoading: isLoadingCompany,
          hasCompanyData: !!currentCompany,
          location
        });
      }
      return;
    }

    const currentTab = getCurrentTab();
    if (currentTab !== 'task-center' && !isRouteAccessible()) {
      console.log('[DashboardLayout] Route not accessible, redirecting to task-center');
      navigate('/task-center');
    }
  }, [location, currentCompany?.available_tabs, navigate, isLoadingCompany, isInitialRender]);

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