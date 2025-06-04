import { useEffect, useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { DragSourceMonitor, DropTargetMonitor } from 'react-dnd';
import { useQueryClient } from '@tanstack/react-query';
import { 
  AlertTriangle,
  BarChart2, 
  Database,
  DollarSign,
  Eye,
  Gauge as GaugeIcon,
  GripVertical, 
  Info, 
  Shield,
  Users
} from 'lucide-react';
import { getRiskScoreDataService, CACHE_KEYS } from '@/lib/risk-score-data-service';
import { TutorialManager } from '@/components/tutorial/TutorialManager';

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

// Skeleton component for dimension rows during loading state with updated neumorphic design
const DimensionRowSkeleton = ({ index = 0 }: { index?: number }) => {
  // Vary the width and intensity based on priority
  const nameWidth = `${80 - index * 7}%`;
  const descWidth = `${90 - index * 5}%`;
  
  // Calculate weight percentage based on index (higher priority = higher percentage)
  const weight = Math.round(40 - index * 5);
  
  return (
    <div 
      className="flex items-center p-4 mb-3 animate-pulse rounded-lg relative"
      style={{ 
        animationDelay: `${index * 0.1}s`,
        backgroundColor: 'white',
        borderRadius: '10px',
        border: '1px solid #f0f0f0',
        boxShadow: '4px 4px 10px rgba(0,0,0,0.03), -4px -4px 10px rgba(255,255,255,0.7)',
        position: 'relative',
      }}
    >
      {/* Left border indicator */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg opacity-70"
        style={{
          background: 'linear-gradient(to bottom, #64748b, #94a3b8)',
        }}
      ></div>
      
      {/* Drag handle skeleton */}
      <div className="flex flex-col items-center ml-2 mr-3">
        <div className="h-6 w-6 bg-gray-300 rounded"></div>
        <div className="h-2 w-8 bg-gray-300 rounded mt-1"></div>
      </div>
      
      {/* Dimension icon skeleton with gradient */}
      <div 
        className="w-10 h-10 rounded mr-4 flex-shrink-0"
        style={{ 
          background: 'linear-gradient(to bottom, #334155, #475569)',
          borderRadius: '8px',
          boxShadow: '2px 2px 5px rgba(0,0,0,0.05), -1px -1px 3px rgba(255,255,255,0.5)'
        }}
      ></div>
      
      <div className="flex-1">
        <div className="flex items-center mb-2">
          {/* Name skeleton */}
          <div className="h-4 bg-gray-300 rounded" style={{ width: nameWidth }}></div>
        </div>
        
        {/* Description skeleton */}
        <div className="h-3 bg-gray-200 rounded" style={{ width: descWidth }}></div>
      </div>
      
      <div className="flex flex-col items-end justify-center">
        {/* Priority badge skeleton */}
        <div className="h-4 w-16 bg-gray-200 rounded"></div>
      </div>
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
  // onValueChange prop removed as dimension sliders are being removed
}

/**
 * Draggable and droppable dimension row component
 * Allows reordering of risk dimensions through drag and drop
 */
const DimensionRow: React.FC<DimensionRowProps> = ({ dimension, index, onReorder }) => {
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

  // Render dimension row matching the latest design from screenshot with neumorphic styling
  return (
    <div 
      ref={ref}
      className={`flex items-center p-4 mb-3 transition-all duration-200 
      ${isDragging ? 'opacity-80 scale-[0.98] shadow-inner' : 'opacity-100 hover:shadow-md'}`}
      style={{ 
        backgroundColor: 'white',
        borderRadius: '10px',
        border: '1px solid #f0f0f0',
        boxShadow: isDragging 
          ? 'inset 2px 2px 5px rgba(0,0,0,0.05), inset -2px -2px 5px rgba(255,255,255,0.8)' 
          : '4px 4px 10px rgba(0,0,0,0.03), -4px -4px 10px rgba(255,255,255,0.7)',
        position: 'relative',
      }}
    >
      {/* Left border line indicating draggable */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg opacity-70"
        style={{
          background: 'linear-gradient(to bottom, #64748b, #94a3b8)'
        }}
      ></div>
      
      {/* Drag handle on the left with more pronounced visual */}
      <div className="cursor-move flex flex-col items-center justify-center ml-2 mr-3">
        <GripVertical className="h-6 w-6 text-gray-500 hover:text-gray-700 transition-colors duration-150" />
        <span className="text-[9px] font-medium text-gray-500 mt-1">DRAG</span>
      </div>
      
      {/* Icon with blue to gray gradient */}
      <div 
        className="w-10 h-10 rounded mr-4 flex-shrink-0 flex items-center justify-center" 
        style={{ 
          background: 'linear-gradient(to bottom, #1a365d, #2d3748)',
          borderRadius: '8px',
          boxShadow: '2px 2px 5px rgba(0,0,0,0.1), -1px -1px 3px rgba(255,255,255,0.7)'
        }}
      >
        {/* Dimension icon based on dimension type */}
        {dimension.id === 'financial_stability' && <DollarSign className="h-5 w-5 text-white" />}
        {dimension.id === 'public_sentiment' && <Users className="h-5 w-5 text-white" />}
        {dimension.id === 'dark_web_data' && <Eye className="h-5 w-5 text-white" />}
        {dimension.id === 'cyber_security' && <Shield className="h-5 w-5 text-white" />}
        {dimension.id === 'potential_liability' && <AlertTriangle className="h-5 w-5 text-white" />}
        {dimension.id === 'data_access_scope' && <Database className="h-5 w-5 text-white" />}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center mb-1">
          <h4 className="font-medium text-gray-900">
            {dimension.name}
          </h4>
        </div>
        <p className="text-sm text-gray-600">{dimension.description}</p>
      </div>
      
      <div className="flex flex-col items-end justify-center">
        <div className="px-2 py-0.5 bg-gray-100 text-xs rounded text-gray-700 font-medium">
          Priority {index + 1}
        </div>
      </div>
    </div>
  );
};

/**
 * Risk Score Configuration Page
 * Allows users to configure risk score calculations and dimension priorities
 */
export default function RiskScoreConfigurationPage() {
  // Create a reference to the HTML5Backend
  const dndBackend = HTML5Backend;
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
    hasDefaultsDiff,  // Flag that indicates if current settings differ from defaults
    hasSavedDiff,     // Flag that indicates if current settings differ from saved values
    handleReorder,
    // handleValueChange removed as dimension sliders are being removed
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
      />
    ));
  };

  return (
    <DndProvider backend={dndBackend}>
      <PageHeader 
        title="Risk Score Configuration" 
        description="Configure your organization's risk score calculation parameters."
      />
      
      <PageTemplate>
        {/* Add the tutorial manager for risk-score-configuration */}
        <TutorialManager tabName="risk-score-configuration" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column: Risk score summary - Always visible */}
          <div className="col-span-1">
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
              <CardHeader className="border-b bg-background/40">
                <CardTitle className="text-lg flex items-center">
                  <GaugeIcon className="h-5 w-5 mr-2 text-muted-foreground" />
                  Risk Score Summary
                </CardTitle>
              </CardHeader>
              
              <CardContent className="pt-6">
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
                        <span className="text-xs text-muted-foreground">Low</span>
                        <span className="text-xs text-muted-foreground">Medium</span>
                        <span className="text-xs text-muted-foreground">High</span>
                      </div>
                      
                      <Slider
                        defaultValue={[score]}
                        min={0}
                        max={100}
                        step={1}
                        value={[score]}
                        onValueChange={(value) => {
                          // When slider is being dragged, set userSetScore to true
                          if (!userSetScore) {
                            setUserSetScore(true);
                            riskScoreLogger.log('user:action', 'User manually adjusted risk acceptance level');
                          }
                          handleScoreChange(value[0]);
                        }}
                        className="transition-all duration-150 ease-in-out"
                      />
                      
                      {/* Risk level indicators using blue gradient */}
                      <div className="flex justify-between mt-2">
                        <div className="w-1/3 text-center">
                          <div className="h-1.5 bg-blue-200 rounded"></div>
                          <span className="text-[10px] text-muted-foreground">0-30 (Low)</span>
                        </div>
                        <div className="w-1/3 text-center">
                          <div className="h-1.5 bg-blue-400 rounded"></div>
                          <span className="text-[10px] text-muted-foreground">31-70 (Medium)</span>
                        </div>
                        <div className="w-1/3 text-center">
                          <div className="h-1.5 bg-blue-600 rounded"></div>
                          <span className="text-[10px] text-muted-foreground">71-100 (High)</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex justify-between w-full mt-8 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        onClick={handleReset} 
                        disabled={isSaving || !hasDefaultsDiff} 
                        size="sm"
                        className={!hasDefaultsDiff ? "opacity-50" : "hover:bg-slate-100 transition-colors duration-200"}
                      >
                        Reset to Defaults
                      </Button>
                      
                      <Button 
                        onClick={handleSave} 
                        disabled={isSaving || !hasSavedDiff} 
                        size="sm"
                        className={!hasSavedDiff ? "opacity-50" : "shadow-sm hover:shadow transition-all duration-200"}
                      >
                        {isSaving ? (
                          <>Saving...</>
                        ) : (
                          <>Save Configuration</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Right column: Tabs for Dimension Priorities and Comparative Analysis */}
          <div className="col-span-2">
            <Tabs defaultValue="priority" className="w-full">
              <TabsList className="mb-4 w-full bg-background border-b p-0 h-auto">
                <TabsTrigger value="priority" className="flex-1 rounded-none py-3 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                  Dimension Priorities
                </TabsTrigger>
                <TabsTrigger value="comparative" className="flex-1 rounded-none py-3 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                  Comparative Analysis
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="priority" className="p-0 mt-0">
                <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
                  <CardHeader className="border-b bg-background/40">
                    <CardTitle className="text-lg flex items-center">
                      <Shield className="h-5 w-5 mr-2 text-muted-foreground" />
                      Dimension Priorities
                    </CardTitle>
                    <CardDescription>
                      Configure the relative importance of each risk dimension
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-6">
                    <div className="mb-6 bg-blue-50 p-4 rounded-md border border-blue-100">
                      <h3 className="text-blue-800 font-medium mb-2 flex items-center">
                        <Info className="h-4 w-4 mr-1.5" />
                        How Dimension Ranking & Priorities Work
                      </h3>
                      <p className="text-blue-700 text-sm">
                        Drag and drop dimensions to stack rank them by importance. Dimensions at the top have the highest weight in the risk 
                        score calculation, with weight decreasing as you move down the list. The priority weight is automatically calculated 
                        based on the position.
                      </p>
                    </div>
                    
                    <div className="space-y-2 mb-6">
                      {/* Dimensions list with animation */}
                      <div className="animate-in slide-in-from-top-4 duration-500">
                        {renderDimensionRows()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="comparative" className="p-0 mt-0">
                <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
                  <CardHeader className="border-b bg-background/40">
                    <CardTitle className="text-lg flex items-center">
                      <BarChart2 className="h-5 w-5 mr-2 text-muted-foreground" />
                      Comparative Risk Analysis
                    </CardTitle>
                    <CardDescription>
                      Compare your organization's risk profile against industry benchmarks and similar organizations
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-6">
                    {isLoading || !initialLoadAttempted ? (
                      <div className="flex justify-center items-center h-96">
                        <div className="flex flex-col items-center">
                          <Skeleton className="h-64 w-64 rounded-full mb-6" />
                          <Skeleton className="h-4 w-3/4 rounded mb-2" />
                          <Skeleton className="h-4 w-1/2 rounded" />
                        </div>
                      </div>
                    ) : (
                      <div className="animate-in fade-in-50 slide-in-from-bottom-8 duration-500">
                        <ComparativeVisualization 
                          dimensions={dimensions} 
                          globalScore={score} 
                          riskLevel={riskLevel} 
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </PageTemplate>
    </DndProvider>
  );
}