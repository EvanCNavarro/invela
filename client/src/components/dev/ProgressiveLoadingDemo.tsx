/**
 * ProgressiveLoadingDemo Component
 * 
 * This component provides a testing and visualization interface for the ProgressiveLoader utility.
 * It allows developers to see how sections are loaded with different priorities and test
 * various loading strategies.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { progressiveLoader, OptimizationFeatures } from '../../utils/form-optimization';

// Predefined test sections
const defaultSections = [
  { id: 'section1', title: 'Company Profile', priority: 2 },
  { id: 'section2', title: 'Governance & Leadership', priority: 3 },
  { id: 'section3', title: 'Financial Profile', priority: 4 },
  { id: 'section4', title: 'Operations & Compliance', priority: 5 },
];

export default function ProgressiveLoadingDemo() {
  const [sections, setSections] = useState(defaultSections);
  const [loadingStats, setLoadingStats] = useState<any[]>([]);
  const [currentSection, setCurrentSection] = useState('section1');
  const [isLoading, setIsLoading] = useState(false);
  const [parallelLoading, setParallelLoading] = useState(false);
  const [featureEnabled, setFeatureEnabled] = useState(OptimizationFeatures.PROGRESSIVE_LOADING);
  const [newSection, setNewSection] = useState({ id: '', title: '', priority: 5 });
  
  // Initialize the loader with our test sections
  useEffect(() => {
    // Reset the loader
    progressiveLoader.reset();
    progressiveLoader.initialize(sections, currentSection);
    
    // Set up event listeners for section loading
    progressiveLoader.onSectionLoad((sectionId) => {
      console.log(`[DEMO] Section loaded: ${sectionId}`);
      updateStats();
    });
    
    progressiveLoader.onAllSectionsLoad(() => {
      console.log('[DEMO] All sections loaded!');
      setIsLoading(false);
      updateStats();
    });
    
    // Initial stats
    updateStats();
    
    return () => {
      // Clean up the loader when component unmounts
      progressiveLoader.reset();
    };
  }, [sections, currentSection]);
  
  // Update the displayed statistics
  const updateStats = useCallback(() => {
    const stats = progressiveLoader.getLoadingStats();
    setLoadingStats(stats);
  }, []);
  
  // Start the loading process
  const startLoading = useCallback(() => {
    setIsLoading(true);
    progressiveLoader.startLoading(parallelLoading);
  }, [parallelLoading]);
  
  // Add a new test section
  const handleAddSection = useCallback(() => {
    if (!newSection.id || !newSection.title) return;
    
    setSections(prev => [...prev, { ...newSection }]);
    setNewSection({ id: '', title: '', priority: 5 });
  }, [newSection]);
  
  // Change the current section
  const handleSetCurrentSection = useCallback((sectionId: string) => {
    setCurrentSection(sectionId);
    progressiveLoader.setCurrentSection(sectionId);
  }, []);
  
  // Toggle feature flag
  const toggleFeature = useCallback(() => {
    OptimizationFeatures.PROGRESSIVE_LOADING = !featureEnabled;
    setFeatureEnabled(!featureEnabled);
  }, [featureEnabled]);
  
  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setSections(defaultSections);
    setCurrentSection('section1');
    setParallelLoading(false);
  }, []);
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Progressive Loading Demonstration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {/* Controls Section */}
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Configuration</h3>
                  <p className="text-sm text-gray-500">
                    Control how sections are loaded
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="feature-toggle" className="text-sm">
                    Feature Enabled
                  </Label>
                  <Switch 
                    id="feature-toggle"
                    checked={featureEnabled}
                    onCheckedChange={toggleFeature}
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="current-section">Current Section</Label>
                  <Select 
                    value={currentSection} 
                    onValueChange={handleSetCurrentSection}
                  >
                    <SelectTrigger id="current-section">
                      <SelectValue placeholder="Select a section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map(section => (
                        <SelectItem key={section.id} value={section.id}>
                          {section.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    The current section always gets highest priority
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="parallel-loading"
                    checked={parallelLoading}
                    onCheckedChange={setParallelLoading}
                  />
                  <Label htmlFor="parallel-loading">
                    Parallel Loading
                  </Label>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={startLoading} 
                    disabled={isLoading}
                    variant="default"
                    className="flex-1"
                  >
                    {isLoading ? 'Loading...' : 'Start Loading'}
                  </Button>
                  <Button 
                    onClick={resetToDefaults}
                    variant="outline"
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-3">Test Sections</h3>
              <div className="space-y-3">
                {sections.map((section, index) => (
                  <div key={section.id} className="flex items-center space-x-2">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="font-medium">{section.title}</span>
                        {section.id === currentSection && (
                          <Badge variant="outline" className="ml-2">Current</Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {section.id}, Priority: {section.priority}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSections(prev => prev.filter((_, i) => i !== index));
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                
                <div className="pt-2 border-t">
                  <h4 className="text-sm font-medium">Add New Test Section</h4>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="space-y-1">
                      <Label htmlFor="sectionId">Section ID</Label>
                      <Input 
                        id="sectionId"
                        value={newSection.id}
                        onChange={e => setNewSection(prev => ({ ...prev, id: e.target.value }))}
                        placeholder="e.g., section5"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="sectionTitle">Title</Label>
                      <Input 
                        id="sectionTitle"
                        value={newSection.title}
                        onChange={e => setNewSection(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g., Risk Assessment"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="sectionPriority">Priority (1-10)</Label>
                      <Input 
                        id="sectionPriority"
                        type="number"
                        value={newSection.priority}
                        onChange={e => setNewSection(prev => ({ 
                          ...prev, 
                          priority: parseInt(e.target.value) || 5 
                        }))}
                        min={1}
                        max={10}
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleAddSection}
                    className="mt-2"
                    variant="outline"
                    size="sm"
                  >
                    Add Section
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Visualization Section */}
          <div className="border-l pl-6">
            <h3 className="text-lg font-medium mb-3">Loading Visualization</h3>
            
            <div className="space-y-4">
              {loadingStats.map(stat => (
                <div key={stat.sectionId} className="border rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium">
                        {sections.find(s => s.id === stat.sectionId)?.title || stat.sectionId}
                      </span>
                      {stat.sectionId === currentSection && (
                        <Badge variant="secondary" className="ml-2">Current</Badge>
                      )}
                    </div>
                    <div>
                      <Badge 
                        variant={stat.loaded ? "secondary" : "outline"}
                        className={stat.loaded ? "bg-green-500 hover:bg-green-600" : ""}
                      >
                        {stat.loaded ? 'Loaded' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-gray-500">Priority:</div>
                    <div className="col-span-2">{stat.priority}</div>
                    
                    {stat.loaded && stat.loadTime && (
                      <>
                        <div className="text-gray-500">Load Time:</div>
                        <div className="col-span-2">{stat.loadTime.toFixed(2)}ms</div>
                      </>
                    )}
                  </div>
                  
                  {isLoading && !stat.loaded && (
                    <div className="mt-2 h-1 bg-gray-200 rounded overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 animate-pulse"
                        style={{ width: `${Math.random() * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
              
              {loadingStats.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No sections configured yet. Add sections to test progressive loading.
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}