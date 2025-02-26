import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useDebug } from '@/hooks/use-debug';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { checkAuthState, queryClient, queryKeys } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Shield, ShieldAlert, Key, Server, Laptop } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// Helper function to extract and parse cookies
function getCookies() {
  const cookies = {};
  document.cookie.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    cookies[name] = value;
  });
  return cookies;
}

// Helper to decode JWT without library dependency
function decodeJwtPayload(token) {
  try {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Error decoding JWT:', e);
    return { error: 'Invalid token format' };
  }
}

export function AuthDebug() {
  const auth = useAuth();
  const debug = useDebug();
  const { toast } = useToast();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [serverLoading, setServerLoading] = useState(false);
  const [authCookies, setAuthCookies] = useState<any>(null);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [logoutAttempts, setLogoutAttempts] = useState(0);
  const [sessionChecks, setSessionChecks] = useState(0);

  // Check auth cookies on mount and when auth state changes
  useEffect(() => {
    checkAuthCookies();
    if (debug.isDebugMode) {
      debug.checkAuthStatus();
    }
  }, [auth.user, debug]);

  // Function to check auth cookies
  const checkAuthCookies = () => {
    const cookies = getCookies();
    setAuthCookies(cookies);
    
    // Check for sid and refresh_token
    const sessionId = cookies['sid'];
    const refreshToken = cookies['refresh_token'];
    
    // Log cookie presence
    console.log('[Auth Debug] 🍪 Cookie check:', {
      timestamp: new Date().toISOString(),
      hasSessionId: !!sessionId,
      hasRefreshToken: !!refreshToken,
      userAuthenticated: !!auth.user
    });
    
    // Inspect token content if available
    if (sessionId) {
      try {
        const decodedToken = decodeJwtPayload(sessionId);
        setTokenInfo(prev => ({ ...prev, session: decodedToken }));
      } catch (e) {
        setTokenInfo(prev => ({ ...prev, session: { error: 'Failed to decode' } }));
      }
    } else {
      setTokenInfo(prev => ({ ...prev, session: null }));
    }
  };

  const runDebug = async () => {
    setLoading(true);
    try {
      const result = auth.debug?.();
      setDebugInfo(result);
      
      // Update session check counter
      setSessionChecks(prev => prev + 1);
      
      // Log auth state
      console.log('[Auth Debug] 🔍 Client debug info:', {
        timestamp: new Date().toISOString(),
        isAuthenticated: !!auth.user,
        userData: auth.user,
        authState: result?.authState || 'Unknown',
        queryCache: result?.queryCache || {}
      });
      
      toast({
        title: 'Client Debug Info',
        description: 'Debug information collected from client side',
      });
      
      // Check auth cookies again after debug
      checkAuthCookies();
    } catch (error) {
      console.error('[Auth Debug] ❌ Error running client debug:', error);
      toast({
        title: 'Debug Error',
        description: 'Failed to collect client debug information',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const runServerDebug = async () => {
    setServerLoading(true);
    try {
      const response = await fetch('/api/debug/auth', {
        method: 'GET',
        credentials: 'include',
      });
      
      const data = await response.json();
      setServerInfo(data);
      
      // Log server response
      console.log('[Auth Debug] 🔍 Server debug info:', {
        timestamp: new Date().toISOString(),
        status: response.status,
        serverData: data
      });
      
      toast({
        title: 'Server Debug Info',
        description: 'Debug information collected from server side',
      });
    } catch (error) {
      console.error('[Auth Debug] ❌ Error fetching server debug info:', error);
      toast({
        title: 'Server Debug Error',
        description: 'Failed to collect server debug information',
        variant: 'destructive',
      });
    } finally {
      setServerLoading(false);
    }
  };

  const clearCookies = () => {
    document.cookie = "refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    console.log('[Auth Debug] 🗑️ Auth cookies cleared manually');
    
    toast({
      title: 'Cookies Cleared',
      description: 'Auth cookies have been cleared from this browser',
    });
    
    // Force a check of auth state
    checkAuthState();
    
    // Update cookies display
    checkAuthCookies();
    
    // Invalidate user query to ensure UI updates
    queryClient.invalidateQueries({ queryKey: queryKeys.currentUser() });
  };
  
  const testLogout = async () => {
    try {
      console.log('[Auth Debug] 🔑 Testing logout flow', {
        timestamp: new Date().toISOString(),
        userBefore: auth.user
      });
      
      // Increment logout counter
      setLogoutAttempts(prev => prev + 1);
      
      // Check cookies before logout
      const cookiesBefore = getCookies();
      console.log('[Auth Debug] Cookies before logout:', cookiesBefore);
      
      // Perform logout
      await auth.logout();
      
      // Check cookies after logout
      setTimeout(() => {
        const cookiesAfter = getCookies();
        console.log('[Auth Debug] Cookies after logout:', cookiesAfter);
        checkAuthCookies();
        
        // Check if cookies were properly cleared
        const refreshTokenCleared = !cookiesAfter['refresh_token'] && cookiesBefore['refresh_token'];
        const sessionIdCleared = !cookiesAfter['sid'] && cookiesBefore['sid'];
        
        console.log('[Auth Debug] Logout result:', {
          timestamp: new Date().toISOString(),
          refreshTokenCleared,
          sessionIdCleared,
          userAfter: auth.user
        });
        
        toast({
          title: 'Logout Test Complete',
          description: `Cookies cleared: ${refreshTokenCleared && sessionIdCleared ? 'Successfully' : 'Partially or failed'}`,
          variant: refreshTokenCleared && sessionIdCleared ? 'default' : 'destructive',
        });
      }, 500);
    } catch (error) {
      console.error('[Auth Debug] ❌ Logout test error:', error);
      toast({
        title: 'Logout Test Failed',
        description: error instanceof Error ? error.message : 'Unknown error during logout',
        variant: 'destructive',
      });
    }
  };
  
  const checkQueryCache = () => {
    const userQueryState = queryClient.getQueryState(queryKeys.currentUser());
    const companyQueryState = queryClient.getQueryState(queryKeys.currentCompany());
    
    const cacheInfo = {
      user: {
        exists: !!userQueryState,
        hasFetchFn: !!userQueryState?.fetchStatus,
        data: !!userQueryState?.data,
        status: userQueryState?.status
      },
      company: {
        exists: !!companyQueryState,
        hasFetchFn: !!companyQueryState?.fetchStatus,
        data: !!companyQueryState?.data,
        status: companyQueryState?.status
      }
    };
    
    console.log('[Auth Debug] 📊 Query cache state:', cacheInfo);
    
    // Update debug info with cache state
    setDebugInfo(prev => ({
      ...prev,
      queryCache: cacheInfo
    }));
    
    toast({
      title: 'Query Cache Checked',
      description: `User data cached: ${cacheInfo.user.data ? 'Yes' : 'No'}, Company data cached: ${cacheInfo.company.data ? 'Yes' : 'No'}`,
    });
  };
  
  const testSessionRefresh = async () => {
    try {
      console.log('[Auth Debug] 🔄 Testing session refresh');
      
      // Simulate a session refresh by forcing a user data refetch
      const result = await queryClient.fetchQuery({
        queryKey: queryKeys.currentUser(),
        staleTime: 0
      });
      
      console.log('[Auth Debug] Session refresh result:', {
        timestamp: new Date().toISOString(),
        success: !!result,
        userData: result
      });
      
      // Check auth cookies after refresh
      checkAuthCookies();
      
      toast({
        title: 'Session Refresh Test',
        description: result ? 'Session refreshed successfully' : 'Session refresh may have failed',
        variant: result ? 'default' : 'destructive',
      });
    } catch (error) {
      console.error('[Auth Debug] ❌ Session refresh error:', error);
      toast({
        title: 'Session Refresh Failed',
        description: error instanceof Error ? error.message : 'Unknown error during session refresh',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Authentication Debug Tool
          <Badge variant={auth.user ? "default" : "destructive"}>
            {auth.user ? "Authenticated" : "Not Authenticated"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Use this tool to diagnose authentication issues
        </CardDescription>
      </CardHeader>
      
      <Tabs defaultValue="cookies">
        <TabsList className="mx-6 mb-2">
          <TabsTrigger value="cookies">Cookies & Tokens</TabsTrigger>
          <TabsTrigger value="debug">Debug Info</TabsTrigger>
          <TabsTrigger value="tests">Auth Tests</TabsTrigger>
        </TabsList>
        
        <TabsContent value="cookies">
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              {/* Client-side cookie detection */}
              <div className="bg-muted/50 p-4 rounded-md">
                <div className="font-medium flex items-center gap-2 mb-2">
                  <Laptop className="h-4 w-4 text-blue-500" />
                  Client-Side Cookies:
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={checkAuthCookies} 
                    className="ml-auto h-7 px-2"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Refresh
                  </Button>
                </div>
                
                <div className="bg-muted p-2 rounded text-xs">
                  {authCookies ? (
                    <div>
                      <div className="mb-1">
                        <span className="font-semibold">refresh_token: </span>
                        <span className={authCookies['refresh_token'] ? 'text-green-500' : 'text-red-500'}>
                          {authCookies['refresh_token'] ? 'Present' : 'Missing'}
                        </span>
                        <span className="text-muted-foreground ml-1">(visible to JavaScript)</span>
                      </div>
                      <div>
                        <span className="font-semibold">sid: </span>
                        <span className={authCookies['sid'] ? 'text-green-500' : 'text-red-500'}>
                          {authCookies['sid'] ? 'Present' : 'Missing'}
                        </span>
                        <span className="text-muted-foreground ml-1">(visible to JavaScript)</span>
                      </div>
                    </div>
                  ) : (
                    "No cookies found"
                  )}
                </div>
              </div>
              
              {/* Server-side cookie detection */}
              <div className="bg-muted/50 p-4 rounded-md">
                <div className="font-medium flex items-center gap-2 mb-2">
                  <Server className="h-4 w-4 text-purple-500" />
                  Server-Side Cookies:
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => debug.checkAuthStatus()} 
                    className="ml-auto h-7 px-2"
                    disabled={!debug.isDebugMode}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Refresh
                  </Button>
                </div>
                
                <div className="bg-muted p-2 rounded text-xs">
                  {debug.authStatus ? (
                    <div>
                      <div className="mb-1">
                        <span className="font-semibold">refresh_token: </span>
                        <span className={debug.authStatus.hasRefreshToken ? 'text-green-500' : 'text-red-500'}>
                          {debug.authStatus.hasRefreshToken ? 'Present' : 'Missing'}
                        </span>
                        <span className="text-muted-foreground ml-1">(server detected)</span>
                      </div>
                      <div>
                        <span className="font-semibold">sid: </span>
                        <span className={debug.authStatus.hasSessionCookie ? 'text-green-500' : 'text-red-500'}>
                          {debug.authStatus.hasSessionCookie ? 'Present' : 'Missing'}
                        </span>
                        <span className="text-muted-foreground ml-1">(server detected)</span>
                      </div>
                      <div className="mt-1">
                        <span className="font-semibold">Auth Status: </span>
                        <span className={debug.authStatus.isAuthenticated ? 'text-green-500' : 'text-red-500'}>
                          {debug.authStatus.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
                        </span>
                      </div>
                    </div>
                  ) : debug.isDebugMode ? (
                    "Loading server auth status..."
                  ) : (
                    "Debug mode disabled. Enable it to check server-side auth status."
                  )}
                </div>
                
                {!debug.isDebugMode && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={debug.toggleDebugMode} 
                    className="mt-2 w-full"
                  >
                    Enable Debug Mode
                  </Button>
                )}
              </div>
              
              {tokenInfo && tokenInfo.session && (
                <div className="mt-2">
                  <Accordion type="single" collapsible>
                    <AccordionItem value="token">
                      <AccordionTrigger className="text-xs font-medium py-1">
                        Session Token Details
                      </AccordionTrigger>
                      <AccordionContent>
                        <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-32">
                          {JSON.stringify(tokenInfo.session, null, 2)}
                        </pre>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              )}
            </div>
            
            <div className="grid gap-2">
              <div className="font-medium">Current User:</div>
              <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-32">
                {auth.user ? JSON.stringify(auth.user, null, 2) : "No user logged in"}
              </pre>
            </div>
            
            <div className="bg-amber-50 p-3 rounded-md border border-amber-200 text-amber-800 text-sm">
              <p className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600" /> 
                <span className="font-medium">Auth Status: </span>
                <span>{auth.user ? 'Logged In' : 'Logged Out'}</span>
              </p>
              <p className="text-xs mt-1 text-amber-600">
                Login attempts: {loginAttempts} | Logout attempts: {logoutAttempts} | Session checks: {sessionChecks}
              </p>
            </div>
          </CardContent>
        </TabsContent>
        
        <TabsContent value="debug">
          <CardContent className="space-y-4">
            {debugInfo && (
              <div className="grid gap-2">
                <div className="font-medium">Client Debug Information:</div>
                <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-64">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}

            {serverInfo && (
              <div className="grid gap-2">
                <div className="font-medium">Server Debug Information:</div>
                <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-64">
                  {JSON.stringify(serverInfo, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </TabsContent>
        
        <TabsContent value="tests">
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <div className="font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                Authentication Tests
              </div>
              
              <div className="bg-muted/50 p-4 rounded-md space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Test the full logout flow to verify token clearing</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={testLogout}
                    className="w-full"
                  >
                    Test Logout Flow
                  </Button>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Check React Query cache for user and company data</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={checkQueryCache}
                    className="w-full"
                  >
                    Check Query Cache
                  </Button>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Test session refresh by re-fetching user data</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={testSessionRefresh}
                    className="w-full"
                  >
                    Test Session Refresh
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </TabsContent>
      </Tabs>
      
      <CardFooter className="flex gap-2 flex-wrap">
        <Button onClick={runDebug} disabled={loading}>
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running...</> : "Run Client Diagnostics"}
        </Button>
        <Button onClick={runServerDebug} disabled={serverLoading} variant="secondary">
          {serverLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running...</> : "Run Server Diagnostics"}
        </Button>
        <Button variant="destructive" onClick={clearCookies}>
          Clear Auth Cookies
        </Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      </CardFooter>
    </Card>
  );
} 