import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Widget } from "@/components/dashboard/Widget";
import { CompanySnapshot } from "@/components/dashboard/CompanySnapshot";
import { RiskRadarWidget } from "@/components/dashboard/RiskRadarWidget";
import { NetworkVisualizationWidget } from "@/components/dashboard/NetworkVisualizationWidget";
import { Button } from "@/components/ui/button";
import { InviteButton } from "@/components/ui/invite-button";
import { PageHeader } from "@/components/ui/page-header";
import { PageTemplate } from "@/components/ui/page-template";
import { PageSideDrawer } from "@/components/ui/page-side-drawer";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { RiskMeter } from "@/components/dashboard/RiskMeter";
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

// Create separate default widget sets based on company type
const FINTECH_DEFAULT_WIDGETS = {
  quickActions: true,
  companyScore: true,
  networkVisualization: false,
  riskRadar: true
};

const OTHER_DEFAULT_WIDGETS = {
  quickActions: true,
  companyScore: true,
  networkVisualization: true,
  riskRadar: false
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation(); // wouter hook for navigation
  // Initially set to a common subset of widgets
  const [visibleWidgets, setVisibleWidgets] = useState({
    quickActions: true,
    companyScore: true,
    networkVisualization: false,
    riskRadar: false
  });
  const [openFinTechModal, setOpenFinTechModal] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Use optimized query options for better performance
  const { data: companyData, isLoading } = useQuery<Company>({
    queryKey: ["/api/companies/current"],
    enabled: !!user,
    ...getOptimizedQueryOptions("/api/companies/current"),
    refetchInterval: false
  });

  type WidgetKey = 'quickActions' | 'companyScore' | 'networkVisualization' | 'riskRadar';
  
  const toggleWidget = (widgetId: WidgetKey) => {
    setVisibleWidgets(prev => ({
      ...prev,
      [widgetId]: !prev[widgetId]
    }));
  };

  const toggleDrawer = () => {
    setDrawerOpen(prev => !prev);
  };

  // Toggle widgets based on company type
  useEffect(() => {
    if (companyData?.category === 'FinTech') {
      setVisibleWidgets(prev => ({
        ...prev,
        networkVisualization: false,
        riskRadar: true
      }));
    } else {
      // For non-FinTech companies (Bank, Invela)
      setVisibleWidgets(prev => ({
        ...prev,
        networkVisualization: true,
        riskRadar: false
      }));
    }
  }, [companyData?.category]);

  const allWidgetsHidden = Object.values(visibleWidgets).every(v => !v);

  return (
    <DashboardLayout>
      <PageTemplate
        drawerOpen={drawerOpen}
        onDrawerOpenChange={setDrawerOpen}
        title="Dashboard"
        description="Get an overview of your company's performance and recent activities."
        headerActions={
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Customize Dashboard
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" sideOffset={4}>
                <DropdownMenuLabel>Visible Widgets</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(visibleWidgets)
                  // Filter dropdown options based on company type
                  .filter(([key]) => {
                    if (key === 'riskRadar') {
                      // Only show Risk Radar for FinTech
                      return companyData?.category === 'FinTech';
                    }
                    if (key === 'networkVisualization') {
                      // Hide Network Visualization for FinTech
                      return companyData?.category !== 'FinTech';
                    }
                    return true;
                  })
                  .map(([key, isVisible]) => (
                  <DropdownMenuItem
                    key={key}
                    onSelect={(event) => {
                      event.preventDefault();
                      toggleWidget(key as 'quickActions' | 'companyScore' | 'networkVisualization' | 'riskRadar');
                    }}
                    className="flex items-center gap-2"
                  >
                    <div className="w-4">
                      {isVisible ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <div className="h-4 w-4" />
                      )}
                    </div>
                    <span className={cn(
                      "flex-1",
                      isVisible ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
        drawer={
          <PageSideDrawer
            title="Dashboard Information"
            titleIcon={<Info className="h-5 w-5" />}
            defaultOpen={drawerOpen}
            isClosable={true}
            onOpenChange={setDrawerOpen}
          >
            <div className="space-y-4">
              <p className="text-muted-foreground">
                This drawer provides additional information and context about your dashboard:
              </p>
              <ul className="space-y-2">
                <li>• Widget customization options</li>
                <li>• Data refresh schedules</li>
                <li>• Dashboard shortcuts</li>
                <li>• Notification settings</li>
              </ul>
            </div>
          </PageSideDrawer>
        }
      >
        <div className="mt-2 space-y-4 flex-1 flex flex-col overflow-y-auto">
          {allWidgetsHidden ? (
            <div className="grid grid-cols-3 gap-4 h-full">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="border-2 border-dashed border-muted rounded-lg flex items-center justify-center p-6 text-center bg-background/40 backdrop-blur-sm"
                >
                  <div className="space-y-2">
                    <LayoutGrid className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No widgets selected. Click "Customize Dashboard" to add widgets.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : isLoading ? (
            // Show appropriate skeleton based on current loading state
            <DashboardSkeleton />
          ) : (
            <div className="grid grid-cols-3 gap-4 flex-1 pb-8">
              {/* Quick Actions - Full width at the top */}
              {visibleWidgets.quickActions && (
                <div className="col-span-3">
                  <Widget
                    title="Quick Actions"
                    icon={<Zap className="h-5 w-5" />}
                    size="triple"
                    onVisibilityToggle={() => toggleWidget('quickActions')}
                    isVisible={visibleWidgets.quickActions}
                  >
                    <div className="grid grid-cols-3 gap-4">
                      {/* Only show Invite FinTech button if user is not a FinTech company */}
                      {companyData?.category !== 'FinTech' ? (
                        <>
                          <InviteButton
                            variant="fintech"
                            pulse={false}
                            className="w-full font-medium"
                            onClick={() => setOpenFinTechModal(true)}
                          />
                          <Button 
                            variant="outline" 
                            className="w-full font-medium flex items-center justify-center gap-2"
                            onClick={() => setLocation(`/network/company/${companyData?.id}`)}
                          >
                            <User className="h-4 w-4" />
                            View Company Profile
                          </Button>
                          <Button 
                            variant="outline" 
                            className="w-full font-medium flex items-center justify-center gap-2"
                            onClick={() => setLocation('/insights')}
                          >
                            <BarChart3 className="h-4 w-4" />
                            View Insights
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button 
                            variant="outline" 
                            className="w-full font-medium flex items-center justify-center gap-2"
                          >
                            <FileText className="h-4 w-4" />
                            View Documentation
                          </Button>
                          <Button 
                            variant="outline" 
                            className="w-full font-medium flex items-center justify-center gap-2"
                            onClick={() => setLocation(`/network/company/${companyData?.id}`)}
                          >
                            <User className="h-4 w-4" />
                            View Company Profile
                          </Button>
                          <Button 
                            variant="outline" 
                            className="w-full font-medium flex items-center justify-center gap-2"
                            onClick={() => setLocation('/insights')}
                          >
                            <BarChart3 className="h-4 w-4" />
                            View Insights
                          </Button>
                        </>
                      )}
                    </div>
                  </Widget>
                </div>
              )}

              {/* Middle section */}
              <div className="col-span-3 grid gap-4">
                {/* FinTech layout - 1:3 ratio grid */}
                {companyData?.category === 'FinTech' && (visibleWidgets.companyScore || visibleWidgets.riskRadar) && (
                  <div className="grid grid-cols-4 gap-4 h-[450px]">
                    {/* Company Snapshot (1/4 width) for FinTech */}
                    {visibleWidgets.companyScore && companyData && (
                      <div className="col-span-1">
                        <CompanySnapshot 
                          companyData={companyData}
                          onToggle={() => toggleWidget('companyScore')}
                          isVisible={visibleWidgets.companyScore}
                        />
                      </div>
                    )}

                    {/* Risk Radar (3/4 width) for FinTech */}
                    {visibleWidgets.riskRadar && companyData && (
                      <div className="col-span-3 h-full">
                        <RiskRadarWidget
                          companyId={companyData?.id || 0}
                          onToggle={() => toggleWidget('riskRadar')}
                          isVisible={visibleWidgets.riskRadar}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Bank/Invela layout - 1:1 ratio grid */}
                {companyData?.category !== 'FinTech' && (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Company Snapshot for Bank/Invela */}
                    {visibleWidgets.companyScore && companyData && (
                      <div>
                        <CompanySnapshot 
                          companyData={companyData}
                          onToggle={() => toggleWidget('companyScore')}
                          isVisible={visibleWidgets.companyScore}
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
              
              {/* Risk Radar - Only for Bank/Invela companies as full width */}
              {visibleWidgets.riskRadar && companyData?.category !== 'FinTech' && companyData && (
                <div className="col-span-3 h-[400px]">
                  <RiskRadarWidget
                    companyId={companyData?.id || 0}
                    onToggle={() => toggleWidget('riskRadar')}
                    isVisible={visibleWidgets.riskRadar}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <InviteModal
          variant="fintech"
          open={openFinTechModal}
          onOpenChange={setOpenFinTechModal}
        />
      </PageTemplate>
    </DashboardLayout>
  );
}