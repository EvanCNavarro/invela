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
  BarChart2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { usePlaygroundVisibility } from "@/hooks/use-playground-visibility";
import { SidebarTab } from "./SidebarTab";
import { useEffect, useState } from "react";
import { wsService } from "@/lib/websocket";
import { TaskCountData } from "@/lib/types";

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
    
    // Subscribe to the company_tabs_update event
    wsService.subscribe('company_tabs_update', handleTabsUpdate)
      .then(unsubscribe => unsubscribeFunctions.push(unsubscribe))
      .catch(err => console.error('[Sidebar] Failed to subscribe to company_tabs_update:', err));
    
    // Subscribe to the company_tabs_updated event (alternative format)
    wsService.subscribe('company_tabs_updated', handleTabsUpdate)
      .then(unsubscribe => unsubscribeFunctions.push(unsubscribe))
      .catch(err => console.error('[Sidebar] Failed to subscribe to company_tabs_updated:', err));
    
    // Subscribe to the sidebar_refresh_tabs event
    wsService.subscribe('sidebar_refresh_tabs', handleSidebarRefresh)
      .then(unsubscribe => unsubscribeFunctions.push(unsubscribe))
      .catch(err => console.error('[Sidebar] Failed to subscribe to sidebar_refresh_tabs:', err));
    
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
    
    // Special case: If we're already ON the file-vault route but it's not available in tabs
    // This can happen during page loads or when switching between companies
    if (location.includes('file-vault') && !availableTabs.includes('file-vault')) {
      console.log('[Sidebar] 🚨 Tab state mismatch: On file-vault route but tab not in availableTabs');
      
      // CRITICAL: Check that we're not in a company transition (don't force if company ID is changing)
      // This is crucial to prevent incorrect forcing during company switches
      const lastCompanyId = parseInt(localStorage.getItem('last_company_id') || '0');
      
      // Only force if we're still in the same company
      if (currentCompanyId && lastCompanyId === currentCompanyId) {
        console.log(`[Sidebar] ✅ Same company (${currentCompanyId}), safe to force tab visibility`);
        // Force a server refresh to make sure our tabs are up to date
        queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
        queryClient.refetchQueries({ queryKey: ['/api/companies/current'] });
        
        // This is a development-only flag to help us track forced access paths
        document.body.classList.add('file-vault-forced-access');
        
        // Important diagnostic - this helps us see if we're in a mismatch state
        console.log('[SidebarTab] Special case: File Vault tab appears unlocked');
      } else {
        console.log(`[Sidebar] ⚠️ Company transition detected (${lastCompanyId} → ${currentCompanyId}), not forcing tab visibility`);
      }
    } else if (location.includes('file-vault')) {
      // We're on file vault and it's in available tabs - normal state
      document.body.classList.remove('file-vault-forced-access');
    }
    
    // Update last company ID for next check
    if (currentCompanyId) {
      try {
        localStorage.setItem('last_company_id', String(currentCompanyId));
      } catch (error) {
        // Ignore localStorage errors
      }
    }
    
    // Also check for form submission success from localStorage, but only for current company
    try {
      const lastFormSubmission = localStorage.getItem('lastFormSubmission');
      if (lastFormSubmission) {
        const submission = JSON.parse(lastFormSubmission);
        const submissionTime = new Date(submission.timestamp).getTime();
        const currentTime = new Date().getTime();
        const fiveMinutesAgo = currentTime - (5 * 60 * 1000); // 5 minutes ago
        
        // Only process if the submission is for the current company
        if (submission.companyId === currentCompanyId) {
          // If submission was recent (within 5 minutes) and was a KYB form
          if (submissionTime > fiveMinutesAgo && 
              (submission.formType === 'kyb' || submission.formType === 'company_kyb')) {
            console.log(`[Sidebar] 🔑 Recent KYB form submission detected, unlocking File Vault tab:`, submission);
            
            if (!availableTabs.includes('file-vault')) {
              console.log('[Sidebar] 🚨 File Vault tab not in available tabs despite recent KYB form submission');
              // Force a server refresh
              queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
              queryClient.refetchQueries({ queryKey: ['/api/companies/current'] });
            }
          }
        } else {
          console.log(`[Sidebar] Form submission was for company ${submission.companyId}, but current company is ${currentCompanyId}`);
        }
      }
    } catch (error) {
      console.error('[Sidebar] Error checking localStorage for recent form submissions:', error);
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
        // Subscribe to task creation
        const unsubTaskCreate = await wsService.subscribe('task_created', (data: TaskCountData) => {
          if (data.count?.total !== undefined) {
            setTaskCount(data.count.total);
          }
        });
        subscriptions.push(unsubTaskCreate);

        // Subscribe to task deletion
        const unsubTaskDelete = await wsService.subscribe('task_deleted', (data: TaskCountData) => {
          if (data.count?.total !== undefined) {
            setTaskCount(data.count.total);
          }
        });
        subscriptions.push(unsubTaskDelete);

        // Subscribe to task updates
        const unsubTaskUpdate = await wsService.subscribe('task_updated', (data: TaskCountData) => {
          if (data.count?.total !== undefined) {
            setTaskCount(data.count.total);
          }
        });
        subscriptions.push(unsubTaskUpdate);
        
        // CRITICAL FIX: Enhanced WebSocket handling for sidebar updates
        // This function is shared between both event handlers to ensure consistent behavior
        const handleCompanyTabsUpdate = (data: { companyId?: number; availableTabs?: string[] }, eventName: string) => {
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
        const unsubCompanyTabsUpdate = await wsService.subscribe('company_tabs_update', (data: { companyId?: number; availableTabs?: string[] }) => {
          handleCompanyTabsUpdate(data, 'company_tabs_update');
        });
        subscriptions.push(unsubCompanyTabsUpdate);
        
        // Also subscribe to the alternative event name
        const unsubCompanyTabsUpdated = await wsService.subscribe('company_tabs_updated', (data: { companyId?: number; availableTabs?: string[] }) => {
          handleCompanyTabsUpdate(data, 'company_tabs_updated');
        });
        subscriptions.push(unsubCompanyTabsUpdated);
        
        // CRITICAL FIX: Also listen for form submission success events as they often trigger tab changes
        const unsubFormSubmitted = await wsService.subscribe('form_submitted', (data: { unlockedTabs?: string[] }) => {
          console.log(`[Sidebar] Received form_submitted event:`, data);
          
          // Check if this event includes unlockedTabs information
          if (data.unlockedTabs && Array.isArray(data.unlockedTabs) && data.unlockedTabs.length > 0) {
            console.log(`[Sidebar] Form submission unlocked tabs:`, data.unlockedTabs);
            
            // Form submission unlocked tabs, we should refresh company data
            if (data.unlockedTabs.includes('file-vault')) {
              console.log(`[Sidebar] 🚨 File vault tab unlocked, refreshing company data...`);
              queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
              queryClient.refetchQueries({ queryKey: ['/api/companies/current'] });
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
      href: "https://kzmpi00aqgxqa533ay5q.lite.vusercontent.net/claims",
      locked: !availableTabs.includes('claims'),
      hideForFinTech: true,
      externalLink: true
    },
    {
      icon: BarChart2,
      label: "S&P Risk Score",
      href: "https://kzmpi00aqgxqa533ay5q.lite.vusercontent.net/risk-score",
      locked: !availableTabs.includes('risk-score'),
      hideForFinTech: true,
      externalLink: true
    },
    {
      icon: Hammer,
      label: "Builder",
      href: "/builder",
      locked: !availableTabs.includes('builder'),
      hideForFinTech: true
    }
  ];

  // Filter out tabs that should be hidden for FinTech companies
  const visibleMenuItems = category === 'FinTech'
    ? menuItems.filter(item => !item.hideForFinTech)
    : menuItems;

  // Admin menu items (only for Invela users)
  const { isVisible: showPlayground } = usePlaygroundVisibility();
  const adminMenuItems = [];

  const isInvelaUser = isPlayground ? showInvelaTabs : (category === 'Invela');

  if (isInvelaUser && (isPlayground || showPlayground)) {
    adminMenuItems.push({
      icon: MousePointer2Icon,
      label: "Playground",
      href: "/playground",
      locked: !availableTabs.includes('playground')
    });
  }

  return (
    <div className={cn(
      "h-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      isExpanded ? "w-64" : "w-20"
    )}>
      <div className={cn(
        "flex items-center h-16",
        isExpanded ? "px-4" : "justify-center"
      )}>
        <img
          src="/invela-logo.svg"
          alt="Invela"
          className="h-6 w-6"
        />
        {isExpanded && (
          <span className="ml-3 font-semibold text-lg text-foreground">Invela</span>
        )}
      </div>

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
                      Invela Only
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