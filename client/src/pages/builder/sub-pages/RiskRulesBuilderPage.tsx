import { PageHeader } from "@/components/ui/page-header";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { BreadcrumbNav } from "@/components/dashboard/BreadcrumbNav";

const breadcrumbItems = [
  { label: "Builder", href: "/builder" },
  { label: "Risk Score Rules", href: "/builder/risk-rules" }
];

export function RiskRulesBuilderPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BreadcrumbNav items={breadcrumbItems} />
        <PageHeader
          title="Risk Score Rules"
          description="Set up risk assessment criteria based on fintech data standards"
        />
        <div className="container mx-auto">
          {/* Content will be implemented later */}
          <p className="text-muted-foreground">Set up risk assessment criteria and scoring rules.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}