/**
 * BatchUpdateDebugger Component
 * 
 * This component provides a debugging interface for the BatchUpdater utility.
 * It allows developers to test and verify batch update functionality without affecting
 * production data or workflows.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormBatchUpdater, OptimizationFeatures } from '@/utils/form-optimization';
import { Switch } from '@/components/ui/switch';

interface TestField {
  name: string;
  value: string;
  section: string;
}

export function BatchUpdateDebugger() {
  const [fields, setFields] = useState<TestField[]>([
    { name: 'field1', value: 'test value 1', section: 'section1' },
    { name: 'field2', value: 'test value 2', section: 'section1' },
    { name: 'field3', value: 'test value 3', section: 'section2' },
  ]);
  
  const [batchResults, setBatchResults] = useState<{
    batchedFields: Record<string, any>;
    timestamps: Record<string, number>;
    processingTime: number;
    success: boolean;
    error?: any;
  } | null>(null);
  
  const [newField, setNewField] = useState<TestField>({ 
    name: '', value: '', section: 'section1' 
  });
  
  const [debounceDelay, setDebounceDelay] = useState(500);
  const [featureEnabled, setFeatureEnabled] = useState(OptimizationFeatures.DEBOUNCED_UPDATES);
  
  // Configure the batch updater
  useEffect(() => {
    FormBatchUpdater.configure({ updateDelayMs: debounceDelay });
    console.log('[DEBUG] BatchUpdater configured with delay:', debounceDelay);
    
    // Set up a batch update listener just for testing
    FormBatchUpdater.onUpdate((batchedFields, timestamps) => {
      console.log('[DEBUG] Batch update received:', batchedFields, timestamps);
      
      const startTime = performance.now();
      
      // Simulate some processing time
      setTimeout(() => {
        const endTime = performance.now();
        
        setBatchResults({
          batchedFields,
          timestamps,
          processingTime: endTime - startTime,
          success: true
        });
      }, 100);
    });
    
    return () => {
      // Reset the batch updater when component unmounts
      FormBatchUpdater.reset();
    };
  }, [debounceDelay]);
  
  const handleAddField = useCallback(() => {
    if (!newField.name.trim() || !newField.value.trim()) return;
    
    setFields(prev => [...prev, { ...newField }]);
    setNewField({ name: '', value: '', section: newField.section });
  }, [newField]);
  
  const handleUpdateField = useCallback((index: number, value: string) => {
    setFields(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], value };
      return updated;
    });
  }, []);
  
  const handleQueueUpdates = useCallback(() => {
    // Reset batch results
    setBatchResults(null);
    
    // Queue updates for all fields
    fields.forEach(field => {
      FormBatchUpdater.queueUpdate(field.name, field.value, {
        sectionId: field.section
      });
    });
    
    console.log('[DEBUG] Queued', fields.length, 'field updates');
  }, [fields]);
  
  const handleFlushUpdates = useCallback(() => {
    FormBatchUpdater.flush();
    console.log('[DEBUG] Manually flushed batch queue');
  }, []);
  
  const toggleFeature = useCallback(() => {
    // For testing only - in real code, you would use a global configuration system
    OptimizationFeatures.DEBOUNCED_UPDATES = !featureEnabled;
    setFeatureEnabled(!featureEnabled);
    console.log('[DEBUG] DEBOUNCED_UPDATES feature flag set to:', !featureEnabled);
  }, [featureEnabled]);
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>BatchUpdater Debug Panel</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="fields">
          <TabsList>
            <TabsTrigger value="fields">Test Fields</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>
          
          <TabsContent value="fields" className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Test Fields</h3>
              <p className="text-sm text-gray-500">
                These fields will be used to test the BatchUpdater functionality
              </p>
              
              {fields.map((field, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-1/4">
                    <span className="text-sm font-medium">{field.name}</span>
                    <span className="text-xs text-gray-500 block">{field.section}</span>
                  </div>
                  <Input 
                    value={field.value} 
                    onChange={e => handleUpdateField(index, e.target.value)}
                    className="flex-1"
                  />
                </div>
              ))}
              
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium">Add New Test Field</h4>
                <div className="flex items-end space-x-2 mt-2">
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="fieldName">Field Name</Label>
                    <Input 
                      id="fieldName"
                      value={newField.name}
                      onChange={e => setNewField(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., companyName"
                    />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="fieldValue">Field Value</Label>
                    <Input 
                      id="fieldValue"
                      value={newField.value}
                      onChange={e => setNewField(prev => ({ ...prev, value: e.target.value }))}
                      placeholder="e.g., Acme Corp"
                    />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="fieldSection">Section</Label>
                    <Input 
                      id="fieldSection"
                      value={newField.section}
                      onChange={e => setNewField(prev => ({ ...prev, section: e.target.value }))}
                      placeholder="e.g., section1"
                    />
                  </div>
                  <Button onClick={handleAddField}>Add</Button>
                </div>
              </div>
              
              <div className="flex space-x-2 mt-4">
                <Button 
                  onClick={handleQueueUpdates} 
                  variant="default"
                >
                  Queue Updates
                </Button>
                <Button 
                  onClick={handleFlushUpdates}
                  variant="outline"
                >
                  Flush Queue
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="config" className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Configuration</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="feature-toggle">DEBOUNCED_UPDATES Feature Flag</Label>
                    <p className="text-sm text-gray-500">Enable or disable the feature for testing</p>
                  </div>
                  <Switch 
                    id="feature-toggle"
                    checked={featureEnabled}
                    onCheckedChange={toggleFeature}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="debounce-delay">Debounce Delay (ms)</Label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      id="debounce-delay"
                      type="number"
                      value={debounceDelay}
                      onChange={e => setDebounceDelay(Number(e.target.value))}
                      min={0}
                      max={5000}
                    />
                    <Button 
                      onClick={() => FormBatchUpdater.configure({ updateDelayMs: debounceDelay })}
                      variant="outline"
                    >
                      Apply
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Default: 500ms. Lower values increase responsiveness but may cause more frequent batch processing.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="results" className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Batch Processing Results</h3>
              
              {batchResults ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h4 className="text-sm font-medium mb-2">Processing Stats</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Fields Processed:</div>
                      <div>{Object.keys(batchResults.batchedFields).length}</div>
                      <div>Processing Time:</div>
                      <div>{batchResults.processingTime.toFixed(2)}ms</div>
                      <div>Status:</div>
                      <div className={batchResults.success ? "text-green-600" : "text-red-600"}>
                        {batchResults.success ? "Success" : "Failed"}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Field Values</h4>
                    <div className="bg-gray-50 p-3 rounded-md">
                      <pre className="text-xs overflow-auto max-h-40">
                        {JSON.stringify(batchResults.batchedFields, null, 2)}
                      </pre>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Timestamps</h4>
                    <div className="bg-gray-50 p-3 rounded-md">
                      <pre className="text-xs overflow-auto max-h-40">
                        {JSON.stringify(batchResults.timestamps, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 text-gray-500">
                  No batch processing results yet. Queue some updates and wait for processing to complete.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}