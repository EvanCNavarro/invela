/**
 * WebSocket Test Page
 * 
 * This page allows testing of the WebSocket functionality,
 * particularly for form submission events.
 */

import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/use-websocket';
import { testFormSubmissionBroadcast } from '../services/formSubmissionService';
import FormSubmissionListener from '../components/forms/FormSubmissionListener';
import { SubmissionSuccessModal } from '../components/modals/SubmissionSuccessModal';

export function WebSocketTestPage() {
  const { connectionState, lastMessage } = useWebSocket();
  const [messages, setMessages] = useState<any[]>([]);
  const [taskId, setTaskId] = useState<number>(999);
  const [formType, setFormType] = useState<string>('kyb');
  const [companyId, setCompanyId] = useState<number>(254);
  const [submissionEvent, setSubmissionEvent] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  // Track WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      setMessages(prev => [...prev, lastMessage]);
    }
  }, [lastMessage]);

  // Handle success event
  const handleSuccess = (event: any) => {
    console.log('Success event received:', event);
    setSubmissionEvent(event);
    setShowSuccessModal(true);
  };

  // Handle error event
  const handleError = (event: any) => {
    console.error('Error event received:', event);
    alert(`Error: ${event.error || 'Unknown error'}`);
  };

  // Send test broadcast
  const sendTestBroadcast = async () => {
    try {
      const response = await testFormSubmissionBroadcast(
        taskId,
        formType,
        companyId
      );
      console.log('Test broadcast sent:', response);
    } catch (error) {
      console.error('Error sending test broadcast:', error);
      alert(`Error sending test: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Clear messages
  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">WebSocket Testing</h1>
      
      {/* Connection Status */}
      <div className="mb-6">
        <h2 className="font-semibold text-lg mb-2">Connection Status</h2>
        <div className="flex items-center">
          <div 
            className={`w-3 h-3 rounded-full mr-2 ${
              connectionState === 'connected' 
                ? 'bg-green-500' 
                : connectionState === 'connecting' 
                  ? 'bg-yellow-500' 
                  : 'bg-red-500'
            }`}
          ></div>
          <span className="capitalize">{connectionState}</span>
        </div>
      </div>
      
      {/* Form Submission Test */}
      <div className="mb-6 p-4 border rounded-md bg-white">
        <h2 className="font-semibold text-lg mb-4">Test Form Submission</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label htmlFor="taskId" className="block text-sm font-medium mb-1">Task ID</label>
            <input
              type="number"
              id="taskId"
              className="w-full px-3 py-2 border rounded-md"
              value={taskId}
              onChange={(e) => setTaskId(parseInt(e.target.value) || 0)}
            />
          </div>
          <div>
            <label htmlFor="formType" className="block text-sm font-medium mb-1">Form Type</label>
            <select
              id="formType"
              className="w-full px-3 py-2 border rounded-md"
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
            >
              <option value="kyb">KYB</option>
              <option value="ky3p">KY3P</option>
              <option value="open_banking">Open Banking</option>
            </select>
          </div>
          <div>
            <label htmlFor="companyId" className="block text-sm font-medium mb-1">Company ID</label>
            <input
              type="number"
              id="companyId"
              className="w-full px-3 py-2 border rounded-md"
              value={companyId}
              onChange={(e) => setCompanyId(parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
        <button
          onClick={sendTestBroadcast}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Send Test Broadcast
        </button>
      </div>
      
      {/* Form Submission Listener */}
      <div className="mb-6 p-4 border rounded-md bg-white">
        <h2 className="font-semibold text-lg mb-2">Form Submission Listener</h2>
        <FormSubmissionListener
          taskId={taskId}
          formType={formType}
          onSuccess={handleSuccess}
          onError={handleError}
          showToasts={true}
        >
          <div className="text-sm text-gray-600">
            Listening for form submission events for Task ID: {taskId}, Form Type: {formType}
          </div>
        </FormSubmissionListener>
      </div>
      
      {/* Recent Messages */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold text-lg">Recent Messages</h2>
          <button 
            onClick={clearMessages}
            className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Clear
          </button>
        </div>
        <div className="border rounded-md bg-gray-50 p-4 max-h-80 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-gray-500 text-center p-4">No messages received yet</div>
          ) : (
            <ul className="space-y-2">
              {messages.map((message, index) => (
                <li key={index} className="p-2 bg-white rounded border">
                  <div className="font-mono text-sm">
                    <span className="font-semibold">Type:</span> {message.type}
                  </div>
                  {message.payload && (
                    <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(message.payload, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      
      {/* Success Modal */}
      {submissionEvent && (
        <SubmissionSuccessModal
          open={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          title="Form Submission Successful"
          message={`Your ${formType} form has been submitted successfully.`}
          fileName={submissionEvent.fileName}
          fileId={submissionEvent.fileId}
          returnPath="/websocket-test"
          returnLabel="Back to Test Page"
          taskType={formType}
        />
      )}
    </div>
  );
}

export default WebSocketTestPage;