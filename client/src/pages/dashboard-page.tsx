import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Widget } from "@/components/dashboard/Widget";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { 
  BellRing, 
  FileText, 
  Users, 
  BarChart3, 
  Settings,
  MoreHorizontal
} from "lucide-react";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Get an overview of your company's performance and recent activities."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Activity Feed */}
          <Widget className="lg:col-span-2">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-6 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <BellRing className="h-5 w-5 text-primary" />
                  <span className="font-medium">Recent Activity</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  aria-label="More options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
              <div className="px-6 pb-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Welcome to your dashboard! Check your recent notifications and updates here.
                  </p>
                </div>
              </div>
            </div>
          </Widget>

          {/* Documents Stats */}
          <Widget>
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-6 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="font-medium">Documents</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  aria-label="More options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
              <div className="px-6 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">24</p>
                    <p className="text-sm text-muted-foreground">Total Files</p>
                  </div>
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </div>
            </div>
          </Widget>

          {/* Team Stats */}
          <Widget>
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-6 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="font-medium">Team Members</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  aria-label="More options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
              <div className="px-6 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">12</p>
                    <p className="text-sm text-muted-foreground">Active Users</p>
                  </div>
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </div>
            </div>
          </Widget>

          {/* Quick Actions */}
          <Widget className="lg:col-span-2">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-6 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span className="font-medium">Quick Actions</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  aria-label="More options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
              <div className="px-6 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-primary/5"
                    aria-label="Add Document"
                  >
                    <FileText className="h-6 w-6 text-primary" />
                    <span>Add Document</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-primary/5"
                    aria-label="Invite Team Members"
                  >
                    <Users className="h-6 w-6 text-primary" />
                    <span>Invite Team</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-primary/5"
                    aria-label="View Reports"
                  >
                    <BarChart3 className="h-6 w-6 text-primary" />
                    <span>View Reports</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-primary/5"
                    aria-label="Open Settings"
                  >
                    <Settings className="h-6 w-6 text-primary" />
                    <span>Settings</span>
                  </Button>
                </div>
              </div>
            </div>
          </Widget>

          {/* Announcements */}
          <Widget className="lg:col-span-2">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-6 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <BellRing className="h-5 w-5 text-primary" />
                  <span className="font-medium">Announcements</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  aria-label="More options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
              <div className="px-6 pb-4">
                <div className="flex flex-col gap-3">
                  <div className={cn(
                    "p-4 rounded-lg",
                    "bg-primary/5 border border-primary/10"
                  )}>
                    <p className="font-medium">Welcome to Invela!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Explore our latest features and improvements in document management.
                    </p>
                  </div>
                  <div className={cn(
                    "p-4 rounded-lg",
                    "bg-muted/50"
                  )}>
                    <p className="font-medium">System Update</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      New security features have been added to protect your documents.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Widget>

          {/* Network Overview */}
          <Widget className="col-span-full">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-6 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span className="font-medium">Network Overview</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    aria-label="View network details"
                  >
                    View Details
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    aria-label="More options"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="px-6 pb-4">
                <div className="h-[300px] flex items-center justify-center bg-muted/50 rounded-lg">
                  <p className="text-muted-foreground">Network visualization coming soon</p>
                </div>
              </div>
            </div>
          </Widget>
        </div>
      </div>
    </DashboardLayout>
  );
}