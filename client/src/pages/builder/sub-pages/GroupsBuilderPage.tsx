import { PageHeader } from "@/components/ui/page-header";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { BreadcrumbNav } from "@/components/dashboard/BreadcrumbNav";

const breadcrumbItems = [
  { label: "Builder", href: "/builder" },
  { label: "User Groups", href: "/builder/groups" }
];

export function GroupsBuilderPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BreadcrumbNav items={breadcrumbItems} />
        <PageHeader
          title="User Groups"
          description="Manage user groups and permissions."
        />
        <div className="container mx-auto">
          {/* Content will be implemented later */}
        </div>
      </div>
    </DashboardLayout>
  );
}