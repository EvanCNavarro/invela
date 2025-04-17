/**
 * Optimization Test Component
 * 
 * This component allows toggling all optimizations on/off and measuring
 * the performance impact. It's used for side-by-side testing of the
 * optimization system.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  OptimizationFeatures, 
  performanceMonitor 
} from '@/utils/form-optimization';
import VirtualizedFormSection from '@/components/forms/VirtualizedFormSection';

// Store original feature settings to restore later
const originalSettings = { ...OptimizationFeatures };

// Type definition for test results
type TestResult = {
  timestamp: number;
  initialRender: number | null;
  memoryUsage: number | null;
  fieldUpdateTime: number | null;
  featuresEnabled: boolean;
};

const OptimizationTest: React.FC = () => {
  // Track if optimizations are enabled
  const [optimizationsEnabled, setOptimizationsEnabled] = useState(true);
  
  // Store test results
  const [results, setResults] = useState<TestResult[]>([]);
  
  // Track test in progress
  const [testRunning, setTestRunning] = useState(false);
  
  // Generate dummy form data for testing
  const generateTestFields = (count: number) => {
    return Array.from({ length: count }).map((_, i) => ({
      name: `test_field_${i}`,
      label: `Test Field ${i}`,
      type: 'text',
      section: `section-${Math.floor(i / 25)}`,
      required: i % 5 === 0,
      placeholder: `Enter value for field ${i}`
    }));
  };
  
  // Test form with 100 fields
  const testFields = generateTestFields(100);
  
  // Toggle all optimizations
  const toggleOptimizations = (enabled: boolean) => {
    console.log(`[OptimizationTest] ${enabled ? 'Enabling' : 'Disabling'} all optimizations`);
    
    if (enabled) {
      // Restore original settings
      Object.keys(originalSettings).forEach(key => {
        (OptimizationFeatures as any)[key] = (originalSettings as any)[key];
      });
    } else {
      // Disable all optimizations
      OptimizationFeatures.VIRTUALIZED_RENDERING = false;
      OptimizationFeatures.PROGRESSIVE_LOADING = false;
      OptimizationFeatures.DEBOUNCED_UPDATES = false;
      OptimizationFeatures.SECTION_BASED_SAVING = false;
      OptimizationFeatures.OPTIMIZED_TIMESTAMPS = false;
    }
    
    setOptimizationsEnabled(enabled);
  };
  
  // Run performance test with current optimization settings
  const runTest = async () => {
    setTestRunning(true);
    
    // Reset performance monitor
    performanceMonitor.reset();
    
    // Measure initial render
    performanceMonitor.startTimer('initialRender');
    
    // Simulate field updates
    for (let i = 0; i < 10; i++) {
      performanceMonitor.startTimer('fieldUpdate');
      // Sleep to simulate user typing
      await new Promise(resolve => setTimeout(resolve, 50));
      performanceMonitor.endTimer('fieldUpdate');
    }
    
    // Get results after a slight delay to ensure all measurements are complete
    setTimeout(() => {
      // Get performance measurements with fallbacks to null
      const initialRender = performanceMonitor.getLastMeasurement('initialRender') || null;
      
      // Get memory usage if available in the browser
      const memoryUsage = typeof performance !== 'undefined' && 
                          typeof performance.memory !== 'undefined' ? 
                          performance.memory?.usedJSHeapSize / (1024 * 1024) : null;
                          
      const fieldUpdateTime = performanceMonitor.getAverageMeasurement('fieldUpdate') || null;
      
      // Save test result
      const newResult: TestResult = {
        timestamp: Date.now(),
        initialRender,
        memoryUsage,
        fieldUpdateTime,
        featuresEnabled: optimizationsEnabled
      };
      
      setResults(prev => [...prev, newResult]);
      setTestRunning(false);
    }, 500);
  };
  
  // Clear test results
  const clearResults = () => {
    setResults([]);
  };
  
  // Format time for display
  const formatTime = (time: number | null) => {
    if (time === null) return 'N/A';
    return `${time.toFixed(2)} ms`;
  };
  
  // Format memory for display
  const formatMemory = (memory: number | null) => {
    if (memory === null) return 'N/A';
    return `${memory.toFixed(2)} MB`;
  };
  
  // Calculate performance improvement
  const calculateImprovement = (optimizedValue: number, baseValue: number) => {
    const improvement = ((baseValue - optimizedValue) / baseValue) * 100;
    return improvement > 0 
      ? `${improvement.toFixed(2)}% faster` 
      : `${Math.abs(improvement).toFixed(2)}% slower`;
  };
  
  // Get most recent results for each mode (optimized/non-optimized)
  const getLatestResults = () => {
    const optimizedResult = [...results]
      .filter(r => r.featuresEnabled)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
      
    const nonOptimizedResult = [...results]
      .filter(r => !r.featuresEnabled)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
      
    return { optimizedResult, nonOptimizedResult };
  };
  
  // Calculate improvements between latest results
  const { optimizedResult, nonOptimizedResult } = getLatestResults();
  const hasComparisons = optimizedResult && nonOptimizedResult;
  
  return (
    <div className="optimization-test p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Optimization Performance Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center gap-4">
            <Switch 
              id="optimization-toggle"
              checked={optimizationsEnabled}
              onCheckedChange={toggleOptimizations}
            />
            <Label htmlFor="optimization-toggle">
              {optimizationsEnabled ? 'Optimizations Enabled' : 'Optimizations Disabled'}
            </Label>
            
            <div className="ml-auto space-x-2">
              <Button 
                onClick={runTest} 
                variant="default"
                disabled={testRunning}
              >
                {testRunning ? 'Test Running...' : 'Run Test'}
              </Button>
              <Button 
                onClick={clearResults} 
                variant="outline"
                disabled={testRunning || results.length === 0}
              >
                Clear Results
              </Button>
            </div>
          </div>
          
          <div className="test-content border rounded-lg p-4 h-[300px] overflow-auto">
            {/* Simple test form with many fields */}
            <VirtualizedFormSection
              sectionId="test-section"
              sectionTitle="Test Section"
              fields={testFields}
              values={{}}
              onChange={() => {}}
            />
          </div>
        </CardContent>
      </Card>
      
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="border rounded-lg p-4">
                <h3 className="font-bold mb-2">With Optimizations</h3>
                {optimizedResult ? (
                  <div className="space-y-2">
                    <div>Initial Render: {formatTime(optimizedResult.initialRender)}</div>
                    <div>Field Update (avg): {formatTime(optimizedResult.fieldUpdateTime)}</div>
                    <div>Memory Usage: {formatMemory(optimizedResult.memoryUsage)}</div>
                  </div>
                ) : (
                  <div className="text-gray-500">No data available - run a test with optimizations enabled</div>
                )}
              </div>
              
              <div className="border rounded-lg p-4">
                <h3 className="font-bold mb-2">Without Optimizations</h3>
                {nonOptimizedResult ? (
                  <div className="space-y-2">
                    <div>Initial Render: {formatTime(nonOptimizedResult.initialRender)}</div>
                    <div>Field Update (avg): {formatTime(nonOptimizedResult.fieldUpdateTime)}</div>
                    <div>Memory Usage: {formatMemory(nonOptimizedResult.memoryUsage)}</div>
                  </div>
                ) : (
                  <div className="text-gray-500">No data available - run a test with optimizations disabled</div>
                )}
              </div>
            </div>
            
            {hasComparisons && optimizedResult.initialRender && nonOptimizedResult.initialRender && (
              <div className="border rounded-lg p-4 bg-blue-50">
                <h3 className="font-bold mb-2">Performance Improvement</h3>
                <div className="space-y-2">
                  <div>
                    Initial Render: {calculateImprovement(
                      optimizedResult.initialRender, 
                      nonOptimizedResult.initialRender
                    )}
                  </div>
                  
                  {optimizedResult.fieldUpdateTime && nonOptimizedResult.fieldUpdateTime && (
                    <div>
                      Field Updates: {calculateImprovement(
                        optimizedResult.fieldUpdateTime, 
                        nonOptimizedResult.fieldUpdateTime
                      )}
                    </div>
                  )}
                  
                  {optimizedResult.memoryUsage && nonOptimizedResult.memoryUsage && (
                    <div>
                      Memory Usage: {(
                        (optimizedResult.memoryUsage - nonOptimizedResult.memoryUsage) / 
                        nonOptimizedResult.memoryUsage * 100
                      ).toFixed(2)}% {optimizedResult.memoryUsage < nonOptimizedResult.memoryUsage ? 'less' : 'more'}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="mt-4">
              <h3 className="font-bold mb-2">All Test Runs</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Time</th>
                      <th className="border p-2 text-left">Mode</th>
                      <th className="border p-2 text-left">Initial Render</th>
                      <th className="border p-2 text-left">Field Update (avg)</th>
                      <th className="border p-2 text-left">Memory</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.sort((a, b) => b.timestamp - a.timestamp).map((result, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="border p-2">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="border p-2">
                          {result.featuresEnabled ? 'Optimized' : 'Non-optimized'}
                        </td>
                        <td className="border p-2">{formatTime(result.initialRender)}</td>
                        <td className="border p-2">{formatTime(result.fieldUpdateTime)}</td>
                        <td className="border p-2">{formatMemory(result.memoryUsage)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OptimizationTest;