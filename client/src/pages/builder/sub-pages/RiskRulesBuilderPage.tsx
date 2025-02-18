import { PageHeader } from "@/components/ui/page-header";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { BreadcrumbNav } from "@/components/dashboard/BreadcrumbNav";
import { PageSideDrawer } from "@/components/playground/PageSideDrawerPlayground";
import { Info } from "lucide-react";
import { useState } from "react";

const breadcrumbItems = [
  { label: "Builder", href: "/builder" },
  { label: "Risk Score Rules", href: "/builder/risk-rules" }
];

export function RiskRulesBuilderPage() {
  const [drawerOpen, setDrawerOpen] = useState(true);

  return (
    <DashboardLayout>
      <div className="flex-1 p-8 pt-6 overflow-hidden">
        <div className="relative w-full">
          <div className={`transition-all duration-300 ${drawerOpen ? 'pr-[33.75rem]' : 'pr-0'}`}>
            <BreadcrumbNav items={breadcrumbItems} />
            <div className="mt-6">
              <PageHeader
                title="Risk Score Rules"
                description="Set up risk assessment criteria."
              />
              <div className="w-full">
                <div className="text-muted-foreground">
                  Define and manage risk scoring rules here.
                </div>
              </div>
            </div>
          </div>

          <PageSideDrawer 
            title="Risk Rules Settings"
            titleIcon={<Info className="h-5 w-5" />}
            defaultOpen={drawerOpen}
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
        </div>
      </div>
    </DashboardLayout>
  );
}