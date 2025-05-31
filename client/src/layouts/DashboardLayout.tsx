import { useLocation, useRoute } from "wouter";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useEffect } from "react";
import { WelcomeModal } from "@/components/modals/EmptyWelcomeModal";
import { getOptimizedQueryOptions } from "@/lib/queryClient";
import { useCurrentCompany } from "@/hooks/use-current-company";

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

  // Use the optimized query options for tasks (keeping HTTP for tasks for now)
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    ...getOptimizedQueryOptions("/api/tasks"),
  });

  // Use WebSocket-driven company data (eliminates all HTTP polling)
  const { company: currentCompany, isLoading: isLoadingCompany } = useCurrentCompany();

  // WebSocket-driven company tab updates (eliminated HTTP polling)
  useEffect(() => {
    // Handler for company tabs updates via WebSocket
    const handleCompanyTabsUpdate = (event: CustomEvent) => {
      const { companyId, availableTabs, cacheInvalidation } = event.detail || {};
      
      console.log('[DashboardLayout] Received company tabs update event:', {
        companyId,
        availableTabs,
        cacheInvalidation,
        eventType: event.type,
        currentCompanyId: currentCompany?.id,
      });

      // Only process if it's relevant to current company
      if (companyId && currentCompany?.id && companyId === currentCompany.id) {
        console.log('[DashboardLayout] Processing relevant company tabs update for company:', companyId);
        
        // Update company data via WebSocket-driven mechanisms only
        console.log('[DashboardLayout] Company tabs updated via WebSocket:', availableTabs);
      }
    };

    // Listen for company tabs update events
    window.addEventListener('company-tabs-update', handleCompanyTabsUpdate as EventListener);

    // Cleanup event listener
    return () => {
      window.removeEventListener('company-tabs-update', handleCompanyTabsUpdate as EventListener);
    };
  }, [currentCompany?.id]);

  // Check if current route requires authentication and company data
  useEffect(() => {
    // Only check for company loading and redirect logic if we have user but no company
    if (user && !isLoadingCompany && !currentCompany) {
      console.log('[DashboardLayout] User authenticated but no company data available');
      // Allow the app to continue - WebSocket data may be loading
    }
  }, [user, currentCompany, isLoadingCompany]);

  // Filter tasks for current user and company
  const userTasks = Array.isArray(tasks) ? tasks.filter((task: Task) => {
    if (!user || !currentCompany) return false;
    
    // Show tasks if user is assigned or if it's a company-scoped task for their company
    return (task.assigned_to === user.id) || 
           (task.task_scope === 'company' && task.company_id === currentCompany.id);
  }) : [];

  // Split path to check which section we're in
  const pathSegments = location.split('/').filter(Boolean);
  const currentSection = pathSegments[0] || '';

  // Determine available tabs based on WebSocket-driven company data
  const availableTabs = currentCompany?.available_tabs || [];

  // Check if user has access to current route
  const hasAccess = (path: string): boolean => {
    if (!user || !currentCompany) return false;
    
    // Always allow root dashboard
    if (path === '' || path === 'dashboard') return true;
    
    // Check specific tab access
    if (path === 'file-vault') return availableTabs.includes('file-vault');
    if (path === 'task-center') return availableTabs.includes('task-center');
    if (path.startsWith('tasks/') && userTasks.length > 0) return true;
    
    return false;
  };

  // Redirect logic for unauthorized access
  useEffect(() => {
    if (!isLoadingCompany && currentCompany && !hasAccess(currentSection)) {
      console.log(`[DashboardLayout] Access denied to ${currentSection}, redirecting to root`);
      navigate('/');
    }
  }, [currentSection, currentCompany, isLoadingCompany, navigate]);

  // Show loading state while company data is being fetched via WebSocket
  if (isLoadingCompany || !currentCompany) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading company data...</p>
        </div>
      </div>
    );
  }

  // Show access denied for unauthorized sections
  if (!hasAccess(currentSection)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <Lock className="h-16 w-16 text-muted-foreground mx-auto" />
          <div>
            <h2 className="text-xl font-semibold">Access Restricted</h2>
            <p className="text-muted-foreground">
              You don't have permission to access this section.
            </p>
            <button 
              onClick={() => navigate('/')}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        isExpanded={isExpanded}
        onToggleExpanded={toggleExpanded}
        availableTabs={availableTabs}
        category={currentCompany?.category}
      />
      
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-200",
        isExpanded ? "ml-64" : "ml-16"
      )}>
        <TopNav 
          currentCompany={currentCompany}
          isLoadingCompany={isLoadingCompany}
        />
        
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      
      <WelcomeModal />
    </div>
  );
}