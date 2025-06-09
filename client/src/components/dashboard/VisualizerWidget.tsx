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
 * - Accreditation Status (All personas)
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
  import('@/components/insights/RiskMonitoringInsight').then(module => ({ 
    default: module.RiskMonitoringInsight 
  }))
);
const NetworkScatterPlotInsight = React.lazy(() => 
  import('@/components/insights/NetworkScatterPlotInsight').then(module => ({ 
    default: module.NetworkScatterPlotInsight 
  }))
);
const NetworkTreemapInsight = React.lazy(() => 
  import('@/components/insights/NetworkTreemapInsight').then(module => ({ 
    default: module.NetworkTreemapInsight 
  }))
);
const NetworkChordInsight = React.lazy(() => 
  import('@/components/insights/NetworkChordInsight').then(module => ({ 
    default: module.NetworkChordInsight 
  }))
);
const NetworkForceDirectedInsight = React.lazy(() => 
  import('@/components/insights/NetworkForceDirectedInsight').then(module => ({ 
    default: module.NetworkForceDirectedInsight 
  }))
);
const AccreditationDotMatrix = React.lazy(() => 
  import('@/components/insights/AccreditationDotMatrix').then(module => ({ 
    default: module.AccreditationDotMatrix 
  }))
);
const RiskRadarChart = React.lazy(() => 
  import('@/components/insights/RiskRadarChart').then(module => ({ 
    default: module.RiskRadarChart 
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
    value: 'accreditation_status',
    label: 'Accreditation Status',
    category: 'Compliance',
    personas: ['Invela', 'Bank', 'FinTech']
  },
  {
    value: 'consent_activity',
    label: 'Consent Activity',
    category: 'Activity',
    personas: ['Invela', 'Bank', 'FinTech']
  },
  {
    value: 'network_force_directed',
    label: 'Force-Directed Network',
    category: 'Network',
    personas: ['Invela', 'Bank']
  },
  {
    value: 'network_chord',
    label: 'Network Chord Diagram',
    category: 'Network',
    personas: ['Invela', 'Bank']
  },
  {
    value: 'network_scatter_plot',
    label: 'Network Scatter Plot',
    category: 'Network',
    personas: ['Invela', 'Bank']
  },
  {
    value: 'network_treemap',
    label: 'Network Treemap',
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
  // Get current company data for persona-based filtering
  const { data: currentCompany } = useQuery<any>({
    queryKey: ['/api/companies/current'],
  });

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
    }
  }, [currentCompany]);

  // Filter visualizations based on company persona
  const availableVisualizations = React.useMemo(() => {
    if (!currentCompany) return VISUALIZATION_OPTIONS;
    
    const companyCategory = currentCompany.category as 'Invela' | 'Bank' | 'FinTech';
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

  // Handle visualization selection change
  const handleVisualizationChange = (value: string) => {
    console.log('[VisualizerWidget] Changing visualization:', value);
    setSelectedVisualization(value);
  };

  // Render the selected insight component
  const renderSelectedInsight = () => {
    const insightProps = {
      className: 'bg-transparent shadow-none border-none w-full h-full',
      companyId: currentCompany?.id
    };

    switch (selectedVisualization) {
      case 'system_overview':
        return (
          <InsightErrorBoundary insightName="System Overview">
            <Suspense fallback={<InsightLoadingSkeleton />}>
              <SystemOverviewInsight {...insightProps} />
            </Suspense>
          </InsightErrorBoundary>
        );
      
      case 'consent_activity':
        return (
          <InsightErrorBoundary insightName="Consent Activity">
            <Suspense fallback={<InsightLoadingSkeleton />}>
              <ConsentActivityInsight {...insightProps} />
            </Suspense>
          </InsightErrorBoundary>
        );
      
      case 'risk_monitoring':
        return (
          <InsightErrorBoundary insightName="Risk Monitoring">
            <Suspense fallback={<InsightLoadingSkeleton />}>
              <RiskMonitoringInsight {...insightProps} />
            </Suspense>
          </InsightErrorBoundary>
        );
      
      case 'network_scatter_plot':
        return (
          <InsightErrorBoundary insightName="Network Scatter Plot">
            <Suspense fallback={<InsightLoadingSkeleton />}>
              <NetworkScatterPlotInsight {...insightProps} />
            </Suspense>
          </InsightErrorBoundary>
        );
      
      case 'network_treemap':
        return (
          <InsightErrorBoundary insightName="Network Treemap">
            <Suspense fallback={<InsightLoadingSkeleton />}>
              <NetworkTreemapInsight {...insightProps} />
            </Suspense>
          </InsightErrorBoundary>
        );
      
      case 'network_chord':
        return (
          <InsightErrorBoundary insightName="Network Chord Diagram">
            <Suspense fallback={<InsightLoadingSkeleton />}>
              <NetworkChordInsight {...insightProps} />
            </Suspense>
          </InsightErrorBoundary>
        );
      
      case 'network_force_directed':
        return (
          <InsightErrorBoundary insightName="Force-Directed Network">
            <Suspense fallback={<InsightLoadingSkeleton />}>
              <NetworkForceDirectedInsight {...insightProps} />
            </Suspense>
          </InsightErrorBoundary>
        );
      
      case 'accreditation_status':
        return (
          <InsightErrorBoundary insightName="Accreditation Status">
            <Suspense fallback={<InsightLoadingSkeleton />}>
              <AccreditationDotMatrix {...insightProps} />
            </Suspense>
          </InsightErrorBoundary>
        );
      
      case 'risk_radar':
        return (
          <InsightErrorBoundary insightName="Risk Radar">
            <Suspense fallback={<InsightLoadingSkeleton />}>
              <RiskRadarChart 
                companyId={currentCompany?.id || 0}
                showDropdown={false}
                className="shadow-none border-none w-full h-full"
              />
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
        headerChildren={
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
        }
      >
        <div className="h-[500px] w-full overflow-hidden">
          {renderSelectedInsight()}
        </div>
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