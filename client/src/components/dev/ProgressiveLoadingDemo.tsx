/**
 * ProgressiveLoadingDemo Component
 * 
 * This component demonstrates the progressive loading capability
 * where form sections are loaded incrementally to improve perceived performance.
 * 
 * Features:
 * - Visual representation of section loading sequence
 * - Controls for testing different loading configurations
 * - Performance metrics for load times
 */

import React, { useState, useEffect, useCallback } from 'react';

// Default section configuration for testing
const DEFAULT_SECTIONS = [
  'section-1', 'section-2', 'section-3', 'section-4', 
  'section-5', 'section-6', 'section-7', 'section-8'
];

// Section names that match our standard form sections
const SECTION_LABELS: Record<string, string> = {
  'section-1': 'Company Profile',
  'section-2': 'Governance & Leadership',
  'section-3': 'Financial Profile',
  'section-4': 'Operations & Compliance',
  'section-5': 'Risk Assessment',
  'section-6': 'Regulatory Information',
  'section-7': 'Additional Documents',
  'section-8': 'Review & Submit'
};

const ProgressiveLoadingDemo: React.FC = () => {
  // State for controlling the demo
  const [sections] = useState<string[]>(DEFAULT_SECTIONS);
  const [loadedSections, setLoadedSections] = useState<Set<string>>(new Set());
  const [initialBatchSize, setInitialBatchSize] = useState(2);
  const [loadBatchSize, setLoadBatchSize] = useState(1);
  const [loadDelay, setLoadDelay] = useState(500);
  const [isLoading, setIsLoading] = useState(false);
  const [loadTimes, setLoadTimes] = useState<Record<string, number>>({});
  
  // Function to handle section loading
  const handleSectionLoaded = useCallback((sectionId: string) => {
    setLoadedSections(prev => {
      const newSet = new Set(prev);
      newSet.add(sectionId);
      return newSet;
    });
    
    // Record the load time
    setLoadTimes(prev => ({
      ...prev,
      [sectionId]: Date.now()
    }));
  }, []);
  
  // Start the progressive loading process
  const startLoading = useCallback(() => {
    // Reset state
    setLoadedSections(new Set());
    setLoadTimes({});
    setIsLoading(true);
    
    // Record start time
    const startTime = Date.now();
    setLoadTimes({ start: startTime });
    
    // Load initial batch
    const initialBatch = sections.slice(0, initialBatchSize);
    initialBatch.forEach(sectionId => {
      setTimeout(() => {
        handleSectionLoaded(sectionId);
      }, 10);
    });
    
    // Load remaining sections progressively
    let nextIndex = initialBatchSize;
    
    const loadNextBatch = () => {
      if (nextIndex >= sections.length) {
        setIsLoading(false);
        setLoadTimes(prev => ({
          ...prev,
          complete: Date.now()
        }));
        return;
      }
      
      // Load next batch
      const nextBatch = sections.slice(nextIndex, nextIndex + loadBatchSize);
      nextBatch.forEach(sectionId => {
        handleSectionLoaded(sectionId);
      });
      
      // Move to next batch
      nextIndex += loadBatchSize;
      
      // Schedule next batch
      setTimeout(loadNextBatch, loadDelay);
    };
    
    // Start loading next batches after initial delay
    setTimeout(loadNextBatch, loadDelay);
  }, [sections, initialBatchSize, loadBatchSize, loadDelay, handleSectionLoaded]);
  
  // Calculate load stats
  const getLoadStats = useCallback(() => {
    if (!loadTimes.start || !loadTimes.complete) return null;
    
    const totalTime = loadTimes.complete - loadTimes.start;
    const sectionTimes: Record<string, number> = {};
    
    sections.forEach(sectionId => {
      if (loadTimes[sectionId]) {
        sectionTimes[sectionId] = loadTimes[sectionId] - loadTimes.start;
      }
    });
    
    return {
      totalTime,
      sectionTimes,
      averageTimePerSection: totalTime / sections.length
    };
  }, [loadTimes, sections]);
  
  // Reset everything
  const handleReset = useCallback(() => {
    setLoadedSections(new Set());
    setLoadTimes({});
    setIsLoading(false);
  }, []);
  
  return (
    <div className="progressive-loading-demo p-4">
      <h1 className="text-2xl font-bold mb-4">Progressive Loading Demonstration</h1>
      
      <div className="controls bg-gray-100 p-4 rounded-lg mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Initial Batch Size:
            </label>
            <input 
              type="number" 
              value={initialBatchSize}
              onChange={(e) => setInitialBatchSize(Number(e.target.value))}
              min="1"
              max="8"
              className="border rounded p-2 w-full"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Number of sections to load immediately
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Load Batch Size:
            </label>
            <input 
              type="number" 
              value={loadBatchSize}
              onChange={(e) => setLoadBatchSize(Number(e.target.value))}
              min="1"
              max="4"
              className="border rounded p-2 w-full"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Number of sections to load in each subsequent batch
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Load Delay (ms):
            </label>
            <input 
              type="number" 
              value={loadDelay}
              onChange={(e) => setLoadDelay(Number(e.target.value))}
              min="100"
              max="2000"
              step="100"
              className="border rounded p-2 w-full"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Delay between loading batches
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={startLoading}
            disabled={isLoading}
            className={`px-4 py-2 rounded ${
              isLoading 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            Start Loading
          </button>
          
          <button
            onClick={handleReset}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Reset
          </button>
        </div>
      </div>
      
      <div className="section-display grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {sections.map((sectionId) => {
          const isLoaded = loadedSections.has(sectionId);
          const loadTime = loadTimes[sectionId] 
            ? ((loadTimes[sectionId] - loadTimes.start) / 1000).toFixed(2)
            : null;
            
          return (
            <div 
              key={sectionId}
              className={`border rounded-lg p-4 transition-all duration-300 ${
                isLoaded 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium">
                  {SECTION_LABELS[sectionId] || sectionId}
                </h3>
                {isLoaded && (
                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                    Loaded
                  </span>
                )}
              </div>
              
              {loadTime && (
                <div className="text-sm text-gray-500">
                  Loaded after: <span className="font-medium">{loadTime}s</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {loadTimes.complete && (
        <div className="stats bg-blue-50 border border-blue-100 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Loading Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Load Time:</p>
              <p className="text-xl font-bold">
                {((loadTimes.complete - loadTimes.start) / 1000).toFixed(2)}s
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Sections Loaded:</p>
              <p className="text-xl font-bold">
                {loadedSections.size} / {sections.length}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Avg Time Per Section:</p>
              <p className="text-xl font-bold">
                {getLoadStats()?.averageTimePerSection 
                  ? (getLoadStats()?.averageTimePerSection / 1000).toFixed(2) 
                  : '0.00'}s
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressiveLoadingDemo;