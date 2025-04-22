import { useState, useEffect } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Widget } from "@/components/dashboard/Widget";
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
  LayoutGrid
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

const DEFAULT_WIDGETS = {
  updates: true,
  announcements: true,
  quickActions: true,
  companyScore: true,
  networkVisualization: true,
  riskRadar: true
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [visibleWidgets, setVisibleWidgets] = useState(DEFAULT_WIDGETS);
  const [openFinTechModal, setOpenFinTechModal] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Use optimized query options for better performance
  const { data: companyData, isLoading } = useQuery<Company>({
    queryKey: ["/api/companies/current"],
    enabled: !!user,
    ...getOptimizedQueryOptions("/api/companies/current"),
    refetchInterval: false
  });

  const toggleWidget = (widgetId: keyof typeof DEFAULT_WIDGETS) => {
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
                {Object.entries(visibleWidgets).map(([key, isVisible]) => (
                  <DropdownMenuItem
                    key={key}
                    onSelect={(event) => {
                      event.preventDefault();
                      toggleWidget(key as keyof typeof DEFAULT_WIDGETS);
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
        <div className="mt-12 space-y-8">
          {allWidgetsHidden ? (
            <div className="grid grid-cols-3 gap-4 min-h-[400px]">
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
            <div className="grid grid-cols-3 gap-4">
              {visibleWidgets.updates && (
                <Widget
                  title="Recent Updates"
                  icon={<Activity className="h-5 w-5" />}
                  size="double"
                  onVisibilityToggle={() => toggleWidget('updates')}
                  isVisible={visibleWidgets.updates}
                >
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      No recent updates to show.
                    </p>
                  </div>
                </Widget>
              )}

              {visibleWidgets.announcements && (
                <Widget
                  title="Announcements"
                  icon={<Bell className="h-5 w-5" />}
                  onVisibilityToggle={() => toggleWidget('announcements')}
                  isVisible={visibleWidgets.announcements}
                >
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Welcome to Invela! Check out our latest features.
                    </p>
                  </div>
                </Widget>
              )}

              {visibleWidgets.quickActions && (
                <Widget
                  title="Quick Actions"
                  icon={<Zap className="h-5 w-5" />}
                  size="double"
                  onVisibilityToggle={() => toggleWidget('quickActions')}
                  isVisible={visibleWidgets.quickActions}
                >
                  <div className="grid grid-cols-2 gap-2">
                    {/* Only show Invite FinTech button if user is not a FinTech company */}
                    {companyData?.category !== 'FinTech' && (
                      <InviteButton
                        variant="fintech"
                        pulse={false}
                        className="w-full font-medium"
                        onClick={() => setOpenFinTechModal(true)}
                      />
                    )}
                    <Button variant="outline" className="w-full font-medium">
                      Add User
                    </Button>
                    <Button variant="outline" className="w-full font-medium">
                      Set Risk Tracker
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full font-medium"
                      onClick={toggleDrawer}
                    >
                      {drawerOpen ? "Hide Side Drawer" : "Show Side Drawer"}
                    </Button>
                    {/* Show this button only when we're hiding the Invite FinTech button */}
                    {companyData?.category === 'FinTech' && (
                      <Button variant="outline" className="w-full font-medium">
                        View Documentation
                      </Button>
                    )}
                  </div>
                </Widget>
              )}

              {visibleWidgets.companyScore && companyData && (
                <Widget
                  title="Company Score"
                  icon={<AlertTriangle className="h-5 w-5" />}
                  onVisibilityToggle={() => toggleWidget('companyScore')}
                  isVisible={visibleWidgets.companyScore}
                >
                  <div className="space-y-1">
                    <div className="bg-muted/50 rounded-lg py-2 px-3 flex items-center justify-center space-x-3">
                      {companyData?.logoId ? (
                        <img
                          src={`/api/companies/${companyData.id}/logo`}
                          alt={`${companyData.name} logo`}
                          className="w-6 h-6 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            console.debug(`Failed to load logo for company: ${companyData.name}`);
                          }}
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {companyData?.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-sm font-medium">{companyData?.name}</span>
                    </div>
                    <RiskMeter 
                      score={companyData?.riskScore || companyData?.risk_score || 0}
                      chosenScore={companyData?.chosenScore || companyData?.chosen_score || undefined}
                      companyId={companyData?.id || 0}
                      companyType={companyData?.category || "FinTech"}
                      canAdjust={companyData?.category === "Bank" || companyData?.category === "Invela"}
                    />
                  </div>
                </Widget>
              )}

              {visibleWidgets.networkVisualization && (
                <Widget
                  title="Network Visualization"
                  icon={<Globe className="h-5 w-5" />}
                  size="triple"
                  onVisibilityToggle={() => toggleWidget('networkVisualization')}
                  isVisible={visibleWidgets.networkVisualization}
                >
                  <NetworkVisualization className="shadow-none border-none" />
                </Widget>
              )}
              
              {visibleWidgets.riskRadar && companyData && (
                <Widget
                  title="Risk Radar"
                  icon={<Shield className="h-5 w-5" />}
                  size="triple"
                  onVisibilityToggle={() => toggleWidget('riskRadar')}
                  isVisible={visibleWidgets.riskRadar}
                >
                  <RiskRadarChart 
                    companyId={companyData?.id || 0} 
                    showDropdown={false}
                    className="shadow-none border-none p-2"
                  />
                </Widget>
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