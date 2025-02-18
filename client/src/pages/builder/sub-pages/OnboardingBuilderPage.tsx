import { PageHeader } from "@/components/ui/page-header";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export function OnboardingBuilderPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          heading="Onboarding Configuration"
          subtext="Set up questionnaires, surveys, and file requests for fintech onboarding process"
        />
        <div className="container mx-auto">
          {/* Content will be implemented later */}
          <p className="text-muted-foreground">Configure onboarding workflows and requirements.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}