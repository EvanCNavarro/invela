import { PageHeader } from "@/components/ui/page-header";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { BreadcrumbNav } from "@/components/dashboard/BreadcrumbNav";
import { PageSideDrawer } from "@/components/playground/PageSideDrawerPlayground";
import { Info } from "lucide-react";
import { useState } from "react";

const breadcrumbItems = [
  { label: "Builder", href: "/builder" },
  { label: "User Groups", href: "/builder/groups" }
];

export function GroupsBuilderPage() {
  const [drawerOpen, setDrawerOpen] = useState(true);

  return (
    <DashboardLayout>
      <div className="flex-1 p-8 pt-6 overflow-hidden">
        <div className="relative w-full">
          <div className={`transition-all duration-300 ${drawerOpen ? 'pr-[33.75rem]' : 'pr-0'}`}>
            <BreadcrumbNav items={breadcrumbItems} />
            <div className="mt-6">
              <PageHeader
                title="User Groups"
                description="Manage user groups and permissions."
              />
              <div className="w-full">
                <div className="text-muted-foreground">
                  Create and manage user groups here.
                </div>
              </div>
            </div>
          </div>

          <PageSideDrawer 
            title="Group Settings"
            titleIcon={<Info className="h-5 w-5" />}
            defaultOpen={drawerOpen}
            isClosable={true}
            onOpenChange={setDrawerOpen}
          >
            <div className="text-sm space-y-4">
              <h4 className="font-medium">Group Configuration</h4>
              <p className="text-muted-foreground">
                Configure user groups by setting up:
              </p>
              <ul className="space-y-2">
                <li>• Group roles</li>
                <li>• Access levels</li>
                <li>• User assignments</li>
                <li>• Permission sets</li>
              </ul>
            </div>
          </PageSideDrawer>
        </div>
      </div>
    </DashboardLayout>
  );
}