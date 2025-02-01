import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Widget } from "@/components/dashboard/Widget";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Widget
          title="What You Missed"
          className="col-span-full lg:col-span-2"
        >
          <div className="space-y-4">
            <p className="text-muted-foreground">
              No recent updates to show.
            </p>
          </div>
        </Widget>

        <Widget
          title="Announcements"
          className="col-span-full lg:col-span-1"
        >
          <div className="space-y-4">
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
          <div className="grid grid-cols-2 gap-4">
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
          {/* Add company score visualization */}
        </Widget>

        <Widget
          title="Network Visualization"
          className="col-span-full"
        >
          {/* Add network graph visualization */}
        </Widget>
      </div>
    </DashboardLayout>
  );
}
