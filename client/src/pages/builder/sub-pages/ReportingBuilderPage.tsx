import { PageHeader } from "@/components/ui/page-header";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { BreadcrumbNav } from "@/components/dashboard/BreadcrumbNav";
import { PageSideDrawer, PageTemplate } from "@/components/ui/page-side-drawer";
import { Info } from "lucide-react";
import { useState } from "react";

const breadcrumbItems = [
  { label: "Builder", href: "/builder" },
  { label: "Automated Reporting", href: "/builder/reporting" }
];

export function ReportingBuilderPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const drawer = (
    <PageSideDrawer 
      title="Reporting Settings"
      titleIcon={<Info className="h-5 w-5" />}
      defaultOpen={false}
      isClosable={true}
      onOpenChange={setDrawerOpen}
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
    </PageSideDrawer>
  );

  return (
    <DashboardLayout>
      <PageTemplate
        drawer={drawer}
        drawerOpen={drawerOpen}
        onDrawerOpenChange={setDrawerOpen}
      >
        <BreadcrumbNav items={breadcrumbItems} />
        <div className="mt-6">
          <PageHeader
            title="Automated Reporting"
            description="Configure monitoring and alert workflows."
          />
          <div className="mt-4">
            <div className="text-muted-foreground">
              Configure monitoring and reporting workflows here.
            </div>
          </div>
        </div>
      </PageTemplate>
    </DashboardLayout>
  );
}