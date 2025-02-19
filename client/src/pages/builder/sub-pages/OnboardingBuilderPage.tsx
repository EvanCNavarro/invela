import { PageHeader } from "@/components/ui/page-header";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { BreadcrumbNav } from "@/components/dashboard/BreadcrumbNav";
import { PageSideDrawer, PageTemplate } from "@/components/ui/page-side-drawer";
import { Info } from "lucide-react";
import { useState } from "react";

const breadcrumbItems = [
  { label: "Builder", href: "/builder" },
  { label: "Onboarding", href: "/builder/onboarding" }
];

export function OnboardingBuilderPage() {
  const [drawerOpen, setDrawerOpen] = useState(true);

  const drawer = (
    <PageSideDrawer 
      title="Onboarding Settings"
      titleIcon={<Info className="h-5 w-5" />}
      defaultOpen={true}
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
  );

  return (
    <DashboardLayout>
      <PageTemplate
        drawer={drawer}
        drawerOpen={drawerOpen}
        onDrawerOpenChange={setDrawerOpen}
      >
        <BreadcrumbNav items={breadcrumbItems} />
        <PageHeader
          title="Onboarding Configuration"
          description="Design and manage the onboarding process."
        />
        <div className="mt-6">
          <div className="text-muted-foreground">
            Configure onboarding workflows and requirements here.
          </div>
        </div>
      </PageTemplate>
    </DashboardLayout>
  );
}