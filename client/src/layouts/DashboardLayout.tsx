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
  const queryClient = useQueryClient();

  // Use the optimized query options for frequently accessed endpoints
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    ...getOptimizedQueryOptions("/api/tasks"),
  });

  // Use WebSocket-driven company data (eliminates HTTP polling)
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
        currentAvailableTabs: currentCompany?.available_tabs
      });
      
      // Only process if it affects the current company
      if (companyId === currentCompany?.id) {
        console.log('[DashboardLayout] Processing update for current company');
        
        // Enhanced approach with better cache handling:
        // 1. Remove the cached data first
        queryClient.removeQueries({ queryKey: ['/api/companies/current'] });
        
        // 2. Immediately update the cache with the new tabs - this provides instant UI feedback
        //    even before the API refetch completes
        if (currentCompany && Array.isArray(availableTabs)) {
          console.log('[DashboardLayout] Directly updating query cache with new tabs:', availableTabs);
          
          queryClient.setQueryData(['/api/companies/current'], {
            ...currentCompany,
            available_tabs: availableTabs
          });
        }
        
        // 3. Still refetch from the server to ensure full sync
        console.log('[DashboardLayout] Also refetching company data from server for complete sync');
        queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
        refetchCompany();
      }
    };
    
    // Register event listeners
    window.addEventListener('websocket-reconnected', handleWebSocketReconnect);
    window.addEventListener('company-tabs-updated', handleCompanyTabsUpdate as EventListener);
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('websocket-reconnected', handleWebSocketReconnect);
      window.removeEventListener('company-tabs-updated', handleCompanyTabsUpdate as EventListener);
    };
  }, [currentCompany?.id, queryClient, refetchCompany]);

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

  // All routes are now accessible by default - we've removed the locking logic
  const isRouteAccessible = () => {
    // Log the current tab and available tabs for debugging purposes only
    const availableTabs = currentCompany?.available_tabs || ['task-center'];
    const currentTab = getCurrentTab();
    
    console.log('[DashboardLayout] Checking route access:', {
      currentTab,
      availableTabs,
      isLoadingCompany
    });

    // Always return true - all tabs are accessible
    console.log(`[DashboardLayout] Tab "${currentTab}" accessible: true`);
    
    return true;
  };

  // Add redirection functionality to automatically redirect users from locked tabs to the Task Center
  useEffect(() => {
    if (!isLoadingCompany && currentCompany) {
      const availableTabs = currentCompany?.available_tabs || ['task-center'];
      const currentTab = getCurrentTab();
      
      // Check if the current tab is accessible
      const isCurrentTabAccessible = currentTab === 'task-center' || 
        availableTabs.includes(currentTab) || 
        (currentTab === 'risk-score-configuration' && availableTabs.includes('risk-score'));
      
      // If the current tab is not accessible, redirect to the Task Center
      if (!isCurrentTabAccessible) {
        console.log(`[DashboardLayout] Tab "${currentTab}" is locked. Redirecting to task-center.`);
        navigate('/task-center');
      }
    }
  }, [currentCompany, isLoadingCompany, location, navigate]);
  
  // Override tab visibility on route change to prevent any flickering issues
  useEffect(() => {
    const stopFlickering = () => {
      const company = queryClient.getQueryData(['/api/companies/current']) as any;
      if (company && location.includes('file-vault') && !company.available_tabs?.includes('file-vault')) {
        console.log('[DashboardLayout] CRITICAL FIX: Correcting file-vault visibility in navigation');
        
        // If we're on the file-vault route but it's not in available tabs, add it
        queryClient.setQueryData(['/api/companies/current'], {
          ...company,
          available_tabs: [...(company.available_tabs || []), 'file-vault']
        });
      }
    };
    
    // Check multiple times with decreasing frequency
    stopFlickering();
    const timer1 = setTimeout(stopFlickering, 50);
    const timer2 = setTimeout(stopFlickering, 200);
    const timer3 = setTimeout(stopFlickering, 500);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [location, queryClient]);

  // We've removed the locked section screen
  // All sections are now accessible by default

  return (
    <div className="min-h-screen bg-[#FAFCFD] relative flex flex-col">
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

      {/* Fixed navbar that spans across the entire width minus sidebar */}
      <header 
        className={cn(
          "fixed top-0 right-0 z-30 h-14 bg-background/90 backdrop-blur-sm border-b flex-shrink-0",
          "transition-all duration-300 ease-in-out",
          isExpanded ? "left-64" : "left-20"
        )}
      >
        <TopNav />
      </header>

      {/* Content area with proper spacing for fixed navbar */}
      <div
        className={cn(
          "min-h-screen flex flex-col pt-14 transition-all duration-300 ease-in-out", 
          isExpanded ? "ml-64" : "ml-20"
        )}
      >
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className={cn(
            "px-4 sm:px-6 md:px-8 py-4",
            "transition-all duration-300 ease-in-out",
            "container mx-auto max-w-full flex-1 flex flex-col"
          )}>
            {children}
          </div>
        </main>
      </div>

      <WelcomeModal />
      

    </div>
  );
}