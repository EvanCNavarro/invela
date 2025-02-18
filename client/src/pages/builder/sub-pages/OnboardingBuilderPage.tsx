import { PageHeader } from "@/components/ui/page-header";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { BreadcrumbNav } from "@/components/dashboard/BreadcrumbNav";

const breadcrumbItems = [
  { label: "Builder", href: "/builder" },
  { label: "Onboarding Configuration", href: "/builder/onboarding" }
];

export function OnboardingBuilderPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BreadcrumbNav items={breadcrumbItems} />
        <PageHeader
          heading="Onboarding Configuration"
          subtext="Design and manage the onboarding process for fintech companies"
        />
        <div className="container mx-auto">
          {/* Content will be implemented later */}
          <p className="text-muted-foreground">Configure onboarding workflows and requirements.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}