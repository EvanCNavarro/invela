/**
 * WebSocket Status Component
 * 
 * This component shows the current status of the WebSocket connection
 * and allows basic interactions like connect, disconnect, and sending messages.
 */

import React, { useState, useEffect } from 'react';
import useWebSocket, { WebSocketMessage } from '../hooks/use-websocket';

// Component props
interface WebSocketStatusProps {
  userId?: number;
  companyId?: number;
}

export function WebSocketStatus({ userId, companyId }: WebSocketStatusProps) {
  // Use our WebSocket hook with debug mode enabled
  const {
    isConnected,
    isConnecting,
    lastMessage,
    connectionId,
    connect,
    disconnect,
    sendMessage,
    authenticate,
    sendPing
  } = useWebSocket({
    debug: true,
    autoReconnect: true
  });

  // State for message log
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Update messages when a new message is received
  useEffect(() => {
    if (lastMessage) {
      setMessages(prev => [lastMessage, ...prev].slice(0, 10));
      
      // If we received an authentication confirmation, update state
      if (lastMessage.type === 'authenticated') {
        setIsAuthenticated(true);
      }
    }
  }, [lastMessage]);

  // Authenticate with the server when connected and user/company info is available
  useEffect(() => {
    if (isConnected && userId && companyId && !isAuthenticated) {
      authenticate(userId, companyId);
    }
  }, [isConnected, userId, companyId, authenticate, isAuthenticated]);

  // Send a custom task update message
  const sendTaskUpdate = () => {
    sendMessage({
      type: 'task_updated',
      taskId: Math.floor(Math.random() * 1000),
      progress: Math.floor(Math.random() * 100),
      status: 'in_progress',
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'WebSocketStatus component'
      }
    });
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold mb-2">WebSocket Status</h2>
      
      <div className="flex items-center mb-4 space-x-2">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
        <span>{isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}</span>
        {isAuthenticated && <span className="text-green-600 ml-2">(Authenticated)</span>}
      </div>
      
      {connectionId && (
        <div className="mb-4 text-sm text-gray-600">
          <span>Connection ID: </span>
          <code className="bg-gray-100 px-1 rounded">{connectionId}</code>
        </div>
      )}
      
      <div className="flex space-x-2 mb-4">
        <button
          onClick={connect}
          disabled={isConnected || isConnecting}
          className="px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Connect
        </button>
        
        <button
          onClick={disconnect}
          disabled={!isConnected}
          className="px-3 py-1 bg-red-500 text-white rounded disabled:opacity-50"
        >
          Disconnect
        </button>
        
        <button
          onClick={sendPing}
          disabled={!isConnected}
          className="px-3 py-1 bg-gray-500 text-white rounded disabled:opacity-50"
        >
          Ping
        </button>
        
        <button
          onClick={() => authenticate(userId, companyId)}
          disabled={!isConnected || !userId || !companyId}
          className="px-3 py-1 bg-purple-500 text-white rounded disabled:opacity-50"
        >
          Authenticate
        </button>
        
        <button
          onClick={sendTaskUpdate}
          disabled={!isConnected}
          className="px-3 py-1 bg-green-500 text-white rounded disabled:opacity-50"
        >
          Send Task Update
        </button>
      </div>
      
      <div className="mt-4">
        <h3 className="text-md font-medium mb-2">Last 10 Messages</h3>
        <div className="bg-gray-100 p-2 rounded max-h-60 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-gray-500 italic">No messages yet</p>
          ) : (
            <ul className="space-y-2">
              {messages.map((msg, index) => (
                <li key={index} className="text-xs">
                  <div className="bg-white p-2 rounded shadow-sm">
                    <div className="font-semibold">{msg.type}</div>
                    <div className="overflow-hidden text-ellipsis">
                      <pre className="whitespace-pre-wrap text-xs overflow-x-auto">
                        {JSON.stringify(msg, null, 2)}
                      </pre>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default WebSocketStatus;