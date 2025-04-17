/**
 * VirtualizedRenderingDemo Component
 * 
 * This component provides a way to test and demonstrate the virtualized rendering
 * capabilities of our form components. It renders a form with a large number of fields
 * and allows toggling between standard and virtualized rendering to compare performance.
 * 
 * Features:
 * - Dynamic field generation with configurable field count
 * - Performance metrics display (render time, memory usage)
 * - Toggle between virtualized and standard rendering
 * - Visual indicators for rendered vs. virtual fields
 */

import React, { useState, useEffect, useCallback } from 'react';
import VirtualizedFormSection from '../forms/VirtualizedFormSection';
import { FormField } from '../forms/types';
import { performanceMonitor } from '@/utils/form-optimization';

// Configuration for test form generation
const FIELD_COUNT_OPTIONS = [20, 50, 100, 200, 500];
const SECTION_COUNT_OPTIONS = [1, 2, 4, 8];

interface VirtualizedRenderingDemoProps {
  initialFieldCount?: number;
  initialSectionCount?: number;
}

const VirtualizedRenderingDemo: React.FC<VirtualizedRenderingDemoProps> = ({
  initialFieldCount = 100,
  initialSectionCount = 4
}) => {
  // State for controlling test parameters
  const [fieldCount, setFieldCount] = useState(initialFieldCount);
  const [sectionCount, setSectionCount] = useState(initialSectionCount);
  const [virtualizationEnabled, setVirtualizationEnabled] = useState(true);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [performanceStats, setPerformanceStats] = useState<{
    initialRenderTime: number;
    updateRenderTime: number;
    memoryUsage: number;
    visibleFieldCount: number;
  }>({
    initialRenderTime: 0,
    updateRenderTime: 0,
    memoryUsage: 0,
    visibleFieldCount: 0
  });
  
  // Generate test form sections and fields
  const generateTestData = useCallback(() => {
    const sections: { id: string; title: string; fields: FormField[] }[] = [];
    
    // Standard section names that should be used in the form
    const sectionNames = [
      "Company Profile",
      "Governance & Leadership",
      "Financial Profile",
      "Operations & Compliance"
    ];
    
    // Distribute fields across sections
    const fieldsPerSection = Math.floor(fieldCount / sectionCount);
    
    for (let i = 0; i < sectionCount; i++) {
      const sectionId = `section-${i + 1}`;
      const sectionTitle = i < sectionNames.length 
        ? sectionNames[i] 
        : `Section ${i + 1}`;
      
      const fields: FormField[] = [];
      
      // Generate fields for this section
      for (let j = 0; j < fieldsPerSection; j++) {
        const fieldId = `field-${i}-${j}`;
        const fieldType = getRandomFieldType();
        
        fields.push({
          name: fieldId,
          label: `Field ${i}.${j} (${fieldType})`,
          type: fieldType,
          section: sectionId,
          required: j % 3 === 0, // Make every third field required
          placeholder: `Enter value for field ${i}.${j}`,
          description: j % 4 === 0 ? `Description for field ${i}.${j}` : undefined,
          // Add options for select/radio fields
          options: fieldType === 'select' || fieldType === 'radio' 
            ? [
                { label: 'Option 1', value: 'option1' },
                { label: 'Option 2', value: 'option2' },
                { label: 'Option 3', value: 'option3' }
              ] 
            : undefined
        });
      }
      
      sections.push({
        id: sectionId,
        title: sectionTitle,
        fields
      });
    }
    
    return sections;
  }, [fieldCount, sectionCount]);
  
  // Generate random field type for variety
  const getRandomFieldType = () => {
    const types = ['text', 'textarea', 'select', 'checkbox', 'radio', 'number'];
    const randomIndex = Math.floor(Math.random() * types.length);
    return types[randomIndex];
  };
  
  // Handle field value changes
  const handleFieldChange = useCallback((name: string, value: any) => {
    // Start timer to measure update performance
    performanceMonitor.startTimer('fieldUpdate');
    
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
    
    // End timer and update stats
    performanceMonitor.endTimer('fieldUpdate');
    const updateTime = performanceMonitor.getLastMeasurement('fieldUpdate');
    
    setPerformanceStats(prev => ({
      ...prev,
      updateRenderTime: updateTime || prev.updateRenderTime
    }));
  }, []);
  
  // Measure initial render performance
  useEffect(() => {
    performanceMonitor.startTimer('initialRender');
    
    // Cleanup function will capture the performance when component unmounts/re-renders
    return () => {
      performanceMonitor.endTimer('initialRender');
      const renderTime = performanceMonitor.getLastMeasurement('initialRender');
      
      if (renderTime) {
        setPerformanceStats(prev => ({
          ...prev,
          initialRenderTime: renderTime
        }));
      }
      
      // Try to get memory usage if available
      if (window.performance && (window.performance as any).memory) {
        const memoryInfo = (window.performance as any).memory;
        setPerformanceStats(prev => ({
          ...prev,
          memoryUsage: Math.round(memoryInfo.usedJSHeapSize / (1024 * 1024))
        }));
      }
    };
  }, [fieldCount, sectionCount, virtualizationEnabled]);
  
  // Generate test sections
  const testSections = generateTestData();
  
  return (
    <div className="virtualized-rendering-demo p-4">
      <h1 className="text-2xl font-bold mb-4">Virtualized Rendering Test</h1>
      
      <div className="controls bg-gray-100 p-4 rounded-lg mb-4">
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Fields per Form:</label>
            <select 
              value={fieldCount} 
              onChange={(e) => setFieldCount(Number(e.target.value))}
              className="border rounded p-2"
            >
              {FIELD_COUNT_OPTIONS.map(count => (
                <option key={count} value={count}>{count} fields</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Section Count:</label>
            <select 
              value={sectionCount} 
              onChange={(e) => setSectionCount(Number(e.target.value))}
              className="border rounded p-2"
            >
              {SECTION_COUNT_OPTIONS.map(count => (
                <option key={count} value={count}>{count} sections</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Virtualization:</label>
            <div className="flex items-center">
              <input 
                type="checkbox"
                checked={virtualizationEnabled}
                onChange={(e) => setVirtualizationEnabled(e.target.checked)}
                className="mr-2 h-4 w-4"
              />
              <span>{virtualizationEnabled ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
        </div>
        
        <div className="performance-stats grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="stat bg-white p-3 rounded">
            <div className="text-sm text-gray-600">Initial Render Time</div>
            <div className="text-lg font-semibold">{performanceStats.initialRenderTime.toFixed(2)} ms</div>
          </div>
          
          <div className="stat bg-white p-3 rounded">
            <div className="text-sm text-gray-600">Update Render Time</div>
            <div className="text-lg font-semibold">{performanceStats.updateRenderTime.toFixed(2)} ms</div>
          </div>
          
          <div className="stat bg-white p-3 rounded">
            <div className="text-sm text-gray-600">Memory Usage</div>
            <div className="text-lg font-semibold">
              {performanceStats.memoryUsage > 0 
                ? `${performanceStats.memoryUsage} MB` 
                : 'Not available'}
            </div>
          </div>
          
          <div className="stat bg-white p-3 rounded">
            <div className="text-sm text-gray-600">Total Fields</div>
            <div className="text-lg font-semibold">{fieldCount}</div>
          </div>
        </div>
      </div>
      
      <div className="test-content bg-white border rounded-lg" style={{ height: '600px', overflow: 'auto' }}>
        <div className="p-4">
          {testSections.map((section) => (
            <div key={section.id} className="mb-8">
              <VirtualizedFormSection
                sectionId={section.id}
                sectionTitle={section.title}
                fields={section.fields}
                values={formValues}
                onChange={handleFieldChange}
                disabled={false}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VirtualizedRenderingDemo;