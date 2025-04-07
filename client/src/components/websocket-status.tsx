import { useWebSocketContext } from "@/providers/websocket-provider";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Wifi, WifiOff } from "lucide-react";

interface WebSocketStatusProps {
  showTooltip?: boolean;
  showLabel?: boolean;
  className?: string;
  position?: "top" | "bottom" | "left" | "right";
}

const statusColors = {
  connected: "bg-green-500",
  connecting: "bg-yellow-500",
  disconnected: "bg-gray-500",
  error: "bg-red-500"
};

const statusMessages = {
  connected: "Connected to real-time server",
  connecting: "Connecting to real-time server...",
  disconnected: "Not connected to real-time server",
  error: "Error connecting to real-time server"
};

export function WebSocketStatus({ 
  showTooltip = true,
  showLabel = false,
  className = "",
  position = "top"
}: WebSocketStatusProps) {
  const { status, isConnected } = useWebSocketContext();
  
  const statusColor = statusColors[status];
  const statusMessage = statusMessages[status];
  
  const content = (
    <div className={`flex items-center gap-2 ${className}`}>
      {isConnected ? (
        <Wifi className="h-4 w-4 text-green-500" />
      ) : (
        <WifiOff className="h-4 w-4 text-gray-500" />
      )}
      
      {showLabel && (
        <Badge variant="outline" className={`${statusColor} text-white text-xs py-0.5`}>
          {status}
        </Badge>
      )}
    </div>
  );
  
  if (!showTooltip) {
    return content;
  }
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side={position} className="bg-slate-900 text-white text-xs p-2">
          <p>{statusMessage}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default WebSocketStatus;