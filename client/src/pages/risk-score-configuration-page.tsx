import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { PageTemplate } from "@/components/ui/page-template";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart2, Info, BarChart, Shield, Globe2, FileCode, MessageSquare, AlertTriangle, Box, Database, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { RiskDimension, RiskThresholds, CompanyComparison, RiskScoreConfiguration, RiskPriorities } from '@/lib/risk-score-configuration-types';
import { defaultRiskDimensions, defaultRiskThresholds, sampleCompanyComparisons, calculateRiskScore, determineRiskLevel } from '@/lib/risk-score-configuration-data';
import { ComparativeVisualization } from '@/components/risk-score/ComparativeVisualization';
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
// Import from 'react-dnd' and 'react-dnd-html5-backend' more carefully
import { DndProvider } from 'react-dnd';
import type { DragSourceMonitor, DropTargetMonitor } from 'react-dnd';
import { useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const dimensionIcons: Record<string, React.ReactNode> = {
  physical_security: <Shield className="h-5 w-5" />,
  cyber_security: <FileCode className="h-5 w-5" />,
  financial_stability: <BarChart className="h-5 w-5" />,
  dark_web_data: <Globe2 className="h-5 w-5" />,
  public_sentiment: <MessageSquare className="h-5 w-5" />,
  potential_liability: <AlertTriangle className="h-5 w-5" />,
  supply_chain_issues: <Box className="h-5 w-5" />,
  data_access_scope: <Database className="h-5 w-5" />
};

interface DimensionRowProps {
  dimension: RiskDimension;
  index: number;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
  onValueChange: (id: string, value: number) => void;
}

// Define the item type for drag-and-drop
const ItemTypes = {
  DIMENSION_ROW: 'dimensionRow'
};

// Component to render a single draggable dimension row
function DimensionRow({ dimension, index, onReorder, onValueChange }: DimensionRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  
  // Setup drag functionality
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.DIMENSION_ROW,
    item: () => ({ index }),
    collect: (monitor: DragSourceMonitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  
  // Setup drop functionality
  const [, drop] = useDrop({
    accept: ItemTypes.DIMENSION_ROW,
    hover(item: { index: number }, monitor: DropTargetMonitor) {
      if (!ref.current) {
        return;
      }

      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = clientOffset ? clientOffset.y - hoverBoundingRect.top : 0;

      // Only perform the move when the mouse has crossed half of the item's height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      onReorder(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });
  
  // Connect the drag and drop refs
  drag(drop(ref));
  
  const opacity = isDragging ? 0.4 : 1;
  
  return (
    <div 
      ref={ref}
      className="flex items-center gap-2 p-4 bg-white border border-border rounded-md shadow-sm mb-2 relative transition-opacity"
      style={{ opacity }}
    >
      <div className="flex-shrink-0 cursor-move text-muted-foreground">
        <GripVertical className="h-5 w-5" />
      </div>
      
      <div className="h-8 w-8 flex items-center justify-center rounded-full text-white mr-2"
        style={{ backgroundColor: dimension.color || '#ccc' }}>
        {index + 1}
      </div>
      
      <div className="flex items-center gap-2 mr-4">
        <span className="text-primary">
          {dimensionIcons[dimension.id] || <Shield className="h-5 w-5" />}
        </span>
        <div>
          <h4 className="font-medium text-lg">{dimension.name}</h4>
          <p className="text-sm text-muted-foreground">{dimension.description}</p>
        </div>
      </div>
      
      <div className="ml-auto flex items-center gap-6">
        <div className="flex-grow w-40 md:w-60">
          <Slider
            defaultValue={[dimension.value]}
            max={100}
            step={1}
            value={[dimension.value]}
            onValueChange={(values) => onValueChange(dimension.id, values[0])}
            className="cursor-pointer"
          />
        </div>
        
        <div className="flex items-center justify-center px-3 py-1 rounded-md"
          style={{ backgroundColor: dimension.color ? `${dimension.color}20` : '#f5f5f5' }}>
          <span className="font-semibold" style={{ color: dimension.color }}>
            {dimension.value}%
          </span>
        </div>
        
        <div className="ml-2 flex-shrink-0 w-20 text-right">
          <div className="text-sm font-medium">Weight</div>
          <div className="text-lg font-bold text-muted-foreground">{dimension.weight}%</div>
        </div>
      </div>
    </div>
  );
}

// Helper function to get risk level color
function getRiskLevelColor(level: string): string {
  switch (level) {
    case 'none': return '#9e9e9e';
    case 'low': return '#4caf50';
    case 'medium': return '#ff9800';
    case 'high': return '#f44336';
    case 'critical': return '#9c27b0';
    default: return '#9e9e9e';
  }
}

export default function RiskScoreConfigurationPage() {
  const [activeTab, setActiveTab] = useState("dimension-ranking");
  const [dimensions, setDimensions] = useState<RiskDimension[]>(defaultRiskDimensions);
  const [thresholds, setThresholds] = useState<RiskThresholds>(defaultRiskThresholds);
  const [score, setScore] = useState<number>(50);
  const [riskLevel, setRiskLevel] = useState<'none' | 'low' | 'medium' | 'high' | 'critical'>('medium');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Query to fetch the risk score configuration
  const { data: configData, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['/api/risk-score/configuration'],
    onSuccess: (data) => {
      if (data) {
        setDimensions(data.dimensions || defaultRiskDimensions);
        setThresholds(data.thresholds || defaultRiskThresholds);
        setScore(data.score || 50);
        setRiskLevel(data.riskLevel || 'medium');
      }
    },
    onError: (error) => {
      console.error('Error fetching risk score configuration:', error);
      toast({
        title: 'Failed to load configuration',
        description: 'Using default configuration instead.',
        variant: 'destructive',
      });
    }
  });
  
  // Query to fetch the risk priorities (for dimension ranking)
  const { data: prioritiesData, isLoading: isLoadingPriorities } = useQuery({
    queryKey: ['/api/risk-score/priorities'],
    onSuccess: (data) => {
      if (data && data.dimensions) {
        // If we have priorities data, use it instead of the general configuration
        setDimensions(data.dimensions);
      }
    },
    onError: (error) => {
      console.error('Error fetching risk priorities:', error);
      // Don't show error toast as we'll fall back to config data or defaults
    }
  });
  
  // Mutation to save the risk score configuration
  const saveMutation = useMutation({
    mutationFn: (configuration: RiskScoreConfiguration) => {
      return apiRequest('POST', '/api/risk-score/configuration', configuration);
    },
    onSuccess: () => {
      toast({
        title: 'Configuration saved',
        description: 'Your risk score configuration has been saved successfully.',
        variant: 'success',
      });
      // Invalidate the query to refetch the configuration
      queryClient.invalidateQueries({ queryKey: ['/api/risk-score/configuration'] });
    },
    onError: (error) => {
      console.error('Error saving risk score configuration:', error);
      toast({
        title: 'Failed to save configuration',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    }
  });
  
  // Mutation to save risk priorities
  const savePrioritiesMutation = useMutation({
    mutationFn: (priorities: RiskPriorities) => {
      return apiRequest('POST', '/api/risk-score/priorities', priorities);
    },
    onSuccess: () => {
      toast({
        title: 'Priorities saved',
        description: 'Your risk dimension priorities have been saved successfully.',
        variant: 'success',
      });
      // Invalidate the priorities query to refetch the data
      queryClient.invalidateQueries({ queryKey: ['/api/risk-score/priorities'] });
    },
    onError: (error) => {
      console.error('Error saving risk priorities:', error);
      toast({
        title: 'Failed to save priorities',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    }
  });
  
  // Calculate score and risk level when dimensions change
  useEffect(() => {
    const newScore = calculateRiskScore(dimensions);
    setScore(newScore);
    setRiskLevel(determineRiskLevel(newScore));
  }, [dimensions]);
  
  // Handle dimension reordering (for drag and drop functionality)
  const handleReorder = (dragIndex: number, hoverIndex: number) => {
    // For the MVP, we'll just implement a simple array reordering
    const newDimensions = [...dimensions];
    const draggedItem = newDimensions[dragIndex];
    
    // Remove the dragged item and insert it at the new position
    newDimensions.splice(dragIndex, 1);
    newDimensions.splice(hoverIndex, 0, draggedItem);
    
    // Recalculate weights based on the new order
    // For the MVP we'll use a simple linear distribution
    // Later we can implement more sophisticated weighting algorithms
    const totalWeight = 100;
    const newWeightedDimensions = newDimensions.map((dim, index) => {
      // Higher index = lower weight (reverse order)
      const reverseIndex = newDimensions.length - 1 - index;
      // Simple exponentially decreasing weight distribution
      const weight = Math.max(1, Math.round(totalWeight * Math.pow(0.8, reverseIndex) / newDimensions.length * 2.5 * 10) / 10);
      return { ...dim, weight };
    });
    
    // Normalize weights to sum to 100%
    const weightSum = newWeightedDimensions.reduce((sum, dim) => sum + dim.weight, 0);
    const normalizedDimensions = newWeightedDimensions.map(dim => ({
      ...dim,
      weight: Math.round((dim.weight / weightSum) * 100 * 10) / 10
    }));
    
    setDimensions(normalizedDimensions);
  };
  
  // Handle dimension slider value changes
  const handleValueChange = (id: string, value: number) => {
    setDimensions(prevDimensions => 
      prevDimensions.map(dim => 
        dim.id === id ? { ...dim, value } : dim
      )
    );
  };
  
  // Handle reset to defaults
  const handleReset = () => {
    setDimensions(defaultRiskDimensions);
    setThresholds(defaultRiskThresholds);
    
    // If on the priorities tab, also reset priorities data
    if (activeTab === 'dimension-ranking') {
      // We could also save the reset priorities to the server here
      // but for simplicity we'll just wait until the user explicitly saves
      toast({
        title: 'Reset to defaults',
        description: 'Dimension rankings have been reset to default values. Click save to persist changes.',
        variant: 'info',
      });
    } else {
      toast({
        title: 'Reset to defaults',
        description: 'Configuration has been reset to default values. Click save to persist changes.',
        variant: 'info',
      });
    }
  };
  
  // Handle save configuration
  const handleSave = () => {
    // Determine which type of data to save based on the active tab
    if (activeTab === 'dimension-ranking') {
      // Save to risk priorities endpoint
      const priorities: RiskPriorities = {
        dimensions,
        lastUpdated: new Date().toISOString()
      };
      
      savePrioritiesMutation.mutate(priorities);
    } else {
      // Save to general configuration endpoint
      const configuration: RiskScoreConfiguration = {
        dimensions,
        thresholds,
        score,
        riskLevel
      };
      
      saveMutation.mutate(configuration);
    }
  };

  return (
    <DashboardLayout>
      <PageTemplate showBreadcrumbs>
        <div className="space-y-6">
          <PageHeader
            title="S&P Risk Score Configuration"
            description="Configure your risk assessment priorities for third parties accessing your open banking data"
            icon={<BarChart2 className="h-6 w-6 text-primary" />}
          />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>Risk Dimension Prioritization</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop dimensions to rank them by importance. Adjust thresholds using the sliders.
                  </p>
                </CardHeader>
                <CardContent>
                  <Tabs 
                    defaultValue="dimension-ranking" 
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full"
                  >
                    <TabsList className="mb-6">
                      <TabsTrigger value="dimension-ranking">Dimension Ranking & Priorities</TabsTrigger>
                      <TabsTrigger value="comparative-visualization">Comparative Visualization</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="dimension-ranking" className="space-y-6">
                      <div className="bg-muted/40 p-4 rounded-lg border border-border">
                        <div className="flex items-start gap-2">
                          <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div className="text-sm text-muted-foreground">
                            <p className="font-medium">How Dimension Ranking & Priorities Work</p>
                            <p>Drag and drop dimensions to stack rank them by importance. Dimensions at the top have more weight in the final risk score calculation. Adjust risk levels for each dimension using the sliders. Click Save to persist your priorities.</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <div className="text-sm font-medium pl-20">1</div>
                          <div className="text-sm font-medium pr-20">8</div>
                        </div>
                        <div className="bg-muted/30 h-2 rounded-full relative mb-6">
                          <div className="absolute inset-x-0 flex justify-between px-4">
                            <div className="w-1 h-3 -mt-0.5 bg-primary"></div>
                            <div className="w-1 h-3 -mt-0.5 bg-primary"></div>
                          </div>
                          <div className="absolute inset-x-0 top-4 flex justify-between px-4">
                            <div className="text-xs text-muted-foreground">Highest <br/>Priority</div>
                            <div className="text-xs text-muted-foreground text-right">Lowest <br/>Priority</div>
                          </div>
                        </div>
                        
                        {/* Dimension rows with drag and drop */}
                        <DndProvider backend={HTML5Backend}>
                          <div className="space-y-2 mt-8">
                            {dimensions.map((dimension, index) => (
                              <DimensionRow 
                                key={dimension.id}
                                dimension={dimension}
                                index={index}
                                onReorder={handleReorder}
                                onValueChange={handleValueChange}
                              />
                            ))}
                          </div>
                        </DndProvider>
                      </div>
                    </TabsContent>

                    <TabsContent value="comparative-visualization" className="space-y-6">
                      <div className="bg-muted/40 p-4 rounded-lg border border-border">
                        <div className="flex items-start gap-2">
                          <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div className="text-sm text-muted-foreground">
                            <p className="font-medium">Compare Your Risk Profile</p>
                            <p>See how your risk configuration compares to popular fintech companies and industry standards.</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Comparative visualization component */}
                      <ComparativeVisualization dimensions={dimensions} />
                    </TabsContent>
                  </Tabs>

                  <Separator className="my-6" />

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={handleReset}>Reset to Defaults</Button>
                    <Button onClick={handleSave}>Save Configuration</Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Risk Score Summary</CardTitle>
                  <p className="text-sm text-muted-foreground">Based on your dimension prioritization</p>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <div className="relative w-36 h-36 my-4">
                    <div className="w-full h-full rounded-full border-8 border-muted flex items-center justify-center">
                      {/* Semi-circle gauge background */}
                      <div 
                        className="absolute top-0 bottom-0 left-0 right-0 rounded-full border-8" 
                        style={{ 
                          borderColor: getRiskLevelColor(riskLevel),
                          clip: `rect(0, ${36 * 2}px, ${36 * 2}px, ${36}px)`,
                          opacity: 0.2,
                          borderRadius: '50%',
                        }}
                      ></div>
                      
                      {/* Gauge fill based on score */}
                      <div 
                        className="absolute top-0 bottom-0 left-0 right-0 rounded-full border-8 transition-all duration-500 ease-in-out" 
                        style={{ 
                          borderColor: getRiskLevelColor(riskLevel),
                          clip: `rect(0, ${36 * 2}px, ${36 * 2}px, ${36}px)`,
                          clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin(Math.PI * score / 100)}% ${50 - 50 * Math.cos(Math.PI * score / 100)}%)`,
                          borderRadius: '50%',
                        }}
                      ></div>
                      
                      {/* Score display */}
                      <div className="text-4xl font-bold">{score}</div>
                    </div>
                    <div className="text-center mt-2 uppercase font-semibold" style={{ color: getRiskLevelColor(riskLevel) }}>
                      {riskLevel} Risk
                    </div>
                  </div>
                  
                  <p className="text-sm mt-4 text-center">Based on your prioritized dimensions</p>
                  
                  <div className="w-full mt-6">
                    <h4 className="font-medium mb-2">Top Priority Dimensions</h4>
                    <ul className="space-y-2">
                      {dimensions.slice(0, 3).map(dimension => (
                        <li key={dimension.id} className="flex items-center gap-2">
                          <span className="text-primary">
                            {dimensionIcons[dimension.id] || <Shield className="h-5 w-5" />}
                          </span>
                          <span>{dimension.name}</span>
                          <span className="ml-auto font-semibold">{dimension.value}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="w-full mt-6">
                    <h4 className="font-medium mb-2">Weight Distribution</h4>
                    <p className="text-xs text-muted-foreground mb-3">How each dimension contributes to the risk score</p>
                    
                    <ul className="space-y-3">
                      {dimensions.map((dimension, index) => (
                        <li key={dimension.id} className="text-sm">
                          <div className="flex justify-between mb-1">
                            <span className="flex items-center gap-1">
                              <span className="text-muted-foreground">{index + 1}.</span> {dimension.name}
                            </span>
                            <span className="font-medium">{dimension.weight}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full" 
                              style={{ 
                                width: `${dimension.weight}%`,
                                backgroundColor: dimension.color || '#ccc'
                              }}
                            ></div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </PageTemplate>
    </DashboardLayout>
  );
}
