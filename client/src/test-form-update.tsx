import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { kybService } from '@/services/kybService';

/**
 * A simple test component to validate form field updates are working properly
 */
export default function TestFormUpdate() {
  const [taskId, setTaskId] = useState<number>(348); // Default to task 348
  const [fieldKey, setFieldKey] = useState<string>('businessType');
  const [fieldValue, setFieldValue] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  // Add log entry
  const addLog = (message: string) => {
    console.log(`[TEST LOG] ${message}`);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Test direct field update
  const testDirectUpdate = async () => {
    try {
      addLog(`Starting direct update test for field "${fieldKey}" with value "${fieldValue}"`);
      
      // Direct update using kybService
      kybService.updateFormData(fieldKey, fieldValue, taskId);
      addLog('🟢 Field updated in kybService');
      
      // Force immediate save
      addLog('Forcing immediate save...');
      const saveResult = await kybService.saveProgress(taskId);
      addLog(`🟢 Save completed`);
      setResult('✅ Update successful');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(`❌ Error: ${errorMessage}`);
      setResult(`❌ Error: ${errorMessage}`);
    }
  };

  // Clear logs
  const clearLogs = () => setLogs([]);

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Form Field Update Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 mb-4">
            <div>
              <label className="block mb-2">Task ID</label>
              <Input
                type="number"
                value={taskId}
                onChange={(e) => setTaskId(Number(e.target.value))}
                placeholder="Task ID"
                className="mb-2"
              />
            </div>
            <div>
              <label className="block mb-2">Field Key</label>
              <Input
                type="text"
                value={fieldKey}
                onChange={(e) => setFieldKey(e.target.value)}
                placeholder="Field Key"
                className="mb-2"
              />
            </div>
            <div>
              <label className="block mb-2">Field Value</label>
              <Input
                type="text"
                value={fieldValue}
                onChange={(e) => setFieldValue(e.target.value)}
                placeholder="Field Value"
                className="mb-2"
              />
            </div>
          </div>
          
          <div className="flex gap-2 mb-4">
            <Button onClick={testDirectUpdate}>Test Direct Update</Button>
            <Button variant="outline" onClick={clearLogs}>Clear Logs</Button>
          </div>
          
          {result && (
            <div className={`p-3 mb-4 rounded ${result.includes('✅') ? 'bg-green-100' : 'bg-red-100'}`}>
              {result}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-black text-green-400 font-mono p-4 rounded h-[300px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet. Run a test to see results.</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}