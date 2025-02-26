import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import useDebug from '@/hooks/use-debug';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, ShieldAlert, RefreshCw, LogOut, Clock, Database, Key } from 'lucide-react';

/**
 * Authentication Test Page
 * 
 * This page provides tools for testing and debugging the authentication system.
 * It is only available in development mode for security reasons.
 */
const AuthTestPage: React.FC = () => {
  const { currentUser, login, logout, isAuthenticated, isLoading } = useAuth();
  const debug = useDebug();
  
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [authState, setAuthState] = useState<any>(null);
  const [queryCache, setQueryCache] = useState<any>(null);
  const [lastOperation, setLastOperation] = useState('');
  const [operationResult, setOperationResult] = useState<{success: boolean; message: string} | null>(null);
  const [testLog, setTestLog] = useState<string[]>([]);
  
  // Log function that we'll use throughout the tests
  const log = (message: string) => {
    console.log(`[Auth Test] ${message}`);
    setTestLog(prev => [...prev, `${new Date().toISOString().slice(11, 23)} | ${message}`]);
  };
  
  // Reset the log
  const clearLog = () => {
    setTestLog([]);
  };
  
  // Run a test with logging and error handling
  const runTest = async (name: string, testFn: () => Promise<any>) => {
    setLastOperation(name);
    setOperationResult(null);
    
    log(`Starting test: ${name}`);
    try {
      const result = await testFn();
      log(`Test completed: ${name}`);
      setOperationResult({ success: true, message: 'Operation completed successfully' });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`ERROR in test: ${name} - ${errorMessage}`);
      setOperationResult({ success: false, message: errorMessage });
      return null;
    }
  };
  
  // Initialize page
  useEffect(() => {
    refreshDebugInfo();
    log('Auth Test Page initialized');
    
    // Cleanup on unmount
    return () => {
      log('Auth Test Page unmounted');
    };
  }, []);
  
  // Refresh debug info function
  const refreshDebugInfo = async () => {
    const state = await debug.getAuthState();
    setAuthState(state);
    
    const cache = await debug.getQueryCache();
    setQueryCache(cache);
  };
  
  // Test login
  const testLogin = async () => {
    return runTest('Login', async () => {
      log(`Attempting login with email: ${email}`);
      await login(email, password);
      log('Login request complete');
      
      // Verify login was successful
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay to let state update
      const authState = await debug.getAuthState();
      
      if (authState.authenticated) {
        log('Login successful');
      } else {
        throw new Error('Login did not result in authenticated state');
      }
      
      await refreshDebugInfo();
      return authState;
    });
  };
  
  // Test logout
  const testLogout = async () => {
    return runTest('Logout', async () => {
      log('Attempting logout');
      await logout();
      log('Logout request complete');
      
      // Verify logout was successful
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay to let state update
      const authState = await debug.getAuthState();
      
      if (!authState.authenticated) {
        log('Logout successful');
      } else {
        throw new Error('Logout did not result in unauthenticated state');
      }
      
      await refreshDebugInfo();
      return authState;
    });
  };
  
  // Test session refresh
  const testSessionRefresh = async () => {
    return runTest('Session Refresh', async () => {
      log('Refreshing authentication session');
      const result = await debug.refreshAuthState();
      log(`Refresh result: ${result ? 'success' : 'failure'}`);
      await refreshDebugInfo();
      return result;
    });
  };
  
  // Test full authentication flow
  const testFullFlow = async () => {
    return runTest('Full Authentication Flow', async () => {
      log('--- STARTING FULL AUTHENTICATION FLOW TEST ---');
      
      // Step 1: Make sure we're logged out
      log('Step 1: Ensuring logged out state');
      const initialState = await debug.getAuthState();
      if (initialState.authenticated) {
        log('User is authenticated, logging out first');
        await logout();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Step 2: Perform login
      log('Step 2: Testing login');
      await login(email, password);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const postLoginState = await debug.getAuthState();
      if (!postLoginState.authenticated) {
        throw new Error('Login failed during full flow test');
      }
      log('Login successful');
      
      // Step 3: Test session refresh
      log('Step 3: Testing session refresh');
      const refreshResult = await debug.refreshAuthState();
      if (!refreshResult) {
        throw new Error('Session refresh failed during full flow test');
      }
      log('Session refresh successful');
      
      // Step 4: Test logout
      log('Step 4: Testing logout');
      await logout();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const finalState = await debug.getAuthState();
      if (finalState.authenticated) {
        throw new Error('Logout failed during full flow test');
      }
      log('Logout successful');
      
      log('--- FULL AUTHENTICATION FLOW TEST COMPLETE ---');
      await refreshDebugInfo();
      return true;
    });
  };
  
  // Clear all auth data
  const clearAuthData = async () => {
    return runTest('Clear Authentication Data', async () => {
      log('Clearing all authentication data');
      const result = await debug.clearAuth();
      log('Auth data cleared');
      await refreshDebugInfo();
      return result;
    });
  };
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Authentication Testing Page</h1>
      
      {process.env.NODE_ENV === 'production' && (
        <Alert className="mb-4">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            This page should not be accessible in production. Please contact the administrator.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Auth State & Controls */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Authentication State</CardTitle>
              <CardDescription>Real-time status of your authentication</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${isAuthenticated ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="font-medium">
                    {isLoading ? 'Checking...' : (isAuthenticated ? 'Authenticated' : 'Not Authenticated')}
                  </span>
                </div>
                
                {isAuthenticated && currentUser && (
                  <div className="mt-4 text-sm">
                    <p><span className="font-medium">User:</span> {currentUser.email}</p>
                    <p><span className="font-medium">ID:</span> {currentUser.id}</p>
                  </div>
                )}
                
                {authState && (
                  <div className="mt-4 p-2 bg-muted rounded-md text-xs">
                    <p><span className="font-medium">Session Token:</span> {authState.hasSessionToken ? 'Present' : 'Missing'}</p>
                    <p><span className="font-medium">Refresh Token:</span> {authState.hasRefreshToken ? 'Present' : 'Missing'}</p>
                    {authState.sessionExpiresAt && (
                      <p>
                        <span className="font-medium">Expires:</span> {new Date(authState.sessionExpiresAt).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={refreshDebugInfo}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Status
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Login Controls</CardTitle>
              <CardDescription>Test authentication with these credentials</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                onClick={testLogin}
                disabled={isLoading}
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                Login
              </Button>
              <Button 
                variant="outline" 
                onClick={testLogout}
                disabled={isLoading}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* Middle Column: Test Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Tests</CardTitle>
              <CardDescription>Run various tests on the auth system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  className="w-full"
                  onClick={testSessionRefresh}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Test Session Refresh
                </Button>
                <Button 
                  className="w-full"
                  onClick={testFullFlow}
                  variant="default"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Run Full Auth Flow Test
                </Button>
                <Button 
                  className="w-full"
                  onClick={clearAuthData}
                  variant="destructive"
                >
                  Clear All Auth Data
                </Button>
                <Button 
                  className="w-full"
                  onClick={() => debug.runAuthCLI()}
                  variant="outline"
                >
                  Run Auth CLI
                </Button>
              </div>
            </CardContent>
            <CardFooter>
              {operationResult && (
                <div className={`w-full p-2 rounded-md text-sm ${operationResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <p className="font-medium">{lastOperation}: {operationResult.success ? 'Success' : 'Failed'}</p>
                  <p className="text-xs">{operationResult.message}</p>
                </div>
              )}
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Cache Status</CardTitle>
              <CardDescription>Status of data in the client cache</CardDescription>
            </CardHeader>
            <CardContent className="max-h-64 overflow-auto">
              {queryCache && (
                <pre className="text-xs p-2 bg-muted rounded-md">
                  {JSON.stringify(queryCache, null, 2)}
                </pre>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={refreshDebugInfo}
              >
                <Database className="h-4 w-4 mr-2" />
                Refresh Cache Info
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* Right Column: Test Log */}
        <div>
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Test Log</span>
                <Button variant="ghost" size="sm" onClick={clearLog}>Clear</Button>
              </CardTitle>
              <CardDescription>History of test operations and their results</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow overflow-auto">
              <div className="bg-muted p-2 rounded-md h-full">
                {testLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No operations logged yet</p>
                ) : (
                  <pre className="text-xs whitespace-pre-wrap">
                    {testLog.map((log, i) => (
                      <div key={i} className="py-1">
                        {log}
                      </div>
                    ))}
                  </pre>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <div className="text-xs text-muted-foreground w-full text-center">
                <Clock className="h-3 w-3 inline mr-1" />
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AuthTestPage;