import React, { useState } from 'react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { PageTemplate } from '@/components/ui/page-template';
import { Button } from '@/components/ui/button';
import { Widget } from '@/components/dashboard/Widget';
import { InviteModal } from '@/components/modals/InviteModal';
import { PageSideDrawer } from '@/components/templates/PageSideDrawer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Check, Clock, DollarSign, FileText, Globe, Info, LineChart, MessagesSquare, Settings, Target, TrendingDown, TrendingUp, Users } from 'lucide-react';

// Define the widget structure
const DEFAULT_WIDGETS = {
  activityLog: true,
  recentDocuments: true,
  performanceMetrics: true,
  teamProductivity: true,
  upcomingTasks: true,
  revenueOverview: true,
  networkVisualization: true,
};

export function DashboardPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState(DEFAULT_WIDGETS);
  const [openFinTechModal, setOpenFinTechModal] = useState(false);

  const toggleWidget = (widgetKey: keyof typeof DEFAULT_WIDGETS) => {
    setVisibleWidgets((prev) => ({
      ...prev,
      [widgetKey]: !prev[widgetKey],
    }));
  };

  // Check if all widgets are hidden
  const allWidgetsHidden = Object.values(visibleWidgets).every((visible) => !visible);

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
                  className="flex items-center justify-center border border-dashed border-muted-foreground/20 rounded-lg bg-card/50 p-8"
                >
                  <p className="text-sm text-muted-foreground text-center">
                    No widgets visible. Use the "Customize Dashboard" button to show widgets.
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {visibleWidgets.activityLog && (
                <Widget
                  title="Recent Activity"
                  icon={<Clock className="h-5 w-5" />}
                  onVisibilityToggle={() => toggleWidget('activityLog')}
                  isVisible={visibleWidgets.activityLog}
                >
                  <div className="space-y-4">
                    <div className="flex items-start gap-2 border-l-2 border-primary/50 pl-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">Task completed</p>
                        <p className="text-xs text-muted-foreground">Business structure verification</p>
                      </div>
                      <span className="text-xs text-muted-foreground">Just now</span>
                    </div>
                    <div className="flex items-start gap-2 border-l-2 border-primary/50 pl-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">Document uploaded</p>
                        <p className="text-xs text-muted-foreground">Articles of Incorporation</p>
                      </div>
                      <span className="text-xs text-muted-foreground">1h ago</span>
                    </div>
                    <div className="flex items-start gap-2 border-l-2 border-primary/50 pl-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">Onboarding progress</p>
                        <p className="text-xs text-muted-foreground">KYB process 65% complete</p>
                      </div>
                      <span className="text-xs text-muted-foreground">2h ago</span>
                    </div>
                  </div>
                </Widget>
              )}

              {visibleWidgets.recentDocuments && (
                <Widget
                  title="Recent Documents"
                  icon={<FileText className="h-5 w-5" />}
                  onVisibilityToggle={() => toggleWidget('recentDocuments')}
                  isVisible={visibleWidgets.recentDocuments}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm">Business Plan.pdf</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Today</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm">Financial Statements.xlsx</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Yesterday</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm">Compliance Report Q3.docx</span>
                      </div>
                      <span className="text-xs text-muted-foreground">3 days ago</span>
                    </div>
                  </div>
                </Widget>
              )}

              {visibleWidgets.performanceMetrics && (
                <Widget
                  title="Performance Metrics"
                  icon={<LineChart className="h-5 w-5" />}
                  onVisibilityToggle={() => toggleWidget('performanceMetrics')}
                  isVisible={visibleWidgets.performanceMetrics}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Completion Rate</p>
                        <p className="text-xs text-muted-foreground">Task completion efficiency</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-green-500">94%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Response Time</p>
                        <p className="text-xs text-muted-foreground">Average time to respond</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingDown className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-green-500">1.2h</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Approval Rate</p>
                        <p className="text-xs text-muted-foreground">Document approvals</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingDown className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium text-red-500">78%</span>
                      </div>
                    </div>
                  </div>
                </Widget>
              )}

              {visibleWidgets.teamProductivity && (
                <Widget
                  title="Team Productivity"
                  icon={<Users className="h-5 w-5" />}
                  onVisibilityToggle={() => toggleWidget('teamProductivity')}
                  isVisible={visibleWidgets.teamProductivity}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Sarah Johnson</span>
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: '87%' }}></div>
                      </div>
                      <span className="text-xs font-medium">87%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Michael Chen</span>
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: '92%' }}></div>
                      </div>
                      <span className="text-xs font-medium">92%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Alex Rodriguez</span>
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: '65%' }}></div>
                      </div>
                      <span className="text-xs font-medium">65%</span>
                    </div>
                  </div>
                </Widget>
              )}

              {visibleWidgets.upcomingTasks && (
                <Widget
                  title="Upcoming Tasks"
                  icon={<Target className="h-5 w-5" />}
                  onVisibilityToggle={() => toggleWidget('upcomingTasks')}
                  isVisible={visibleWidgets.upcomingTasks}
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="min-w-[60px] text-xs text-muted-foreground">Today</div>
                      <div>
                        <p className="text-sm font-medium">Compliance Check</p>
                        <p className="text-xs text-muted-foreground">Review latest regulations</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="min-w-[60px] text-xs text-muted-foreground">Tomorrow</div>
                      <div>
                        <p className="text-sm font-medium">Team Meeting</p>
                        <p className="text-xs text-muted-foreground">Quarterly planning</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="min-w-[60px] text-xs text-muted-foreground">Mar 15</div>
                      <div>
                        <p className="text-sm font-medium">Document Review</p>
                        <p className="text-xs text-muted-foreground">Verify new client documents</p>
                      </div>
                    </div>
                  </div>
                </Widget>
              )}

              {visibleWidgets.revenueOverview && (
                <Widget
                  title="Revenue Overview"
                  icon={<DollarSign className="h-5 w-5" />}
                  size="double"
                  onVisibilityToggle={() => toggleWidget('revenueOverview')}
                  isVisible={visibleWidgets.revenueOverview}
                >
                  <div className="flex justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                      <p className="text-2xl font-bold">$24,345</p>
                      <div className="flex items-center gap-1 text-green-500">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-xs font-medium">+12.5% from last month</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">YTD Revenue</p>
                      <p className="text-2xl font-bold">$158,764</p>
                      <div className="flex items-center gap-1 text-green-500">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-xs font-medium">+8.3% from last year</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Active Clients</p>
                      <p className="text-2xl font-bold">37</p>
                      <div className="flex items-center gap-1 text-green-500">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-xs font-medium">+3 from last month</span>
                      </div>
                    </div>
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

        <InviteModal
          variant="fintech"
          open={openFinTechModal}
          onOpenChange={setOpenFinTechModal}
        />
      </PageTemplate>
    </DashboardLayout>
  );
}

export default DashboardPage;