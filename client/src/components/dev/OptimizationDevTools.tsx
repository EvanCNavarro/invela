import React, { useState, useEffect } from 'react';
import { 
  performanceMonitor, 
  healthCheck, 
  OptimizationFeatures 
} from '../../utils/form-optimization';

/**
 * Developer Tools for Form Optimization
 * 
 * This component provides a UI for monitoring and controlling form optimizations.
 * It displays:
 * - Current performance metrics
 * - Optimization feature status (enabled/disabled)
 * - Health check results
 * - Controls for toggling features
 * 
 * It's only visible in development mode or with a special flag.
 */
export const OptimizationDevTools: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'metrics' | 'features' | 'health'>('metrics');
  const [features, setFeatures] = useState({ ...OptimizationFeatures });
  
  // Determine if the component should be available
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const isForced = localStorage.getItem('showFormDevTools') === 'true';
  const isAvailable = isDevelopment || isForced;
  
  // Update metrics and health status regularly
  useEffect(() => {
    if (!isVisible) return;
    
    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getMetrics());
      setHealth(healthCheck.getStatus());
      setFeatures({ ...OptimizationFeatures });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isVisible]);
  
  // Toggle dev tools visibility
  const toggleVisibility = () => {
    setIsVisible(!isVisible);
    
    if (!isVisible) {
      // Initialize data when opening
      setMetrics(performanceMonitor.getMetrics());
      setHealth(healthCheck.getStatus());
    }
  };
  
  // Toggle a feature flag
  const toggleFeature = (feature: keyof typeof OptimizationFeatures) => {
    (OptimizationFeatures as any)[feature] = !(OptimizationFeatures as any)[feature];
    setFeatures({ ...OptimizationFeatures });
  };
  
  // Force enable dev tools in any environment
  const forceEnable = () => {
    localStorage.setItem('showFormDevTools', 'true');
    window.location.reload();
  };
  
  // Reset all metrics
  const resetMetrics = () => {
    performanceMonitor.reset();
    setMetrics(performanceMonitor.getMetrics());
  };
  
  // Generate a performance report
  const generateReport = () => {
    const report = performanceMonitor.generateReport();
    
    // Create a download link for the report
    const element = document.createElement('a');
    const file = new Blob([report], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `form-performance-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  // If not in development and not forced, just show an invisible button
  if (!isAvailable) {
    return (
      <button 
        className="fixed bottom-2 right-2 bg-transparent border-0 text-transparent p-0 w-4 h-4 opacity-0 hover:opacity-100"
        onClick={forceEnable}
        title="Enable Form Dev Tools"
      />
    );
  }
  
  // If not visible, show a small button
  if (!isVisible) {
    return (
      <button 
        onClick={toggleVisibility}
        className="fixed bottom-2 right-2 bg-gray-200 p-1 text-xs rounded opacity-50 hover:opacity-100 z-50"
        title="Show Form Optimization Tools"
      >
        Dev
      </button>
    );
  }
  
  return (
    <div className="fixed bottom-0 right-0 bg-white border border-gray-300 shadow-lg p-4 w-96 max-h-[80vh] overflow-auto z-50 text-sm">
      <div className="flex justify-between items-center border-b pb-2 mb-2">
        <h3 className="font-bold">Form Optimization Tools</h3>
        <button 
          onClick={toggleVisibility}
          className="text-gray-500 hover:text-gray-700"
          title="Close"
        >
          ✕
        </button>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b mb-3">
        <button 
          onClick={() => setActiveTab('metrics')} 
          className={`px-3 py-1 ${activeTab === 'metrics' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'}`}
        >
          Metrics
        </button>
        <button 
          onClick={() => setActiveTab('features')} 
          className={`px-3 py-1 ${activeTab === 'features' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'}`}
        >
          Features
        </button>
        <button 
          onClick={() => setActiveTab('health')} 
          className={`px-3 py-1 ${activeTab === 'health' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'}`}
        >
          Health
        </button>
      </div>
      
      {/* Metrics Tab */}
      {activeTab === 'metrics' && metrics && (
        <div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <MetricCard title="Load Time" value={`${metrics.loadDuration.toFixed(2)}ms`} />
            <MetricCard title="Fields" value={metrics.fieldCount.toString()} />
            <MetricCard title="Sections" value={metrics.sectionCount.toString()} />
            <MetricCard 
              title="Processing Speed" 
              value={`${metrics.fieldsPerSecond.toFixed(2)}/s`} 
            />
            <MetricCard title="Render Time" value={`${metrics.renderDuration.toFixed(2)}ms`} />
            <MetricCard title="Save Operations" value={metrics.saveCount.toString()} />
            {metrics.saveCount > 0 && (
              <MetricCard 
                title="Avg Save Time" 
                value={`${metrics.averageSaveDuration.toFixed(2)}ms`} 
              />
            )}
          </div>
          
          {/* Memory Usage */}
          <div className="mb-3">
            <h4 className="font-semibold mb-1">Memory Usage</h4>
            <div className="text-xs grid grid-cols-3 gap-2">
              <div className="bg-gray-100 p-2 rounded">
                <div className="text-gray-500">Initial</div>
                <div>{formatMemory(metrics.initialMemoryUsage)}</div>
              </div>
              <div className="bg-gray-100 p-2 rounded">
                <div className="text-gray-500">Peak</div>
                <div>{formatMemory(metrics.peakMemoryUsage)}</div>
              </div>
              <div className="bg-gray-100 p-2 rounded">
                <div className="text-gray-500">Current</div>
                <div>{formatMemory(metrics.currentMemoryUsage)}</div>
              </div>
            </div>
          </div>
          
          {/* Custom Timers */}
          {Object.keys(metrics.timers).length > 0 && (
            <div className="mb-3">
              <h4 className="font-semibold mb-1">Custom Timers</h4>
              <div className="text-xs">
                {Object.entries(metrics.timers).map(([name, timer]: [string, any]) => (
                  <div key={name} className="flex justify-between p-1 border-b border-gray-100">
                    <span>{name}</span>
                    <span className="font-mono">
                      {timer.average.toFixed(2)}ms ({timer.count}x)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex justify-between mt-3">
            <button 
              onClick={resetMetrics}
              className="bg-gray-100 hover:bg-gray-200 text-xs px-2 py-1 rounded"
            >
              Reset Metrics
            </button>
            <button 
              onClick={generateReport}
              className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded"
            >
              Generate Report
            </button>
          </div>
        </div>
      )}
      
      {/* Features Tab */}
      {activeTab === 'features' && (
        <div>
          <div className="mb-3">
            <h4 className="font-semibold mb-1">Optimization Features</h4>
            {Object.entries(features).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between py-1 border-b border-gray-100">
                <span className="text-sm">{formatFeatureName(key)}</span>
                <div>
                  <button
                    onClick={() => toggleFeature(key as keyof typeof OptimizationFeatures)}
                    className={`relative inline-flex h-5 w-10 items-center rounded-full ${enabled ? 'bg-blue-500' : 'bg-gray-300'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${enabled ? 'translate-x-5' : 'translate-x-1'}`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-xs text-gray-500 mt-2">
            <p>Changes take effect immediately. Some optimizations may require reload to fully activate or deactivate.</p>
          </div>
        </div>
      )}
      
      {/* Health Tab */}
      {activeTab === 'health' && health && (
        <div>
          <div className="mb-3">
            <h4 className="font-semibold mb-1">System Health</h4>
            <div className={`p-2 rounded text-white ${health.isHealthy ? 'bg-green-500' : 'bg-red-500'}`}>
              {health.isHealthy ? '✅ System Healthy' : `❌ System Unhealthy (${health.failedChecks} issues)`}
            </div>
          </div>
          
          {health.disabledFeatures.length > 0 && (
            <div className="mb-3">
              <h4 className="font-semibold mb-1">Disabled Features</h4>
              <div className="text-xs">
                {health.disabledFeatures.map((feature: string) => (
                  <div key={feature} className="p-1 bg-yellow-100 text-yellow-800 rounded mb-1">
                    {formatFeatureName(feature)} (auto-disabled)
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {health.errors.length > 0 && (
            <div className="mb-3">
              <h4 className="font-semibold mb-1">Recent Errors</h4>
              <div className="text-xs max-h-40 overflow-auto">
                {health.errors.map((err: any, i: number) => (
                  <div key={i} className="p-1 border-b border-gray-100">
                    <div className="font-semibold">{err.operation}</div>
                    <div className="text-red-500">{err.error}</div>
                    <div className="text-gray-400">{new Date(err.timestamp).toLocaleTimeString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper component for metrics display
const MetricCard: React.FC<{title: string, value: string}> = ({ title, value }) => (
  <div className="bg-gray-100 p-2 rounded">
    <div className="text-xs text-gray-500">{title}</div>
    <div className="font-mono text-sm">{value}</div>
  </div>
);

// Helper function to format memory sizes
const formatMemory = (bytes: number): string => {
  if (bytes === 0) return 'N/A';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
};

// Helper function to format feature names
const formatFeatureName = (key: string): string => {
  return key
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

export default OptimizationDevTools;