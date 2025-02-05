import { useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Widget } from "@/components/dashboard/Widget";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { 
  LayoutGrid, 
  Settings,
  BarChart3,
  Globe,
  Zap,
  Users,
  Activity,
  LineChart,
  Bell,
  Check
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const DEFAULT_WIDGETS = {
  updates: true,
  announcements: true,
  quickActions: true,
  companyScore: true,
  networkVisualization: true
};

export default function DashboardPage() {
  const [visibleWidgets, setVisibleWidgets] = useState(DEFAULT_WIDGETS);
  const [isCustomizing, setIsCustomizing] = useState(false);

  const toggleWidget = (widgetId: keyof typeof DEFAULT_WIDGETS) => {
    setVisibleWidgets(prev => ({
      ...prev,
      [widgetId]: !prev[widgetId]
    }));
  };

  const allWidgetsHidden = Object.values(visibleWidgets).every(v => !v);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <PageHeader
            title="Dashboard"
            description="Get an overview of your company's performance and recent activities."
          />
          <DropdownMenu open={isCustomizing} onOpenChange={setIsCustomizing}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Customize Dashboard
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Visible Widgets</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.entries(visibleWidgets).map(([key, isVisible]) => (
                <DropdownMenuItem 
                  key={key}
                  onClick={() => toggleWidget(key as keyof typeof DEFAULT_WIDGETS)}
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
                actions={[
                  { 
                    label: "Customize Actions",
                    onClick: () => console.log("Customize actions"),
                    icon: <Settings className="h-4 w-4" />
                  }
                ]}
              >
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="w-full">
                    Add FinTech
                  </Button>
                  <Button variant="outline" className="w-full">
                    Add User
                  </Button>
                  <Button variant="outline" className="w-full">
                    Set Risk Tracker
                  </Button>
                  <Button variant="outline" className="w-full">
                    View Reports
                  </Button>
                </div>
              </Widget>
            )}

            {visibleWidgets.companyScore && (
              <Widget
                title="Company Score"
                icon={<BarChart3 className="h-5 w-5" />}
                onVisibilityToggle={() => toggleWidget('companyScore')}
                isVisible={visibleWidgets.companyScore}
              >
                <div className="flex items-center justify-center min-h-[120px]">
                  <p className="text-sm text-muted-foreground">No score data available</p>
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
                <div className="flex items-center justify-center min-h-[200px]">
                  <p className="text-sm text-muted-foreground">
                    Network visualization coming soon
                  </p>
                </div>
              </Widget>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}