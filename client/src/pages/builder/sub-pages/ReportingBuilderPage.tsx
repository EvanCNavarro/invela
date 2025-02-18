import { PageHeader } from "@/components/ui/page-header";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { BreadcrumbNav } from "@/components/dashboard/BreadcrumbNav";

const breadcrumbItems = [
  { label: "Builder", href: "/builder" },
  { label: "Automated Reporting", href: "/builder/reporting" }
];

export function ReportingBuilderPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BreadcrumbNav items={breadcrumbItems} />
        <PageHeader
          title="Automated Reporting"
          description="Configure monitoring, alerts, and notification workflows"
        />
        <div className="container mx-auto">
          {/* Content will be implemented later */}
          <p className="text-muted-foreground">Set up automated reporting and monitoring rules.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}