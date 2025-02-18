import { PageHeader } from "@/components/ui/page-header";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export function ReportingBuilderPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          heading="Automated Reporting"
          subtext="Configure system monitoring, audits, alerts, and notification settings"
        />
        <div className="container mx-auto">
          {/* Content will be implemented later */}
          <p className="text-muted-foreground">Set up automated reporting and monitoring rules.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}