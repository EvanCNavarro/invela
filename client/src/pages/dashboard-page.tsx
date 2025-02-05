import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Widget } from "@/components/dashboard/Widget";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { BellRing, Plus, FileText, Users, BarChart3, Settings } from "lucide-react";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Get an overview of your company's performance and recent activities."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stats Overview - Row 1 */}
          <Widget className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Recent Activity</h3>
              <BellRing className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Welcome to your dashboard! Check your recent notifications and updates here.
                </p>
              </div>
            </div>
          </Widget>

          <Widget className="p-6">
            <div className="space-y-2">
              <h3 className="font-semibold">Documents</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">24</p>
                  <p className="text-sm text-muted-foreground">Total Files</p>
                </div>
                <FileText className="h-8 w-8 text-primary/20" />
              </div>
            </div>
          </Widget>

          <Widget className="p-6">
            <div className="space-y-2">
              <h3 className="font-semibold">Team Members</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                </div>
                <Users className="h-8 w-8 text-primary/20" />
              </div>
            </div>
          </Widget>

          {/* Quick Actions - Row 2 */}
          <Widget className="lg:col-span-2 p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Quick Actions</h3>
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2">
                  <FileText className="h-6 w-6" />
                  <span>Add Document</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2">
                  <Users className="h-6 w-6" />
                  <span>Invite Team</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2">
                  <BarChart3 className="h-6 w-6" />
                  <span>View Reports</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2">
                  <Settings className="h-6 w-6" />
                  <span>Settings</span>
                </Button>
              </div>
            </div>
          </Widget>

          {/* Announcements - Row 2 */}
          <Widget className="lg:col-span-2 p-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Announcements</h3>
              <div className="space-y-4">
                <div className={cn(
                  "p-4 rounded-lg",
                  "bg-primary/5 border border-primary/10"
                )}>
                  <p className="font-medium mb-1">Welcome to Invela!</p>
                  <p className="text-sm text-muted-foreground">
                    Explore our latest features and improvements in document management.
                  </p>
                </div>
                <div className={cn(
                  "p-4 rounded-lg",
                  "bg-muted/50"
                )}>
                  <p className="font-medium mb-1">System Update</p>
                  <p className="text-sm text-muted-foreground">
                    New security features have been added to protect your documents.
                  </p>
                </div>
              </div>
            </div>
          </Widget>

          {/* Network Visualization - Row 3 */}
          <Widget className="col-span-full p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Network Overview</h3>
                <Button variant="outline" size="sm">View Details</Button>
              </div>
              <div className="h-[300px] flex items-center justify-center bg-muted/50 rounded-lg">
                <p className="text-muted-foreground">Network visualization coming soon</p>
              </div>
            </div>
          </Widget>
        </div>
      </div>
    </DashboardLayout>
  );
}