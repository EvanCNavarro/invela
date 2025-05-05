/**
 * WebSocket Diagnostic Page
 * 
 * This page provides a diagnostic interface for testing WebSocket connectivity
 * and monitoring connection status with detailed information.
 */

import React, { useState, useEffect } from 'react';
import { useWebSocketService } from '@/providers/websocket-provider';
import { WebSocketEventMap } from '@/lib/websocket-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle2, RefreshCw, Send, Wifi, WifiOff } from 'lucide-react';

export default function WebSocketDiagnosticPage() {
  const { isConnected, isConnecting, connectionId, hasAttemptedConnecting, send, subscribe, unsubscribe } = useWebSocketService();
  
  // Get WebSocket provider methods
  const handleConnect = () => {
    if (typeof window !== 'undefined') {
      window.location.reload(); // Force a refresh to reconnect
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
    
    // We're using 'connection_status' as a generic message type
    // that the server sends when a client connects
    const unsubscribeFunc = subscribe('connection_status', handleMessage);
    
    // Cleanup subscription on component unmount
    return () => {
      unsubscribeFunc();
    };
  }, [subscribe, unsubscribe, lastPingSent]);
  
  // Handle testing ping
  const handlePing = () => {
    setLastPingSent(Date.now());
    send({
      type: 'ping',
      timestamp: new Date().toISOString()
    });
    
    setMessages(prev => [
      { 
        type: 'SENT', 
        payload: { type: 'ping' }, 
        timestamp: new Date().toISOString() 
      },
      ...prev
    ]);
  };
  
  // Handle manual connection attempt
  const handleReconnect = () => {
    handleConnect();
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
                <span className="text-sm text-muted-foreground">Reconnection Attempts:</span>
                <Badge variant={hasAttemptedConnecting ? "outline" : "secondary"}>
                  {hasAttemptedConnecting ? "Exhausted" : "Normal"}
                </Badge>
              </div>
              
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
          </CardContent>
          <CardFooter className="flex justify-between gap-4">
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
