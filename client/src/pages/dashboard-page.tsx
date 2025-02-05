import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Widget } from "@/components/dashboard/Widget";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold mb-1">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Get an overview of your company's performance and recent activities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <Widget
            title="What You Missed"
            className="col-span-full lg:col-span-2"
          >
            <div className="space-y-2">
              <p className="text-muted-foreground">
                No recent updates to show.
              </p>
            </div>
          </Widget>

          <Widget
            title="Announcements"
            className="col-span-full lg:col-span-1"
          >
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Welcome to Invela! Check out our latest features.
              </p>
            </div>
          </Widget>

          <Widget
            title="Quick Actions"
            onEdit={() => {}}
            className="col-span-full md:col-span-1"
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

          <Widget
            title="Your Company Score"
            className="col-span-full md:col-span-1"
          >
            <div className="flex items-center justify-center min-h-[120px]">
              <p className="text-muted-foreground">No score data available</p>
            </div>
          </Widget>

          <Widget
            title="Network Visualization"
            className="col-span-full"
          >
            <div className="flex items-center justify-center min-h-[120px]">
              <p className="text-muted-foreground">Network visualization coming soon</p>
            </div>
          </Widget>
        </div>
      </div>
    </DashboardLayout>
  );
}