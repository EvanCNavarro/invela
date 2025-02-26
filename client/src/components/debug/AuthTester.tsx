import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { RotateCcw, CheckCircle2, XCircle, AlertCircle, ShieldAlert, LogOut, LogIn, Hourglass } from "lucide-react";

import { runAuthTest, checkAuthState, clearAuthCookies, monitorAuthState, type AuthStateResult, type AuthTestResults } from '@/lib/auth-tests';

/**
 * Authentication Testing Component
 * 
 * This component provides a UI for testing authentication flows.
 */
const AuthTester: React.FC = () => {
  const [testResults, setTestResults] = useState<AuthTestResults | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [currentState, setCurrentState] = useState<AuthStateResult | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [logEntries, setLogEntries] = useState<string[]>([]);
  
  // Load initial auth state on mount
  useEffect(() => {
    const initialState = checkAuthState();
    setCurrentState(initialState);
    
    // Override console.log for capturing auth test logs
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    
    console.log = (...args: any[]) => {
      originalConsoleLog(...args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      if (message.includes('[Auth')) {
        setLogEntries(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
      }
    };
    
    console.error = (...args: any[]) => {
      originalConsoleError(...args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      if (message.includes('[Auth')) {
        setLogEntries(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ ${message}`]);
      }
    };
    
    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    };
  }, []);
  
  // Function to run auth test
  const handleRunTest = async () => {
    setIsRunningTest(true);
    setLogEntries([]);
    
    try {
      const results = await runAuthTest();
      setTestResults(results);
      setCurrentState(checkAuthState());
    } catch (error) {
      console.error('[Auth Tester] Test failed with error:', error);
    } finally {
      setIsRunningTest(false);
    }
  };
  
  // Function to clear auth cookies
  const handleClearCookies = () => {
    clearAuthCookies();
    setCurrentState(checkAuthState());
    setLogEntries(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🗑️ Auth cookies cleared manually`]);
  };
  
  // Function to toggle monitoring
  const handleToggleMonitoring = () => {
    if (isMonitoring) {
      setIsMonitoring(false);
      return;
    }
    
    setIsMonitoring(true);
    const stopMonitoring = monitorAuthState(
      60, // 1 minute
      5,  // check every 5 seconds
      (state) => setCurrentState(state)
    );
    
    // Automatically stop after 60 seconds
    setTimeout(() => {
      stopMonitoring();
      setIsMonitoring(false);
    }, 60000);
  };
  
  // Helper functions for rendering
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'authenticated':
        return <Badge className="bg-green-500">Authenticated</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500">Partial Auth</Badge>;
      case 'unauthenticated':
        return <Badge className="bg-red-500">Not Authenticated</Badge>;
      default:
        return <Badge className="bg-gray-500">Unknown</Badge>;
    }
  };
  
  const renderTokenStatus = (token: AuthStateResult['token']) => {
    if (!token) return null;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">Valid:</div>
          {token.isValid 
            ? <CheckCircle2 className="h-4 w-4 text-green-500" /> 
            : <XCircle className="h-4 w-4 text-red-500" />}
        </div>
        
        {token.isExpired !== null && (
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">Expired:</div>
            {token.isExpired 
              ? <CheckCircle2 className="h-4 w-4 text-red-500" /> 
              : <XCircle className="h-4 w-4 text-green-500" />}
          </div>
        )}
        
        {token.isAboutToExpire && (
          <div className="flex items-center gap-2 text-yellow-500">
            <AlertCircle className="h-4 w-4" />
            <div className="text-sm">Expiring soon</div>
          </div>
        )}
        
        {token.expiresAt && (
          <div className="text-sm">
            Expires: {new Date(token.expiresAt).toLocaleString()}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          Authentication Tester
        </CardTitle>
        <CardDescription>
          Test and debug authentication flows in the application
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="current">
          <TabsList className="mb-4">
            <TabsTrigger value="current">Current State</TabsTrigger>
            <TabsTrigger value="test">Test Results</TabsTrigger>
            <TabsTrigger value="logs">Debug Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="current">
            {currentState ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium">Status:</h3>
                    {getStatusBadge(currentState.status)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Last updated: {new Date(currentState.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="py-2">
                      <CardTitle className="text-base">Cookies</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium">Session ID:</div>
                          {currentState.cookies.hasSid 
                            ? <CheckCircle2 className="h-4 w-4 text-green-500" /> 
                            : <XCircle className="h-4 w-4 text-red-500" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium">Refresh Token:</div>
                          {currentState.cookies.hasRefreshToken 
                            ? <CheckCircle2 className="h-4 w-4 text-green-500" /> 
                            : <XCircle className="h-4 w-4 text-red-500" />}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="py-2">
                      <CardTitle className="text-base">Token Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {renderTokenStatus(currentState.token)}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="py-2">
                      <CardTitle className="text-base">Cache Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium">User Cached:</div>
                          {currentState.cache.userCached 
                            ? <CheckCircle2 className="h-4 w-4 text-green-500" /> 
                            : <XCircle className="h-4 w-4 text-red-500" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium">Company Cached:</div>
                          {currentState.cache.companyCached 
                            ? <CheckCircle2 className="h-4 w-4 text-green-500" /> 
                            : <XCircle className="h-4 w-4 text-red-500" />}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="flex items-center mt-4">
                  <Checkbox 
                    id="show-details" 
                    checked={showDetails}
                    onCheckedChange={(checked) => setShowDetails(!!checked)}
                  />
                  <label htmlFor="show-details" className="ml-2 text-sm">
                    Show detailed information
                  </label>
                </div>
                
                {showDetails && (
                  <Card className="mt-2">
                    <CardContent className="p-4">
                      <h3 className="text-sm font-medium mb-2">Token Payload</h3>
                      <ScrollArea className="h-40 rounded-md border p-2">
                        <pre className="text-xs">
                          {JSON.stringify(currentState.token.payload, null, 2)}
                        </pre>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No authentication state available.
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="test">
            {testResults ? (
              <div className="space-y-4">
                <Alert variant={testResults.passed ? "default" : "destructive"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>
                    {testResults.passed ? "Tests Passed" : "Tests Failed"}
                  </AlertTitle>
                  <AlertDescription>
                    {testResults.passed 
                      ? "All authentication checks completed successfully."
                      : `Failed with ${testResults.errors.length} errors. See details below.`
                    }
                  </AlertDescription>
                </Alert>
                
                {testResults.errors.length > 0 && (
                  <Card>
                    <CardHeader className="py-2">
                      <CardTitle className="text-base">Errors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-40 rounded-md border p-2">
                        <ul className="space-y-2">
                          {testResults.errors.map((error, i) => (
                            <li key={i} className="text-sm text-red-500">
                              {error}
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="py-2">
                      <CardTitle className="text-base">Initial State</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-sm font-medium">Status:</h3>
                        {getStatusBadge(testResults.initialState.status)}
                      </div>
                      <div className="text-sm">
                        {testResults.initialState.cookies.hasSid ? "✓" : "✗"} Session ID<br />
                        {testResults.initialState.cookies.hasRefreshToken ? "✓" : "✗"} Refresh Token
                      </div>
                    </CardContent>
                  </Card>
                  
                  {testResults.refreshState && (
                    <Card>
                      <CardHeader className="py-2">
                        <CardTitle className="text-base">After Refresh</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-sm font-medium">Status:</h3>
                          {getStatusBadge(testResults.refreshState.status)}
                        </div>
                        <div className="text-sm">
                          {testResults.refreshState.cookies.hasSid ? "✓" : "✗"} Session ID<br />
                          {testResults.refreshState.cookies.hasRefreshToken ? "✓" : "✗"} Refresh Token
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No test results available. Run a test to see results.
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="logs">
            <Card>
              <CardContent className="p-4">
                <ScrollArea className="h-[300px] rounded-md border p-2">
                  {logEntries.length > 0 ? (
                    <div className="space-y-1">
                      {logEntries.map((log, index) => (
                        <div key={index} className="text-xs font-mono whitespace-pre-wrap">
                          {log}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      No logs available. Run a test to generate logs.
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex flex-wrap gap-2">
        <Button 
          variant="default" 
          onClick={handleRunTest}
          disabled={isRunningTest}
          className="flex items-center gap-2"
        >
          {isRunningTest ? (
            <>
              <Hourglass className="h-4 w-4 animate-spin" />
              Running Test...
            </>
          ) : (
            <>
              <RotateCcw className="h-4 w-4" />
              Run Auth Test
            </>
          )}
        </Button>
        
        <Button 
          variant="secondary" 
          onClick={() => setCurrentState(checkAuthState())}
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Refresh State
        </Button>
        
        <Button 
          variant={isMonitoring ? "destructive" : "outline"}
          onClick={handleToggleMonitoring}
          className="flex items-center gap-2"
        >
          {isMonitoring ? (
            <>
              <XCircle className="h-4 w-4" />
              Stop Monitoring
            </>
          ) : (
            <>
              <Hourglass className="h-4 w-4" />
              Monitor (1 min)
            </>
          )}
        </Button>
        
        <Button 
          variant="destructive" 
          onClick={handleClearCookies}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Clear Auth Cookies
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AuthTester; 