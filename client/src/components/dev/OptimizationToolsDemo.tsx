/**
 * OptimizationToolsDemo Component
 * 
 * This component provides a centralized dashboard for analyzing and 
 * configuring form optimization settings. It displays metrics,
 * allows feature flag toggling, and provides comprehensive debugging tools.
 */

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  performanceMonitor, 
  OptimizationFeatures 
} from '@/utils/form-optimization';

// Type for optimization feature flags
type FeatureFlag = keyof typeof OptimizationFeatures;

const OptimizationToolsDemo: React.FC = () => {
  // Feature flags state
  const [features, setFeatures] = useState<Record<string, boolean>>({
    PROGRESSIVE_LOADING: OptimizationFeatures.PROGRESSIVE_LOADING,
    SECTION_BASED_SAVING: OptimizationFeatures.SECTION_BASED_SAVING || false,
    VIRTUALIZED_RENDERING: OptimizationFeatures.VIRTUALIZED_RENDERING || false,
    DEBOUNCED_UPDATES: OptimizationFeatures.DEBOUNCED_UPDATES || false,
    OPTIMIZED_TIMESTAMPS: OptimizationFeatures.OPTIMIZED_TIMESTAMPS || false
  });
  
  // Get performance metrics
  const [metrics, setMetrics] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState('features');
  
  // Fetch metrics periodically
  useEffect(() => {
    // Initial load
    updateMetrics();
    
    // Set up periodic refresh
    const interval = setInterval(updateMetrics, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Update metrics from the performance monitor
  const updateMetrics = () => {
    const summary = performanceMonitor.getSummary();
    setMetrics(summary);
  };
  
  // Toggle a feature flag
  const toggleFeature = (feature: string) => {
    setFeatures(prev => {
      const newFeatures = { ...prev, [feature]: !prev[feature] };
      
      // Update the actual optimization features (if they were exported)
      try {
        if (typeof OptimizationFeatures === 'object') {
          // This would normally change the actual feature settings
          // For demo purposes, we're just updating our local state
          console.log(`[Optimization Tools] Setting ${feature} to ${newFeatures[feature]}`);
        }
      } catch (err) {
        console.error('Failed to update optimization feature:', err);
      }
      
      return newFeatures;
    });
  };
  
  // Calculate average render time
  const getAverageRenderTime = () => {
    if (!metrics?.operations?.formRender?.average) return 'N/A';
    return `${metrics.operations.formRender.average.toFixed(2)} ms`;
  };
  
  // Calculate average field update time
  const getAverageUpdateTime = () => {
    if (!metrics?.operations?.fieldUpdate?.average) return 'N/A';
    return `${metrics.operations.fieldUpdate.average.toFixed(2)} ms`;
  };
  
  // Calculate form load time
  const getFormLoadTime = () => {
    if (!metrics?.operations?.formLoad?.average) return 'N/A';
    return `${metrics.operations.formLoad.average.toFixed(2)} ms`;
  };
  
  // Feature descriptions for the UI
  const featureDescriptions: Record<string, string> = {
    PROGRESSIVE_LOADING: "Load form sections incrementally to improve perceived performance",
    SECTION_BASED_SAVING: "Save form data by section to reduce payload size and improve save times",
    VIRTUALIZED_RENDERING: "Only render form fields that are visible in the viewport",
    DEBOUNCED_UPDATES: "Batch field updates together to reduce unnecessary re-renders",
    OPTIMIZED_TIMESTAMPS: "Track field-level modifications for precise synchronization"
  };
  
  return (
    <div className="optimization-tools-demo">
      <h1 className="text-2xl font-bold mb-4">Form Optimization Tools</h1>
      
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-3 gap-2">
          <TabsTrigger value="features">Feature Flags</TabsTrigger>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
          <TabsTrigger value="health">Health Check</TabsTrigger>
        </TabsList>
        
        {/* Feature Flags Tab */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Feature Flags</CardTitle>
              <CardDescription>
                Enable or disable optimization features to test their impact
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(features).map(([feature, enabled]) => (
                  <div key={feature} className="flex items-start space-x-4 mb-4">
                    <div className="flex-1">
                      <h3 className="font-medium">{feature}</h3>
                      <p className="text-sm text-gray-500">
                        {featureDescriptions[feature] || "No description available"}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={enabled} 
                        onCheckedChange={() => toggleFeature(feature)}
                        id={`switch-${feature}`}
                      />
                      <Label htmlFor={`switch-${feature}`}>
                        {enabled ? 'Enabled' : 'Disabled'}
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Performance Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Real-time performance measurements for form operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Form Rendering</h3>
                  <p className="text-2xl font-bold">{getAverageRenderTime()}</p>
                  <p className="text-xs text-gray-500">Average render time</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Field Updates</h3>
                  <p className="text-2xl font-bold">{getAverageUpdateTime()}</p>
                  <p className="text-xs text-gray-500">Average update time</p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Form Loading</h3>
                  <p className="text-2xl font-bold">{getFormLoadTime()}</p>
                  <p className="text-xs text-gray-500">Average load time</p>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div>
                <h3 className="font-medium mb-2">Detailed Metrics</h3>
                <pre className="bg-gray-100 p-3 rounded-md text-xs overflow-auto max-h-[200px]">
                  {JSON.stringify(metrics, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Health Check Tab */}
        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Health Check</CardTitle>
              <CardDescription>
                Monitor the health of optimization features and detect issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2">Progressive Loading</h3>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${features.PROGRESSIVE_LOADING ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span>{features.PROGRESSIVE_LOADING ? 'Active' : 'Inactive'}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      {features.PROGRESSIVE_LOADING 
                        ? 'Sections are loading incrementally to improve performance'
                        : 'All sections are loading at once, which may impact performance'}
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2">Virtualized Rendering</h3>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${features.VIRTUALIZED_RENDERING ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span>{features.VIRTUALIZED_RENDERING ? 'Active' : 'Inactive'}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      {features.VIRTUALIZED_RENDERING 
                        ? 'Only visible fields are being rendered, improving performance'
                        : 'All fields are rendering at once, which may cause slowdowns for large forms'}
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2">Batch Updates</h3>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${features.DEBOUNCED_UPDATES ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span>{features.DEBOUNCED_UPDATES ? 'Active' : 'Inactive'}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      {features.DEBOUNCED_UPDATES 
                        ? 'Field updates are being batched to reduce re-renders'
                        : 'Each field update causes an immediate re-render, which may impact performance'}
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2">Timestamps</h3>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${features.OPTIMIZED_TIMESTAMPS ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span>{features.OPTIMIZED_TIMESTAMPS ? 'Active' : 'Inactive'}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      {features.OPTIMIZED_TIMESTAMPS 
                        ? 'Field-level timestamps are being tracked for precise synchronization'
                        : 'Using last-write-wins approach which may lead to data conflicts'}
                    </p>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div>
                  <h3 className="font-medium mb-2">Memory Usage</h3>
                  <div className="h-8 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${Math.min((metrics?.memory?.current || 0) / 50, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span>0 MB</span>
                    <span>50 MB</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Current memory usage: {metrics?.memory?.current ? `${metrics.memory.current.toFixed(2)} MB` : 'Unknown'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="mt-6 bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Developer Notes</h3>
        <p className="text-sm text-gray-700 mb-2">
          This optimization tools dashboard allows developers to monitor and configure form optimization features.
          Toggle feature flags to test different optimization strategies and monitor their impact on performance.
        </p>
        <p className="text-sm text-gray-700">
          Performance metrics are collected automatically as users interact with the form system.
          The health check panel provides an overview of active optimizations and potential issues.
        </p>
      </div>
    </div>
  );
};

export default OptimizationToolsDemo;