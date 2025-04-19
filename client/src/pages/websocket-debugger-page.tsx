import React from 'react';
import { WebSocketDebugger } from '@/components/WebSocketDebugger';

export default function WebSocketDebuggerPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2">WebSocket Debugger</h1>
      <p className="text-gray-500 mb-6">
        Test real-time WebSocket notifications and task updates
      </p>
      <div className="my-6 border-t border-gray-200" />
      
      <div className="max-w-3xl mx-auto">
        <WebSocketDebugger />
        
        <div className="mt-10 p-4 border rounded-md bg-slate-50">
          <h2 className="text-xl font-semibold mb-4">How to use</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Enter a task ID in the input field (must be a valid task ID from your task center)</li>
            <li>Click "Test Notification" to send a test notification through the WebSocket</li>
            <li>The WebSocket context will capture the update and display it in the "Last Task Update" section</li>
            <li>You can also test the connection by clicking "Send Ping" to verify the WebSocket is working</li>
          </ol>
          <p className="mt-4 text-sm text-gray-500">
            Note: This is a development tool to test the WebSocket functionality for task progress updates.
          </p>
        </div>
      </div>
    </div>
  );
}