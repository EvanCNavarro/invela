import React, { useState } from 'react';
import TestRunner from '../utils/tests/TestRunner';
import { initializeOptimizationMonitoring } from '../utils/form-optimization';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BatchUpdateDebugger } from '../components/dev/BatchUpdateDebugger';
import ProgressiveLoadingDemo from '../components/dev/ProgressiveLoadingDemo';
import VirtualizedRenderingDemo from '../components/dev/VirtualizedRenderingDemo';

/**
 * Form Performance Testing Page
 * 
 * This page hosts the performance test runner component and debugging interfaces,
 * allowing developers to run various performance tests on forms
 * with different field counts and optimization settings, and to debug
 * optimization features like BatchUpdater.
 * 
 * Tabs:
 * 1. Performance Tests - General form performance benchmarks
 * 2. BatchUpdater Debug - Testing the batch update functionality
 * 3. Progressive Loading - Testing section-based loading system
 * 4. Virtualized Rendering - Testing optimized rendering for large forms
 */
export default function FormPerformancePage() {
  const [activeTab, setActiveTab] = useState('performance-tests');
  
  // Initialize performance monitoring when the page loads
  React.useEffect(() => {
    // Enable debug mode in development
    initializeOptimizationMonitoring(true);
    
    console.log('[FormPerformancePage] Initialized optimization monitoring in debug mode');
    
    return () => {
      // Clean up if needed when navigating away
    };
  }, []);
  
  return (
    <div className="container mx-auto py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Form Performance Testing</h1>
        <p className="text-gray-600 mt-2">
          Run performance tests to measure and optimize form rendering and interaction
          with various field counts and optimization strategies.
        </p>
      </header>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance-tests">Performance Tests</TabsTrigger>
          <TabsTrigger value="batch-updater">BatchUpdater Debug</TabsTrigger>
          <TabsTrigger value="progressive-loading">Progressive Loading</TabsTrigger>
          <TabsTrigger value="virtualized-rendering">Virtualized Rendering</TabsTrigger>
        </TabsList>
        
        <TabsContent value="performance-tests" className="mt-4">
          <div className="bg-white rounded-lg shadow-md">
            <TestRunner />
          </div>
        </TabsContent>
        
        <TabsContent value="batch-updater" className="mt-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <BatchUpdateDebugger />
          </div>
        </TabsContent>
        
        <TabsContent value="progressive-loading" className="mt-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            {activeTab === 'progressive-loading' && <ProgressiveLoadingDemo />}
          </div>
        </TabsContent>
        
        <TabsContent value="virtualized-rendering" className="mt-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            {activeTab === 'virtualized-rendering' && <VirtualizedRenderingDemo />}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}