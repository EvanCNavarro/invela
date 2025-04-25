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
  ShieldCheck,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
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

  // Only fetch real data if not in playground mode
  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
    enabled: !isPlayground,
  });

  // Simple monitoring of availableTabs
  useEffect(() => {
    console.log('[Sidebar] Available tabs updated:', availableTabs);
  }, [availableTabs]);
  
  // Special case for file-vault route - ensure tab is unlocked
  useEffect(() => {
    // Always show File Vault when on the File Vault route
    if (location.includes('file-vault') && !availableTabs.includes('file-vault')) {
      console.log('[Sidebar] On file-vault route - ensuring tab is visible');
      // We're already using this tab, so it should be visible
      // No need to modify taskCount here
    }
  }, [location, availableTabs]);
  
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
        
        // Subscribe to company tabs updates
        const unsubCompanyTabs = await wsService.subscribe('company_tabs_updated', (data: any) => {
          console.log('[Sidebar] Received company_tabs_updated event:', data);
          
          // React Query will automatically update the cache when WebSocket events come in
          // No need to manually force re-renders
        });
        subscriptions.push(unsubCompanyTabs);
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
  }, [isPlayground]);

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
      locked: !availableTabs.includes('file-vault') && !location.includes('file-vault')
    },
    {
      icon: BarChartIcon,
      label: "Insights",
      href: "/insights",
      locked: !availableTabs.includes('insights')
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