import { PageHeader } from "@/components/ui/page-header";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { BreadcrumbNav } from "@/components/dashboard/BreadcrumbNav";
import { PageSideDrawer } from "@/components/ui/page-side-drawer";
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
      <div className="flex-1 flex overflow-x-hidden">
        <div className={`flex-1 min-w-0 ${drawerOpen ? 'mr-[27.25rem]' : ''}`}>
          <BreadcrumbNav items={breadcrumbItems} />
          <div className="mt-6">
            <PageHeader
              title="Onboarding Configuration"
              description="Design and manage the onboarding process."
            />
            <div className="mt-4">
              <div className="text-muted-foreground">
                Configure onboarding workflows and requirements here.
              </div>
              <div className="mt-8 space-y-6">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="prose dark:prose-invert max-w-none">
                    <h3>Section {i + 1}</h3>
                    <p>
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
                    </p>
                    <p>
                      Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
                    </p>
                    <p>
                      Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <PageSideDrawer 
          title="Onboarding Settings"
          titleIcon={<Info className="h-5 w-5" />}
          defaultOpen={true}
          isClosable={false}
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
    </DashboardLayout>
  );
}