/**
 * ========================================
 * Visualizer Widget Component
 * ========================================
 * 
 * Dynamic visualization widget that displays selected insights in dashboard context.
 * Features dropdown selection for all available insights with persona-based filtering
 * and seamless content switching with proper error boundaries and loading states.
 * 
 * Key Features:
 * - Dynamic insight component rendering based on selection
 * - Persona-based insight filtering (FinTech sees limited options)
 * - Consistent widget container styling and interactions
 * - Error boundaries with graceful fallback states
 * - Loading states and debug logging for troubleshooting
 * 
 * Available Insights:
 * - System Overview (Invela only)
 * - Consent Activity (All personas)
 * - Risk Monitoring (Bank/Invela only)
 * - Network Scatter Plot (Bank/Invela only)
 * - Network Treemap (Bank/Invela only)
 * - Network Chord Diagram (Bank/Invela only)
 * - Force-Directed Network (Bank/Invela only)
 * - Risk Radar Chart (All personas)
 * 
 * @module components/dashboard/VisualizerWidget
 * @version 1.0.0
 * @since 2025-06-09
 */

import React, { useState, useEffect, Suspense } from 'react';
import { Widget } from './Widget';
import { BarChart3, AlertCircle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Lazy load insight components for optimal performance
const SystemOverviewInsight = React.lazy(() => 
  import('@/components/insights/SystemOverviewInsight').then(module => ({ 
    default: module.SystemOverviewInsight 
  }))
);
const ConsentActivityInsight = React.lazy(() => 
  import('@/components/insights/ConsentActivityInsight').then(module => ({ 
    default: module.ConsentActivityInsight 
  }))
);
const RiskMonitoringInsight = React.lazy(() => 
  import('@/components/insights/RiskMonitoringInsight')
);
const NetworkScatterPlotInsight = React.lazy(() => 
  import('@/components/insights/NetworkScatterPlotInsight').then(module => ({ 
    default: module.NetworkScatterPlotInsight 
  }))
);
const NetworkTreemapInsight = React.lazy(() => 
  import('@/components/insights/SimpleTreemap')
);
const NetworkChordInsight = React.lazy(() => 
  import('@/components/insights/NetworkChordSimple').then(module => ({ 
    default: module.NetworkChordSimple 
  }))
);
const NetworkForceDirectedInsight = React.lazy(() => 
  import('@/components/insights/NetworkForceDirectedSimple').then(module => ({ 
    default: module.NetworkForceDirectedSimple 
  }))
);

const RiskRadarD3Simple = React.lazy(() => 
  import('@/components/insights/RiskRadarD3Simple').then(module => ({ 
    default: module.RiskRadarD3Simple 
  }))
);

// ========================================
// TYPE DEFINITIONS
// ========================================

interface VisualizerWidgetProps {
  onToggle?: () => void;
  isVisible?: boolean;
  className?: string;
  /** Animation delay for staggered entrance effects */
  animationDelay?: number;
}

/**
 * Available visualization options with display names
 */
interface VisualizationOption {
  value: string;
  label: string;
  category?: string;
  personas: ('Invela' | 'Bank' | 'FinTech')[];
}

/**
 * Complete list of available visualizations with persona restrictions
 */
const VISUALIZATION_OPTIONS: VisualizationOption[] = [

  {
    value: 'consent_activity',
    label: 'Consent Activity',
    category: 'Activity',
    personas: ['Invela', 'Bank', 'FinTech']
  },
  {
    value: 'network_treemap',
    label: 'Network Tree Map',
    category: 'Network',
    personas: ['Invela', 'Bank']
  },
  {
    value: 'risk_monitoring',
    label: 'Risk Monitoring',
    category: 'Risk',
    personas: ['Invela', 'Bank']
  },
  {
    value: 'risk_radar',
    label: 'Risk Radar',
    category: 'Risk',
    personas: ['Invela', 'Bank', 'FinTech']
  },
  {
    value: 'system_overview',
    label: 'System Overview',
    category: 'System',
    personas: ['Invela']
  }
];

// Persona-specific default visualizations
const PERSONA_DEFAULTS = {
  'Invela': 'system_overview',
  'Bank': 'consent_activity',
  'FinTech': 'consent_activity'
};

// ========================================
// ERROR BOUNDARY COMPONENT
// ========================================

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class InsightErrorBoundary extends React.Component<
  { children: React.ReactNode; insightName: string },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; insightName: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[VisualizerWidget] Error in ${this.props.insightName}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-[400px] bg-gray-50 rounded-lg border">
          <div className="text-center text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Unable to load {this.props.insightName}</p>
            <p className="text-sm">Please try selecting a different visualization</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ========================================
// MAIN COMPONENT
// ========================================

export function VisualizerWidget({ 
  onToggle, 
  isVisible = true, 
  className = '',
  animationDelay = 0
}: VisualizerWidgetProps) {
  // ========================================
  // LOADING STATE MANAGEMENT
  // ========================================
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoadingVisualization, setIsLoadingVisualization] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // Get current company data for persona-based filtering
  const { data: currentCompany, isLoading: companyLoading, error: companyError } = useQuery<any>({
    queryKey: ['/api/companies/current'],
    retry: 3,
    retryDelay: 1000
  });

  // Initialize loading state management with progress tracking
  useEffect(() => {
    console.log('[VisualizerWidget] Initializing with animation delay:', animationDelay);
    setLoadingProgress(0);
    
    const initTimer = setTimeout(() => {
      setLoadingProgress(30);
      setIsInitializing(false);
      console.log('[VisualizerWidget] Initialization phase complete');
    }, 300);
    
    return () => clearTimeout(initTimer);
  }, [animationDelay]);

  // Track company data loading progress
  useEffect(() => {
    if (companyLoading) {
      setLoadingProgress(prev => Math.min(prev + 20, 60));
      console.log('[VisualizerWidget] Loading company data...');
    } else if (currentCompany) {
      setLoadingProgress(80);
      console.log('[VisualizerWidget] Company data loaded:', currentCompany.name);
    }
  }, [companyLoading, currentCompany]);

  // Get persona-specific default visualization
  const getDefaultVisualization = (persona: string) => {
    return PERSONA_DEFAULTS[persona as keyof typeof PERSONA_DEFAULTS] || 'consent_activity';
  };

  // State for selected visualization with persona-specific default
  const [selectedVisualization, setSelectedVisualization] = useState<string>(() => {
    return getDefaultVisualization(currentCompany?.category || 'FinTech');
  });

  // Update selected visualization when company data loads
  useEffect(() => {
    if (currentCompany && currentCompany.category) {
      const defaultViz = getDefaultVisualization(currentCompany.category);
      setSelectedVisualization(defaultViz);
      setLoadingProgress(90);
    }
  }, [currentCompany]);

  // Filter visualizations based on company persona
  // Invela admin gets access to ALL visualizations for comprehensive oversight
  const availableVisualizations = React.useMemo(() => {
    if (!currentCompany) return VISUALIZATION_OPTIONS;
    
    const companyCategory = currentCompany.category as 'Invela' | 'Bank' | 'FinTech';
    
    // Invela admin has access to every single insight graph
    if (companyCategory === 'Invela') {
      return VISUALIZATION_OPTIONS;
    }
    
    return VISUALIZATION_OPTIONS.filter(option => 
      option.personas.includes(companyCategory)
    );
  }, [currentCompany]);

  // Debug logging for visualization state
  useEffect(() => {
    console.log('[VisualizerWidget] State update:', {
      selectedVisualization,
      companyCategory: currentCompany?.category,
      availableCount: availableVisualizations.length,
      currentTime: new Date().toISOString()
    });
  }, [selectedVisualization, currentCompany, availableVisualizations]);

  // ========================================
  // GENERIC VISUALIZATION SKELETON
  // ========================================
  
  const renderGenericVisualizationSkeleton = () => (
    <div className="space-y-4 p-4">
      {/* Visualization Controls Skeleton */}
      <div className="flex gap-3">
        <div 
          className="widget-skeleton-shimmer h-10 w-48 rounded-lg"
          style={{ animationDelay: `${animationDelay}ms` }}
        />
        <div 
          className="widget-skeleton-shimmer h-10 w-32 rounded-lg"
          style={{ animationDelay: `${animationDelay + 100}ms` }}
        />
      </div>
      
      {/* Main Visualization Area Skeleton */}
      <div 
        className="widget-skeleton-shimmer h-[400px] rounded-lg relative overflow-hidden"
        style={{ animationDelay: `${animationDelay + 200}ms` }}
      >
        {/* Simulated chart elements */}
        <div className="absolute inset-8 flex items-end justify-between opacity-20">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={`chart-bar-${index}`}
              className="bg-blue-200 rounded-t"
              style={{ 
                width: '8%',
                height: `${20 + (index * 10)}%`,
                animationDelay: `${animationDelay + 400 + (index * 50)}ms`,
                animation: 'pulse 2s ease-in-out infinite'
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Loading Progress Indicator */}
      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading visualization... {loadingProgress}%</span>
      </div>
    </div>
  );

  // ========================================
  // LOADING STATE HANDLERS
  // ========================================

  // Show enhanced loading skeleton during initialization and data loading
  if (isInitializing || companyLoading) {
    console.log('[VisualizerWidget] Rendering loading state - Progress:', loadingProgress);
    return (
      <div 
        className={`widget-entrance-animation ${className}`}
        style={{ animationDelay: `${animationDelay}ms` }}
      >
        <Widget
          title="Visualizer"
          icon={<BarChart3 className="h-5 w-5 text-muted-foreground" />}
          onVisibilityToggle={onToggle}
          isVisible={isVisible}
          loadingState="shimmer"
          isLoading={true}
          animationDelay={animationDelay}
          ariaLabel="Visualizer widget loading"
        >
          {renderGenericVisualizationSkeleton()}
        </Widget>
      </div>
    );
  }

  // Show error state with retry option
  if (companyError) {
    console.error('[VisualizerWidget] Error loading company data:', companyError);
    return (
      <div 
        className={`widget-entrance-animation ${className}`}
        style={{ animationDelay: `${animationDelay}ms` }}
      >
        <Widget
          title="Visualizer"
          icon={<BarChart3 className="h-5 w-5 text-muted-foreground" />}
          onVisibilityToggle={onToggle}
          isVisible={isVisible}
          error="Unable to load visualization data. Please refresh to try again."
          animationDelay={animationDelay}
        >
          <div className="flex items-center justify-center h-[400px]">
            <div className="text-center text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Visualization Unavailable</p>
              <p className="text-sm">Please refresh the page to try again</p>
            </div>
          </div>
        </Widget>
      </div>
    );
  }

  // ========================================
  // VISUALIZATION RENDERING
  // ========================================

  // Handle visualization selection change with loading state
  const handleVisualizationChange = (value: string) => {
    console.log('[VisualizerWidget] Changing visualization:', value);
    setIsLoadingVisualization(true);
    setLoadingProgress(85);
    
    // Brief loading delay for smooth transition
    setTimeout(() => {
      setSelectedVisualization(value);
      setLoadingProgress(100);
      setIsLoadingVisualization(false);
    }, 200);
  };

  // Render the selected insight component
  const renderSelectedInsight = () => {
    // Show generic visualization skeleton during content loading
    if (isLoadingVisualization) {
      return renderGenericVisualizationSkeleton();
    }

    const baseClassName = 'bg-transparent shadow-none border-none w-full h-full';

    switch (selectedVisualization) {
      case 'system_overview':
        return (
          <InsightErrorBoundary insightName="System Overview">
            <Suspense fallback={<InsightLoadingSkeleton />}>
              <SystemOverviewInsight className={baseClassName} />
            </Suspense>
          </InsightErrorBoundary>
        );
      
      case 'consent_activity':
        return (
          <InsightErrorBoundary insightName="Consent Activity">
            <Suspense fallback={<InsightLoadingSkeleton />}>
              <ConsentActivityInsight className={baseClassName} />
            </Suspense>
          </InsightErrorBoundary>
        );
      
      case 'risk_monitoring':
        return (
          <InsightErrorBoundary insightName="Risk Monitoring">
            <Suspense fallback={<InsightLoadingSkeleton />}>
              <RiskMonitoringInsight className={baseClassName} />
            </Suspense>
          </InsightErrorBoundary>
        );
      
      case 'network_scatter_plot':
        return (
          <InsightErrorBoundary insightName="Network Scatter Plot">
            <Suspense fallback={<InsightLoadingSkeleton />}>
              <NetworkScatterPlotInsight className={baseClassName} />
            </Suspense>
          </InsightErrorBoundary>
        );
      
      case 'network_treemap':
        return (
          <InsightErrorBoundary insightName="Network Treemap">
            <Suspense fallback={<InsightLoadingSkeleton />}>
              <NetworkTreemapInsight />
            </Suspense>
          </InsightErrorBoundary>
        );
      
      case 'network_chord':
        return (
          <InsightErrorBoundary insightName="Network Chord Diagram">
            <Suspense fallback={<InsightLoadingSkeleton />}>
              <NetworkChordInsight className={baseClassName} />
            </Suspense>
          </InsightErrorBoundary>
        );
      
      case 'network_force_directed':
        return (
          <InsightErrorBoundary insightName="Force-Directed Network">
            <Suspense fallback={<InsightLoadingSkeleton />}>
              <NetworkForceDirectedInsight className={baseClassName} />
            </Suspense>
          </InsightErrorBoundary>
        );
      
      
      case 'risk_radar':
        return (
          <InsightErrorBoundary insightName="Risk Radar">
            <Suspense fallback={<InsightLoadingSkeleton />}>
              <RiskRadarD3Simple className={baseClassName} />
            </Suspense>
          </InsightErrorBoundary>
        );
      
      default:
        return (
          <div className="flex items-center justify-center h-[400px]">
            <div className="text-center text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a visualization</p>
              <p className="text-sm">Choose from the dropdown above to display insights</p>
            </div>
          </div>
        );
    }
  };

  // Determine overall loading state for widget-level skeleton
  const isWidgetLoading = isInitializing || companyLoading || !currentCompany || availableVisualizations.length === 0;

  return (
    <div 
      className={`widget-entrance-animation ${className}`}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <Widget
        title="Visualizer"
        icon={<BarChart3 className="h-5 w-5 text-muted-foreground" />}
        onVisibilityToggle={onToggle}
        isVisible={isVisible}
        isLoading={isWidgetLoading}
        loadingState="shimmer"
        headerChildren={
          !isWidgetLoading ? (
            <div className="flex items-center gap-2">
              <Select
                value={selectedVisualization}
                onValueChange={handleVisualizationChange}
              >
                <SelectTrigger className="w-[240px] font-semibold">
                  <SelectValue placeholder="Select visualization" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  {availableVisualizations.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="bg-white hover:bg-gray-50">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : undefined
        }
      >
        {!isWidgetLoading && (
          <div className="h-[500px] w-full overflow-hidden">
            {renderSelectedInsight()}
          </div>
        )}
      </Widget>
    </div>
  );
}

// ========================================
// LOADING SKELETON COMPONENT
// ========================================

function InsightLoadingSkeleton() {
  return (
    <div className="flex items-center justify-center h-[400px]">
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading visualization...</span>
      </div>
    </div>
  );
}

export default VisualizerWidget;