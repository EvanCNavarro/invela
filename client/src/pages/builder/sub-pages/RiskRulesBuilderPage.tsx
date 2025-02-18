import { PageHeader } from "@/components/ui/page-header";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export function RiskRulesBuilderPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          heading="Risk Score Rules"
          subtext="Define dynamic risk scoring rules based on fintech data and certification standards"
        />
        <div className="container mx-auto">
          {/* Content will be implemented later */}
          <p className="text-muted-foreground">Set up risk assessment criteria and scoring rules.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}