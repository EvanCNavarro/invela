/**
 * ========================================
 * Dashboard Page Component
 * ========================================
 * 
 * Enterprise dashboard providing comprehensive risk assessment overview,
 * company insights, and real-time monitoring capabilities. Implements
 * responsive design patterns with interactive widgets, tutorial integration,
 * and comprehensive data visualization for executive decision-making support.
 * 
 * Key Features:
 * - Comprehensive risk assessment dashboard with real-time data
 * - Interactive widget system with responsive grid layout
 * - Company snapshot and performance monitoring capabilities
 * - Risk radar and network visualization components
 * - Tutorial integration for user onboarding and guidance
 * - Enterprise-grade authentication and authorization
 * 
 * Dependencies:
 * - DashboardLayout: Layout wrapper for consistent dashboard presentation
 * - Dashboard Widgets: Specialized components for data visualization
 * - UI Components: Professional button, dropdown, and page structure elements
 * - Auth System: User authentication and authorization management
 * - Query Management: React Query for efficient data fetching
 * 
 * @module DashboardPage
 * @version 2.0.0
 * @since 2024-04-15
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality for state and lifecycle management
import { useState, useEffect } from "react";
// Routing utilities for navigation management
import { useLocation } from "wouter";

// Layout components for consistent dashboard structure
import { DashboardLayout } from "@/layouts/DashboardLayout";

// Specialized dashboard widget components for data visualization
import { Widget } from "@/components/dashboard/Widget";
import { CompanySnapshot } from "@/components/dashboard/CompanySnapshot";
import { RiskRadarWidget } from "@/components/dashboard/RiskRadarWidget";
import { TaskSummaryWidget } from "@/components/dashboard/TaskSummaryWidget";
import { QuickActionsWidget } from "@/components/dashboard/QuickActionsWidget";
import { NetworkVisualizationWidget } from "@/components/dashboard/NetworkVisualizationWidget";
import RiskMonitoringWidget from "@/components/dashboard/RiskMonitoringWidget";
import { SystemOverviewWidget } from "@/components/dashboard/SystemOverviewWidget";
import { RiskMeter } from "@/components/dashboard/RiskMeter";

// UI components for interactive elements and page structure
import { Button } from "@/components/ui/button";
import { InviteButton } from "@/components/ui/invite-button";
import { PageHeader } from "@/components/ui/page-header";
import { PageTemplate } from "@/components/ui/page-template";
import { PageSideDrawer } from "@/components/ui/page-side-drawer";

// Tutorial system for user guidance and onboarding
import { TutorialManager } from "@/components/tutorial/TutorialManager";

// Icon components for visual consistency and accessibility
import {
  Settings,
  Check,
  Info,
  Activity,
  Bell,
  Zap,
  Globe,
  Shield,
  AlertTriangle,
  LayoutGrid,
  User,
  BarChart3,
  FileText
} from "lucide-react";

// Dropdown menu components for navigation and action menus
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

// Authentication and data management hooks
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import type { Company } from "@/types/company";
import { InviteModal } from "@/components/playground/InviteModal";
import { cn } from "@/lib/utils";
import { getOptimizedQueryOptions } from "@/lib/queryClient";
import { NetworkVisualization } from "@/components/network";
import { RiskRadarChart } from "@/components/insights/RiskRadarChart";
import { 
  DashboardSkeleton, 
  FinTechDashboardSkeleton 
} from "@/components/dashboard/SkeletonWidgets";

// ========================================
// WIDGET CONFIGURATION INTERFACES
// ========================================

/**
 * Interface defining all available dashboard widgets
 * Ensures type safety and consistent widget management across company types
 */
interface DashboardWidgets {
  quickActions: boolean;
  companySnapshot: boolean;
  networkVisualization: boolean;
  riskRadar: boolean;
  riskMonitoring: boolean;
  taskSummary: boolean;
  systemOverview: boolean;
}

/**
 * Widget configuration for FinTech companies
 * Simplified layout focusing on core risk assessment features
 */
const FINTECH_DEFAULT_WIDGETS: DashboardWidgets = {
  quickActions: true,
  companySnapshot: true,
  networkVisualization: false,
  riskRadar: true,
  riskMonitoring: false,
  taskSummary: false, // FinTech companies use simplified task management
  systemOverview: false, // Not available for FinTech companies
};

/**
 * Widget configuration for Bank and Invela companies
 * Full feature set with comprehensive monitoring capabilities
 */
const OTHER_DEFAULT_WIDGETS: DashboardWidgets = {
  quickActions: true,
  companySnapshot: true,
  networkVisualization: true,
  riskRadar: true,
  riskMonitoring: true,
  taskSummary: true, // Enhanced task tracking for complex operations
  systemOverview: true, // Available for Bank and Invela companies
};

/**
 * Widget configuration for Invela companies
 * Administrative dashboard with system overview and quick actions
 */
const INVELA_DEFAULT_WIDGETS: DashboardWidgets = {
  quickActions: true, // Administrative quick actions for platform management
  companySnapshot: true,
  networkVisualization: true,
  riskRadar: false, // Risk Radar not applicable for Invela admin users
  riskMonitoring: false, // Risk Monitoring not applicable for Invela admin users
  taskSummary: false, // Replaced with Quick Actions for better admin workflow
  systemOverview: true, // Exclusive system-wide overview for Invela
};

// ========================================
// MAIN COMPONENT
// ========================================

/**
 * Dashboard Page Component
 * 
 * Comprehensive enterprise dashboard providing risk assessment overview,
 * company insights, and real-time monitoring capabilities. Features
 * responsive widget layout, tutorial integration, and executive-level
 * data visualization for informed decision making.
 * 
 * @returns {JSX.Element} Rendered dashboard page with full feature set
 */
export default function DashboardPage(): JSX.Element {
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  
  // Navigation state for routing management
  const [location, navigate] = useLocation();
  
  // Authentication context for user management
  const { user } = useAuth();
  
  // Modal state management for user interactions
  const [openFinTechModal, setOpenFinTechModal] = useState(false);
  const [sideDrawerOpen, setSideDrawerOpen] = useState(false);
  
  // Widget visibility state with proper type declaration and dynamic initialization
  const [visibleWidgets, setVisibleWidgets] = useState<DashboardWidgets>(OTHER_DEFAULT_WIDGETS);
  
  // ========================================
  // DATA FETCHING
  // ========================================
  
  // Company data retrieval with optimized caching
  const { data: companyData, isLoading: isCompanyLoading, error: companyError } = useQuery<Company>({
    queryKey: ['/api/companies/current'],
    refetchInterval: 180000,      // 3 minutes - poll for permission changes
    refetchOnWindowFocus: true,   // Fetch when tab becomes active
    staleTime: 60000,             // 1 minute - keep data fresh
    retry: false,
    gcTime: 5 * 60 * 1000,        // 5 minutes - garbage collection time
    refetchOnReconnect: true,     // Refetch on reconnect
    refetchOnMount: true,         // Refetch on mount
  });

  // ========================================
  // EFFECTS
  // ========================================

  // Update widget visibility based on company type
  useEffect(() => {
    if (companyData) {
      const isFinTech = companyData.category === 'FinTech';
      const isInvela = companyData.category === 'Invela';
      
      // Company-specific widget configurations
      if (isInvela) {
        setVisibleWidgets(INVELA_DEFAULT_WIDGETS); // Invela-specific configuration without Risk Radar
      } else if (isFinTech) {
        setVisibleWidgets(FINTECH_DEFAULT_WIDGETS); // Simplified for FinTech
      } else {
        setVisibleWidgets(OTHER_DEFAULT_WIDGETS); // Full set for Bank companies
      }
    }
  }, [companyData]);

  // ========================================
  // EVENT HANDLERS
  // ========================================

  /**
   * Toggle widget visibility with type-safe implementation
   * @param {keyof DashboardWidgets} widgetKey - Key of the widget to toggle
   */
  const toggleWidget = (widgetKey: keyof DashboardWidgets) => {
    setVisibleWidgets(prev => ({
      ...prev,
      [widgetKey]: !prev[widgetKey]
    }));
  };

  /**
   * Handle quick action navigation
   * @param {string} path - Target navigation path
   */
  const handleQuickAction = (path: string) => {
    navigate(path);
  };

  // ========================================
  // LOADING STATES
  // ========================================

  // ========================================
  // LOADING STATE MANAGEMENT
  // ========================================
  
  /**
   * Enhanced loading state management following enterprise standards
   * Implements proper data availability checks to ensure dashboard renders
   * when company data is successfully loaded from authenticated sources
   * 
   * Loading Logic:
   * - Show loading skeleton only when actively fetching AND no data exists
   * - Prioritize data availability over loading state to prevent infinite loading
   * - Maintain enterprise UX standards with proper skeleton display
   */
  const shouldShowLoading = isCompanyLoading && !companyData;

  // Debug dashboard rendering
  useEffect(() => {
    console.log('🔍 DASHBOARD RENDER DEBUG:', {
      companyData,
      category: companyData?.category,
      visibleWidgets,
      shouldShowLoading,
      isInvelaCompany: companyData?.category === 'Invela'
    });
  }, [companyData, visibleWidgets, shouldShowLoading]);
  
  if (shouldShowLoading) {
    return (
      <DashboardLayout>
        <PageTemplate
          title="Dashboard"
          description="Enterprise risk assessment and monitoring overview"
        >
          <DashboardSkeleton />
        </PageTemplate>
      </DashboardLayout>
    );
  }

  // Handle error states with proper enterprise error display
  if (companyError) {
    return (
      <DashboardLayout>
        <PageTemplate
          title="Dashboard"
          description="Enterprise risk assessment and monitoring overview"
        >
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Unable to load company data
              </h3>
              <p className="text-gray-600">
                Please refresh the page or contact support if the issue persists.
              </p>
            </div>
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }

  // Error state handling
  if (companyError) {
    return (
      <DashboardLayout>
        <PageTemplate
          title="Dashboard"
          description="Enterprise risk assessment and monitoring overview"
        >
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Unable to Load Dashboard</h3>
              <p className="text-muted-foreground">
                There was an error loading your company data. Please try refreshing the page.
              </p>
            </div>
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <DashboardLayout>
      <TutorialManager tabName="dashboard">
        <PageTemplate
          title="Dashboard"
          description="Enterprise risk assessment and monitoring overview"
          headerActions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSideDrawerOpen(true)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Customize
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <LayoutGrid className="w-4 h-4 mr-2" />
                    Quick Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Navigation</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleQuickAction('/task-center')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Task Center
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleQuickAction('/network')}>
                    <Globe className="w-4 h-4 mr-2" />
                    Network View
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleQuickAction('/insights')}>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Insights
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setOpenFinTechModal(true)}>
                    <User className="w-4 h-4 mr-2" />
                    Invite User
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        >
          {/* Widget Customization Side Drawer */}
          <PageSideDrawer
            defaultOpen={sideDrawerOpen}
            onOpenChange={(open) => setSideDrawerOpen(open)}
            title="Customize Dashboard"
          >
            <div className="space-y-4">
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Available Widgets</h4>
                
                {Object.entries(visibleWidgets).map(([key, isVisible]) => (
                  <div key={key} className="flex items-center justify-between">
                    <label className="text-sm capitalize cursor-pointer">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    <Button
                      variant={isVisible ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleWidget(key as keyof typeof visibleWidgets)}
                    >
                      {isVisible ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Visible
                        </>
                      ) : (
                        <>
                          <Info className="w-3 h-3 mr-1" />
                          Hidden
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </PageSideDrawer>

          {/* Main Dashboard Content */}
          <div className="space-y-6">
            {/* Debug logging moved to useEffect for proper React rendering */}
            
            {/* Invela Company Layout - Optimized for Invela Trust Network */}
            {companyData?.category === 'Invela' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Company Snapshot - 1.5 column width equivalent */}
                {visibleWidgets.companySnapshot && (
                  <div className="lg:col-span-1">
                    <CompanySnapshot
                      companyData={companyData}
                      onToggle={() => toggleWidget('companySnapshot')}
                      isVisible={visibleWidgets.companySnapshot}
                    />
                  </div>
                )}

                {/* Quick Actions - 1.5 column width equivalent */}
                {visibleWidgets.quickActions && (
                  <div className="lg:col-span-1">
                    <QuickActionsWidget
                      onToggle={() => toggleWidget('quickActions')}
                      isVisible={visibleWidgets.quickActions}
                    />
                  </div>
                )}
              </div>
            )}

            {/* FinTech Layout - Simplified for FinTech companies */}
            {companyData?.category === 'FinTech' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Company Snapshot */}
                {visibleWidgets.companySnapshot && (
                  <div className="lg:col-span-1">
                    <CompanySnapshot
                      companyData={companyData}
                      onToggle={() => toggleWidget('companySnapshot')}
                      isVisible={visibleWidgets.companySnapshot}
                    />
                  </div>
                )}

                {/* Risk Radar for FinTech */}
                {visibleWidgets.riskRadar && companyData && (
                  <div className="lg:col-span-2 h-[400px]">
                    <RiskRadarWidget
                      companyId={companyData?.id || 0}
                      onToggle={() => toggleWidget('riskRadar')}
                      isVisible={visibleWidgets.riskRadar}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Bank Layout - Full feature set for traditional banks */}
            {companyData?.category === 'Bank' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Company Info */}
                {visibleWidgets.companySnapshot && (
                  <div className="lg:col-span-1 space-y-6">
                    {/* Company Snapshot */}
                    <div>
                      <CompanySnapshot
                        companyData={companyData}
                        onToggle={() => toggleWidget('companySnapshot')}
                        isVisible={visibleWidgets.companySnapshot}
                      />
                    </div>
                  </div>
                )}

                {/* Right Columns - Visualization */}
                {(visibleWidgets.networkVisualization || visibleWidgets.companySnapshot) && (
                  <div className={cn(
                    "space-y-6",
                    visibleWidgets.companySnapshot ? "lg:col-span-2" : "lg:col-span-3"
                  )}>
                    {!visibleWidgets.companySnapshot && visibleWidgets.networkVisualization && (
                      <div>
                        <CompanySnapshot
                          companyData={companyData}
                          onToggle={() => toggleWidget('companySnapshot')}
                          isVisible={visibleWidgets.companySnapshot}
                        />
                      </div>
                    )}

                    {/* Network Visualization for Bank/Invela */}
                    {visibleWidgets.networkVisualization && (
                      <div className="h-[600px]">
                        <NetworkVisualizationWidget
                          onToggle={() => toggleWidget('networkVisualization')}
                          isVisible={visibleWidgets.networkVisualization}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Risk Monitoring Widget for Bank/Invela - Full width */}
            {visibleWidgets.riskMonitoring && companyData?.category !== 'FinTech' && (
              <div className="col-span-3 mt-4">
                <RiskMonitoringWidget />
              </div>
            )}
            

            
            {/* System Overview Widget for Invela - Full width */}
            {visibleWidgets.systemOverview && companyData?.category === 'Invela' && (
              <div className="col-span-3 mt-4">
                <SystemOverviewWidget
                  onToggle={() => toggleWidget('systemOverview')}
                  isVisible={visibleWidgets.systemOverview}
                />
              </div>
            )}
          </div>

        </PageTemplate>

        <InviteModal
          variant="fintech"
          open={openFinTechModal}
          onOpenChange={setOpenFinTechModal}
        />
      </TutorialManager>
    </DashboardLayout>
  );
}