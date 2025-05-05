/**
 * WebSocket Diagnostic Page
 * 
 * This page provides a diagnostic interface for testing WebSocket connectivity
 * and monitoring connection status with detailed information.
 */

import React, { useState, useEffect } from 'react';
import { useWebSocketService } from '@/providers/websocket-provider';
import { WebSocketEventMap, WebSocketEvent } from '@/lib/websocket-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle2, RefreshCcw, RefreshCw, Send, Wifi, WifiOff } from 'lucide-react';

export default function WebSocketDiagnosticPage() {
  const wsService = useWebSocketService();
  const { isConnected, isConnecting, connectionId, subscribe, unsubscribe, connect, disconnect } = wsService;
  
  // Use the updated WebSocket send method that supports both signatures
  const send = wsService.send;
  const sendMessage = wsService.sendMessage;
  
  // Track if we've exhausted reconnection attempts
  const [hasAttemptedConnecting, setHasAttemptedConnecting] = useState(false);
  
  // Check if we're in reconnection backoff mode
  useEffect(() => {
    setHasAttemptedConnecting(window._ws_backoff_active || false);
  }, [isConnected, isConnecting]);
  
  // Get WebSocket provider methods
  const handleConnect = () => {
    if (!isConnected && !isConnecting) {
      connect();
    }
  };
  const [messages, setMessages] = useState<{type: string, payload: any, timestamp: string}[]>([]);
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [lastPingSent, setLastPingSent] = useState<number | null>(null);
  
  // Subscribe to all message types
  useEffect(() => {
    const handleMessage = (payload: any) => {
      setMessages(prev => [
        { 
          type: 'RECEIVED', 
          payload, 
          timestamp: new Date().toISOString() 
        },
        ...prev.slice(0, 19) // Keep only the last 20 messages
      ]);
      
      // If this is a pong response to our ping and we have a lastPingSent timestamp
      if (payload.type === 'pong' && lastPingSent) {
        const latency = Date.now() - lastPingSent;
        setPingLatency(latency);
        setLastPingSent(null);
      }
    };
    
    // Subscribe to multiple event types for comprehensive monitoring
    const unsubscribers = [
      // Connection status events
      subscribe('connection_status', handleMessage),
      // Authentication events
      subscribe('authenticated', handleMessage),
      // Task-related events
      subscribe('task_update', handleMessage),
      subscribe('task_status_update', handleMessage),
      // Form-related events
      subscribe('form_submitted', handleMessage),
      subscribe('form_field_update', handleMessage),
      // Company-related events
      subscribe('company_tabs_update', handleMessage),
      subscribe('sidebar_refresh_tabs', handleMessage),
      // Connection events
      subscribe('connection_established', handleMessage),
      // Response events
      subscribe('ping', handleMessage),
      subscribe('pong', handleMessage)
    ];
    
    // Cleanup all subscriptions on component unmount
    return () => {
      unsubscribers.forEach(unsub => typeof unsub === 'function' && unsub());
    };
  }, [subscribe, unsubscribe, lastPingSent]);
  
  // Handle testing ping with additional diagnostic information
  const handlePing = () => {
    const pingTimestamp = Date.now();
    setLastPingSent(pingTimestamp);
    
    // Create a detailed ping payload with diagnostic information
    const pingPayload = {
      timestamp: new Date(pingTimestamp).toISOString(),
      clientId: connectionId || 'diagnostic-page',
      browser: navigator.userAgent,
      screen: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      url: window.location.href,
      diagnostic: true
    };
    
    // Use the unified send method with consistent parameters
    try {
      if (typeof send === 'function') {
        // Always try the new API first
        send('ping', pingPayload);
      } else if (sendMessage && typeof sendMessage === 'function') {
        // Fall back to alternative API if needed
        sendMessage({
          type: 'ping',
          payload: pingPayload
        });
      }
      
      // Record the sent message
      setMessages(prev => [
        { 
          type: 'SENT', 
          payload: { 
            type: 'ping',
            ...pingPayload
          }, 
          timestamp: new Date(pingTimestamp).toISOString() 
        },
        ...prev
      ]);
    } catch (error) {
      // Record the error
      console.error('[WebSocket] Error sending ping:', error);
      setMessages(prev => [
        { 
          type: 'ERROR', 
          payload: { 
            message: error instanceof Error ? error.message : String(error),
            type: 'ping_error'
          }, 
          timestamp: new Date().toISOString() 
        },
        ...prev
      ]);
    }
  };
  
  // Handle manual connection attempt
  const handleReconnect = () => {
    // Reset reconnect cycle detection status before trying to reconnect
    // This allows a user to manually break out of the reconnect backoff
    console.log('[WebSocket] Manually resetting reconnection backoff and forcing reconnect');
    
    // Reset backoff detection completely
    window._ws_backoff_active = false;
    window._ws_last_attempt = 0;
    
    // Add tracking to global window to monitor success of manual reconnect
    window._manual_reconnect_attempt = Date.now();
    
    // First disconnect to ensure a clean connection attempt
    disconnect();
    
    // Short delay before reconnecting to ensure socket is fully closed
    setTimeout(() => {
      connect();
      
      setMessages(prev => [{
        type: 'SYSTEM', 
        payload: { message: 'Manual reconnection initiated', timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString() 
      }, ...prev]);
      
      console.log('[WebSocket] Manual reconnection initiated');
    }, 1000); // Longer delay to ensure clean disconnection
  };
  
  // Clear messages for a cleaner view
  const handleClearMessages = () => {
    setMessages([]);
    setPingLatency(null);
  };
  
  // Reset everything including error counters
  const handleFullReset = () => {
    // Reset connection status
    disconnect();
    
    // Reset all WebSocket-related window variables
    window._ws_backoff_active = false;
    window._ws_last_attempt = 0;
    window._ws_1006_count = 0;
    window._manual_reconnect_attempt = Date.now();
    
    // Clear UI state
    setMessages([
      { 
        type: 'SYSTEM', 
        payload: { message: 'Full system reset performed', timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString() 
      }
    ]);
    setPingLatency(null);
    
    // Log the reset
    console.log('[WebSocket] Full system reset performed');
    
    // Wait a bit and reconnect
    setTimeout(() => {
      connect();
    }, 1500);
  };
  
  // Check if we're in fallback mode (using our enhanced mechanism)
  const inFallbackMode = (window._ws_1006_count || 0) >= 15 || window._ws_backoff_active;
  
  // Authentication test
  const handleAuthTest = () => {
    // Check which send method is available - this is compatible with both implementations
    if (typeof send === 'function') {
      if (send.length >= 2) {
        // Using the new API with separate type and payload parameters
        send('authenticate', {
          userId: null,
          companyId: null,
          clientId: connectionId || `manual_${Date.now()}`,
          timestamp: new Date().toISOString()
        });
      } else {
        // Using the older API with a single message object
        send({
          type: 'authenticate',
          payload: {
            userId: null,
            companyId: null,
            clientId: connectionId || `manual_${Date.now()}`,
            timestamp: new Date().toISOString()
          }
        });
      }
    } else if (sendMessage && typeof sendMessage === 'function') {
      // Alternative API if available
      sendMessage({
        type: 'authenticate',
        payload: {
          userId: null,
          companyId: null,
          clientId: connectionId || `manual_${Date.now()}`,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    setMessages(prev => [
      { 
        type: 'SENT', 
        payload: { type: 'authenticate' }, 
        timestamp: new Date().toISOString() 
      },
      ...prev
    ]);
  };
  
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">WebSocket Diagnostic</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span>Connected</span>
                </>
              ) : isConnecting ? (
                <>
                  <RefreshCw className="h-5 w-5 text-amber-500 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-5 w-5 text-red-500" />
                  <span>Disconnected</span>
                </>
              )}
            </CardTitle>
            <CardDescription>
              {connectionId ? (
                <span>Connection ID: {connectionId}</span>
              ) : (
                <span>No active connection</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Connection Status:</span>
                  <Badge 
                    variant={isConnected ? "default" : isConnecting ? "outline" : "destructive"}
                    className={isConnected ? "bg-green-600 hover:bg-green-600/80" : ""}
                  >
                    {isConnected ? "Connected" : isConnecting ? "Connecting" : "Disconnected"}
                  </Badge>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Connection Mode:</span>
                  <Badge 
                    variant={inFallbackMode ? "destructive" : "secondary"}
                    className={inFallbackMode ? "bg-red-600" : ""}
                  >
                    {inFallbackMode ? "Fallback Mode" : "WebSocket"}
                  </Badge>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Reconnection Status:</span>
                  <Badge 
                    variant={window._ws_backoff_active ? "destructive" : hasAttemptedConnecting ? "outline" : "secondary"}
                    className={window._ws_backoff_active ? "bg-red-600" : ""}
                  >
                    {window._ws_backoff_active ? "Backoff Active" : hasAttemptedConnecting ? "Exhausted" : "Normal"}
                  </Badge>
                </div>
                
                {window._ws_backoff_active && (
                  <div className="rounded-md p-2 bg-red-50 dark:bg-red-950 text-xs">
                    <p className="font-semibold text-red-700 dark:text-red-400 mb-1">
                      Connection Cycle Detected
                    </p>
                    <p className="text-red-600 dark:text-red-300">
                      Rapid connect/disconnect cycling detected. Backoff enabled to prevent browser strain.
                      Use the Reconnect button to try again.
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Last attempt: {window._ws_last_attempt ? new Date(window._ws_last_attempt).toLocaleTimeString() : 'Unknown'}
                    </p>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Error 1006 Count:</span>
                  <Badge 
                    variant={(window._ws_1006_count || 0) > 5 ? "destructive" : "outline"}
                    className={(window._ws_1006_count || 0) > 5 ? "bg-red-600" : ""}
                  >
                    {window._ws_1006_count || 0}
                  </Badge>
                </div>
                
                {(window._ws_1006_count || 0) > 5 && (
                  <div className="rounded-md p-2 bg-amber-50 dark:bg-amber-950 text-xs mb-2">
                    <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1">
                      Multiple Error 1006 Detected
                    </p>
                    <p className="text-amber-600 dark:text-amber-300">
                      Error 1006 (Abnormal Closure) indicates possible network issues. 
                      Check your internet connection or firewall settings.
                    </p>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Ping Latency:</span>
                  {pingLatency !== null ? (
                    <Badge variant="outline" className={pingLatency < 300 ? "text-green-500" : "text-amber-500"}>
                      {pingLatency}ms
                    </Badge>
                  ) : (
                    <Badge variant="outline">Not tested</Badge>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">WebSocket Configuration</h4>
                <div className="text-xs p-2 bg-muted rounded-md break-all">
                  <p className="mb-1"><span className="font-semibold">Protocol:</span> {window.location.protocol === 'https:' ? 'wss:' : 'ws:'}</p>
                  <p className="mb-1"><span className="font-semibold">Host:</span> {window.location.host}</p>
                  <p><span className="font-semibold">Path:</span> /ws</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Using app-specific protocol to separate from Vite HMR</p>
              </div>
              
              {inFallbackMode && (
                <div className="rounded-md p-3 bg-amber-50 dark:bg-amber-950/30 text-xs">
                  <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1">
                    Operating in Fallback Mode
                  </p>
                  <p className="text-amber-600 dark:text-amber-300 mb-2">
                    Due to persistent connection issues, the application is using a polling fallback mechanism instead of WebSockets.
                  </p>
                  <p className="text-muted-foreground">
                    Real-time updates will be delayed. Tasks and updates may require refreshing the page to see the latest data.
                  </p>
                  <div className="mt-2">
                    <Button 
                      onClick={handleFullReset} 
                      variant="outline" 
                      size="sm"
                      className="w-full text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700/50"
                    >
                      <RefreshCw className="mr-2 h-3 w-3" /> Try Reset & Reconnect
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex-col space-y-2">
            <div className="flex justify-between gap-2 w-full">
              <Button 
                onClick={handlePing} 
                disabled={!isConnected}
                className="flex-1"
                size="sm"
              >
                <Send className="mr-2 h-4 w-4" /> Send Ping
              </Button>
              <Button 
                onClick={handleReconnect} 
                variant="outline" 
                size="sm"
                className="flex-1"
              >
                <Wifi className="mr-2 h-4 w-4" /> Reconnect
              </Button>
            </div>
            <div className="flex justify-between gap-2 w-full">
              <Button 
                onClick={handleAuthTest} 
                disabled={!isConnected}
                variant="secondary"
                size="sm"
                className="flex-1"
              >
                Test Auth
              </Button>
              <Button 
                onClick={handleClearMessages} 
                variant="outline" 
                size="sm"
                className="flex-1"
              >
                Clear Log
              </Button>
            </div>
            
            <Button 
              onClick={handleFullReset}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Full Reset
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Message Log</CardTitle>
            <CardDescription>
              Recent WebSocket messages sent and received
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 h-[400px] overflow-y-auto">
              {messages.length > 0 ? (
                messages.map((msg, i) => (
                  <div key={i} className="border rounded-md p-3 text-sm">
                    <div className="flex justify-between">
                      <Badge variant={msg.type === 'SENT' ? "outline" : "secondary"}>
                        {msg.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <Separator className="my-2" />
                    <pre className="text-xs overflow-x-auto">{JSON.stringify(msg.payload, null, 2)}</pre>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  No messages yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
