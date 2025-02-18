import { PageHeader } from "@/components/ui/page-header";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { BreadcrumbNav } from "@/components/dashboard/BreadcrumbNav";
import { BuilderPageDrawer } from "@/components/builder/BuilderPageDrawer";
import { useState } from "react";

const breadcrumbItems = [
  { label: "Builder", href: "/builder" },
  { label: "Onboarding", href: "/builder/onboarding" }
];

export function OnboardingBuilderPage() {
  const [drawerOpen, setDrawerOpen] = useState(true);

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* Main content area with split layout */}
        <div className="flex relative">
          {/* Left section */}
          <div className={`flex-1 transition-all duration-300 ${drawerOpen ? 'mr-[25.75rem]' : 'mr-0'}`}>
            <BreadcrumbNav items={breadcrumbItems} />

            <div className="mt-6">
              <PageHeader
                title="Onboarding Configuration"
                description="Design and manage the onboarding process."
              />
              <div className="container mx-auto p-6">
                <div className="text-muted-foreground">
                  Configure onboarding workflows and requirements here.
                </div>
              </div>
            </div>
          </div>

          {/* Right section */}
          <BuilderPageDrawer 
            title="Onboarding Settings" 
            defaultOpen={drawerOpen}
          >
            <div className="text-sm space-y-4">
              <h4 className="font-medium">Configuration Options</h4>
              <p className="text-muted-foreground">
                Customize the onboarding experience by configuring:
              </p>
              <ul className="space-y-2">
                <li>• Questionnaire steps</li>
                <li>• Required documents</li>
                <li>• Verification processes</li>
                <li>• Welcome messages</li>
              </ul>
            </div>
          </BuilderPageDrawer>
        </div>
      </div>
    </DashboardLayout>
  );
}