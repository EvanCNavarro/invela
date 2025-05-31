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
import { Separator } from "@/components/ui/separator";
import { usePlaygroundVisibility } from "@/hooks/use-playground-visibility";
import { SidebarTab } from "./SidebarTab";
import { useEffect, useState } from "react";
import { unifiedWebSocketService } from "@/services/websocket-unified";
import { useCurrentCompany } from "@/hooks/use-current-company";

// Task type definition
interface Task {
  id: number;
  title: string;
  status: string;
  progress: number;
}

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
  const [isConnected, setIsConnected] = useState(false);
  
  // Use WebSocket-driven company data instead of HTTP query
  const { company, isLoading: companyLoading, isError: companyError } = useCurrentCompany();
  
  // Monitor WebSocket connection status
  useEffect(() => {
    setIsConnected(unifiedWebSocketService.isConnected());
    unifiedWebSocketService.connect().catch(console.error);
    
    // Listen for connection state changes
    const unsubscribeConnection = unifiedWebSocketService.subscribe('connection_status', (data: any) => {
      setIsConnected(data.connected === true);
    });
    
    return unsubscribeConnection;
  }, []);

  // Get task data via WebSocket subscription
  useEffect(() => {
    const unsubscribeTaskData = unifiedWebSocketService.subscribe('task_data', (data: any) => {
      if (data.tasks && Array.isArray(data.tasks)) {
        setTaskCount(data.tasks.length);
        console.log('[Sidebar] Task count updated from WebSocket:', data.tasks.length);
      }
    });

    const unsubscribeInitialData = unifiedWebSocketService.subscribe('initial_data', (data: any) => {
      if (data.tasks && Array.isArray(data.tasks)) {
        setTaskCount(data.tasks.length);
        console.log('[Sidebar] Initial task count from WebSocket:', data.tasks.length);
      }
    });

    return () => {
      unsubscribeTaskData();
      unsubscribeInitialData();
    };
  }, []);

  // Log current state for debugging
  useEffect(() => {
    const tabs = company?.available_tabs || availableTabs;
    const hasFileVault = tabs.includes('file-vault');
    const hasDashboard = tabs.includes('dashboard');
    const hasTaskCenter = tabs.includes('task-center');
    
    console.log('[Sidebar] Available tabs updated:', {
      tabs,
      hasFileVault,
      hasDashboard,
      hasTaskCenter,
      currentRoute: location
    });
    
    console.log('[Sidebar] Tab state check:', {
      company: company ? `${company.name} (${company.id})` : 'undefined',
      path: location,
      'file-vault-unlocked': localStorage.getItem('file-vault-unlocked') === 'true'
    });
  }, [company, location, availableTabs]);

  // Get playground visibility state
  const { isVisible } = usePlaygroundVisibility();

  // Loading state while WebSocket company data loads
  if (companyLoading && !isPlayground) {
    return (
      <div className={cn(
        "flex flex-col bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300",
        isExpanded ? "w-64" : "w-16"
      )}>
        <div className="p-4">
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-6 rounded"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (companyError && !isPlayground) {
    return (
      <div className={cn(
        "flex flex-col bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300",
        isExpanded ? "w-64" : "w-16"
      )}>
        <div className="p-4">
          <div className="text-red-500 text-sm">WebSocket connection error</div>
        </div>
      </div>
    );
  }

  const tabs = company?.available_tabs || availableTabs;
  const hasFileVault = tabs.includes('file-vault');
  const hasDashboard = tabs.includes('dashboard');
  const hasTaskCenter = tabs.includes('task-center');

  // Check if file vault is unlocked
  const isFileVaultUnlocked = localStorage.getItem('file-vault-unlocked') === 'true';

  return (
    <div
      className={cn(
        "flex flex-col bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300",
        isExpanded ? "w-64" : "w-16"
      )}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className={cn("text-lg font-semibold", !isExpanded && "hidden")}>
            Menu
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpanded}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {isExpanded ? (
              <ChevronLeftIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav className="p-4 space-y-1">
          {/* Dashboard tab */}
          {(hasDashboard || isPlayground) && (
            <SidebarTab
              href="/"
              icon={HomeIcon}
              label="Dashboard"
              isActive={location === "/"}
              notificationCount={isNewUser ? 1 : 0}
              showPulsingDot={showPulsingDot && isNewUser}
              isExpanded={isExpanded}
            />
          )}

          {/* Task Center tab */}
          {(hasTaskCenter || isPlayground) && (
            <SidebarTab
              href="/task-center"
              icon={CheckCircleIcon}
              label="Task Center"
              isActive={location.startsWith("/task-center")}
              notificationCount={taskCount}
              isExpanded={isExpanded}
            />
          )}

          {/* File Vault tab - only show if company has it unlocked or it's playground */}
          {(hasFileVault || isPlayground) && (isFileVaultUnlocked || isPlayground) && (
            <SidebarTab
              href="/file-vault"
              icon={FileIcon}
              label="File Vault"
              isActive={location.startsWith("/file-vault")}
              isExpanded={isExpanded}
            />
          )}

          {/* Conditional Invela tabs */}
          {showInvelaTabs && (
            <>
              <Separator className="my-2" />
              <SidebarTab
                href="/network"
                icon={Network}
                label="Network"
                isActive={location === "/network"}
                isExpanded={isExpanded}
              />
              <SidebarTab
                href="/analytics"
                icon={BarChartIcon}
                label="Analytics"
                isActive={location === "/analytics"}
                isExpanded={isExpanded}
              />
            </>
          )}

          {/* Playground specific tabs */}
          {isPlayground && isVisible && (
            <>
              <Separator className="my-2" />
              <div className={cn(
                "text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2",
                !isExpanded && "text-center"
              )}>
                {isExpanded ? "Playground" : "P"}
              </div>
              <SidebarTab
                href="/playground/cursor"
                icon={MousePointer2Icon}
                label="Cursor"
                isActive={location === "/playground/cursor"}
                isExpanded={isExpanded}
              />
              <SidebarTab
                href="/playground/utility"
                icon={Hammer}
                label="Utility"
                isActive={location === "/playground/utility"}
                isExpanded={isExpanded}
              />
              <SidebarTab
                to="/playground/form-performance"
                icon={FileText}
                label="Form Performance"
                isActive={location === "/playground/form-performance"}
                isExpanded={isExpanded}
              />
              <SidebarTab
                to="/playground/chart-gallery"
                icon={BarChart2}
                label="Chart Gallery"
                isActive={location === "/playground/chart-gallery"}
                isExpanded={isExpanded}
              />
              <SidebarTab
                to="/playground/performance-monitor"
                icon={Gauge}
                label="Performance Monitor"
                isActive={location === "/playground/performance-monitor"}
                isExpanded={isExpanded}
              />
            </>
          )}
        </nav>
      </div>

      {/* Connection status indicator */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className={cn(
          "flex items-center space-x-2",
          !isExpanded && "justify-center"
        )}>
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500" : "bg-red-500"
          )} />
          {isExpanded && (
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}