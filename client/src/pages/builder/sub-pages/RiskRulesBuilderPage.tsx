import { PageHeader } from "@/components/ui/page-header";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { BreadcrumbNav } from "@/components/dashboard/BreadcrumbNav";
import { BuilderPageDrawer } from "@/components/builder/BuilderPageDrawer";
import { useState } from "react";

const breadcrumbItems = [
  { label: "Builder", href: "/builder" },
  { label: "Risk Score Rules", href: "/builder/risk-rules" }
];

export function RiskRulesBuilderPage() {
  const [drawerOpen, setDrawerOpen] = useState(true);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BreadcrumbNav items={breadcrumbItems} />
        <div className="flex relative min-h-[calc(100vh-12rem)]">
          <div className={`flex-1 transition-all duration-300 ${drawerOpen ? 'pr-[25.75rem]' : 'pr-0'}`}>
            <PageHeader
              title="Risk Score Rules"
              description="Set up risk assessment criteria."
            />
            <div className="container mx-auto p-6">
              <div className="text-muted-foreground">
                Define and manage risk scoring rules here.
              </div>
            </div>
          </div>

          <BuilderPageDrawer 
            title="Risk Rules Settings" 
            defaultOpen={drawerOpen}
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
          </BuilderPageDrawer>
        </div>
      </div>
    </DashboardLayout>
  );
}