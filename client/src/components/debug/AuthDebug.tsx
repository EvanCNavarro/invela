import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { checkAuthState } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function AuthDebug() {
  const auth = useAuth();
  const { toast } = useToast();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [serverLoading, setServerLoading] = useState(false);

  const runDebug = async () => {
    setLoading(true);
    try {
      const result = auth.debug?.();
      setDebugInfo(result);
      toast({
        title: 'Client Debug Info',
        description: 'Debug information collected from client side',
      });
    } catch (error) {
      console.error('Error running client debug:', error);
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
      
      toast({
        title: 'Server Debug Info',
        description: 'Debug information collected from server side',
      });
    } catch (error) {
      console.error('Error fetching server debug info:', error);
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
    toast({
      title: 'Cookies Cleared',
      description: 'Auth cookies have been cleared from this browser',
    });
    checkAuthState();
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
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <div className="font-medium">Current User:</div>
          <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-32">
            {auth.user ? JSON.stringify(auth.user, null, 2) : "No user logged in"}
          </pre>
        </div>

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