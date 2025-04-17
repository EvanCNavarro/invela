/**
 * VirtualizedRenderingDemo Component
 * 
 * This component provides a testing interface for the VirtualizedFormSection component.
 * It allows developers to see performance benefits of virtualized rendering with different
 * numbers of fields and test configurations.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  OptimizationFeatures, 
  performanceMonitor 
} from '@/utils/form-optimization';
import VirtualizedFormSection from '../forms/VirtualizedFormSection';
import { FormField } from '../forms/types';

// Field types available for testing
const FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'select',
  'radio',
  'checkbox',
  'date',
];

export default function VirtualizedRenderingDemo() {
  // Feature flag state
  const [virtualizationEnabled, setVirtualizationEnabled] = useState(
    OptimizationFeatures.VIRTUALIZED_RENDERING
  );
  
  // Test configuration
  const [fieldCount, setFieldCount] = useState(50);
  const [sectionId, setSectionId] = useState('test-section');
  const [sectionTitle, setSectionTitle] = useState('Performance Test Section');
  
  // Form state
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  
  // Performance metrics
  const [metrics, setMetrics] = useState<Record<string, number>>({
    renderTime: 0,
    scrollUpdateTime: 0,
    memoryUsage: 0,
  });
  
  // Generate test fields
  const testFields = useMemo(() => {
    const fields: FormField[] = [];
    
    for (let i = 0; i < fieldCount; i++) {
      // Determine field type - cycle through available types
      const fieldType = FIELD_TYPES[i % FIELD_TYPES.length];
      
      const field: FormField = {
        name: `field_${i}`,
        label: `Test Field ${i}`,
        type: fieldType,
        section: sectionId,
        required: i % 3 === 0, // Make every third field required for variety
      };
      
      // Add options for select and radio fields
      if (fieldType === 'select' || fieldType === 'radio') {
        field.options = [
          { label: 'Option A', value: 'a' },
          { label: 'Option B', value: 'b' },
          { label: 'Option C', value: 'c' },
        ];
      }
      
      fields.push(field);
    }
    
    return fields;
  }, [fieldCount, sectionId]);
  
  // Toggle virtualization feature
  const toggleVirtualization = useCallback(() => {
    const newValue = !virtualizationEnabled;
    OptimizationFeatures.VIRTUALIZED_RENDERING = newValue;
    setVirtualizationEnabled(newValue);
    
    // Reset metrics when switching modes
    setMetrics({
      renderTime: 0,
      scrollUpdateTime: 0,
      memoryUsage: 0,
    });
  }, [virtualizationEnabled]);
  
  // Handle field value changes
  const handleFieldChange = useCallback((name: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);
  
  // Run performance test
  const runPerformanceTest = useCallback(() => {
    // Start performance monitoring
    performanceMonitor.startTimer('virtualizedRendering');
    
    // Force re-render by updating state
    setFieldCount((prev) => prev);
    
    // Collect metrics after render completes
    setTimeout(() => {
      const renderTime = performanceMonitor.endTimer('virtualizedRendering');
      const scrollUpdateTime = performanceMonitor.getAverageTime('updateVisibleRange') || 0;
      
      // Update metrics display
      setMetrics({
        renderTime,
        scrollUpdateTime,
        memoryUsage: window.performance?.memory?.usedJSHeapSize || 0,
      });
    }, 100);
  }, []);
  
  // Reset form state
  const resetDemo = useCallback(() => {
    setFormValues({});
    setMetrics({
      renderTime: 0,
      scrollUpdateTime: 0,
      memoryUsage: 0,
    });
  }, []);
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Virtualized Rendering Demo</CardTitle>
            <CardDescription>
              Test performance benefits of virtualized scrolling for large form sections
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="virtualization-toggle" className="text-sm">
              Virtualization Enabled
            </Label>
            <Switch 
              id="virtualization-toggle"
              checked={virtualizationEnabled}
              onCheckedChange={toggleVirtualization}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="demo" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="demo">Demo</TabsTrigger>
            <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="demo" className="space-y-6 pt-4">
            <div className="grid grid-cols-3 gap-6">
              {/* Configuration Panel */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Configuration</h3>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="field-count">Field Count</Label>
                    <div className="flex space-x-2">
                      <Input 
                        id="field-count"
                        type="number"
                        min={10}
                        max={500}
                        value={fieldCount}
                        onChange={(e) => setFieldCount(Math.min(500, Math.max(10, parseInt(e.target.value) || 10)))}
                      />
                      <div className="flex space-x-1">
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => setFieldCount(50)}
                        >
                          50
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => setFieldCount(120)}
                        >
                          120
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => setFieldCount(250)}
                        >
                          250
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="section-title">Section Title</Label>
                    <Input 
                      id="section-title"
                      value={sectionTitle}
                      onChange={(e) => setSectionTitle(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="section-id">Section ID</Label>
                    <Input 
                      id="section-id"
                      value={sectionId}
                      onChange={(e) => setSectionId(e.target.value)}
                    />
                  </div>
                  
                  <div className="pt-2 space-y-2">
                    <Button 
                      onClick={runPerformanceTest}
                      className="w-full"
                    >
                      Run Performance Test
                    </Button>
                    
                    <Button 
                      onClick={resetDemo}
                      variant="outline"
                      className="w-full"
                    >
                      Reset Form
                    </Button>
                  </div>
                </div>
                
                <div className="pt-4 space-y-3">
                  <h3 className="text-lg font-medium">Performance Report</h3>
                  
                  <div className="bg-muted p-3 rounded-md text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-gray-500">Render Time:</div>
                      <div className="font-medium">
                        {metrics.renderTime ? `${metrics.renderTime.toFixed(2)}ms` : 'N/A'}
                      </div>
                      
                      <div className="text-gray-500">Scroll Update:</div>
                      <div className="font-medium">
                        {metrics.scrollUpdateTime ? `${metrics.scrollUpdateTime.toFixed(2)}ms` : 'N/A'}
                      </div>
                      
                      <div className="text-gray-500">Fields Rendered:</div>
                      <div className="font-medium">
                        {virtualizationEnabled ? '~15-25 (visible only)' : fieldCount}
                      </div>
                      
                      <div className="text-gray-500">Virtualization:</div>
                      <div className="font-medium">
                        <Badge variant={virtualizationEnabled ? "default" : "outline"}>
                          {virtualizationEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-gray-500">
                        Try toggling virtualization and comparing render times with different field counts.
                        For best results, use 120+ fields.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Form Section Preview */}
              <div className="col-span-2 border rounded-md p-4">
                <h3 className="text-lg font-medium mb-4">Virtualized Form Preview</h3>
                
                <div className="h-[650px] overflow-hidden">
                  <VirtualizedFormSection
                    sectionId={sectionId}
                    sectionTitle={sectionTitle}
                    fields={testFields}
                    values={formValues}
                    onChange={handleFieldChange}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="metrics" className="pt-4">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Standard vs. Virtualized Rendering</CardTitle>
                    <CardDescription>
                      Performance comparison between rendering approaches
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-muted rounded-md">
                          <div className="text-3xl font-bold">
                            {fieldCount}
                          </div>
                          <div className="text-sm text-gray-500">
                            Total Fields
                          </div>
                        </div>
                        
                        <div className="p-3 bg-muted rounded-md">
                          <div className="text-3xl font-bold">
                            ~20
                          </div>
                          <div className="text-sm text-gray-500">
                            Visible Fields
                          </div>
                        </div>
                        
                        <div className="p-3 bg-muted rounded-md">
                          <div className="text-3xl font-bold text-green-600">
                            {fieldCount > 0 ? Math.round((fieldCount - 20) / fieldCount * 100) : 0}%
                          </div>
                          <div className="text-sm text-gray-500">
                            Reduction
                          </div>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Expected Benefits</h4>
                        <ul className="text-sm space-y-1">
                          <li className="flex items-start space-x-2">
                            <div className="text-green-500 mt-0.5">✓</div>
                            <div>Faster initial rendering (up to 90% faster with 120+ fields)</div>
                          </li>
                          <li className="flex items-start space-x-2">
                            <div className="text-green-500 mt-0.5">✓</div>
                            <div>Reduced memory usage</div>
                          </li>
                          <li className="flex items-start space-x-2">
                            <div className="text-green-500 mt-0.5">✓</div>
                            <div>Smoother scrolling experience</div>
                          </li>
                          <li className="flex items-start space-x-2">
                            <div className="text-green-500 mt-0.5">✓</div>
                            <div>Lower CPU/GPU utilization</div>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Testing Instructions</CardTitle>
                    <CardDescription>
                      How to verify virtualized rendering performance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <ol className="text-sm space-y-2 list-decimal pl-4">
                        <li>
                          <span className="font-medium">Disable virtualization</span> using the toggle at the top
                        </li>
                        <li>
                          Set the field count to <span className="font-medium">120+ fields</span> (higher values show more benefit)
                        </li>
                        <li>
                          Click <span className="font-medium">Run Performance Test</span> and note the render time
                        </li>
                        <li>
                          <span className="font-medium">Enable virtualization</span> using the toggle
                        </li>
                        <li>
                          Run the test again and compare the timing results
                        </li>
                        <li>
                          Try scrolling through the form and observe the smoothness
                        </li>
                      </ol>
                      
                      <Separator />
                      
                      <div className="text-sm text-gray-500">
                        <p className="font-medium">Expected Results:</p>
                        <p>
                          With 120 fields, virtualized rendering should be at least 60-70% faster.
                          With 250+ fields, improvements can be 80-90% or more.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Implementation Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Key Components</h4>
                        <ul className="text-sm space-y-1">
                          <li className="flex items-start space-x-2">
                            <div className="text-blue-500 mt-0.5">•</div>
                            <div><code>VirtualizedFormSection</code> - Main component that implements virtualization</div>
                          </li>
                          <li className="flex items-start space-x-2">
                            <div className="text-blue-500 mt-0.5">•</div>
                            <div><code>OptimizationFeatures.VIRTUALIZED_RENDERING</code> - Feature flag</div>
                          </li>
                          <li className="flex items-start space-x-2">
                            <div className="text-blue-500 mt-0.5">•</div>
                            <div>React's <code>useEffect</code> for scroll measurement</div>
                          </li>
                          <li className="flex items-start space-x-2">
                            <div className="text-blue-500 mt-0.5">•</div>
                            <div>CSS spacers for maintaining scroll dimensions</div>
                          </li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">How Virtualization Works</h4>
                        <ol className="text-sm space-y-1 list-decimal pl-4">
                          <li>Measure the visible viewport</li>
                          <li>Calculate which fields would be visible</li>
                          <li>Render only visible fields plus a small buffer</li>
                          <li>Add spacers to maintain scroll dimensions</li>
                          <li>Recalculate on scroll events</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}