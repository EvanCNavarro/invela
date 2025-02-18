import { PageHeader } from "@/components/ui/page-header";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { BreadcrumbNav } from "@/components/dashboard/BreadcrumbNav";
import { PageSideDrawer } from "@/components/playground/PageSideDrawerPlayground";
import { Info } from "lucide-react";
import { useState } from "react";

const breadcrumbItems = [
  { label: "Builder", href: "/builder" },
  { label: "Onboarding", href: "/builder/onboarding" }
];

export function OnboardingBuilderPage() {
  const [drawerOpen, setDrawerOpen] = useState(true);

  return (
    <DashboardLayout>
      <div className="flex-1 p-8 pt-6 overflow-hidden">
        <div className="relative w-full">
          <div className={`transition-all duration-300 ${drawerOpen ? 'pr-[33.75rem]' : 'pr-0'}`}>
            <BreadcrumbNav items={breadcrumbItems} />
            <div className="mt-6">
              <PageHeader
                title="Onboarding Configuration"
                description="Design and manage the onboarding process."
              />
              <div className="w-full">
                <div className="text-muted-foreground">
                  Configure onboarding workflows and requirements here.
                </div>
              </div>
            </div>
          </div>

          <PageSideDrawer 
            title="Onboarding Settings"
            titleIcon={<Info className="h-5 w-5" />}
            defaultOpen={drawerOpen}
            isClosable={true}
            onOpenChange={setDrawerOpen}
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
          </PageSideDrawer>
        </div>
      </div>
    </DashboardLayout>
  );
}