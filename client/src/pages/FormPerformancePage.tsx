/**
 * FormPerformancePage
 * 
 * This page provides a comprehensive demonstration and testing environment
 * for all the form optimization features. It allows developers to test and
 * analyze the performance of various form optimizations, including:
 * 
 * - Virtualized rendering
 * - Progressive loading
 * - Batched updates
 * - Field-level timestamp synchronization
 * 
 * The page serves as both a testing tool and a demonstration of the
 * optimization capabilities of the form system.
 */

import React, { useState } from 'react';
import VirtualizedRenderingDemo from '@/components/dev/VirtualizedRenderingDemo';
import ProgressiveLoadingDemo from '@/components/dev/ProgressiveLoadingDemo';
import BatchUpdateDebugger from '@/components/dev/BatchUpdateDebugger';
import OptimizationToolsDemo from '@/components/dev/OptimizationToolsDemo';
import OptimizationTest from '@/components/dev/OptimizationTest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

enum DemoTabs {
  VIRTUALIZED = 'virtualized',
  PROGRESSIVE = 'progressive',
  BATCHED = 'batched',
  OPTIMIZATION = 'optimization',
  TEST = 'test'
}

const FormPerformancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DemoTabs>(DemoTabs.VIRTUALIZED);

  return (
    <div className="form-performance-page container mx-auto p-4">
      <div className="page-header mb-6">
        <h1 className="text-3xl font-bold mb-2">Form Performance Testing Suite</h1>
        <p className="text-gray-600 mb-4">
          This suite provides tools to test and visualize various form optimization techniques
          implemented in the application.
        </p>
      </div>

      <Tabs 
        defaultValue={DemoTabs.VIRTUALIZED}
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as DemoTabs)}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-5 gap-2">
          <TabsTrigger value={DemoTabs.VIRTUALIZED}>
            Virtualized Rendering
          </TabsTrigger>
          <TabsTrigger value={DemoTabs.PROGRESSIVE}>
            Progressive Loading
          </TabsTrigger>
          <TabsTrigger value={DemoTabs.BATCHED}>
            Batched Updates
          </TabsTrigger>
          <TabsTrigger value={DemoTabs.OPTIMIZATION}>
            Optimization Tools
          </TabsTrigger>
          <TabsTrigger value={DemoTabs.TEST}>
            Performance Test
          </TabsTrigger>
        </TabsList>

        <TabsContent value={DemoTabs.VIRTUALIZED} className="bg-white rounded-lg shadow p-4 border">
          <VirtualizedRenderingDemo initialFieldCount={100} initialSectionCount={4} />
        </TabsContent>

        <TabsContent value={DemoTabs.PROGRESSIVE} className="bg-white rounded-lg shadow p-4 border">
          <ProgressiveLoadingDemo />
        </TabsContent>

        <TabsContent value={DemoTabs.BATCHED} className="bg-white rounded-lg shadow p-4 border">
          <BatchUpdateDebugger initialDelay={500} maxQueueSize={25} autoFlushEnabled={false} />
        </TabsContent>

        <TabsContent value={DemoTabs.OPTIMIZATION} className="bg-white rounded-lg shadow p-4 border">
          <OptimizationToolsDemo />
        </TabsContent>
        
        <TabsContent value={DemoTabs.TEST} className="bg-white rounded-lg shadow p-4 border">
          <OptimizationTest />
        </TabsContent>
      </Tabs>

      <div className="mt-8 bg-blue-50 p-4 rounded-lg border border-blue-100">
        <h2 className="text-xl font-semibold mb-2">About Form Optimization</h2>
        <p className="mb-2">
          Our form system includes several optimization techniques to improve performance:
        </p>
        <ul className="list-disc ml-6 space-y-1">
          <li><strong>Virtualized Rendering:</strong> Only renders form fields that are visible in the viewport</li>
          <li><strong>Progressive Loading:</strong> Loads form sections incrementally to improve perceived performance</li>
          <li><strong>Batched Updates:</strong> Groups field updates together to reduce unnecessary re-renders</li>
          <li><strong>Field-level Timestamps:</strong> Tracks individual field modifications for precise synchronization</li>
        </ul>
      </div>
    </div>
  );
};

export default FormPerformancePage;