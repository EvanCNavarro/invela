/**
 * Performance Test Runner UI Component
 * 
 * This component provides a simple UI for running the performance tests
 * with different configurations (field count, optimizations enabled, etc.)
 */

import React, { useState } from 'react';
import { 
  runPerformanceTest, 
  compareOptimizations, 
  runScalabilityTest, 
  TestOptions, 
  TestResults 
} from './form-performance-harness';
import { OptimizationFeatures } from '../form-optimization';

const TestRunner: React.FC = () => {
  // Test configuration state
  const [fieldCount, setFieldCount] = useState<number>(30);
  const [iterations, setIterations] = useState<number>(1);
  const [optimizationsEnabled, setOptimizationsEnabled] = useState<boolean>(false);
  const [verbose, setVerbose] = useState<boolean>(true);
  const [featureToTest, setFeatureToTest] = useState<keyof typeof OptimizationFeatures | ''>('');
  
  // Results state
  const [results, setResults] = useState<TestResults | null>(null);
  const [comparisonResults, setComparisonResults] = useState<any | null>(null);
  const [scalabilityResults, setScalabilityResults] = useState<Record<number, TestResults> | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'single' | 'comparison' | 'scalability'>('single');
  
  // Run a single performance test
  const handleRunTest = async () => {
    setIsRunning(true);
    setResults(null);
    
    try {
      const options: TestOptions = {
        fieldCount,
        iterations,
        optimizationsEnabled,
        verbose,
        featureToTest: featureToTest as keyof typeof OptimizationFeatures || undefined,
        onComplete: (testResults) => {
          setResults(testResults);
          setIsRunning(false);
        }
      };
      
      await runPerformanceTest(options);
    } catch (error) {
      console.error('Error running performance test:', error);
      setIsRunning(false);
    }
  };
  
  // Run comparison test (optimized vs non-optimized)
  const handleRunComparison = async () => {
    setIsRunning(true);
    setComparisonResults(null);
    
    try {
      const options: TestOptions = {
        fieldCount,
        iterations,
        verbose,
        featureToTest: featureToTest as keyof typeof OptimizationFeatures || undefined
      };
      
      const results = await compareOptimizations(options);
      setComparisonResults(results);
      setIsRunning(false);
    } catch (error) {
      console.error('Error running comparison test:', error);
      setIsRunning(false);
    }
  };
  
  // Run scalability test (multiple field counts)
  const handleRunScalabilityTest = async () => {
    setIsRunning(true);
    setScalabilityResults(null);
    
    try {
      const fieldCounts = [30, 60, 90, 120];
      
      const results = await runScalabilityTest({
        fieldCounts,
        iterations,
        verbose
      });
      
      setScalabilityResults(results);
      setIsRunning(false);
    } catch (error) {
      console.error('Error running scalability test:', error);
      setIsRunning(false);
    }
  };
  
  // Format metrics for display
  const formatMetric = (value: number | undefined): string => {
    if (value === undefined) return 'N/A';
    return `${value.toFixed(2)}ms`;
  };
  
  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Form Performance Test Runner</h1>
      
      {/* Tabs */}
      <div className="flex mb-4 border-b">
        <button
          className={`px-4 py-2 ${activeTab === 'single' ? 'border-b-2 border-blue-500 text-blue-500' : ''}`}
          onClick={() => setActiveTab('single')}
        >
          Single Test
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'comparison' ? 'border-b-2 border-blue-500 text-blue-500' : ''}`}
          onClick={() => setActiveTab('comparison')}
        >
          Optimization Comparison
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'scalability' ? 'border-b-2 border-blue-500 text-blue-500' : ''}`}
          onClick={() => setActiveTab('scalability')}
        >
          Scalability Test
        </button>
      </div>
      
      {/* Test Configuration */}
      <div className="mb-6 p-4 border rounded-lg bg-gray-50">
        <h2 className="text-lg font-semibold mb-3">Test Configuration</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Field Count</label>
            <select
              className="w-full p-2 border rounded"
              value={fieldCount}
              onChange={(e) => setFieldCount(Number(e.target.value))}
            >
              <option value={30}>30 fields</option>
              <option value={60}>60 fields</option>
              <option value={90}>90 fields</option>
              <option value={120}>120 fields</option>
              <option value={150}>150 fields</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Iterations</label>
            <select
              className="w-full p-2 border rounded"
              value={iterations}
              onChange={(e) => setIterations(Number(e.target.value))}
            >
              <option value={1}>1 iteration</option>
              <option value={3}>3 iterations</option>
              <option value={5}>5 iterations</option>
              <option value={10}>10 iterations</option>
            </select>
          </div>
          
          {activeTab === 'single' && (
            <div>
              <label className="block text-sm font-medium mb-1">Optimizations</label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="optimizationsEnabled"
                  checked={optimizationsEnabled}
                  onChange={(e) => setOptimizationsEnabled(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="optimizationsEnabled">Enable optimizations</label>
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1">Feature to Test</label>
            <select
              className="w-full p-2 border rounded"
              value={featureToTest}
              onChange={(e) => setFeatureToTest(e.target.value as keyof typeof OptimizationFeatures | '')}
            >
              <option value="">All features</option>
              {Object.keys(OptimizationFeatures).map((feature) => (
                <option key={feature} value={feature}>
                  {feature}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Verbose Logging</label>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="verbose"
                checked={verbose}
                onChange={(e) => setVerbose(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="verbose">Enable detailed logging</label>
            </div>
          </div>
        </div>
        
        {/* Test Button */}
        <div className="mt-4">
          {activeTab === 'single' && (
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              onClick={handleRunTest}
              disabled={isRunning}
            >
              {isRunning ? 'Running Test...' : 'Run Performance Test'}
            </button>
          )}
          
          {activeTab === 'comparison' && (
            <button
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
              onClick={handleRunComparison}
              disabled={isRunning}
            >
              {isRunning ? 'Running Comparison...' : 'Compare Optimized vs Non-Optimized'}
            </button>
          )}
          
          {activeTab === 'scalability' && (
            <button
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              onClick={handleRunScalabilityTest}
              disabled={isRunning}
            >
              {isRunning ? 'Running Tests...' : 'Run Scalability Tests'}
            </button>
          )}
        </div>
      </div>
      
      {/* Results Section */}
      {activeTab === 'single' && results && (
        <div className="mb-6 p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Test Results</h2>
          
          <div className="mb-4">
            <h3 className="text-md font-medium mb-2">Test Configuration</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Field Count: <span className="font-medium">{results.config.fieldCount}</span></div>
              <div>Iterations: <span className="font-medium">{results.config.iterations}</span></div>
              <div>Optimizations: <span className="font-medium">{results.config.optimizationsEnabled ? 'Enabled' : 'Disabled'}</span></div>
              <div>Feature Tested: <span className="font-medium">{results.config.featureToTest || 'All'}</span></div>
              <div>Total Duration: <span className="font-medium">{results.duration}ms</span></div>
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="text-md font-medium mb-2">Performance Metrics</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Operation</th>
                    <th className="px-4 py-2 text-right">Average Time</th>
                    <th className="px-4 py-2 text-right">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(results.metrics.timers).map(([name, timer]: [string, any]) => (
                    <tr key={name} className="border-b">
                      <td className="px-4 py-2">{name}</td>
                      <td className="px-4 py-2 text-right font-mono">{timer.average.toFixed(2)}ms</td>
                      <td className="px-4 py-2 text-right">{timer.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="text-md font-medium mb-2">Memory Usage</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-gray-600 mb-1">Initial</div>
                <div className="font-mono">{formatBytes(results.metrics.initialMemoryUsage)}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-gray-600 mb-1">Peak</div>
                <div className="font-mono">{formatBytes(results.metrics.peakMemoryUsage)}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-gray-600 mb-1">Final</div>
                <div className="font-mono">{formatBytes(results.metrics.currentMemoryUsage)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Comparison Results */}
      {activeTab === 'comparison' && comparisonResults && (
        <div className="mb-6 p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Optimization Comparison</h2>
          
          <div className="mb-4">
            <h3 className="text-md font-medium mb-2">Performance Improvement</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Operation</th>
                    <th className="px-4 py-2 text-right">Non-Optimized</th>
                    <th className="px-4 py-2 text-right">Optimized</th>
                    <th className="px-4 py-2 text-right">Improvement</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-4 py-2">Form Load</td>
                    <td className="px-4 py-2 text-right font-mono">
                      {formatMetric(comparisonResults.nonOptimizedResults.metrics.timers['formLoad']?.average)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {formatMetric(comparisonResults.optimizedResults.metrics.timers['formLoad']?.average)}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      {comparisonResults.improvement.loadTime.toFixed(2)}%
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-2">Field Updates</td>
                    <td className="px-4 py-2 text-right font-mono">
                      {formatMetric(comparisonResults.nonOptimizedResults.metrics.timers['fieldUpdates']?.average)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {formatMetric(comparisonResults.optimizedResults.metrics.timers['fieldUpdates']?.average)}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      {comparisonResults.improvement.updateTime.toFixed(2)}%
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-2">Form Save</td>
                    <td className="px-4 py-2 text-right font-mono">
                      {formatMetric(comparisonResults.nonOptimizedResults.metrics.timers['formSave']?.average)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {formatMetric(comparisonResults.optimizedResults.metrics.timers['formSave']?.average)}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      {comparisonResults.improvement.saveTime.toFixed(2)}%
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-2">Form Render</td>
                    <td className="px-4 py-2 text-right font-mono">
                      {formatMetric(comparisonResults.nonOptimizedResults.metrics.timers['formRender']?.average)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {formatMetric(comparisonResults.optimizedResults.metrics.timers['formRender']?.average)}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      {comparisonResults.improvement.renderTime.toFixed(2)}%
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-2">Navigation</td>
                    <td className="px-4 py-2 text-right font-mono">
                      {formatMetric(comparisonResults.nonOptimizedResults.metrics.timers['navigation']?.average)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {formatMetric(comparisonResults.optimizedResults.metrics.timers['navigation']?.average)}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      {comparisonResults.improvement.navigationTime.toFixed(2)}%
                    </td>
                  </tr>
                  <tr className="bg-gray-50 font-medium">
                    <td className="px-4 py-2">Overall</td>
                    <td className="px-4 py-2 text-right font-mono">
                      {comparisonResults.nonOptimizedResults.duration}ms
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {comparisonResults.optimizedResults.duration}ms
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      {comparisonResults.improvement.overallTime.toFixed(2)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* Scalability Results */}
      {activeTab === 'scalability' && scalabilityResults && (
        <div className="mb-6 p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Scalability Test Results</h2>
          
          <div className="mb-4">
            <h3 className="text-md font-medium mb-2">Performance by Field Count</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Field Count</th>
                    <th className="px-4 py-2 text-right">Load Time</th>
                    <th className="px-4 py-2 text-right">Update Time</th>
                    <th className="px-4 py-2 text-right">Save Time</th>
                    <th className="px-4 py-2 text-right">Render Time</th>
                    <th className="px-4 py-2 text-right">Total Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(scalabilityResults).map(([count, result]) => (
                    <tr key={count} className="border-b">
                      <td className="px-4 py-2 font-medium">{count} fields</td>
                      <td className="px-4 py-2 text-right font-mono">
                        {formatMetric(result.metrics.timers['formLoad']?.average)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {formatMetric(result.metrics.timers['fieldUpdates']?.average)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {formatMetric(result.metrics.timers['formSave']?.average)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {formatMetric(result.metrics.timers['formRender']?.average)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {result.duration}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="text-md font-medium mb-2">Memory Usage Comparison</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Field Count</th>
                    <th className="px-4 py-2 text-right">Initial</th>
                    <th className="px-4 py-2 text-right">Peak</th>
                    <th className="px-4 py-2 text-right">Final</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(scalabilityResults).map(([count, result]) => (
                    <tr key={count} className="border-b">
                      <td className="px-4 py-2 font-medium">{count} fields</td>
                      <td className="px-4 py-2 text-right font-mono">
                        {formatBytes(result.metrics.initialMemoryUsage)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {formatBytes(result.metrics.peakMemoryUsage)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {formatBytes(result.metrics.currentMemoryUsage)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return 'N/A';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

export default TestRunner;