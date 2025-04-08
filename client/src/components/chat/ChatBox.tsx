import React, { useState, useRef, useEffect } from 'react';
import { useWebSocket, WebSocketMessage } from '@/hooks/useWebSocket';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PaperPlaneIcon, CircleCheckIcon, AlertCircleIcon } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { motion } from 'framer-motion';

interface ChatBoxProps {
  className?: string;
}

export function ChatBox({ className = '' }: ChatBoxProps) {
  const [messageInput, setMessageInput] = useState('');
  const { messages, connected, error, sendMessage } = useWebSocket();
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  
  const displayName = user?.name || user?.email || 'You';

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    
    const sent = sendMessage(messageInput, displayName);
    if (sent) {
      setMessageInput('');
    }
  };

  // Format timestamp to a readable time
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (err) {
      return '';
    }
  };

  return (
    <div className={`flex flex-col h-full border rounded-lg bg-white shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3 bg-gray-50 rounded-t-lg">
        <div className="flex items-center">
          <h3 className="text-lg font-semibold">Compliance Chat</h3>
          <div className="ml-2 flex items-center">
            {connected ? (
              <div className="flex items-center text-green-600">
                <CircleCheckIcon className="w-4 h-4 mr-1" />
                <span className="text-xs">Connected</span>
              </div>
            ) : (
              <div className="flex items-center text-amber-600">
                <AlertCircleIcon className="w-4 h-4 mr-1" />
                <span className="text-xs">Disconnected</span>
              </div>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-500">
          {connected ? 'Chat service online' : 'Chat service offline'}
        </div>
      </div>
      
      {/* Messages Container */}
      <div 
        ref={messageContainerRef}
        className="flex-1 p-4 overflow-y-auto space-y-4"
        style={{ maxHeight: 'calc(100% - 120px)' }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p>No messages yet</p>
            <p className="text-sm">Start a conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${message.sender === displayName ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] px-4 py-2 rounded-lg shadow-sm ${
                  message.sender === displayName 
                    ? 'bg-blue-100 text-blue-900' 
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-sm">
                    {message.sender === displayName ? 'You' : message.sender}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    {message.timestamp && formatTime(message.timestamp)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              </div>
            </motion.div>
          ))
        )}
        
        {error && (
          <div className="bg-red-50 text-red-600 p-2 rounded text-sm text-center">
            {error}
          </div>
        )}
      </div>
      
      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-3 border-t mt-auto">
        <div className="flex gap-2">
          <Input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            disabled={!connected}
          />
          <Button 
            type="submit" 
            size="sm"
            disabled={!connected || !messageInput.trim()}
          >
            <PaperPlaneIcon className="h-4 w-4 mr-1" />
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}