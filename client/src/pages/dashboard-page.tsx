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
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BellRing className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Recent Activity</h3>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4">
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
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Documents</h3>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">24</p>
                  <p className="text-sm text-muted-foreground">Total Files</p>
                </div>
                <div className="bg-primary/10 p-3 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
              </div>
            </div>
          </Widget>

          {/* Team Stats */}
          <Widget>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Team Members</h3>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                </div>
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
            </div>
          </Widget>

          {/* Quick Actions */}
          <Widget className="lg:col-span-2">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Quick Actions</h3>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-primary/5"
                >
                  <FileText className="h-6 w-6 text-primary" />
                  <span>Add Document</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-primary/5"
                >
                  <Users className="h-6 w-6 text-primary" />
                  <span>Invite Team</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-primary/5"
                >
                  <BarChart3 className="h-6 w-6 text-primary" />
                  <span>View Reports</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-primary/5"
                >
                  <Settings className="h-6 w-6 text-primary" />
                  <span>Settings</span>
                </Button>
              </div>
            </div>
          </Widget>

          {/* Announcements */}
          <Widget className="lg:col-span-2">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BellRing className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Announcements</h3>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 flex flex-col gap-3">
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
          </Widget>

          {/* Network Overview */}
          <Widget className="col-span-full">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Network Overview</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">View Details</Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-4">
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