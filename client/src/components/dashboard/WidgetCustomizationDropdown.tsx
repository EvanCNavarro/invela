/**
 * ========================================
 * Widget Customization Dropdown Component
 * ========================================
 * 
 * Specialized dropdown component for dashboard widget visibility management.
 * Provides multi-select functionality with real-time updates and seamless
 * integration with existing widget state management system.
 * 
 * Key Features:
 * - Multi-select widget visibility toggling
 * - Real-time dashboard updates
 * - Click-outside-to-close behavior
 * - Professional styling consistent with design system
 * - Comprehensive error handling and logging
 * - TypeScript type safety and accessibility support
 * 
 * Dependencies:
 * - Radix UI: Dropdown menu primitives for accessibility
 * - Lucide React: Professional iconography
 * - Tailwind CSS: Utility-first styling
 * - Logger utility: Development and debugging support
 * 
 * @module WidgetCustomizationDropdown
 * @version 1.0.0
 * @since 2025-06-09
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality
import React, { useState, useMemo, useCallback } from "react";

// UI components and utilities
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Professional iconography
import { 
  Settings, 
  Check, 
  Info,
  Activity,
  BarChart3,
  Network,
  Shield,
  Globe,
  FileText,
  User,
  Layout,
  Bell
} from "lucide-react";

// Development utilities
import getLogger from '@/utils/logger';

// ========================================
// LOGGER INITIALIZATION
// ========================================

const logger = getLogger('WidgetCustomizationDropdown');

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Interface defining widget configuration for dropdown display
 */
interface WidgetConfig {
  key: string;
  label: string;
  description?: string;
  icon: React.ComponentType<any>;
  category?: 'core' | 'analytics' | 'network' | 'system';
}

/**
 * Props interface for WidgetCustomizationDropdown component
 */
interface WidgetCustomizationDropdownProps {
  /** Current widget visibility state */
  visibleWidgets: Record<string, boolean>;
  /** Function to toggle widget visibility */
  onToggleWidget: (widgetKey: string) => void;
  /** Optional custom CSS classes */
  className?: string;
  /** Optional custom button variant */
  variant?: "outline" | "default" | "secondary";
  /** Optional custom button size */
  size?: "sm" | "default" | "lg";
  /** Company category for widget filtering */
  companyCategory?: 'Invela' | 'Bank' | 'FinTech';
}

// ========================================
// WIDGET CONFIGURATION
// ========================================

/**
 * Comprehensive widget configuration mapping
 * Defines all available widgets with their display properties
 */
const WIDGET_CONFIGURATIONS: Record<string, WidgetConfig> = {
  companySnapshot: {
    key: 'companySnapshot',
    label: 'Company Snapshot',
    description: 'Overview of company profile and key metrics',
    icon: User,
    category: 'core'
  },
  quickActions: {
    key: 'quickActions',
    label: 'Quick Actions',
    description: 'Fast access to common tasks and workflows',
    icon: Layout,
    category: 'core'
  },
  riskMonitoring: {
    key: 'riskMonitoring',
    label: 'Risk Monitoring',
    description: 'Real-time risk assessment and alerts',
    icon: Shield,
    category: 'analytics'
  },
  networkVisualization: {
    key: 'networkVisualization',
    label: 'Network Visualization',
    description: 'Interactive network relationships and connections',
    icon: Network,
    category: 'network'
  },
  riskRadar: {
    key: 'riskRadar',
    label: 'Risk Radar',
    description: 'Comprehensive risk analysis visualization',
    icon: BarChart3,
    category: 'analytics'
  },
  systemOverview: {
    key: 'systemOverview',
    label: 'System Overview',
    description: 'Platform-wide metrics and system health',
    icon: Activity,
    category: 'system'
  },
  announcements: {
    key: 'announcements',
    label: 'Announcements',
    description: 'Important updates and notifications',
    icon: Bell,
    category: 'core'
  },
  insights: {
    key: 'insights',
    label: 'Insights',
    description: 'Data-driven insights and recommendations',
    icon: FileText,
    category: 'analytics'
  }
};

/**
 * Widget visibility rules based on company category
 */
const COMPANY_WIDGET_RULES: Record<string, string[]> = {
  'Invela': ['companySnapshot', 'networkVisualization', 'systemOverview', 'announcements'],
  'Bank': ['companySnapshot', 'riskMonitoring', 'networkVisualization', 'riskRadar'],
  'FinTech': ['companySnapshot', 'quickActions', 'riskRadar', 'insights'],
};

// ========================================
// MAIN COMPONENT
// ========================================

/**
 * WidgetCustomizationDropdown Component
 * 
 * Renders a professional dropdown interface for managing dashboard widget visibility.
 * Supports multi-select operations with real-time updates and maintains state
 * consistency across the dashboard interface.
 * 
 * @param props - Component configuration and state management props
 * @returns {JSX.Element} Rendered dropdown component
 */
export function WidgetCustomizationDropdown({
  visibleWidgets,
  onToggleWidget,
  className,
  variant = "outline",
  size = "sm",
  companyCategory = 'FinTech'
}: WidgetCustomizationDropdownProps): JSX.Element {
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  
  const [isOpen, setIsOpen] = useState(false);

  // ========================================
  // COMPUTED VALUES
  // ========================================
  
  /**
   * Filter available widgets based on company category and current state
   */
  const availableWidgets = useMemo(() => {
    logger.info('Computing available widgets', {
      companyCategory,
      visibleWidgetsCount: Object.keys(visibleWidgets).length,
      timestamp: new Date().toISOString()
    });

    // Get widgets applicable to this company category
    const applicableWidgetKeys = COMPANY_WIDGET_RULES[companyCategory] || 
                                Object.keys(visibleWidgets);

    // Filter and map to widget configurations
    const widgets = applicableWidgetKeys
      .filter(key => key in WIDGET_CONFIGURATIONS)
      .map(key => ({
        ...WIDGET_CONFIGURATIONS[key],
        isVisible: Boolean(visibleWidgets[key])
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    logger.debug('Available widgets computed', {
      widgetCount: widgets.length,
      visibleCount: widgets.filter(w => w.isVisible).length,
      categories: [...new Set(widgets.map(w => w.category))]
    });

    return widgets;
  }, [visibleWidgets, companyCategory]);

  /**
   * Calculate summary statistics for button display
   */
  const widgetStats = useMemo(() => {
    const total = availableWidgets.length;
    const visible = availableWidgets.filter(w => w.isVisible).length;
    
    return {
      total,
      visible,
      hidden: total - visible,
      percentage: total > 0 ? Math.round((visible / total) * 100) : 0
    };
  }, [availableWidgets]);

  // ========================================
  // EVENT HANDLERS
  // ========================================

  /**
   * Handle widget visibility toggle with comprehensive logging
   */
  const handleToggleWidget = useCallback((widgetKey: string) => {
    logger.info('Widget visibility toggled', {
      widgetKey,
      previousState: visibleWidgets[widgetKey],
      newState: !visibleWidgets[widgetKey],
      companyCategory,
      timestamp: new Date().toISOString()
    });

    try {
      onToggleWidget(widgetKey);
      
      logger.debug('Widget toggle successful', {
        widgetKey,
        updatedState: !visibleWidgets[widgetKey]
      });
    } catch (error) {
      logger.error('Widget toggle failed', {
        widgetKey,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }, [visibleWidgets, onToggleWidget, companyCategory]);

  /**
   * Handle dropdown open state changes
   */
  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    
    logger.info('Dropdown state changed', {
      isOpen: open,
      widgetStats,
      timestamp: new Date().toISOString()
    });
  }, [widgetStats]);

  // ========================================
  // RENDER HELPERS
  // ========================================

  /**
   * Generate dynamic button text based on widget stats
   */
  const getButtonText = useCallback(() => {
    if (widgetStats.visible === widgetStats.total) {
      return 'All Widgets Visible';
    } else if (widgetStats.visible === 0) {
      return 'All Widgets Hidden';
    } else {
      return `${widgetStats.visible}/${widgetStats.total} Widgets`;
    }
  }, [widgetStats]);

  // ========================================
  // RENDER
  // ========================================

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn(
            "flex items-center gap-2",
            "transition-all duration-200",
            "hover:shadow-sm",
            className
          )}
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Customize</span>
          <span className="text-xs text-muted-foreground ml-1">
            ({widgetStats.visible}/{widgetStats.total})
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className={cn(
          "w-72",
          "shadow-lg border",
          "bg-popover text-popover-foreground"
        )}
        sideOffset={8}
      >
        {/* Header */}
        <DropdownMenuLabel className="flex items-center justify-between py-2">
          <span className="font-semibold">Widget Visibility</span>
          <span className="text-xs text-muted-foreground">
            {widgetStats.percentage}% visible
          </span>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />

        {/* Widget List */}
        <div className="py-1">
          {availableWidgets.map((widget) => {
            const IconComponent = widget.icon;
            
            return (
              <DropdownMenuCheckboxItem
                key={widget.key}
                checked={widget.isVisible}
                onCheckedChange={() => handleToggleWidget(widget.key)}
                className={cn(
                  "flex items-start gap-3 py-2.5 px-3",
                  "cursor-pointer select-none",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus:bg-accent focus:text-accent-foreground"
                )}
              >
                <IconComponent className={cn(
                  "w-4 h-4 mt-0.5 flex-shrink-0",
                  widget.isVisible ? "text-primary" : "text-muted-foreground"
                )} />
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{widget.label}</div>
                  {widget.description && (
                    <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {widget.description}
                    </div>
                  )}
                </div>
              </DropdownMenuCheckboxItem>
            );
          })}
        </div>

        {availableWidgets.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            <Info className="w-4 h-4 mx-auto mb-2" />
            No widgets available for this company type
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ========================================
// EXPORTS
// ========================================

export default WidgetCustomizationDropdown;

/**
 * Export type definitions for external usage
 */
export type {
  WidgetCustomizationDropdownProps,
  WidgetConfig
};