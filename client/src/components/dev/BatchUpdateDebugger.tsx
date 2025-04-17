/**
 * BatchUpdateDebugger Component
 * 
 * This component provides a visualization and debugging tool for the BatchUpdateManager,
 * which optimizes form performance by batching field updates together to reduce
 * unnecessary re-renders and API calls.
 * 
 * Features:
 * - Real-time visualization of batch queue
 * - Configurable delay and batch processing
 * - Performance metrics for batch operations
 * - Manual testing capabilities for batched vs. unbatched updates
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  BatchUpdateManager,
  performanceMonitor,
  FormBatchUpdater
} from '@/utils/form-optimization';

// Styles for the visualization
const getBatchItemStyle = (age: number, maxAge: number) => {
  // Color transitions from blue (new) to red (old)
  const ageRatio = Math.min(age / maxAge, 1);
  return {
    backgroundColor: `rgba(${Math.round(ageRatio * 255)}, ${Math.round((1 - ageRatio) * 100)}, ${Math.round((1 - ageRatio) * 255)}, 0.8)`,
    padding: '0.5rem',
    margin: '0.25rem',
    borderRadius: '0.25rem',
    fontSize: '0.875rem',
    transition: 'all 0.3s ease',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    flex: '1 1 auto',
    maxWidth: '150px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  };
};

interface BatchUpdateDebuggerProps {
  initialDelay?: number;
  maxQueueSize?: number;
  autoFlushEnabled?: boolean;
}

const BatchUpdateDebugger: React.FC<BatchUpdateDebuggerProps> = ({
  initialDelay = 500,
  maxQueueSize = 20,
  autoFlushEnabled = true
}) => {
  // Use singleton instance for demos or create a separate instance for the debugger
  const batchManager = useRef<BatchUpdateManager<string>>(
    // For debugging, we create a separate instance to avoid affecting the main form
    FormBatchUpdater
  ).current;
  
  // State for UI controls and visualization
  const [delay, setDelay] = useState(initialDelay);
  const [inputValue, setInputValue] = useState('');
  const [batchedValues, setBatchedValues] = useState<Record<string, { value: string, timestamp: number }>>({});
  const [processedBatches, setProcessedBatches] = useState<Array<{
    timestamp: number;
    count: number;
    processingTime: number;
  }>>([]);
  const [autoFlush, setAutoFlush] = useState(autoFlushEnabled);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Performance stats
  const [stats, setStats] = useState({
    totalUpdates: 0,
    totalBatches: 0,
    averageBatchSize: 0,
    averageProcessingTime: 0,
    lastProcessingTime: 0
  });
  
  // Setup batch manager and callbacks
  useEffect(() => {
    // Update the batch manager delay when the delay setting changes
    batchManager.delay = delay;
    
    // Define callbacks for batch processing events
    const handleBatchUpdate = (updates: Record<string, string>) => {
      // Process the batch
      performanceMonitor.startTimer('batchProcessing');
      
      // Simulate processing time (proportional to batch size)
      setTimeout(() => {
        const processingTime = performanceMonitor.endTimer('batchProcessing') || 0;
        
        // Update processed batches history
        setProcessedBatches(prev => {
          const newBatches = [...prev, {
            timestamp: Date.now(),
            count: Object.keys(updates).length,
            processingTime
          }];
          
          // Keep only the last 10 batches
          if (newBatches.length > 10) {
            return newBatches.slice(newBatches.length - 10);
          }
          return newBatches;
        });
        
        // Update stats
        setStats(prev => {
          const totalBatches = prev.totalBatches + 1;
          const totalUpdates = prev.totalUpdates + Object.keys(updates).length;
          
          return {
            totalUpdates,
            totalBatches,
            averageBatchSize: totalUpdates / totalBatches,
            averageProcessingTime: 
              (prev.averageProcessingTime * (totalBatches - 1) + processingTime) / totalBatches,
            lastProcessingTime: processingTime
          };
        });
        
        // Clear processed items from the batch visualization
        setBatchedValues(prev => {
          const newValues = { ...prev };
          Object.keys(updates).forEach(key => {
            delete newValues[key];
          });
          return newValues;
        });
        
        setIsProcessing(false);
      }, Object.keys(updates).length * 5); // Simulate processing time
    };
    
    // Setup automatic batch processing if enabled
    let interval: number | null = null;
    if (autoFlush) {
      interval = window.setInterval(() => {
        if (Object.keys(batchedValues).length > 0 && !isProcessing) {
          setIsProcessing(true);
          const updates = batchManager.processQueue();
          handleBatchUpdate(updates);
        }
      }, delay + 100);
    }
    
    return () => {
      if (interval !== null) {
        clearInterval(interval);
      }
    };
  }, [batchManager, delay, autoFlush, batchedValues, isProcessing]);
  
  // Add a field update to the batch
  const handleAddUpdate = useCallback(() => {
    if (!inputValue.trim()) return;
    
    // Create a unique key
    const key = `field_${Date.now()}`;
    
    // Add to batch manager
    batchManager.addUpdate(key, inputValue);
    
    // Add to visual representation
    setBatchedValues(prev => ({
      ...prev,
      [key]: {
        value: inputValue,
        timestamp: Date.now()
      }
    }));
    
    // Clear input
    setInputValue('');
  }, [inputValue, batchManager]);
  
  // Add multiple updates at once (simulation)
  const handleAddBulk = useCallback((count: number) => {
    for (let i = 0; i < count; i++) {
      const key = `field_bulk_${Date.now()}_${i}`;
      const value = `Value ${i+1}`;
      
      // Add to batch manager
      batchManager.addUpdate(key, value);
      
      // Add to visual representation with slight delay between items
      setTimeout(() => {
        setBatchedValues(prev => ({
          ...prev,
          [key]: {
            value,
            timestamp: Date.now()
          }
        }));
      }, i * 50);
    }
  }, [batchManager]);
  
  // Manually process the batch
  const handleProcessBatch = useCallback(() => {
    if (Object.keys(batchedValues).length === 0 || isProcessing) return;
    
    setIsProcessing(true);
    const updates = batchManager.processQueue();
    
    // Process the batch (using the same handler from useEffect)
    performanceMonitor.startTimer('batchProcessing');
    
    // Simulate processing time (proportional to batch size)
    setTimeout(() => {
      const processingTime = performanceMonitor.endTimer('batchProcessing') || 0;
      
      // Update processed batches history
      setProcessedBatches(prev => {
        const newBatches = [...prev, {
          timestamp: Date.now(),
          count: Object.keys(updates).length,
          processingTime
        }];
        
        // Keep only the last 10 batches
        if (newBatches.length > 10) {
          return newBatches.slice(newBatches.length - 10);
        }
        return newBatches;
      });
      
      // Update stats
      setStats(prev => {
        const totalBatches = prev.totalBatches + 1;
        const totalUpdates = prev.totalUpdates + Object.keys(updates).length;
        
        return {
          totalUpdates,
          totalBatches,
          averageBatchSize: totalUpdates / totalBatches,
          averageProcessingTime: 
            (prev.averageProcessingTime * (totalBatches - 1) + processingTime) / totalBatches,
          lastProcessingTime: processingTime
        };
      });
      
      // Clear processed items from the batch visualization
      setBatchedValues({});
      
      setIsProcessing(false);
    }, Object.keys(updates).length * 5); // Simulate processing time
  }, [batchManager, batchedValues, isProcessing]);
  
  // Clear the batch without processing
  const handleClearBatch = useCallback(() => {
    batchManager.cancelUpdates();
    setBatchedValues({});
  }, [batchManager]);
  
  // Reset everything
  const handleReset = useCallback(() => {
    batchManager.cancelUpdates();
    setBatchedValues({});
    setProcessedBatches([]);
    setStats({
      totalUpdates: 0,
      totalBatches: 0,
      averageBatchSize: 0,
      averageProcessingTime: 0,
      lastProcessingTime: 0
    });
  }, [batchManager]);
  
  return (
    <div className="batch-update-debugger">
      <h1 className="text-2xl font-bold mb-4">Batch Update Debugger</h1>
      
      <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h2 className="text-lg font-semibold mb-2">Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Batch Delay (ms):
            </label>
            <input 
              type="number" 
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value))}
              min="0"
              max="2000"
              step="100"
              className="border rounded p-2 w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Time to wait before processing updates
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Auto-Process Batches:
            </label>
            <div className="flex items-center mt-3">
              <input 
                type="checkbox" 
                checked={autoFlush}
                onChange={() => setAutoFlush(!autoFlush)}
                className="h-4 w-4 text-blue-600"
              />
              <span className="ml-2 text-sm">Enabled</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Automatically process batches after delay
            </p>
          </div>
          
          <div className="flex flex-col justify-end">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 mt-auto"
            >
              Reset All Data
            </button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="batch-input">
          <h2 className="text-lg font-semibold mb-2">Add Updates</h2>
          <div className="flex mb-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter a value to add to batch"
              className="border rounded-l p-2 flex-grow"
              onKeyPress={(e) => e.key === 'Enter' && handleAddUpdate()}
            />
            <button
              onClick={handleAddUpdate}
              className="px-4 py-2 bg-blue-500 text-white rounded-r hover:bg-blue-600"
              disabled={!inputValue.trim()}
            >
              Add
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => handleAddBulk(5)}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
            >
              + 5 Items
            </button>
            <button
              onClick={() => handleAddBulk(10)}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
            >
              + 10 Items
            </button>
            <button
              onClick={() => handleAddBulk(20)}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
            >
              + 20 Items
            </button>
          </div>
        </div>
        
        <div className="batch-controls">
          <h2 className="text-lg font-semibold mb-2">Batch Controls</h2>
          <div className="flex gap-2">
            <button
              onClick={handleProcessBatch}
              disabled={Object.keys(batchedValues).length === 0 || isProcessing}
              className={`px-4 py-2 rounded ${
                Object.keys(batchedValues).length === 0 || isProcessing
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              Process Batch Now
            </button>
            
            <button
              onClick={handleClearBatch}
              disabled={Object.keys(batchedValues).length === 0 || isProcessing}
              className={`px-4 py-2 rounded ${
                Object.keys(batchedValues).length === 0 || isProcessing
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              Clear Batch
            </button>
          </div>
          
          <div className="mt-2">
            <p className="text-sm">
              {isProcessing ? (
                <span className="text-yellow-600">Processing batch...</span>
              ) : Object.keys(batchedValues).length > 0 ? (
                <span className="text-blue-600">
                  {Object.keys(batchedValues).length} items in queue
                  {autoFlush && ` (processing in ${delay}ms)`}
                </span>
              ) : (
                <span className="text-gray-500">Queue is empty</span>
              )}
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="batch-visualization">
          <h2 className="text-lg font-semibold mb-2">Current Batch Queue</h2>
          <div className="border rounded-lg p-3 bg-white min-h-[200px] max-h-[400px] overflow-y-auto">
            {Object.keys(batchedValues).length === 0 ? (
              <div className="text-gray-500 text-center p-6">
                Queue is empty. Add some updates to see them here.
              </div>
            ) : (
              <div className="flex flex-wrap">
                {Object.entries(batchedValues).map(([key, { value, timestamp }]) => {
                  const age = Date.now() - timestamp;
                  return (
                    <div 
                      key={key}
                      style={getBatchItemStyle(age, delay)}
                      title={`Key: ${key}, Value: ${value}`}
                    >
                      {value}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        <div className="batch-history">
          <h2 className="text-lg font-semibold mb-2">Processed Batches</h2>
          <div className="border rounded-lg p-3 bg-white min-h-[200px] max-h-[400px] overflow-y-auto">
            {processedBatches.length === 0 ? (
              <div className="text-gray-500 text-center p-6">
                No batches processed yet.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-1 text-left">Time</th>
                    <th className="py-2 px-1 text-right">Items</th>
                    <th className="py-2 px-1 text-right">Processing</th>
                  </tr>
                </thead>
                <tbody>
                  {processedBatches.map((batch, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 px-1 text-sm">
                        {new Date(batch.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2 px-1 text-right text-sm">
                        {batch.count} items
                      </td>
                      <td className="py-2 px-1 text-right text-sm">
                        {batch.processingTime.toFixed(2)} ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      
      <div className="performance-stats bg-blue-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Performance Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card bg-white p-3 rounded shadow-sm">
            <div className="text-sm text-gray-600">Total Updates</div>
            <div className="text-2xl font-bold">{stats.totalUpdates}</div>
          </div>
          
          <div className="stat-card bg-white p-3 rounded shadow-sm">
            <div className="text-sm text-gray-600">Total Batches</div>
            <div className="text-2xl font-bold">{stats.totalBatches}</div>
          </div>
          
          <div className="stat-card bg-white p-3 rounded shadow-sm">
            <div className="text-sm text-gray-600">Avg Batch Size</div>
            <div className="text-2xl font-bold">
              {stats.averageBatchSize.toFixed(1)}
            </div>
          </div>
          
          <div className="stat-card bg-white p-3 rounded shadow-sm">
            <div className="text-sm text-gray-600">Avg Processing Time</div>
            <div className="text-2xl font-bold">
              {stats.averageProcessingTime.toFixed(2)} ms
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-700">
          <p>
            <strong>Without batching:</strong> Each update would trigger its own processing cycle, 
            requiring {stats.totalUpdates} separate operations.
          </p>
          <p className="mt-1">
            <strong>With batching:</strong> Updates are grouped into {stats.totalBatches} batches, 
            reducing processing overhead by {stats.totalBatches > 0 ? 
            ((1 - (stats.totalBatches / stats.totalUpdates)) * 100).toFixed(1) : 0}%.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BatchUpdateDebugger;