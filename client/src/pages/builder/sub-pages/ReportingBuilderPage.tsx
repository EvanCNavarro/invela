import { PageHeader } from "@/components/ui/page-header";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { BreadcrumbNav } from "@/components/dashboard/BreadcrumbNav";
import { BuilderPageDrawer } from "@/components/builder/BuilderPageDrawer";
import { useState } from "react";

const breadcrumbItems = [
  { label: "Builder", href: "/builder" },
  { label: "Automated Reporting", href: "/builder/reporting" }
];

export function ReportingBuilderPage() {
  const [drawerOpen, setDrawerOpen] = useState(true);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BreadcrumbNav items={breadcrumbItems} />
        <div className="flex relative min-h-[calc(100vh-12rem)]">
          <div className={`flex-1 transition-all duration-300 ${drawerOpen ? 'pr-[23.75rem]' : 'pr-0'}`}>
            <PageHeader
              title="Automated Reporting"
              description="Configure monitoring and alert workflows."
            />
            <div className="container mx-auto p-6">
              {/* Main content will be implemented later */}
              <div className="text-muted-foreground">
                Configure monitoring and reporting workflows here.
              </div>
            </div>
          </div>

          <BuilderPageDrawer 
            title="Reporting Settings" 
            defaultOpen={drawerOpen}
          >
            <div className="text-sm space-y-4">
              <h4 className="font-medium">Report Configuration</h4>
              <p className="text-muted-foreground">
                Set up automated reporting by configuring:
              </p>
              <ul className="space-y-2">
                <li>• Report templates</li>
                <li>• Schedule settings</li>
                <li>• Notification rules</li>
                <li>• Data sources</li>
              </ul>
            </div>
          </BuilderPageDrawer>
        </div>
      </div>
    </DashboardLayout>
  );
}