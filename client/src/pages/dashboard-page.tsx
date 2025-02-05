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
  Bell
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const DEFAULT_WIDGETS = {
  updates: true,
  announcements: true,
  quickActions: true,
  companyScore: true,
  networkVisualization: true
};

export default function DashboardPage() {
  const [visibleWidgets, setVisibleWidgets] = useState(DEFAULT_WIDGETS);

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Customize Dashboard
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Visible Widgets</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => toggleWidget('updates')}
                className="flex items-center justify-between"
              >
                Recent Updates
                {visibleWidgets.updates && <span>✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => toggleWidget('announcements')}
                className="flex items-center justify-between"
              >
                Announcements
                {visibleWidgets.announcements && <span>✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => toggleWidget('quickActions')}
                className="flex items-center justify-between"
              >
                Quick Actions
                {visibleWidgets.quickActions && <span>✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => toggleWidget('companyScore')}
                className="flex items-center justify-between"
              >
                Company Score
                {visibleWidgets.companyScore && <span>✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => toggleWidget('networkVisualization')}
                className="flex items-center justify-between"
              >
                Network Visualization
                {visibleWidgets.networkVisualization && <span>✓</span>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {allWidgetsHidden ? (
          <div className="grid grid-cols-3 gap-4 min-h-[400px]">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i}
                className="border-2 border-dashed border-muted rounded-lg flex items-center justify-center p-6 text-center"
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
                <div className="space-y-2">
                  <p className="text-muted-foreground">
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
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    Welcome to Invela! Check out our latest features.
                  </p>
                </div>
              </Widget>
            )}

            {visibleWidgets.quickActions && (
              <Widget
                title="Quick Actions"
                icon={<Zap className="h-5 w-5" />}
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
                  <p className="text-muted-foreground">No score data available</p>
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
                <div className="flex items-center justify-center min-h-[120px]">
                  <p className="text-muted-foreground">
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