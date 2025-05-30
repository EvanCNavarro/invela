import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  HomeIcon,
  CheckCircleIcon,
  FileIcon,
  Network,
  BarChartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MousePointer2Icon,
  Hammer,
  FileText,
  BarChart2,
  Gauge
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { usePlaygroundVisibility } from "@/hooks/use-playground-visibility";
import { SidebarTab } from "./SidebarTab";
import { useEffect, useState } from "react";
import { useUnifiedWebSocket } from "@/hooks/use-unified-websocket";

interface SidebarProps {
  isExpanded: boolean;
  onToggleExpanded: () => void;
  isNewUser?: boolean;
  notificationCount?: number;
  showPulsingDot?: boolean;
  showInvelaTabs?: boolean;
  isPlayground?: boolean;
  variant?: 'default' | 'company-locked';
  availableTabs: string[];
  category?: string;
}

export function Sidebar({
  isExpanded,
  onToggleExpanded,
  isNewUser = false,
  notificationCount = 0,
  showPulsingDot = false,
  showInvelaTabs = false,
  isPlayground = false,
  variant = 'default',
  availableTabs = ['task-center'],
  category
}: SidebarProps) {
  const [location] = useLocation();
  const [taskCount, setTaskCount] = useState(0);
  const queryClient = useQueryClient();
  const { subscribe, unsubscribe } = useUnifiedWebSocket();
  
  // Get current company data
  const { data: company } = useQuery<{ id: number; name: string; available_tabs?: string[] }>({
    queryKey: ['/api/companies/current'],
    enabled: !isPlayground
  });

  // Only fetch real data if not in playground mode
  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
    enabled: !isPlayground,
  });

  // Enhanced monitoring of availableTabs
  useEffect(() => {
    // Note: We're using this verbose logging to diagnose tab unlocking issues
    console.log('[Sidebar] Available tabs updated:', {
      tabs: availableTabs,
      hasFileVault: availableTabs.includes('file-vault'),
      hasDashboard: availableTabs.includes('dashboard'),
      hasTaskCenter: availableTabs.includes('task-center'),
      currentRoute: location,
      company: company?.id
    });
    
    // Verify that file-vault tab visibility matches our route if we're on that page
    if (location.includes('file-vault') && !availableTabs.includes('file-vault')) {
      console.warn('[Sidebar] ⚠️ Potential mismatch: On file-vault route but tab not in availableTabs');
    }
  }, [availableTabs, location, company?.id]);
  
  // IMPROVED: Listen for WebSocket tab unlock updates
  useEffect(() => {
    if (!company?.id) return;
    
    // Define handler for company tabs updates from WebSocket
    const handleTabsUpdate = (data: any) => {
      console.log('[Sidebar] 🔔 WebSocket company_tabs_update received:', data);
      
      // Only process if it's for our company
      if (data.companyId === company.id) {
        // Force immediate data refresh
        queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
        queryClient.refetchQueries({ queryKey: ['/api/companies/current'] });
        
        console.log('[Sidebar] 🔄 Forcing tabs refresh for company ' + company.id);
      }
    };
    
    // Define handler for special immediate sidebar refresh event
    const handleSidebarRefresh = (data: any) => {
      console.log('[Sidebar] 🚀 WebSocket sidebar_refresh_tabs received:', data);
      
      // This is a critical path for IMMEDIATE visual updates
      if (data.companyId === company.id && data.forceRefresh) {
        // Force immediate data refresh
        queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
        queryClient.refetchQueries({ queryKey: ['/api/companies/current'] });
        
        console.log('[Sidebar] 🔥 PRIORITY Tabs refresh triggered');
      }
    };
    
    // Register WebSocket listeners using the subscribe method instead of addMessageHandler
    // Create an array to hold all the unsubscribe functions
    const unsubscribeFunctions: Array<() => void> = [];
    
    // Subscribe to the company_tabs_update event using unified WebSocket
    const unsubCompanyTabsUpdate = subscribe('company_tabs_update', handleTabsUpdate);
    unsubscribeFunctions.push(unsubCompanyTabsUpdate);
    
    // Subscribe to the company_tabs_updated event (alternative format)
    const unsubCompanyTabsUpdated = subscribe('company_tabs_updated', handleTabsUpdate);
    unsubscribeFunctions.push(unsubCompanyTabsUpdated);
    
    // Subscribe to the sidebar_refresh_tabs event
    const unsubSidebarRefresh = subscribe('sidebar_refresh_tabs', handleSidebarRefresh);
    unsubscribeFunctions.push(unsubSidebarRefresh);
    
    // Start polling more frequently when we know an update might be coming
    const intervalId = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
    }, 3000); // Check every 3 seconds instead of 10 seconds
    
    return () => {
      // Unsubscribe from all WebSocket subscriptions
      unsubscribeFunctions.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (e) {
          console.error('[Sidebar] Error unsubscribing from WebSocket:', e);
        }
      });
      
      // Clear the polling interval
      clearInterval(intervalId);
    };
  }, [company?.id, queryClient]);
  
  // IMPROVED: Better tab state management to prevent unlock/lock flickering
  useEffect(() => {
    // Get company ID from context for tracking state changes
    const currentCompanyId = company?.id;
    // Log basic state for debugging
    console.log(`[Sidebar] Tab state check: company=${currentCompanyId}, path=${location}, file-vault-unlocked=${availableTabs.includes('file-vault')}`);
    
    // Handle tab access mismatch
    // If we're on a route that should require access control but isn't in availableTabs
    if (location.includes('file-vault') && !availableTabs.includes('file-vault')) {
      console.log('[Sidebar] 🚨 Access control mismatch: On file-vault route but tab not in availableTabs');
      
      // Get current and last company ID to ensure we're not switching companies
      const lastCompanyId = parseInt(localStorage.getItem('last_company_id') || '0');
      
      // Only refresh tabs data if we're still in the same company
      if (currentCompanyId && lastCompanyId === currentCompanyId) {
        console.log(`[Sidebar] 🔄 Refreshing tab data to verify access rights`);
        
        // Force a refresh of company data to ensure we have the most up-to-date tabs
        queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
        queryClient.refetchQueries({ queryKey: ['/api/companies/current'] });
      } else {
        console.log(`[Sidebar] ⚠️ Company transition detected (${lastCompanyId} → ${currentCompanyId})`);
      }
    }
    
    // Update last company ID for next check
    if (currentCompanyId) {
      try {
        localStorage.setItem('last_company_id', String(currentCompanyId));
      } catch (error) {
        // Ignore localStorage errors
      }
    }
    
    // Check for recent form submissions to ensure proper tab state
    try {
      const lastFormSubmission = localStorage.getItem('lastFormSubmission');
      if (lastFormSubmission) {
        const submission = JSON.parse(lastFormSubmission);
        const submissionTime = new Date(submission.timestamp).getTime();
        const currentTime = new Date().getTime();
        const fiveMinutesAgo = currentTime - (5 * 60 * 1000); // 5 minutes ago
        
        // Only process if the submission is for the current company
        if (submission.companyId === currentCompanyId && submissionTime > fiveMinutesAgo) {
          console.log(`[Sidebar] Recent form submission detected:`, submission);
          
          // Refresh company data to ensure tabs are up-to-date
          queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
        }
      }
    } catch (error) {
      console.error('[Sidebar] Error checking localStorage for form submissions:', error);
    }
  }, [location, availableTabs, queryClient, company?.id]);
  
  // Update taskCount when tasks data changes
  useEffect(() => {
    if (!isPlayground && Array.isArray(tasks)) {
      setTaskCount(tasks.length);
    }
  }, [tasks, isPlayground]);

  // Set up WebSocket subscription for real-time updates
  useEffect(() => {
    if (isPlayground) return;

    const subscriptions: Array<() => void> = [];

    const setupWebSocketSubscriptions = async () => {
      try {
        /**
         * Enhanced task count update handler with proper defensive programming
         * 
         * This handler processes WebSocket messages for task-related events and safely
         * updates the task count display and triggers cache invalidation when needed.
         * 
         * @param {TaskCountData} data - The task count data from WebSocket
         */
        const handleTaskCountUpdate = (data: any) => {
          // Safe logging with explicit type checking to aid debugging
          console.log(`[Sidebar] Processing task update event:`, {
            hasCountObject: !!data?.count,
            taskId: data?.taskId,
            companyId: data?.companyId,
            receivedAt: new Date().toISOString(),
          });
          
          try {
            // FIXED: Add robust null/undefined checking for the count property
            // Only update task count state if we have valid count data
            if (data?.count?.total !== undefined) {
              console.log(`[Sidebar] Updating task count to: ${data.count.total}`);
              setTaskCount(data.count.total);
            }
            
            // FIXED: Add proper defensive checks for company-specific updates
            // Check if this update is relevant to our current company context
            const currentCompanyId = company?.id;
            const updateCompanyId = data?.companyId;
            
            if (currentCompanyId && updateCompanyId && currentCompanyId === updateCompanyId) {
              console.log(`[Sidebar] Invalidating tasks query for company ${currentCompanyId}`);
              queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
            }
          } catch (error) {
            // Log any unexpected errors during processing
            console.error(`[Sidebar] Error processing task update:`, error);
          }
        };
        
        // Subscribe to task creation using unified WebSocket
        const unsubTaskCreate = subscribe('task_created', handleTaskCountUpdate);
        subscriptions.push(unsubTaskCreate);

        // Subscribe to task deletion
        const unsubTaskDelete = subscribe('task_deleted', handleTaskCountUpdate);
        subscriptions.push(unsubTaskDelete);

        // Subscribe to task updates
        const unsubTaskUpdate = subscribe('task_updated', handleTaskCountUpdate);
        subscriptions.push(unsubTaskUpdate);
        
        // CRITICAL FIX: Enhanced WebSocket handling for sidebar updates
        // This function is shared between both event handlers to ensure consistent behavior
        const handleCompanyTabsUpdate = (data: any, eventName: string) => {
          console.log(`[Sidebar] Received ${eventName} event:`, data);
          
          // First, check if this is for our company
          if (company && data.companyId === company.id) {
            // Log detailed info for debugging
            console.log(`[Sidebar] ✅ Matched company ID ${company.id}, processing update`);
            
            // Check if availableTabs is an array
            if (Array.isArray(data.availableTabs)) {
              console.log(`[Sidebar] 📋 Received tabs update:`, data.availableTabs);
              
              // Check if file-vault is included in the tabs
              const hasFileVault = data.availableTabs.includes('file-vault');
              console.log(`[Sidebar] File vault tab is ${hasFileVault ? 'included' : 'not included'} in update`);
              
              // Force immediate cache invalidation to ensure sidebar gets refreshed
              console.log(`[Sidebar] 🔄 Invalidating and refetching company data`);
              
              // First remove any stale data
              queryClient.removeQueries({ queryKey: ['/api/companies/current'] });
              
              // Then trigger an immediate refetch
              queryClient.fetchQuery({ queryKey: ['/api/companies/current'] })
                .then(() => {
                  console.log(`[Sidebar] ✅ Company data refreshed successfully`);
                })
                .catch(error => {
                  console.error(`[Sidebar] ❌ Error refreshing company data:`, error);
                  // Fallback to a standard refetch
                  queryClient.refetchQueries({ queryKey: ['/api/companies/current'] });
                });
            } else {
              console.warn(`[Sidebar] ⚠️ Received ${eventName} but availableTabs is not an array:`, data.availableTabs);
              // Still try to refresh the data in case it's a format issue
              queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
              queryClient.refetchQueries({ queryKey: ['/api/companies/current'] });
            }
          } else {
            console.log(`[Sidebar] Ignoring ${eventName} for different company: ${data.companyId} (our ID: ${company?.id})`);
          }
        };
        
        // Subscribe to company tabs updates - both event names for compatibility
        const unsubCompanyTabsUpdate = subscribe('company_tabs_update', (data: any) => {
          handleCompanyTabsUpdate(data, 'company_tabs_update');
        });
        subscriptions.push(unsubCompanyTabsUpdate);
        
        // Also subscribe to the alternative event name
        const unsubCompanyTabsUpdated = subscribe('company_tabs_updated', (data: any) => {
          handleCompanyTabsUpdate(data, 'company_tabs_updated');
        });
        subscriptions.push(unsubCompanyTabsUpdated);
        
        // Listen for form submission events that may affect tab access
        const unsubFormSubmitted = subscribe('form_submitted', (data: any) => {
          console.log(`[Sidebar] Received form_submitted event:`, data);
          
          // Only process events for our company
          if (company && data.companyId === company.id) {
            console.log(`[Sidebar] Form submitted for our company ${company.id}`);
            
            // Always refresh company data after a form submission
            // This ensures tab access rights are up-to-date
            queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
            
            // Store form submission in localStorage for backup tab access verification
            try {
              localStorage.setItem('lastFormSubmission', JSON.stringify({
                companyId: data.companyId,
                taskId: data.taskId,
                formType: data.formType,
                unlockedTabs: data.unlockedTabs || [],
                timestamp: new Date().toISOString()
              }));
            } catch (error) {
              // Ignore storage errors
            }
          }
        });
        subscriptions.push(unsubFormSubmitted);
      } catch (error) {
        console.error('Error setting up WebSocket subscriptions:', error);
      }
    };

    setupWebSocketSubscriptions();

    return () => {
      subscriptions.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from WebSocket:', error);
        }
      });
    };
  }, [isPlayground, queryClient, company?.id]);

  const menuItems = [
    {
      icon: HomeIcon,
      label: "Dashboard",
      href: "/",
      locked: !availableTabs.includes('dashboard')
    },
    {
      icon: CheckCircleIcon,
      label: "Task Center",
      href: "/task-center",
      locked: false, // Task Center is never locked
      count: isPlayground ? notificationCount : taskCount
    },
    {
      icon: Network,
      label: "Network",
      href: "/network",
      locked: !availableTabs.includes('network'),
      pulsingDot: showPulsingDot,
      hideForFinTech: true
    },
    {
      icon: FileIcon,
      label: "File Vault",
      href: "/file-vault",
      locked: !availableTabs.includes('file-vault') // Strict database check only
    },
    {
      icon: BarChartIcon,
      label: "Insights",
      href: "/insights",
      locked: !availableTabs.includes('insights')
    },
    {
      icon: FileText,
      label: "Claims",
      href: "/claims",
      locked: !availableTabs.includes('claims'),
      hideForFinTech: true,
      externalLink: false
    },
    {
      icon: Gauge,
      label: "S&P DARS",
      href: "/risk-score-configuration",
      locked: !availableTabs.includes('risk-score-configuration') && !availableTabs.includes('risk-score'),
      hideForFinTech: true
    }
  ];

  // Filter out tabs that should be hidden for FinTech companies
  const visibleMenuItems = category === 'FinTech'
    ? menuItems.filter(item => !item.hideForFinTech)
    : menuItems;

  // Admin menu items (only for Invela users)
  // Playground tab has been removed during cleanup
  const adminMenuItems = [];

  const isInvelaUser = isPlayground ? showInvelaTabs : (category === 'Invela');

  // No playground tab anymore - removed during cleanup

  return (
    <div className={cn(
      "h-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      isExpanded ? "w-64" : "w-20"
    )}>
      {/* Find first unlocked menu item to use as the destination for the logo link */}
      {(() => {
        // Find the first available tab that's not locked
        const firstAvailableTab = [...visibleMenuItems, ...adminMenuItems]
          .find(item => !item.locked);
        
        const logoLinkHref = firstAvailableTab?.href || '/task-center'; // Fallback to task-center
        
        return (
          <Link href={logoLinkHref} className={cn(
            "flex items-center h-16 cursor-pointer hover:bg-muted/50 transition-colors",
            isExpanded ? "px-4" : "justify-center"
          )}>
            <img
              src="/invela-logo.svg"
              alt="Invela Trust Network"
              className="h-6 w-6"
            />
            {isExpanded && (
              <span className="ml-3 font-semibold text-lg text-foreground">Invela Trust Network</span>
            )}
          </Link>
        );
      })()}

      <nav className="mt-8 flex flex-col justify-between h-[calc(100vh-4rem-2rem)]">
        <div className="space-y-1">
          <div>
            {visibleMenuItems.map((item) => (
              <SidebarTab
                key={item.href}
                icon={item.icon}
                label={item.label}
                href={item.href}
                isActive={
                  // Check if current location is the tab or a sub-page of the tab
                  location === item.href || 
                  (item.href !== "/" && location.startsWith(`${item.href}/`))
                }
                isExpanded={isExpanded}
                isDisabled={item.locked}
                notificationCount={item.count}
                showPulsingDot={item.pulsingDot}
                isPlayground={isPlayground}
                externalLink={item.externalLink}
              />
            ))}
          </div>

          {adminMenuItems.length > 0 && (
            <>
              {isExpanded ? (
                <>
                  <div className="mx-5">
                    <Separator className="mt-4 bg-border/60" />
                  </div>
                  <div className="px-5 pt-2 pb-2">
                    <span className="text-[#707F95] text-xs font-medium tracking-wider uppercase">
                      Invela Trust Network Only
                    </span>
                  </div>
                </>
              ) : (
                <div className="mx-5">
                  <Separator className="my-4 bg-border/60" />
                </div>
              )}
              <div className="pt-2">
                {adminMenuItems.map((item) => (
                  <SidebarTab
                    key={item.href}
                    icon={item.icon}
                    label={item.label}
                    href={item.href}
                    isActive={
                      location === item.href || 
                      (item.href !== "/" && location.startsWith(`${item.href}/`))
                    }
                    isExpanded={isExpanded}
                    isDisabled={item.locked}
                    variant="invela"
                    isPlayground={isPlayground}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleExpanded}
          className="mx-4 mb-4 text-foreground/80 hover:text-foreground dark:text-foreground/60 dark:hover:text-foreground"
        >
          {isExpanded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </Button>
      </nav>
    </div>
  );
}