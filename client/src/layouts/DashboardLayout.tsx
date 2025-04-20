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
import { getOptimizedQueryOptions } from "@/lib/queryClient";

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

  // Use the optimized query options for frequently accessed endpoints
  // But make sure we use aggressive refetching settings to reflect unlocked features
  const { data: currentCompany, isLoading: isLoadingCompany, refetch: refetchCompany } = useQuery<Company>({
    queryKey: ["/api/companies/current"],
    ...getOptimizedQueryOptions("/api/companies/current"),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0, // Consider data stale immediately to ensure fresh data
    
    // Reduced polling frequency to reduce server load
    // We rely on WebSocket events for real-time updates instead
    refetchInterval: 10000, // Poll every 10 seconds as a fallback
  });
  
  // Listen for WebSocket events to refresh company data in real-time
  useEffect(() => {
    // Handler for WebSocket connection status changes
    const handleWebSocketReconnect = () => {
      console.log('[DashboardLayout] WebSocket reconnected, refreshing company data');
      queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
      refetchCompany();
    };
    
    // Handler for company tabs updates via WebSocket
    const handleCompanyTabsUpdate = (event: CustomEvent) => {
      const { companyId, availableTabs, cacheInvalidation } = event.detail || {};
      
      console.log('[DashboardLayout] Received company-tabs-updated event:', {
        companyId,
        availableTabs,
        cacheInvalidation,
        currentCompanyId: currentCompany?.id
      });
      
      // Only process if it affects the current company
      if (companyId === currentCompany?.id) {
        console.log('[DashboardLayout] Processing update for current company');
        
        // For critical updates with cache_invalidation, be more aggressive
        if (cacheInvalidation) {
          console.log('[DashboardLayout] Critical update detected, forcing refetch');
          queryClient.removeQueries({ queryKey: ['/api/companies/current'] });
          refetchCompany();
        } else {
          // Standard invalidation for normal updates
          queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
        }
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
      console.log('[DashboardLayout] Waiting for company data...');
      return;
    }

    const currentTab = getCurrentTab();
    if (currentTab !== 'task-center' && !isRouteAccessible()) {
      console.log('[DashboardLayout] Route not accessible, redirecting to task-center');
      navigate('/task-center');
    }
  }, [location, currentCompany?.available_tabs, navigate, isLoadingCompany]);
  
  // Subscribe to WebSocket events for real-time company tab updates
  useEffect(() => {
    const subscriptions: Array<() => void> = [];
    
    const setupWebSocketSubscriptions = async () => {
      try {
        // Import WebSocket service
        const { wsService } = await import('@/lib/websocket');
        
        // Subscribe to company tabs updates with enhanced handler
        const unsubTabsUpdate = await wsService.subscribe('company_tabs_updated', (data: any) => {
          console.log(`[DashboardLayout] 🔄 Received company_tabs_updated event:`, data);
          
          // If we don't have company data yet, force a refresh
          if (!currentCompany) {
            console.log(`[DashboardLayout] No current company loaded, forcing full refresh`);
            refetchCompany();
            return;
          }
          
          // Log detailed information for debugging
          console.log(`[DashboardLayout] Current company: ${currentCompany?.id} (${currentCompany?.available_tabs?.join(', ')})`);
          console.log(`[DashboardLayout] Update for company: ${data.companyId} (${data.availableTabs?.join(', ')})`);
          
          // IMPORTANT: Always force a refetch to ensure the UI is up-to-date
          // This ensures we catch updates even if company IDs don't match (multiple companies per user)
          console.log(`[DashboardLayout] 🔄 Forcing company data refetch due to tab update`);
          
          // Critical: Invalidate the cache for the /api/companies/current endpoint
          // This ensures the next refetch will get fresh data from the server
          queryClient.invalidateQueries({ queryKey: ["/api/companies/current"] });
          
          // Force an immediate refetch to update the UI
          refetchCompany();
        });
        
        subscriptions.push(unsubTabsUpdate);
        
        // Also subscribe to connection status events to maintain reliable connection
        const unsubConnStatus = await wsService.subscribe('connection_status', (data: any) => {
          if (data.status === 'connected') {
            console.log(`[DashboardLayout] WebSocket reconnected, refreshing company data`);
            refetchCompany();
          }
        });
        
        subscriptions.push(unsubConnStatus);
      } catch (error) {
        console.error('[DashboardLayout] Error setting up WebSocket subscriptions:', error);
      }
    };
    
    // Set up WebSocket subscriptions immediately, don't wait for company data
    // This ensures we catch updates even during initial loading
    setupWebSocketSubscriptions();
    
    return () => {
      // Cleanup subscriptions when component unmounts
      subscriptions.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('[DashboardLayout] Error unsubscribing from WebSocket:', error);
        }
      });
    };
  }, [refetchCompany, currentCompany?.id]); // Intentionally re-subscribing when company ID changes to ensure proper context

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
    <div className="min-h-screen bg-[#FAFCFD] relative">
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
            "px-4 sm:px-6 md:px-8 py-4",
            "transition-all duration-300 ease-in-out",
            "container mx-auto max-w-full"
          )}>
            {children}
          </div>
        </main>
      </div>

      <WelcomeModal />
    </div>
  );
}