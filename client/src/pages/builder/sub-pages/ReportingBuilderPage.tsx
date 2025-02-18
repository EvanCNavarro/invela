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
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full space-y-6">
        <BreadcrumbNav items={breadcrumbItems} />
        <div className="flex-1 relative">
          <div className={`transition-all duration-300 ${drawerOpen ? 'pr-[25.75rem]' : 'pr-0'}`}>
            <PageHeader
              title="Automated Reporting"
              description="Configure monitoring and alert workflows."
            />
            <div className="container mx-auto p-6">
              <div className="text-muted-foreground">
                Configure monitoring and reporting workflows here.
              </div>
            </div>
          </div>

          <BuilderPageDrawer 
            title="Reporting Settings" 
            defaultOpen={false}
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