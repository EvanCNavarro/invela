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
          <Widget className="lg:col-span-2 bg-card">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Recent Activity</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More options">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <div className="bg-muted/40 rounded-md p-3">
                <p className="text-sm text-muted-foreground">
                  Welcome to your dashboard! Check your recent notifications and updates here.
                </p>
              </div>
            </div>
          </Widget>

          {/* Documents Stats */}
          <Widget className="bg-card">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Documents</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold tracking-tight">24</p>
                  <p className="text-sm text-muted-foreground">Total Files</p>
                </div>
                <div className="rounded-md bg-primary/10 p-2">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
              </div>
            </div>
          </Widget>

          {/* Team Stats */}
          <Widget className="bg-card">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Team Members</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold tracking-tight">12</p>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                </div>
                <div className="rounded-md bg-primary/10 p-2">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </div>
            </div>
          </Widget>

          {/* Quick Actions */}
          <Widget className="lg:col-span-2 bg-card">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Quick Actions</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More options">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4">
              <Button 
                variant="outline" 
                className="h-[88px] flex flex-col items-center justify-center gap-2 hover:bg-muted"
                aria-label="Add Document"
              >
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-sm">Add Document</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-[88px] flex flex-col items-center justify-center gap-2 hover:bg-muted"
                aria-label="Invite Team Members"
              >
                <Users className="h-5 w-5 text-primary" />
                <span className="text-sm">Invite Team</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-[88px] flex flex-col items-center justify-center gap-2 hover:bg-muted"
                aria-label="View Reports"
              >
                <BarChart3 className="h-5 w-5 text-primary" />
                <span className="text-sm">View Reports</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-[88px] flex flex-col items-center justify-center gap-2 hover:bg-muted"
                aria-label="Open Settings"
              >
                <Settings className="h-5 w-5 text-primary" />
                <span className="text-sm">Settings</span>
              </Button>
            </div>
          </Widget>

          {/* Announcements */}
          <Widget className="lg:col-span-2 bg-card">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Announcements</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More options">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-muted rounded-md p-3">
                <p className="text-sm font-medium mb-1">Welcome to Invela!</p>
                <p className="text-sm text-muted-foreground">
                  Explore our latest features and improvements in document management.
                </p>
              </div>
              <div className="bg-muted rounded-md p-3">
                <p className="text-sm font-medium mb-1">System Update</p>
                <p className="text-sm text-muted-foreground">
                  New security features have been added to protect your documents.
                </p>
              </div>
            </div>
          </Widget>

          {/* Network Overview */}
          <Widget className="col-span-full bg-card">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Network Overview</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7">View Details</Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More options">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-4">
              <div className="h-[280px] flex items-center justify-center bg-muted/40 rounded-md">
                <p className="text-sm text-muted-foreground">Network visualization coming soon</p>
              </div>
            </div>
          </Widget>
        </div>
      </div>
    </DashboardLayout>
  );
}