import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { kybService } from '@/services/kybService';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

/**
 * A simple test component to validate form field updates are working properly
 * WARNING: This component was causing "asdf" test values to be written to production data
 * It has been modified to prevent accidental test data in production databases
 */
export default function TestFormUpdate() {
  // Changed default task ID to 999999 (non-existent) to prevent accidental production data modification
  const [taskId, setTaskId] = useState<number>(999999); 
  const [fieldKey, setFieldKey] = useState<string>('businessType');
  const [fieldValue, setFieldValue] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [confirmationChecked, setConfirmationChecked] = useState<boolean>(false);
  const [isTestMode, setIsTestMode] = useState<boolean>(true);

  useEffect(() => {
    // Add warning about this tool being for testing only
    addLog('⚠️ WARNING: This is a test tool. Do not use with production task IDs.');
    addLog('This tool was previously set to use task ID 348 by default, which may have caused test data to be saved to production tasks.');
  }, []);

  // Add log entry
  const addLog = (message: string) => {
    console.log(`[TEST LOG] ${message}`);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Test direct field update
  const testDirectUpdate = async () => {
    try {
      // Safety check - prevent updates to production tasks without explicit confirmation
      if (taskId < 900000 && !confirmationChecked) {
        addLog(`⛔ SAFETY BLOCK: Update prevented - task ID ${taskId} appears to be a production task`);
        addLog(`Please check the confirmation box if you're sure you want to modify a production task`);
        setResult('⛔ Update blocked - Please confirm you want to modify a production task');
        return;
      }

      // Additional warning for "asdf" test values
      if (fieldValue === 'asdf') {
        addLog(`⚠️ WARNING: Using "asdf" as test value. This has caused data corruption in the past.`);
      }
      
      addLog(`Starting direct update test for field "${fieldKey}" with value "${fieldValue}"`);
      
      if (isTestMode) {
        // Simulate update without actually calling the API
        addLog('🟡 TEST MODE: Simulating update without modifying database');
        addLog(`Would update field "${fieldKey}" to "${fieldValue}" for task ${taskId}`);
        
        setTimeout(() => {
          addLog('🟡 TEST MODE: Simulated save completed');
          setResult('✅ Test simulation completed (no data was changed)');
        }, 1000);
      } else {
        // Direct update using kybService
        kybService.updateFormData(fieldKey, fieldValue, taskId);
        addLog('🟢 Field updated in kybService');
        
        // Force immediate save
        addLog('Forcing immediate save...');
        const saveResult = await kybService.saveProgress(taskId);
        addLog(`🟢 Save completed`);
        setResult('✅ Update successful');
      }
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
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>⚠️ Use with caution - Testing tool only</AlertTitle>
            <AlertDescription>
              This tool can modify production data. It was previously hardcoded to use task ID 348, 
              which may have caused test data to be saved in production. Use Test Mode or a high Task ID.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 mb-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="block mb-2">Task ID</label>
                {taskId < 900000 && (
                  <Badge variant={confirmationChecked ? "outline" : "destructive"}>
                    Production ID
                  </Badge>
                )}
              </div>
              <Input
                type="number"
                value={taskId}
                onChange={(e) => setTaskId(Number(e.target.value))}
                placeholder="Task ID"
                className={`mb-2 ${taskId < 900000 ? 'border-red-500' : ''}`}
              />
              {taskId < 900000 && (
                <p className="text-sm text-red-500 mb-2">
                  ⚠️ This appears to be a production task ID. Use with caution!
                </p>
              )}
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
                className={`mb-2 ${fieldValue === 'asdf' ? 'border-orange-500' : ''}`}
              />
              {fieldValue === 'asdf' && (
                <p className="text-sm text-orange-500 mb-2">
                  ⚠️ "asdf" test values have been found in production data
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="test-mode" 
                checked={isTestMode} 
                onCheckedChange={(checked) => setIsTestMode(!!checked)} 
              />
              <label
                htmlFor="test-mode"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Test Mode (simulates updates without modifying database)
              </label>
            </div>
            
            {!isTestMode && taskId < 900000 && (
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="confirmation" 
                  checked={confirmationChecked} 
                  onCheckedChange={(checked) => setConfirmationChecked(!!checked)} 
                />
                <label
                  htmlFor="confirmation"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I confirm I want to modify a production task (ID {taskId})
                </label>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 mb-4">
            <Button 
              onClick={testDirectUpdate}
              variant={isTestMode ? "outline" : "default"}
            >
              {isTestMode ? "Run Test Simulation" : "Update Real Data"}
            </Button>
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