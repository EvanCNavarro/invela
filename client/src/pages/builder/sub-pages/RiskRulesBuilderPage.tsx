import { PageHeader } from "@/components/ui/page-header";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { BreadcrumbNav } from "@/components/dashboard/BreadcrumbNav";
import { PageSideDrawer, PageTemplate } from "@/components/ui/page-side-drawer";
import { Info } from "lucide-react";
import { useState } from "react";

const breadcrumbItems = [
  { label: "Builder", href: "/builder" },
  { label: "Risk Score Rules", href: "/builder/risk-rules" }
];

export function RiskRulesBuilderPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const drawer = (
    <PageSideDrawer 
      title="Risk Rules Settings"
      titleIcon={<Info className="h-5 w-5" />}
      defaultOpen={false}
      isClosable={true}
      onOpenChange={setDrawerOpen}
    >
      <div className="text-sm space-y-4">
        <h4 className="font-medium">Rule Configuration</h4>
        <p className="text-muted-foreground">
          Configure risk assessment rules by setting up:
        </p>
        <ul className="space-y-2">
          <li>• Scoring criteria</li>
          <li>• Risk thresholds</li>
          <li>• Assessment factors</li>
          <li>• Alert triggers</li>
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
            title="Risk Score Rules"
            description="Set up risk assessment criteria."
          />
          <div className="mt-4">
            <div className="text-muted-foreground">
              Define and manage risk scoring rules here.
            </div>
          </div>
        </div>
      </PageTemplate>
    </DashboardLayout>
  );
}