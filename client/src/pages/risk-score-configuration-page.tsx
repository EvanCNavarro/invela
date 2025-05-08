import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { PageTemplate } from "@/components/ui/page-template";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart2, Info, BarChart, Shield, Globe2, FileCode, MessageSquare, AlertTriangle, Box, Database, GripVertical, Gauge, Check } from "lucide-react";
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
import { checkAuthentication, directUpdateRiskPriorities } from "@/lib/direct-risk-update";
import riskScoreLogger from "@/lib/risk-score-logger";
import wsManager from "@/lib/websocket-connector";
// Import from 'react-dnd' and 'react-dnd-html5-backend' more carefully
import { DndProvider } from 'react-dnd';
import type { DragSourceMonitor, DropTargetMonitor } from 'react-dnd';
import { useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const dimensionIcons: Record<string, React.ReactNode> = {
  cyber_security: <FileCode className="h-5 w-5" />,
  financial_stability: <BarChart className="h-5 w-5" />,
  dark_web_data: <Globe2 className="h-5 w-5" />,
  public_sentiment: <MessageSquare className="h-5 w-5" />,
  potential_liability: <AlertTriangle className="h-5 w-5" />,
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
  
  // Calculate grayscale colors based on index and position
  const getGradientColors = () => {
    // Create a grayscale that transitions from dark to light
    // For a more business-appropriate muted palette
    const topColor = '#2c3e50'; // Darker slate blue-gray for top items
    const middleColor = '#34495e'; // Mid-level slate for middle items
    const bottomColor = '#7f8c8d'; // Lighter gray for bottom items
    
    // Since we're in the component level, we use a fixed number for consistency
    const totalItems = 6; // Fixed number of dimensions
    
    // Interpolate between grayscale colors based on position
    const primaryColor = index === 0 ? topColor : 
                         index === 1 ? '#3d566e' : 
                         index === 2 ? '#445a70' : 
                         index === 3 ? '#516577' : 
                         index === 4 ? '#5d6e7e' : 
                         middleColor;
    
    // Accent color (slightly different shade for secondary elements)
    const secondaryColor = '#95a5a6';
    
    return { primaryColor, secondaryColor };
  };
  
  const { primaryColor, secondaryColor } = getGradientColors();

  return (
    <div 
      ref={ref}
      className="flex items-center gap-4 p-6 bg-gradient-to-r from-blue-50 to-blue-50/60 border border-blue-100 rounded-2xl shadow-sm mb-4 relative transition-all hover:shadow-md group"
      style={{ 
        opacity,
        borderRadius: '16px' // More pronounced squircle effect
      }}
    >
      {/* Icon container with squircle shape */}
      <div 
        className="h-14 w-14 flex items-center justify-center text-white flex-shrink-0"
        style={{ 
          backgroundColor: primaryColor,
          borderRadius: '12px',
          boxShadow: '0 2px 6px rgba(66, 133, 244, 0.2)'
        }}
      >
        {dimensionIcons[dimension.id] || <Shield className="h-7 w-7" />}
      </div>
      
      {/* Content with improved hierarchy */}
      <div className="flex-grow">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg text-gray-900">{dimension.name}</h3>
          <div 
            className="ml-1 text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center"
            style={{ 
              backgroundColor: `${primaryColor}20`, // 20% opacity of primary color
              color: primaryColor 
            }}
          >
            <span className="flex-shrink-0">Priority {index + 1}</span>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-1">{dimension.description}</p>
      </div>
      
      {/* Weight indicator with improved contrast for accessibility */}
      <div className="ml-auto flex flex-col items-end justify-center">
        <div 
          className="text-3xl font-bold" 
          style={{ color: primaryColor }}
          aria-label={`Weight ${Math.round(dimension.weight)} percent`}
        >
          {Math.round(dimension.weight)}%
        </div>
        <div className="text-xs font-medium" style={{ color: `${primaryColor}CC` }}>
          Priority Weight
        </div>
      </div>
      
      {/* Grip handle for dragging - with improved accessibility */}
      <div
        className="flex-shrink-0 cursor-move ml-2 p-2 rounded-full hover:bg-blue-100/50 transition-colors"
        aria-label="Drag to reorder"
        title="Drag to reorder priority"
      >
        <GripVertical className="h-5 w-5" style={{ color: primaryColor }} />
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
  
  // Reference to track original dimensions loaded from the server
  const originalDimensionsRef = useRef<RiskDimension[] | null>(null);
  
  // Query to fetch the risk priorities (for dimension ranking)
  const { data: prioritiesData, isLoading: isLoadingPriorities, refetch: refetchPriorities } = useQuery({
    queryKey: ['/api/risk-score/priorities'],
    staleTime: 0, // Always consider data stale to force refetch
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Always refetch when component mounts
    onSuccess: (data) => {
      // Force a console.log to check if logger is working
      console.log('DEBUG-DIRECT: Successfully fetched priorities data', data);
      
      // Try direct log call
      riskScoreLogger.log('test', 'Testing if logger is working');
      riskScoreLogger.logFetchSuccess(data);
      
      if (data && data.dimensions) {
        // If we have priorities data, use it instead of the general configuration
        const newDimensions = data.dimensions;
        
        // Store original dimensions for comparison
        if (!originalDimensionsRef.current) {
          originalDimensionsRef.current = JSON.parse(JSON.stringify(newDimensions));
          riskScoreLogger.logInitialLoad(data);
        }
        
        // If dimensions have changed on the server side, log and update
        if (dimensions && dimensions.length > 0 && originalDimensionsRef.current) {
          riskScoreLogger.compareDimensions(
            'fetch', 
            'current', dimensions, 
            'server', newDimensions
          );
        }
        
        setDimensions(newDimensions);
      } else {
        riskScoreLogger.error('fetch', 'No dimensions in priorities data');
      }
    },
    onError: (error) => {
      riskScoreLogger.logFetchError(error);
      // Don't show error toast as we'll fall back to config data or defaults
    }
  });
  
  // Mutation to save the risk score configuration
  const saveMutation = useMutation({
    mutationFn: async (configuration: RiskScoreConfiguration) => {
      // Log the save attempt
      riskScoreLogger.logSaveAttempt({
        dimensions: configuration.dimensions,
        lastUpdated: new Date().toISOString()
      });
      
      try {
        // First check authentication status
        const authStatus = await checkAuthentication();
        riskScoreLogger.log('save', 'Authentication status for configuration save:', authStatus);
        
        const response = await apiRequest('POST', '/api/risk-score/configuration', configuration);
        
        riskScoreLogger.logSaveSuccess({
          dimensions: configuration.dimensions,
          lastUpdated: new Date().toISOString()
        }, response);
        
        return response;
      } catch (error) {
        riskScoreLogger.logSaveError({
          dimensions: configuration.dimensions,
          lastUpdated: new Date().toISOString()
        }, error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Configuration saved',
        description: 'Your risk score configuration has been saved successfully.',
        variant: 'success',
      });
      // Invalidate the query to refetch the configuration
      riskScoreLogger.log('persist', 'Invalidating configuration query to refetch');
      queryClient.invalidateQueries({ queryKey: ['/api/risk-score/configuration'] });
    },
    onError: (error) => {
      console.error('Error saving risk score configuration:', error);
      toast({
        title: 'Failed to save configuration',
        description: 'Please try again later.',
        variant: 'destructive',
      });
      
      // Try direct update as fallback
      riskScoreLogger.log('persist', 'Will attempt direct update as fallback in future versions');
    }
  });
  
  // Mutation to save risk priorities
  const savePrioritiesMutation = useMutation({
    mutationFn: async (priorities: RiskPriorities) => {
      // Log the save attempt with our specialized logger
      riskScoreLogger.logSaveAttempt(priorities);
      
      // If we have original dimensions, log what's changed
      if (originalDimensionsRef.current) {
        riskScoreLogger.logDimensionsChanged(
          originalDimensionsRef.current,
          priorities.dimensions,
          'save-attempt'
        );
      }
      
      try {
        // First check authentication status
        const authStatus = await checkAuthentication();
        riskScoreLogger.log('save', 'Authentication status:', authStatus);
        
        if (!authStatus.riskEndpointAuthenticated) {
          riskScoreLogger.log('save', 'Using direct update method as a fallback due to authentication issues');
          // If we're not authenticated for the risk endpoint, use the direct method
          const directResult = await directUpdateRiskPriorities(priorities);
          
          if (!directResult.success) {
            const errorMsg = 'Direct update failed: ' + directResult.error;
            riskScoreLogger.error('save', errorMsg);
            throw new Error(errorMsg);
          }
          
          riskScoreLogger.logDirectUpdate(priorities);
          return directResult.data;
        }
        
        // Try the normal API endpoint
        riskScoreLogger.log('save', 'Using standard API endpoint');
        return await apiRequest('POST', '/api/risk-score/priorities', priorities);
      } catch (error) {
        riskScoreLogger.error('save', 'Error in initial save attempt:', error);
        
        // Last resort fallback - try direct update if we get here
        riskScoreLogger.log('save', 'Trying direct update as final fallback');
        try {
          const directResult = await directUpdateRiskPriorities(priorities);
          
          if (!directResult.success) {
            riskScoreLogger.error('save', 'Final fallback direct update also failed:', directResult.error);
            throw error; // Rethrow the original error if direct update also fails
          }
          
          riskScoreLogger.logDirectUpdate(priorities);
          return directResult.data;
        } catch (directError) {
          riskScoreLogger.error('save', 'All save attempts failed:', {
            originalError: error,
            directError
          });
          throw error; // Rethrow the original error
        }
      }
    },
    onSuccess: (data) => {
      riskScoreLogger.logSaveSuccess({
        dimensions,
        lastUpdated: new Date().toISOString()
      }, data);
      
      toast({
        title: 'Priorities saved',
        description: 'Your risk dimension priorities have been saved successfully.',
        variant: 'success',
      });
      
      // Force a refetch of the priorities data to verify changes were applied
      riskScoreLogger.log('persist', 'Force refetching priorities query to verify changes');
      
      // Store what we just saved for comparison
      const savedDimensions = JSON.parse(JSON.stringify(dimensions));
      
      refetchPriorities().then(result => {
        if (result.data && result.data.dimensions) {
          // Compare what we just saved with what came back from the server
          riskScoreLogger.compareDimensions(
            'persist',
            'saved',
            savedDimensions,
            'server',
            result.data.dimensions
          );
          
          // If they don't match, update the local dimensions to match server
          if (JSON.stringify(result.data.dimensions) !== JSON.stringify(dimensions)) {
            riskScoreLogger.log('persist', 'Warning: Refetched data does not match local state, updating local state');
            setDimensions(result.data.dimensions);
            
            // Update our original dimensions reference to this freshly fetched data
            originalDimensionsRef.current = JSON.parse(JSON.stringify(result.data.dimensions));
          } else {
            riskScoreLogger.log('persist', 'Verification successful - server data matches what we saved');
          }
        } else {
          riskScoreLogger.error('persist', 'Refetch returned no dimensions data');
        }
      }).catch(err => {
        riskScoreLogger.error('persist', 'Error refetching priorities after save:', err);
      });
    },
    onError: (error) => {
      riskScoreLogger.logSaveError({
        dimensions,
        lastUpdated: new Date().toISOString()
      }, error);
      
      toast({
        title: 'Failed to save priorities',
        description: 'Please try again later. If this persists, please contact support.',
        variant: 'destructive',
      });
    }
  });
  
  // Add an initialization effect to ensure logger is working
  useEffect(() => {
    console.log('Direct console log - RiskScoreConfigurationPage mounted');
    console.log('Logger instance:', riskScoreLogger);
    
    // Direct logger call
    riskScoreLogger.log('init', 'Risk score configuration page initialized');
    // Debug overlay disabled
  }, []);
  
  // Set up WebSocket event handlers for real-time updates
  useEffect(() => {
    // Handler for risk score updates
    const handleRiskScoreUpdate = (data: any) => {
      riskScoreLogger.log('websocket', 'Received risk score update:', data);
      if (data && data.newScore !== undefined) {
        setScore(data.newScore);
        setRiskLevel(determineRiskLevel(data.newScore));
        toast({
          title: 'Risk Score Updated',
          description: `New risk score: ${data.newScore}`,
          variant: 'default',
        });
      }
    };
    
    // Handler for risk priorities updates
    const handleRiskPrioritiesUpdate = (data: any) => {
      riskScoreLogger.log('websocket', 'Received risk priorities update:', data);
      
      // Add extra logging to debug the payload structure
      console.log('[DEBUG] Risk priorities WebSocket data:', data);
      console.log('[DEBUG] data.priorities exists:', data && data.priorities ? 'yes' : 'no');
      if (data && data.priorities) {
        console.log('[DEBUG] data.priorities.dimensions exists:', data.priorities.dimensions ? 'yes' : 'no');
      }
      
      // Support both formats: direct dimensions array or nested in priorities
      if (data && data.priorities && data.priorities.dimensions) {
        // Format: { priorities: { dimensions: [...] } }
        setDimensions(data.priorities.dimensions);
        
        // Update originalDimensionsRef for comparison
        originalDimensionsRef.current = JSON.parse(JSON.stringify(data.priorities.dimensions));
        
        toast({
          title: 'Risk Priorities Updated',
          description: 'Risk dimension priorities have been updated from another session',
          variant: 'default',
        });
        
        // Update our query client cache to match the new data
        queryClient.setQueryData(['/api/risk-score/priorities'], {
          dimensions: data.priorities.dimensions,
          lastUpdated: data.updatedAt || new Date().toISOString()
        });
        
        // Force a refetch to ensure we have the latest data
        refetchPriorities();
      } else if (data && data.dimensions) {
        // Alternative format: { dimensions: [...] }
        setDimensions(data.dimensions);
        
        // Update originalDimensionsRef for comparison
        originalDimensionsRef.current = JSON.parse(JSON.stringify(data.dimensions));
        
        toast({
          title: 'Risk Priorities Updated',
          description: 'Risk dimension priorities have been updated from another session',
          variant: 'default',
        });
        
        // Update our query client cache to match the new data
        queryClient.setQueryData(['/api/risk-score/priorities'], {
          dimensions: data.dimensions,
          lastUpdated: data.updatedAt || new Date().toISOString()
        });
        
        // Force a refetch to ensure we have the latest data
        refetchPriorities();
      }
    };
    
    // Register WebSocket event handlers
    const riskScoreUnsubscribe = wsManager.on('risk_score_update', handleRiskScoreUpdate);
    const riskPrioritiesUnsubscribe = wsManager.on('risk_priorities_update', handleRiskPrioritiesUpdate);
    const riskPriorityUnsubscribe = wsManager.on('risk_priority_update', handleRiskPrioritiesUpdate);
    
    // Cleanup function to remove WebSocket event handlers
    return () => {
      riskScoreUnsubscribe();
      riskPrioritiesUnsubscribe();
      riskPriorityUnsubscribe();
      riskScoreLogger.log('websocket', 'Removed WebSocket event handlers');
    };
  }, [toast, queryClient]); // Dependencies for the effect
  
  // Calculate score and risk level when dimensions change
  useEffect(() => {
    const newScore = calculateRiskScore(dimensions);
    setScore(newScore);
    setRiskLevel(determineRiskLevel(newScore));
  }, [dimensions]);
  
  // Handle dimension reordering (for drag and drop functionality)
  const handleReorder = (dragIndex: number, hoverIndex: number) => {
    // Log the current dimensions before changes
    const originalDims = [...dimensions];
    
    // For the MVP, we'll just implement a simple array reordering
    const newDimensions = [...dimensions];
    const draggedItem = newDimensions[dragIndex];
    
    // Remove the dragged item and insert it at the new position
    newDimensions.splice(dragIndex, 1);
    newDimensions.splice(hoverIndex, 0, draggedItem);
    
    // Recalculate weights based on the new order
    // Top position (index 0) gets highest weight, decreasing as index increases
    const totalWeight = 100;
    const newWeightedDimensions = newDimensions.map((dim, index) => {
      // Simple exponentially decreasing weight distribution - highest at top
      const weight = Math.max(1, Math.round(totalWeight * Math.pow(0.8, index) / newDimensions.length * 2.5 * 10) / 10);
      return { ...dim, weight };
    });
    
    // Normalize weights to sum to 100%
    const weightSum = newWeightedDimensions.reduce((sum, dim) => sum + dim.weight, 0);
    const normalizedDimensions = newWeightedDimensions.map(dim => ({
      ...dim,
      weight: Math.round((dim.weight / weightSum) * 100 * 10) / 10
    }));
    
    // Log the changes
    riskScoreLogger.logDimensionsChanged(originalDims, normalizedDimensions, 'reorder');
    
    setDimensions(normalizedDimensions);
  };
  
  // Handle dimension slider value changes
  const handleValueChange = (id: string, value: number) => {
    setDimensions(prevDimensions => {
      // Create a copy for logging the change
      const oldDimensions = [...prevDimensions];
      
      // Update the dimensions
      const newDimensions = prevDimensions.map(dim => 
        dim.id === id ? { ...dim, value } : dim
      );
      
      // Log the changes
      riskScoreLogger.logDimensionsChanged(oldDimensions, newDimensions, 'value-change');
      
      return newDimensions;
    });
  };
  
  // Handle reset to defaults
  const handleReset = () => {
    // Log the current dimensions before reset
    const currentDimensions = [...dimensions];
    
    // Reset to defaults
    setDimensions(defaultRiskDimensions);
    setThresholds(defaultRiskThresholds);
    
    // Log the reset
    riskScoreLogger.log('change', 'Resetting to default values');
    riskScoreLogger.logDimensionsChanged(currentDimensions, defaultRiskDimensions, 'reset-to-defaults');
    
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
      // Ensure dimensions are properly serialized
      const cleanDimensions = JSON.parse(JSON.stringify(dimensions));
      
      // Create a clean priorities object
      const priorities: RiskPriorities = {
        dimensions: cleanDimensions,
        lastUpdated: new Date().toISOString()
      };
      
      // Log what we're about to save
      riskScoreLogger.log('save', 'Saving dimension priorities');
      console.log('[DEBUG] Saving priorities:', priorities);
      console.log('[DEBUG] Dimensions type:', Array.isArray(priorities.dimensions) ? 'Array' : typeof priorities.dimensions);
      console.log('[DEBUG] First dimension sample:', priorities.dimensions?.[0] ? JSON.stringify(priorities.dimensions[0]) : 'none');
      
      // If we have original dimensions (loaded from server), compare with what we're saving
      if (originalDimensionsRef.current) {
        riskScoreLogger.compareDimensions(
          'save', 
          'original', originalDimensionsRef.current, 
          'current', dimensions
        );
      }
      
      // Add a callback to verify the changes were saved correctly
      const onSuccess = (data: any) => {
        console.log('[DEBUG] Save succeeded, received:', data);
        riskScoreLogger.log('persist', 'Force refetching priorities query to verify changes');
        
        // Force a refetch to make sure we have the latest data
        refetchPriorities().then(result => {
          const retrievedData = result.data;
          console.log('[DEBUG] Refetched data:', retrievedData);
          
          // Compare saved and refetched dimensions
          if (retrievedData && retrievedData.dimensions) {
            // Deep comparison of dimensions
            const retrievedJson = JSON.stringify(retrievedData.dimensions);
            const savedJson = JSON.stringify(priorities.dimensions);
            
            if (retrievedJson !== savedJson) {
              console.log('[DEBUG] Retrieved != Saved:');
              console.log('Retrieved:', retrievedJson);
              console.log('Saved:', savedJson);
              riskScoreLogger.log('persist', 'Warning: Refetched data does not match local state, updating local state');
              
              // Update local state to match what's on the server
              setDimensions(retrievedData.dimensions);
              originalDimensionsRef.current = [...retrievedData.dimensions];
            } else {
              riskScoreLogger.log('persist', 'No differences found between saved and server dimensions');
            }
          }
        });
      };
      
      // Perform the save operation with success callback
      savePrioritiesMutation.mutate(priorities, {
        onSuccess
      });
    } else {
      // Save to general configuration endpoint
      const configuration: RiskScoreConfiguration = {
        dimensions: JSON.parse(JSON.stringify(dimensions)), // Ensure clean serialization
        thresholds,
        score,
        riskLevel
      };
      
      riskScoreLogger.log('save', 'Saving general configuration');
      saveMutation.mutate(configuration);
    }
  };

  return (
    <DashboardLayout>
      <PageTemplate showBreadcrumbs>
        <div className="space-y-6">
          <PageHeader
            title="S&P Data Access Risk Score"
            description="Configure your risk assessment priorities for third parties accessing your data"
            actions={
              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={handleReset}>
                  Reset to Defaults
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={savePrioritiesMutation.isPending || saveMutation.isPending}
                >
                  {savePrioritiesMutation.isPending || saveMutation.isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            }
          />

          {/* Main content area */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Left side - Main configuration area */}
            <div className="md:col-span-3 space-y-6">
              {/* Tabs container */}
              <Card>
                <CardContent>
                  <Tabs 
                    defaultValue="dimension-ranking" 
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full"
                  >
                    <TabsList className="grid grid-cols-2 mb-6">
                      <TabsTrigger value="dimension-ranking">
                        Dimension Priorities
                      </TabsTrigger>
                      <TabsTrigger value="comparative-visualization">
                        Comparative Analysis
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="dimension-ranking" className="space-y-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <div className="flex items-start gap-3">
                          <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <h3 className="font-medium text-base mb-1 text-blue-700">How Dimension Ranking & Priorities Work</h3>
                            <p className="text-sm text-blue-600">
                              Drag and drop dimensions to stack rank them by importance. Dimensions at the top have the highest weight in the risk score calculation, with weight decreasing as you move down the list. The priority weight is automatically calculated based on the position.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Priority scale indicator */}
                      <div className="space-y-1 mb-6">
                        
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
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <div className="flex items-start gap-3">
                          <BarChart2 className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <h3 className="font-medium text-base mb-1 text-blue-700">Compare Your Risk Profile</h3>
                            <p className="text-sm text-blue-600">
                              See how your risk configuration compares to other fintech companies and industry standards. This helps benchmark your risk management approach.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Comparative visualization component */}
                      <ComparativeVisualization dimensions={dimensions} />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
              
              {/* Weight distribution card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <BarChart className="h-5 w-5 mr-2 text-primary" />
                    Dimension Weight Distribution
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    How each dimension contributes to the overall risk score calculation
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    {dimensions.map((dimension, index) => (
                      <li key={dimension.id} className="text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="flex items-center gap-2">
                            <span className="flex-shrink-0 h-5 w-5 text-primary">
                              {dimensionIcons[dimension.id] || <Shield className="h-5 w-5" />}
                            </span>
                            <span>{dimension.name}</span>
                          </span>
                          <span className="font-medium">{dimension.weight}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full" 
                            style={{ 
                              width: `${dimension.weight}%`,
                              backgroundColor: dimension.color || '#ccc'
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{dimension.description}</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
            
            {/* Right side - Summary and visualization */}
            <div className="space-y-6">
              {/* Risk Score Summary Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <Gauge className="h-5 w-5 mr-2 text-primary" />
                    Risk Score Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  {/* Gauge visualization */}
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
                  
                  {/* Top priorities section */}
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
                </CardContent>
              </Card>
              
              {/* DB Integration readiness card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <Database className="h-5 w-5 mr-2 text-primary" />
                    Database Integration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">This section is prepared for future database integration.</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Last Saved</span>
                      <span className="text-sm font-medium">{new Date().toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Modified By</span>
                      <span className="text-sm font-medium">Current User</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Sync Status</span>
                      <span className="text-sm flex items-center gap-1 text-green-600">
                        <Check className="h-3 w-3" /> Synced
                      </span>
                    </div>
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
