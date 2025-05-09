import { useEffect, useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { DragSourceMonitor, DropTargetMonitor } from 'react-dnd';
import { useQueryClient } from '@tanstack/react-query';
import { 
  GripVertical, 
  Shield, 
  BarChart2, 
  Info, 
  Gauge as GaugeIcon 
} from 'lucide-react';
import { getRiskScoreDataService, CACHE_KEYS } from '@/lib/risk-score-data-service';

import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/ui/page-header';
import { PageTemplate } from '@/components/ui/page-template';
import { RiskGauge } from '@/components/risk-score/RiskGauge';
import { ComparativeVisualization } from '@/components/risk-score/ComparativeVisualization';
import { useRiskScoreData } from '@/hooks/use-risk-score-data';
import riskScoreLogger from '@/lib/risk-score-logger';
import { type RiskDimension } from '@/lib/risk-score-configuration-data';

// Map of dimension IDs to icons for visual representation
const dimensionIcons: Record<string, JSX.Element> = {
  data_access_scope: <Shield className="h-5 w-5 text-white" />,
  compliance_status: <BarChart2 className="h-5 w-5 text-white" />,
  technical_architecture: <GaugeIcon className="h-5 w-5 text-white" />,
  operational_maturity: <Info className="h-5 w-5 text-white" />,
};

// Define the type for drag and drop items
const ItemTypes = {
  DIMENSION_ROW: 'dimensionRow'
};

// Skeleton component for dimension rows during loading state with varying styles by index
const DimensionRowSkeleton = ({ index = 0 }: { index?: number }) => {
  // Vary the width and intensity based on priority (higher priority = more prominent)
  const widthClasses = [
    'w-1/3', // highest priority (larger name width)
    'w-1/4',
    'w-1/4',
    'w-1/5',
    'w-1/5',
    'w-1/6', // lowest priority (smallest name width)
  ];
  
  // Vary the background darkness based on priority
  const bgIntensity = [
    'bg-gray-300', // highest priority (darkest)
    'bg-gray-250',
    'bg-gray-200',
    'bg-gray-200',
    'bg-gray-150',
    'bg-gray-100', // lowest priority (lightest)
  ];
  
  // Vary the weight percentage width based on priority
  const weightWidths = [
    'w-16', // highest (widest)
    'w-14',
    'w-12',
    'w-10',
    'w-8',
    'w-6', // lowest (narrowest)
  ];
  
  return (
    <div className="flex items-center space-x-4 p-4 border rounded-md mb-2 animate-pulse"
         style={{ animationDelay: `${index * 0.1}s` }}>
      <div className="h-8 w-8 bg-gray-200 rounded"></div>
      <div className="flex-1">
        <div className={`h-4 ${bgIntensity[index] || 'bg-gray-200'} rounded ${widthClasses[index] || 'w-1/4'} mb-2`}>
          {/* Priority indicator */}
          <div className="flex items-center">
            <span className="invisible">Priority {index + 1}</span>
          </div>
        </div>
        <div className="h-3 bg-gray-100 rounded w-3/4"></div>
      </div>
      <div className="w-1/3 h-4 bg-transparent rounded"></div>
      <div className={`h-6 ${bgIntensity[index] || 'bg-gray-200'} rounded ${weightWidths[index] || 'w-10'}`}></div>
    </div>
  );
};

// Type for drag item
interface DragItem {
  index: number;
  id: string;
  type: string;
}

// Props for dimension row component
interface DimensionRowProps {
  dimension: RiskDimension;
  index: number;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
  onValueChange: (id: string, value: number) => void;
}

/**
 * Draggable and droppable dimension row component
 * Allows reordering of risk dimensions through drag and drop
 */
const DimensionRow: React.FC<DimensionRowProps> = ({ dimension, index, onReorder, onValueChange }) => {
  // Set up drag functionality
  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: ItemTypes.DIMENSION_ROW,
    item: { type: ItemTypes.DIMENSION_ROW, id: dimension.id, index },
    collect: (monitor: DragSourceMonitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  // Set up drop functionality
  const [, drop] = useDrop({
    accept: ItemTypes.DIMENSION_ROW,
    // Explicitly cast item as DragItem to fix type checking issues
    hover(item: unknown, monitor: DropTargetMonitor) {
      if (!drop) {
        return;
      }
      
      const dragItem = item as DragItem;
      
      // Don't replace items with themselves
      if (dragItem.index === index) {
        return;
      }
      
      // Call the reorder function
      onReorder(dragItem.index, index);
      
      // Update the index for the dragged item
      dragItem.index = index;
    }
  });

  // Combine drag and drop refs
  const ref = (node: HTMLDivElement) => {
    drag(node);
    drop(node);
  };

  // Render dimension row
  return (
    <div 
      ref={ref}
      className={`flex items-center space-x-4 p-4 border rounded-md mb-2 transition-opacity ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      style={{ 
        backgroundColor: `${dimension.color}10`, 
        borderColor: `${dimension.color}40` 
      }}
    >
      <div className="cursor-move">
        <GripVertical className="h-5 w-5 text-gray-500" />
      </div>
      
      <div className="flex-1">
        <div className="flex items-center">
          <div 
            className="p-1 rounded mr-2" 
            style={{ backgroundColor: dimension.color }}
          >
            {dimensionIcons[dimension.id] || <div className="h-5 w-5" />}
          </div>
          <div>
            <h4 className="font-medium text-gray-900">
              {dimension.name}
              <span className="ml-2 px-2 py-1 bg-gray-100 text-xs rounded">
                Priority {index + 1}
              </span>
            </h4>
            <p className="text-sm text-gray-500">{dimension.description}</p>
          </div>
        </div>
      </div>
      
      {/* Empty space where sliders used to be */}
      <div className="w-1/3">
        {/* No content needed here */}
      </div>
      
      <div className="text-right font-medium w-16 text-gray-900">
        {dimension.weight.toFixed(0)}%
      </div>
    </div>
  );
};

/**
 * Risk Score Configuration Page
 * Allows users to configure risk score calculations and dimension priorities
 */
export default function RiskScoreConfigurationPage() {
  // Initialize the toast component
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Track whether we've attempted to load fresh data
  const [initialLoadAttempted, setInitialLoadAttempted] = useState(false);
  
  // Get the risk score service for direct data operations
  const riskScoreService = getRiskScoreDataService();
  
  // Log page initialization and refresh data
  useEffect(() => {
    console.log('Direct console log - RiskScoreConfigurationPage mounted');
    riskScoreLogger.log('init', 'Risk score configuration page initialized');
    
    // Force a fresh data load when the component mounts
    const loadFreshData = async () => {
      try {
        riskScoreLogger.log('init', 'Forcing fresh data load on page initialization');
        
        // Invalidate the queries to trigger refetches
        queryClient.invalidateQueries({ queryKey: CACHE_KEYS.PRIORITIES });
        queryClient.invalidateQueries({ queryKey: CACHE_KEYS.CONFIGURATION });
        
        // Also directly fetch fresh data to ensure we have the latest
        await Promise.all([
          riskScoreService.fetchFreshPriorities(),
          riskScoreService.fetchFreshConfiguration()
        ]);
        
        riskScoreLogger.log('init', 'Fresh data load completed successfully');
      } catch (error) {
        riskScoreLogger.error('init', 'Error loading fresh data on initialization', error);
        
        // Show a toast when there's an error loading data
        toast({
          title: 'Error loading data',
          description: 'There was a problem loading your configuration. Please refresh the page.',
          variant: 'destructive',
        });
      } finally {
        setInitialLoadAttempted(true);
      }
    };
    
    loadFreshData();
  }, [toast, queryClient]);
  
  // Use the risk score data hook for state management
  const {
    dimensions,
    thresholds,
    score,
    riskLevel,
    userSetScore,
    isLoading,
    isSaving,
    handleReorder,
    handleValueChange,
    handleSave,
    handleReset,
    handleScoreChange,
    setUserSetScore
  } = useRiskScoreData();
  
  // Function to render toast when dimension reordering changes
  const handleDimensionReorder = (dragIndex: number, hoverIndex: number) => {
    handleReorder(dragIndex, hoverIndex);
    
    // Show toast if first dim moved to last or last to first (major change)
    if ((dragIndex === 0 && hoverIndex === dimensions.length - 1) || 
        (dragIndex === dimensions.length - 1 && hoverIndex === 0)) {
      toast({
        title: 'Dimension priority significantly changed',
        description: 'This will have a major impact on risk score calculation.',
        variant: 'default',
      });
    }
  };
  
  // Function to render dimension rows or skeletons during loading
  const renderDimensionRows = () => {
    if (isLoading) {
      return Array(6).fill(0).map((_, i) => (
        <DimensionRowSkeleton key={i} index={i} />
      ));
    }
    
    return dimensions.map((dim, index) => (
      <DimensionRow
        key={dim.id}
        dimension={dim}
        index={index}
        onReorder={handleDimensionReorder}
        onValueChange={handleValueChange}
      />
    ));
  };

  return (
    <>
      <PageHeader 
        title="Risk Score Configuration" 
        description="Configure your organization's risk score calculation parameters."
      />
      
      <PageTemplate>
        <Tabs defaultValue="priority" className="w-full">
          <TabsList>
            <TabsTrigger value="priority">Dimension Priorities</TabsTrigger>
            <TabsTrigger value="comparative">Comparative Analysis</TabsTrigger>
          </TabsList>
          
          <TabsContent value="priority" className="p-0 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left column: Dimension priorities */}
              <div className="col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Dimension Priorities</CardTitle>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="mb-6 bg-blue-50 p-4 rounded">
                      <h3 className="text-blue-800 font-medium mb-2">How Dimension Ranking & Priorities Work</h3>
                      <p className="text-blue-700 text-sm">
                        Drag and drop dimensions to stack rank them by importance. Dimensions at the top have the highest weight in the risk 
                        score calculation, with weight decreasing as you move down the list. The priority weight is automatically calculated 
                        based on the position.
                      </p>
                    </div>
                    
                    <div className="space-y-2 mb-6">
                      <DndProvider backend={HTML5Backend}>
                        {renderDimensionRows()}
                      </DndProvider>
                    </div>
                    
                    <div className="flex justify-between mt-6">
                      <Button variant="outline" onClick={handleReset} disabled={isSaving}>
                        Reset to Defaults
                      </Button>
                      
                      <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? (
                          <>Saving</>
                        ) : (
                          <>Save Configuration</>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Right column: Risk score summary */}
              <div className="col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Risk Score Summary</CardTitle>
                  </CardHeader>
                  
                  <CardContent>
                    {isLoading || !initialLoadAttempted ? (
                      <div className="flex flex-col items-center justify-center">
                        <Skeleton className="h-40 w-40 rounded-full mb-4" />
                        <Skeleton className="h-6 w-32 rounded mb-2" />
                        <Skeleton className="h-4 w-24 rounded mb-6" />
                        
                        <Skeleton className="h-4 w-full rounded mb-2" />
                        <Skeleton className="h-8 w-full rounded mb-6" />
                        
                        <Skeleton className="h-4 w-3/4 rounded mb-4" />
                        <Skeleton className="h-3 w-full rounded mb-2" />
                        <Skeleton className="h-3 w-full rounded mb-2" />
                        <Skeleton className="h-3 w-full rounded mb-2" />
                        <Skeleton className="h-3 w-full rounded mb-2" />
                        <Skeleton className="h-3 w-full rounded mb-2" />
                        <Skeleton className="h-3 w-full rounded" />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <RiskGauge score={score} riskLevel={riskLevel} />
                        
                        <div className="mt-8 w-full">
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">Risk Acceptance Level</span>
                            <span className="font-medium text-blue-800">{score}</span>
                          </div>
                          
                          <div className="flex justify-between mb-2">
                            <span className="text-xs">Low</span>
                            <span className="text-xs">Medium</span>
                            <span className="text-xs">High</span>
                          </div>
                          
                          <Slider
                            key={`risk-slider-${score}`} // Add key to force re-render when score changes
                            defaultValue={[score]}
                            min={0}
                            max={100}
                            step={1}
                            value={[score]}
                            onValueChange={(value) => {
                              handleScoreChange(value[0]);
                            }}
                            onClick={() => {
                              // When user clicks the slider, set userSetScore to true
                              if (!userSetScore) {
                                setUserSetScore(true);
                                riskScoreLogger.log('user:action', 'User manually adjusted risk acceptance level');
                              }
                            }}
                          />
                        </div>
                        
                        <div className="mt-10 w-full">
                          <h3 className="text-base font-medium mb-2">Weight Distribution</h3>
                          
                          <div className="space-y-2">
                            {dimensions.map((dimension) => (
                              <div key={dimension.id} className="flex items-center justify-between py-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dimension.color }}></div>
                                  <span className="text-sm">{dimension.name}</span>
                                </div>
                                <span className="text-sm font-medium">{dimension.weight.toFixed(0)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="comparative" className="p-0 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Comparative Risk Analysis</CardTitle>
                <CardDescription>
                  Compare your organization's risk profile against industry benchmarks and similar organizations.
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {isLoading || !initialLoadAttempted ? (
                  <div className="flex justify-center items-center h-96">
                    <div className="flex flex-col items-center">
                      <Skeleton className="h-64 w-64 rounded-full mb-6" />
                      <Skeleton className="h-4 w-3/4 rounded mb-2" />
                      <Skeleton className="h-4 w-1/2 rounded" />
                    </div>
                  </div>
                ) : (
                  <ComparativeVisualization 
                    dimensions={dimensions} 
                    globalScore={score} 
                    riskLevel={riskLevel} 
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageTemplate>
    </>
  );
}