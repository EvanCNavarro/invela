import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Widget } from "@/components/dashboard/Widget";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PageTemplate } from "@/components/ui/page-template";
import { PageSideDrawer } from "@/components/ui/page-side-drawer";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Settings,
  Check,
  Info,
  Activity,
  Bell,
  Zap,
  Globe,
  AlertTriangle,
  LayoutGrid,
  RefreshCw,
  LogIn,
  LogOut,
  Shield
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { RiskMeter } from "@/components/dashboard/RiskMeter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { queryClient, queryKeys, fetchCompanyData, registerCriticalQueries } from "@/lib/queryClient";
import type { Company } from "@/types/company";
import { InviteModal } from "@/components/playground/InviteModal";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import useDebug from '@/hooks/use-debug';

const DEFAULT_WIDGETS = {
  updates: true,
  announcements: true,
  quickActions: true,
  companyScore: true,
  networkVisualization: true
};

// Auth debugging helper
function getAuthDebugInfo() {
  interface CookieMap {
    [key: string]: string;
  }

  // Function to extract cookies with proper typing
  const getCookies = (): CookieMap => {
    const cookies: CookieMap = {};
    document.cookie.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name) cookies[name] = value || '';
    });
    return cookies;
  };

  // Decode JWT with proper typing for the token parameter
  const decodeJwtPayload = (token: string): any => {
    try {
      if (!token) return null;
      const base64Url = token.split('.')[1];
      if (!base64Url) return null;
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(c => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  // Get client-side data (visible cookies and cache status)
  const cookies = getCookies();
  const sessionToken = cookies['sid'] || null;
  const refreshToken = cookies['refresh_token'] || null;
  const isUserCached = !!queryClient.getQueryData(queryKeys.user());
  const isCompanyCached = !!queryClient.getQueryData(queryKeys.currentCompany());

  return {
    session: {
      hasSid: !!sessionToken,
      hasRefreshToken: !!refreshToken,
      // Note: Client-side detection may not see HttpOnly cookies
      clientSideCheck: {
        sessionTokenVisible: !!sessionToken,
        refreshTokenVisible: !!refreshToken
      },
      expiresAt: sessionToken ? decodeJwtPayload(sessionToken)?.exp : null
    },
    cache: {
      userCached: isUserCached,
      companyCached: isCompanyCached
    },
    timestamp: new Date().toISOString()
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [visibleWidgets, setVisibleWidgets] = useState(DEFAULT_WIDGETS);
  const [openFinTechModal, setOpenFinTechModal] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const isRetrying = useRef(false);
  const refreshTimestamp = useRef<number | null>(null);
  const [authDebugInfo, setAuthDebugInfo] = useState(getAuthDebugInfo());
  const [, navigate] = useLocation();

  // Debug counters to help track refresh status
  const debugCounters = useRef({
    retryAttempts: 0,
    successfulLoads: 0,
    toastsShown: 0
  });
  
  // Force rerender on retry to ensure fresh query attempt
  const retryKey = `retry-${retryCount}`;

  // Check if we have cached company data
  const cacheState = queryClient.getQueryState(queryKeys.currentCompany());
  const isInitialRender = !cacheState?.dataUpdateCount;
  const hasCachedData = !!cacheState?.data;

  // Only log on initial load or in development
  if (isInitialRender || process.env.NODE_ENV !== 'production') {
    console.log('[Dashboard] 🔍 Company data status:', {
      timestamp: new Date().toISOString(),
      hasCachedData,
      userAuthenticated: !!user,
      userId: user?.id,
      retryCount,
      debugCounters: { ...debugCounters.current }
    });
  }

  // Ensure our query function is registered
  useEffect(() => {
    registerCriticalQueries();
  }, []);

  // Regularly update auth debug info
  useEffect(() => {
    // Initial check
    setAuthDebugInfo(getAuthDebugInfo());
    
    // Update every 10 seconds to track token state
    const interval = setInterval(() => {
      setAuthDebugInfo(getAuthDebugInfo());
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Update auth debug after login/logout operations
  useEffect(() => {
    if (user) {
      console.log('[Auth Debug] 👤 User authenticated:', {
        userId: user.id,
        email: user.email,
        authState: getAuthDebugInfo().session
      });
    } else {
      console.log('[Auth Debug] 👤 No authenticated user found');
    }
    
    setAuthDebugInfo(getAuthDebugInfo());
  }, [user]);

  // Handle manual refresh/retry
  const handleRetry = useCallback(() => {
    console.log('[Dashboard] 🔄 Manual retry initiated', {
      timestamp: new Date().toISOString(),
      previousRetryCount: retryCount,
      debugCounters: { ...debugCounters.current }
    });
    
    // Increment debug counter
    debugCounters.current.retryAttempts++;
    
    // Re-register the query function to ensure it exists
    registerCriticalQueries();
    
    // Set retry flag and timestamp
    isRetrying.current = true;
    refreshTimestamp.current = Date.now();
    
    // Force a refetch by incrementing retry count
    setRetryCount(prev => prev + 1);
    
    // Force a refetch - IMPORTANT: Use fetchQuery to bypass the cache
    // and guarantee a network request
    queryClient.fetchQuery({
      queryKey: queryKeys.currentCompany(),
      queryFn: fetchCompanyData,
      // Force it to bypass cache completely
      staleTime: 0
    });
    
    toast({
      title: "Refreshing data",
      description: "Attempting to reload company data...",
    });
  }, [toast, retryCount]);

  // Use the query with our exported query function
  const { 
    data: companyData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery<Company>({
    queryKey: queryKeys.currentCompany(),
    queryFn: fetchCompanyData,
    enabled: !!user,
    // Add staleTime to avoid unnecessary refetches
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Use 3 retries by default for important company data
    retry: 3,
    // Added refresh on window focus (refocus logic is now in queryClient.ts)
    refetchOnWindowFocus: true,
  });

  // Determine if this is a fresh load after a retry
  // If data loaded within 2 seconds of a refresh click, consider it a result of our refresh
  const isFreshLoadAfterRetry = useCallback(() => {
    if (isRetrying.current && refreshTimestamp.current) {
      const elapsed = Date.now() - refreshTimestamp.current;
      console.log(`[Dashboard] Time since refresh: ${elapsed}ms`);
      return elapsed < 5000; // Consider it our refresh if within 5 seconds
    }
    return false;
  }, []);

  // Log company data status when it changes and show success toast after retry
  useEffect(() => {
    // Only proceed for data changes (not just loading state changes)
    if (!isLoading && companyData && (isInitialRender || process.env.NODE_ENV !== 'production')) {
      debugCounters.current.successfulLoads++;
      
      const isRefreshResult = isFreshLoadAfterRetry();
      
      console.log('[Dashboard] ✅ Company data loaded successfully', {
        timestamp: new Date().toISOString(),
        companyId: companyData.id,
        companyName: companyData.name,
        hasRiskScore: companyData.riskScore !== undefined,
        availableTabs: companyData.available_tabs,
        fromCache: !isInitialRender && hasCachedData,
        retryCount,
        wasRetrying: isRetrying.current,
        isRefreshResult,
        refreshTimestamp: refreshTimestamp.current ? new Date(refreshTimestamp.current).toISOString() : null,
        debugCounters: { ...debugCounters.current }
      });
      
      // Always show success toast if this was a manual retry, 
      // even if data came from cache
      if (isRetrying.current) {
        debugCounters.current.toastsShown++;
        
        toast({
          title: "Data refreshed successfully",
          description: `${companyData.name} data has been updated.`,
          variant: "default",
        });
        
        console.log('[Dashboard] 🎉 Manual refresh completed successfully', {
          fromCache: !isRefreshResult,
          toastCounter: debugCounters.current.toastsShown
        });
        
        // Reset retry flag and timestamp after successful load
        isRetrying.current = false;
        refreshTimestamp.current = null;
      }
    } else if (!isLoading && error) {
      console.error('[Dashboard] ❌ Failed to load company data', {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        retryCount,
        wasRetrying: isRetrying.current,
        debugCounters: { ...debugCounters.current }
      });
      
      // If this was a manual retry and it failed, update the toast
      if (isRetrying.current) {
        debugCounters.current.toastsShown++;
        
        toast({
          title: "Refresh failed",
          description: error instanceof Error ? error.message : "Failed to refresh data. Please try again.",
          variant: "destructive",
        });
        
        console.log('[Dashboard] ❌ Manual refresh failed', {
          toastCounter: debugCounters.current.toastsShown
        });
        
        // Reset retry flag after failed attempt
        isRetrying.current = false;
        refreshTimestamp.current = null;
      }
    }
  }, [companyData, isLoading, error, isInitialRender, hasCachedData, retryCount, toast, isFreshLoadAfterRetry]);

  const toggleWidget = (widgetId: keyof typeof DEFAULT_WIDGETS) => {
    setVisibleWidgets(prev => ({
      ...prev,
      [widgetId]: !prev[widgetId]
    }));
  };

  const toggleDrawer = () => {
    setDrawerOpen(prev => !prev);
  };

  const allWidgetsHidden = Object.values(visibleWidgets).every(v => !v);

  const debug = useDebug();

  return (
    <DashboardLayout>
      <PageTemplate
        drawerOpen={drawerOpen}
        onDrawerOpenChange={setDrawerOpen}
        title="Dashboard"
        description="Get an overview of your company's performance and recent activities."
        headerActions={
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleRetry}
              title="Refresh dashboard data"
              className="mr-2"
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Customize Dashboard
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" sideOffset={4}>
                <DropdownMenuLabel>Visible Widgets</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(visibleWidgets).map(([key, isVisible]) => (
                  <DropdownMenuItem
                    key={key}
                    onSelect={(event) => {
                      event.preventDefault();
                      toggleWidget(key as keyof typeof DEFAULT_WIDGETS);
                    }}
                    className="flex items-center gap-2"
                  >
                    <div className="w-4">
                      {isVisible ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <div className="h-4 w-4" />
                      )}
                    </div>
                    <span className={cn(
                      "flex-1",
                      isVisible ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
        drawer={
          <PageSideDrawer
            title="Dashboard Information"
            titleIcon={<Info className="h-5 w-5" />}
            defaultOpen={drawerOpen}
            isClosable={true}
            onOpenChange={setDrawerOpen}
          >
            <div className="space-y-4">
              <p className="text-muted-foreground">
                This drawer provides additional information and context about your dashboard:
              </p>
              <ul className="space-y-2">
                <li>• Widget customization options</li>
                <li>• Data refresh schedules</li>
                <li>• Dashboard shortcuts</li>
                <li>• Notification settings</li>
              </ul>
              
              {/* Auth Debug Section */}
              <div className="border-t pt-4 mt-6">
                <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
                  <Shield className="h-4 w-4 text-blue-500" />
                  Authentication Status
                </h4>
                <div className="text-xs p-2 rounded bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Session Token:</span>
                    <span className={authDebugInfo.session.hasSid ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
                      {authDebugInfo.session.hasSid ? (
                        <span className="flex items-center gap-1">
                          <LogIn className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <LogOut className="h-3 w-3" /> Missing
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Refresh Token:</span>
                    <span className={authDebugInfo.session.hasRefreshToken ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
                      {authDebugInfo.session.hasRefreshToken ? "Present" : "Missing"}
                    </span>
                  </div>
                  {authDebugInfo.session.hasSid && authDebugInfo.session.expiresAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Token Expires:</span>
                      <span className="font-mono">
                        {new Date(authDebugInfo.session.expiresAt * 1000).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">User Cached:</span>
                    <span className={authDebugInfo.cache.userCached ? "text-green-500" : "text-amber-500"}>
                      {authDebugInfo.cache.userCached ? `Yes (${authDebugInfo.cache.userCached ? 'Cached' : 'Uncached'})` : "No"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Company Cached:</span>
                    <span className={authDebugInfo.cache.companyCached ? "text-green-500" : "text-amber-500"}>
                      {authDebugInfo.cache.companyCached ? `Yes (${authDebugInfo.cache.companyCached ? 'Cached' : 'Uncached'})` : "No"}
                    </span>
                  </div>
                  <div className="text-right text-[10px] text-muted-foreground italic">
                    Last updated: {new Date(authDebugInfo.timestamp).toLocaleTimeString()}
                  </div>
                  
                  {/* Auth test link in development */}
                  {user?.id === 8 && (
                    <div className="mt-2 pt-2 border-t">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full text-xs"
                        asChild
                      >
                        <a href="/auth-test">Go to Auth Test Page</a>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Debug info section - only for user with ID 8 */}
              {user?.id === 8 && (
                <>
                  <h4 className="text-sm font-medium mt-6">Debug Information</h4>
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    <p>Retry Count: {retryCount}</p>
                    <p>Retry Attempts: {debugCounters.current.retryAttempts}</p>
                    <p>Successful Loads: {debugCounters.current.successfulLoads}</p>
                    <p>Toasts Shown: {debugCounters.current.toastsShown}</p>
                    <p>Is Retrying: {isRetrying.current ? 'Yes' : 'No'}</p>
                    <p>Has Cached Data: {hasCachedData ? 'Yes' : 'No'}</p>
                  </div>
                </>
              )}

              {user?.id === 8 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Debug Tools</h3>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full"
                        onClick={debug.runAuthCLI}
                      >
                        Auth CLI
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full"
                        onClick={debug.goToAuthTestPage}
                      >
                        Auth Test Page
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full"
                        onClick={debug.refreshAuthState}
                      >
                        Refresh Auth
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full destructive"
                        onClick={debug.clearAuth}
                      >
                        Clear Auth
                      </Button>
                    </div>
                    <pre className="text-xs p-2 bg-muted rounded-md overflow-auto">
                      {JSON.stringify(debugCounters, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </PageSideDrawer>
        }
      >
        {/* Show loading skeletons while company data is loading */}
        {isLoading && (
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Skeleton className="h-[350px] w-full rounded-lg" />
            </div>
            <Skeleton className="h-[350px] w-full rounded-lg" />
            <div className="col-span-2">
              <Skeleton className="h-[200px] w-full rounded-lg" />
            </div>
            <Skeleton className="h-[200px] w-full rounded-lg" />
          </div>
        )}

        {/* Show error state if there was an error loading company data */}
        {!isLoading && error && (
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-800 mb-2">Failed to load dashboard data</h3>
            <p className="text-red-600 mb-4">
              {error instanceof Error ? error.message : "There was an error loading your dashboard."}
            </p>
            <Button 
              variant="outline" 
              onClick={handleRetry}
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              Try Again
            </Button>
          </div>
        )}

        {!isLoading && !error && allWidgetsHidden ? (
          <div className="grid grid-cols-3 gap-4 min-h-[400px]">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="border-2 border-dashed border-muted rounded-lg flex items-center justify-center p-6 text-center bg-background/40 backdrop-blur-sm"
              >
                <div className="space-y-2">
                  <LayoutGrid className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No widgets selected. Click "Customize Dashboard" to add widgets.
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : !isLoading && !error && (
          <div className="grid grid-cols-3 gap-4">
            {visibleWidgets.updates && (
              <Widget
                title="Recent Updates"
                icon={<Activity className="h-5 w-5" />}
                size="double"
                onVisibilityToggle={() => toggleWidget('updates')}
                isVisible={visibleWidgets.updates}
              >
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    No recent updates to show.
                  </p>
                </div>
              </Widget>
            )}

            {visibleWidgets.announcements && (
              <Widget
                title="Announcements"
                icon={<Bell className="h-5 w-5" />}
                onVisibilityToggle={() => toggleWidget('announcements')}
                isVisible={visibleWidgets.announcements}
              >
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Welcome to Invela! Check out our latest features.
                  </p>
                </div>
              </Widget>
            )}

            {visibleWidgets.quickActions && (
              <Widget
                title="Quick Actions"
                icon={<Zap className="h-5 w-5" />}
                size="double"
                onVisibilityToggle={() => toggleWidget('quickActions')}
                isVisible={visibleWidgets.quickActions}
              >
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="default"
                    className="w-full font-medium"
                    onClick={() => setOpenFinTechModal(true)}
                  >
                    Invite a New FinTech
                  </Button>
                  <Button variant="outline" className="w-full font-medium">
                    Add User
                  </Button>
                  <Button variant="outline" className="w-full font-medium">
                    Set Risk Tracker
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full font-medium"
                    onClick={toggleDrawer}
                  >
                    {drawerOpen ? "Hide Side Drawer" : "Show Side Drawer"}
                  </Button>
                  
                  {/* Only show auth test link to user with ID 8 */}
                  {user?.id === 8 && (
                    <Button
                      variant="outline"
                      className="w-full font-medium bg-blue-500/10 hover:bg-blue-500/20 text-blue-600"
                      asChild
                    >
                      <a href="/auth-test">
                        Authentication Test
                      </a>
                    </Button>
                  )}
                </div>
              </Widget>
            )}

            {visibleWidgets.companyScore && (
              <Widget
                title="Company Score"
                icon={<AlertTriangle className="h-5 w-5" />}
                onVisibilityToggle={() => toggleWidget('companyScore')}
                isVisible={visibleWidgets.companyScore}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center min-h-[200px]">
                    <p className="text-sm text-muted-foreground">Loading company data...</p>
                  </div>
                ) : companyData ? (
                  <div className="space-y-1">
                    <div className="bg-muted/50 rounded-lg py-2 px-3 flex items-center justify-center space-x-3">
                      {companyData.logoId ? (
                        <img
                          src={`/api/companies/${companyData.id}/logo`}
                          alt={`${companyData.name} logo`}
                          className="w-6 h-6 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            console.debug(`Failed to load logo for company: ${companyData.name}`);
                          }}
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {companyData.name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                      <span className="text-sm font-medium">{companyData.name}</span>
                    </div>
                    <RiskMeter score={companyData.riskScore ?? 0} />
                    {companyData.riskScore === undefined && (
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        No risk score available for this company yet.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center min-h-[200px]">
                    <p className="text-sm text-muted-foreground">No company data available</p>
                  </div>
                )}
              </Widget>
            )}

            {visibleWidgets.networkVisualization && (
              <Widget
                title="Network Visualization"
                icon={<Globe className="h-5 w-5" />}
                size="triple"
                onVisibilityToggle={() => toggleWidget('networkVisualization')}
                isVisible={visibleWidgets.networkVisualization}
              >
                <div className="flex items-center justify-center min-h-[200px]">
                  <p className="text-sm text-muted-foreground">
                    Network visualization coming soon
                  </p>
                </div>
              </Widget>
            )}
          </div>
        )}

        <InviteModal
          variant="fintech"
          open={openFinTechModal}
          onOpenChange={setOpenFinTechModal}
        />
      </PageTemplate>
    </DashboardLayout>
  );
}