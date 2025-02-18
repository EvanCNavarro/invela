import { PageHeader } from "@/components/ui/page-header";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export function GroupsBuilderPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          heading="User Groups"
          subtext="Create and manage user groups with custom permissions and notification settings"
        />
        <div className="container mx-auto">
          {/* Content will be implemented later */}
          <p className="text-muted-foreground">Manage user groups and permissions.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}