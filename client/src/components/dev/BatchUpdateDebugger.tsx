/**
 * BatchUpdateDebugger Component
 * 
 * This component provides a debugging interface for the BatchUpdater utility.
 * It allows developers to test and verify batch update functionality without affecting
 * production data or workflows.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { FormBatchUpdater, OptimizationFeatures, performanceMonitor } from '../../utils/form-optimization';

interface TestField {
  name: string;
  value: string;
  section: string;
}

export function BatchUpdateDebugger() {
  const [activeTab, setActiveTab] = useState('queue');
  const [featureEnabled, setFeatureEnabled] = useState(OptimizationFeatures.DEBOUNCED_UPDATES);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [newField, setNewField] = useState<TestField>({ name: '', value: '', section: 'test-section' });
  const [queuedFields, setQueuedFields] = useState<TestField[]>([]);
  const [processedFields, setProcessedFields] = useState<Record<string, any>>({});
  const [queueStats, setQueueStats] = useState({
    totalQueued: 0,
    totalProcessed: 0,
    lastProcessTime: 0,
    averageProcessTime: 0,
  });
  const [updateDelay, setUpdateDelay] = useState(500);
  
  // Initialize BatchUpdater with test configuration
  useEffect(() => {
    // Configure batch updater with test settings
    FormBatchUpdater.configure({
      updateDelayMs: updateDelay,
    });
    
    // Register callbacks to monitor activity
    FormBatchUpdater.onUpdate((fields, timestamps) => {
      addLog(`Processing batch update with ${Object.keys(fields).length} fields`);
      setProcessedFields(prev => ({ ...prev, ...fields }));
      setQueueStats(prev => ({
        ...prev,
        totalProcessed: prev.totalProcessed + Object.keys(fields).length,
        lastProcessTime: Date.now(),
      }));
    });
    
    FormBatchUpdater.onComplete(() => {
      addLog('Batch update completed');
      // Clear the queue in our UI
      setQueuedFields([]);
    });
    
    // Log initial state
    addLog('BatchUpdateDebugger initialized');
    
    return () => {
      // Clean up when component unmounts
      FormBatchUpdater.reset();
    };
  }, [updateDelay]);
  
  // Add log message
  const addLog = useCallback((message: string) => {
    setDebugLog(prev => [
      `[${new Date().toLocaleTimeString()}] ${message}`,
      ...prev.slice(0, 49), // Keep last 50 messages
    ]);
  }, []);
  
  // Queue a field update
  const queueUpdate = useCallback(() => {
    if (!newField.name || !newField.value) {
      addLog('Error: Field name and value are required');
      return;
    }
    
    // Add to our visual queue
    setQueuedFields(prev => [...prev, { ...newField }]);
    
    // Queue the actual update
    FormBatchUpdater.queueUpdate(newField.name, newField.value, {
      sectionId: newField.section,
    });
    
    addLog(`Queued field "${newField.name}" with value "${newField.value}"`);
    
    setQueueStats(prev => ({
      ...prev,
      totalQueued: prev.totalQueued + 1,
    }));
    
    // Reset the form
    setNewField(prev => ({ ...prev, name: '', value: '' }));
  }, [newField, addLog]);
  
  // Process the queue immediately
  const processQueue = useCallback(() => {
    addLog('Manually processing queue');
    FormBatchUpdater.flush();
  }, [addLog]);
  
  // Clear the queue without processing
  const clearQueue = useCallback(() => {
    addLog('Clearing queue without processing');
    FormBatchUpdater.clear();
    setQueuedFields([]);
  }, [addLog]);
  
  // Reset all state
  const resetDebugger = useCallback(() => {
    addLog('Resetting debugger state');
    FormBatchUpdater.reset();
    setQueuedFields([]);
    setProcessedFields({});
    setQueueStats({
      totalQueued: 0,
      totalProcessed: 0,
      lastProcessTime: 0,
      averageProcessTime: 0,
    });
  }, [addLog]);
  
  // Toggle feature flag
  const toggleFeature = useCallback(() => {
    OptimizationFeatures.DEBOUNCED_UPDATES = !featureEnabled;
    setFeatureEnabled(!featureEnabled);
    addLog(`Feature flag set to: ${!featureEnabled}`);
  }, [featureEnabled, addLog]);
  
  // Update delay setting
  const updateDelayValue = useCallback((newDelay: number) => {
    setUpdateDelay(newDelay);
    FormBatchUpdater.configure({ updateDelayMs: newDelay });
    addLog(`Update delay set to: ${newDelay}ms`);
  }, [addLog]);
  
  // Run performance test with multiple fields
  const runPerformanceTest = useCallback(() => {
    addLog('Starting performance test');
    performanceMonitor.startTimer('batchUpdateTest');
    
    // Generate test data - 50 fields
    for (let i = 0; i < 50; i++) {
      const fieldName = `test_field_${i}`;
      const fieldValue = `value_${i}_${Date.now()}`;
      
      // Queue the update
      FormBatchUpdater.queueUpdate(fieldName, fieldValue, {
        sectionId: `section_${Math.floor(i / 10)}`,
      });
      
      // Add to our visual queue
      setQueuedFields(prev => [
        ...prev,
        {
          name: fieldName,
          value: fieldValue,
          section: `section_${Math.floor(i / 10)}`,
        },
      ]);
    }
    
    setQueueStats(prev => ({
      ...prev,
      totalQueued: prev.totalQueued + 50,
    }));
    
    addLog('Queued 50 test fields');
  }, [addLog]);
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Batch Updater Debugger</CardTitle>
            <CardDescription>
              Test and monitor the BatchUpdater utility for field updates
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="feature-toggle" className="text-sm">
              Feature Enabled
            </Label>
            <Switch 
              id="feature-toggle"
              checked={featureEnabled}
              onCheckedChange={toggleFeature}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="queue">Queue Manager</TabsTrigger>
            <TabsTrigger value="logs">Debug Logs</TabsTrigger>
            <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="queue" className="pt-4">
            <div className="grid grid-cols-3 gap-6">
              {/* Left: Add Field Form */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Add Test Field</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="field-name">Field Name</Label>
                    <Input 
                      id="field-name"
                      value={newField.name}
                      onChange={e => setNewField(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., companyName"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="field-value">Field Value</Label>
                    <Input 
                      id="field-value"
                      value={newField.value}
                      onChange={e => setNewField(prev => ({ ...prev, value: e.target.value }))}
                      placeholder="e.g., Acme Corp"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="field-section">Section ID</Label>
                    <Input 
                      id="field-section"
                      value={newField.section}
                      onChange={e => setNewField(prev => ({ ...prev, section: e.target.value }))}
                      placeholder="e.g., company-profile"
                    />
                  </div>
                  
                  <Button 
                    onClick={queueUpdate}
                    className="w-full"
                    disabled={!newField.name || !newField.value || !featureEnabled}
                  >
                    Queue Update
                  </Button>
                </div>
                
                <div className="pt-4 space-y-3">
                  <h3 className="text-lg font-medium">Configuration</h3>
                  <div>
                    <Label htmlFor="update-delay">Update Delay (ms)</Label>
                    <div className="flex items-center space-x-2">
                      <Input 
                        id="update-delay"
                        type="number"
                        value={updateDelay}
                        onChange={e => updateDelayValue(parseInt(e.target.value) || 500)}
                        min={0}
                        max={5000}
                        className="flex-1"
                      />
                      <Button 
                        variant="outline"
                        onClick={() => updateDelayValue(500)}
                        size="sm"
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Button 
                      onClick={runPerformanceTest}
                      variant="outline"
                      className="w-full"
                      disabled={!featureEnabled}
                    >
                      Run Performance Test
                    </Button>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        onClick={processQueue}
                        disabled={queuedFields.length === 0 || !featureEnabled}
                        variant="secondary"
                      >
                        Process Now
                      </Button>
                      <Button 
                        onClick={clearQueue}
                        disabled={queuedFields.length === 0}
                        variant="destructive"
                      >
                        Clear Queue
                      </Button>
                    </div>
                    
                    <Button 
                      onClick={resetDebugger}
                      variant="outline"
                      className="w-full"
                    >
                      Reset All
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Middle: Queue Status */}
              <div>
                <h3 className="text-lg font-medium mb-3">Queue Status</h3>
                <div className="border rounded-md p-4 mb-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">Queue Size:</div>
                    <div className="font-medium">{queuedFields.length}</div>
                    
                    <div className="text-gray-500">Total Queued:</div>
                    <div className="font-medium">{queueStats.totalQueued}</div>
                    
                    <div className="text-gray-500">Total Processed:</div>
                    <div className="font-medium">{queueStats.totalProcessed}</div>
                    
                    <div className="text-gray-500">Update Delay:</div>
                    <div className="font-medium">{updateDelay}ms</div>
                  </div>
                </div>
                
                <div className="h-80 overflow-y-auto border rounded-md">
                  {queuedFields.length > 0 ? (
                    <div className="divide-y">
                      {queuedFields.map((field, index) => (
                        <div key={`${field.name}-${index}`} className="p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{field.name}</span>
                            <Badge>{field.section}</Badge>
                          </div>
                          <div className="mt-1 text-gray-600 truncate">
                            {field.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      Queue is empty
                    </div>
                  )}
                </div>
              </div>
              
              {/* Right: Processed Fields */}
              <div>
                <h3 className="text-lg font-medium mb-3">Processed Fields</h3>
                <div className="h-96 overflow-y-auto border rounded-md">
                  {Object.keys(processedFields).length > 0 ? (
                    <div className="divide-y">
                      {Object.entries(processedFields).map(([fieldName, value]) => (
                        <div key={fieldName} className="p-3 text-sm">
                          <div className="font-medium">{fieldName}</div>
                          <div className="mt-1 text-gray-600 break-all">
                            {String(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No processed fields yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="logs" className="pt-4">
            <div className="border rounded-md h-96 overflow-y-auto p-4 font-mono text-sm">
              {debugLog.length > 0 ? (
                <div className="space-y-1">
                  {debugLog.map((log, index) => (
                    <div key={index} className="pb-1">
                      {log}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No logs yet
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setDebugLog([])}
              >
                Clear Logs
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="metrics" className="pt-4">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Batch Update Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-gray-500">Total Queued:</div>
                      <div className="font-medium">{queueStats.totalQueued}</div>
                      
                      <div className="text-gray-500">Total Processed:</div>
                      <div className="font-medium">{queueStats.totalProcessed}</div>
                      
                      <div className="text-gray-500">Current Queue Size:</div>
                      <div className="font-medium">{queuedFields.length}</div>
                      
                      <div className="text-gray-500">Update Delay:</div>
                      <div className="font-medium">{updateDelay}ms</div>
                      
                      <div className="text-gray-500">Feature Enabled:</div>
                      <div className="font-medium">{featureEnabled ? 'Yes' : 'No'}</div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Performance Test</h4>
                      <Button 
                        onClick={runPerformanceTest} 
                        className="w-full"
                        disabled={!featureEnabled}
                      >
                        Run 50-Field Test
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>System Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-gray-500">Browser:</div>
                      <div className="font-medium">{navigator.userAgent.split(' ')[0]}</div>
                      
                      <div className="text-gray-500">Platform:</div>
                      <div className="font-medium">{navigator.platform}</div>
                      
                      <div className="text-gray-500">Window Size:</div>
                      <div className="font-medium">{window.innerWidth} x {window.innerHeight}</div>
                      
                      <div className="text-gray-500">Feature Flags:</div>
                      <div className="font-medium">
                        <Badge variant={OptimizationFeatures.DEBOUNCED_UPDATES ? "default" : "outline"} className="mr-1">
                          DEBOUNCED_UPDATES
                        </Badge>
                        <Badge variant={OptimizationFeatures.PROGRESSIVE_LOADING ? "default" : "outline"}>
                          PROGRESSIVE_LOADING
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}