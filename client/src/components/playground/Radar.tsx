
import React, { useEffect, useState } from 'react';
import { useSocket } from '@/contexts/SocketContext';

interface RadarEvent {
  type: string;
  timestamp: string;
  data?: any;
}

export const Radar: React.FC = () => {
  const { socket } = useSocket();
  const [events, setEvents] = useState<RadarEvent[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleRadarEvent = (event: RadarEvent) => {
      setEvents(prev => [event, ...prev].slice(0, 50));
    };

    socket.on('radar:event', handleRadarEvent);

    return () => {
      socket.off('radar:event', handleRadarEvent);
    };
  }, [socket]);

  // Debug panel visibility toggle with keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl+Shift+R to toggle radar visibility
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-h-96 overflow-auto bg-background/90 backdrop-blur-sm border border-border rounded-lg shadow-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium">Event Radar</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>
      
      <div className="space-y-2">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events captured yet</p>
        ) : (
          events.map((event, index) => (
            <div key={index} className="text-xs border-l-2 border-primary pl-2 py-1">
              <div className="font-medium">{event.type}</div>
              <div className="text-muted-foreground">{new Date(event.timestamp).toLocaleTimeString()}</div>
              {event.data && (
                <pre className="mt-1 bg-muted/50 p-1 rounded text-[10px] overflow-x-auto">
                  {JSON.stringify(event.data, null, 2)}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
