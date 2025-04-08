import React, { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  WifiOff, 
  Wifi, 
  RefreshCcw, 
  CheckCircle2 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WebSocketStatusProps {
  className?: string;
  showReconnectButton?: boolean;
}

/**
 * Component to display the WebSocket connection status
 */
export default function WebSocketStatus({ 
  className, 
  showReconnectButton = true 
}: WebSocketStatusProps) {
  const { isConnected, connect } = useWebSocket();
  const [reconnecting, setReconnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [messageTimestamp, setMessageTimestamp] = useState<string | null>(null);
  
  // Handle reconnection with visual feedback
  const handleReconnect = () => {
    setReconnecting(true);
    connect();
    // Reset the reconnecting state after a delay
    setTimeout(() => setReconnecting(false), 2000);
  };
  
  // Set up message listener
  useEffect(() => {
    const messageListener = (data: any) => {
      if (data.type === 'connection_established') {
        setLastMessage('Connected');
        setMessageTimestamp(new Date(data.timestamp).toLocaleTimeString());
      } else if (data.type === 'pong') {
        setLastMessage('Pong received');
        setMessageTimestamp(new Date(data.timestamp).toLocaleTimeString());
      }
    };
    
    // Add and remove message listeners
    useWebSocket().addMessageListener('connection_established', messageListener);
    useWebSocket().addMessageListener('pong', messageListener);
    
    return () => {
      useWebSocket().removeMessageListener('connection_established', messageListener);
      useWebSocket().removeMessageListener('pong', messageListener);
    };
  }, []);
  
  return (
    <div className={cn('flex flex-col space-y-2', className)}>
      <div className="flex items-center space-x-2">
        <Badge 
          variant={isConnected ? 'default' : 'destructive'} 
          className="flex items-center gap-1.5"
        >
          {isConnected ? (
            <>
              <Wifi className="h-3.5 w-3.5" />
              <span>Connected</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5" />
              <span>Disconnected</span>
            </>
          )}
        </Badge>
        
        {showReconnectButton && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleReconnect}
            disabled={reconnecting || isConnected}
            className="h-7 px-2"
          >
            <RefreshCcw className={cn(
              'h-3.5 w-3.5 mr-1',
              reconnecting && 'animate-spin'
            )} />
            Reconnect
          </Button>
        )}
      </div>
      
      {lastMessage && messageTimestamp && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">{lastMessage}</span> at {messageTimestamp}
        </div>
      )}
    </div>
  );
}