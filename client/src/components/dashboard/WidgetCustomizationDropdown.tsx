/**
 * ========================================
 * Widget Customization Dropdown Component
 * ========================================
 * 
 * Persona-based widget visibility management for enterprise dashboards.
 * Features checkbox-style selection, persona filtering, and stays open for
 * multiple selections. Follows NetworkFilters design pattern for consistency.
 * 
 * Key Features:
 * - Persona-based widget filtering (Admin, Bank, FinTech)
 * - Checkbox-style selection with blue checkmarks
 * - Dropdown stays open for multiple selections
 * - Clean interface without percentage clutter
 * - Consistent with existing dropdown patterns
 * 
 * @module components/dashboard/WidgetCustomizationDropdown
 * @version 2.0.0
 * @since 2025-06-09
 */

import { useMemo, useState } from 'react';
import { Settings, Check, X, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Interface for widget visibility state management
 */
interface WidgetVisibility {
  companySnapshot: boolean;
  networkVisualization: boolean;
  riskRadar: boolean;
  riskMonitoring: boolean;
  taskSummary: boolean;
  systemOverview: boolean;
  quickActions: boolean;
}

/**
 * Props interface for WidgetCustomizationDropdown component
 */
interface WidgetCustomizationDropdownProps {
  /** Current visibility state of all widgets */
  visibleWidgets: WidgetVisibility;
  /** Callback function to toggle widget visibility */
  onToggleWidget: (widgetKey: keyof WidgetVisibility) => void;
  /** Company category for persona-based filtering */
  companyCategory?: string;
}

// ========================================
// WIDGET CONFIGURATION
// ========================================

/**
 * Human-readable widget labels for enhanced user experience
 * Ordered by their visual appearance on the dashboard
 */
const WIDGET_LABELS: Record<keyof WidgetVisibility, string> = {
  quickActions: 'Quick Actions',
  companySnapshot: 'Company Snapshot',
  networkVisualization: 'Network Visualization',
  riskRadar: 'Risk Radar',
  riskMonitoring: 'Risk Monitoring',
  taskSummary: 'Task Summary',
  systemOverview: 'System Overview',
};

/**
 * Widget availability per persona type
 * Defines which widgets each company category can access
 * Ordered by their visual appearance on the dashboard
 */
const PERSONA_WIDGETS: Record<string, (keyof WidgetVisibility)[]> = {
  'Invela': ['quickActions', 'companySnapshot', 'networkVisualization', 'riskRadar', 'riskMonitoring', 'taskSummary', 'systemOverview'],
  'Bank': ['quickActions', 'companySnapshot', 'networkVisualization', 'riskMonitoring'],
  'FinTech': ['quickActions', 'companySnapshot', 'riskRadar', 'taskSummary'],
};

// ========================================
// MAIN COMPONENT
// ========================================

/**
 * Widget Customization Dropdown Component
 * 
 * Persona-based dashboard widget management interface providing granular
 * control over widget visibility with checkbox-style selection.
 */
export function WidgetCustomizationDropdown({
  visibleWidgets,
  onToggleWidget,
  companyCategory = 'Invela'
}: WidgetCustomizationDropdownProps) {
  
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  
  const [hoveredWidget, setHoveredWidget] = useState<keyof WidgetVisibility | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // ========================================
  // COMPUTED STATE
  // ========================================
  
  /**
   * Get available widgets for current persona
   */
  const availableWidgets = useMemo(() => {
    return PERSONA_WIDGETS[companyCategory] || PERSONA_WIDGETS['Invela'];
  }, [companyCategory]);
  
  /**
   * Calculate visible widget count for trigger display
   */
  const visibleCount = useMemo(() => {
    return availableWidgets.filter(widgetKey => visibleWidgets[widgetKey]).length;
  }, [availableWidgets, visibleWidgets]);
  
  // ========================================
  // COMPONENT RENDER
  // ========================================
  
  return (
    <DropdownMenu 
      open={dropdownOpen} 
      onOpenChange={(open) => {
        setDropdownOpen(open);
        if (!open) setHoveredWidget(null);
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 px-3 flex items-center gap-2 hover:bg-gray-50 transition-colors duration-200"
          aria-label="Customize widgets"
        >
          <Settings className="h-4 w-4" />
          <span className="text-sm font-medium">Customize</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-64 p-2"
        sideOffset={4}
      >
        <DropdownMenuLabel className="px-2 py-2 text-sm font-semibold text-gray-900">Available Widgets</DropdownMenuLabel>
        <DropdownMenuSeparator className="my-2" />
        
        <div className="space-y-1">
          {availableWidgets.map((widgetKey) => (
            <div
              key={widgetKey}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleWidget(widgetKey);
              }}
              onMouseEnter={() => setHoveredWidget(widgetKey)}
              onMouseLeave={() => setHoveredWidget(null)}
              className={cn(
                "relative flex cursor-pointer select-none items-center rounded-lg py-3 pl-10 pr-4 text-sm outline-none transition-all duration-200",
                "hover:bg-gray-100",
                visibleWidgets[widgetKey] 
                  ? "bg-blue-50 border border-blue-200 shadow-sm" 
                  : "border border-transparent"
              )}
            >
              <span className="absolute left-3 flex h-4 w-4 items-center justify-center">
                {hoveredWidget === widgetKey ? (
                  // Show X for checked items on hover, small dot for unchecked
                  visibleWidgets[widgetKey] ? (
                    <X className="h-3.5 w-3.5 text-gray-500" strokeWidth={2} />
                  ) : (
                    <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                  )
                ) : (
                  // Normal state - checkmark for selected items
                  visibleWidgets[widgetKey] && (
                    <Check className="h-4 w-4 text-blue-600" strokeWidth={3} />
                  )
                )}
              </span>
              <span className={cn(
                "transition-all duration-200 text-sm font-semibold",
                visibleWidgets[widgetKey] 
                  ? "text-gray-900" 
                  : "text-gray-500"
              )}>
                {WIDGET_LABELS[widgetKey]}
              </span>
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}