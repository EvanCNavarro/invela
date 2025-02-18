import { PageHeader } from "@/components/ui/page-header";
import { BuilderCard } from "@/components/builder/BuilderCard";
import { ClipboardList, Scale, Bell, Users } from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout";

const builderCards = [
  {
    title: "Onboarding Configuration",
    description: "Configure fintech onboarding questionnaires and requirements.",
    imagePath: "/assets/thumbnail_onboarding.png",
    route: "/builder/onboarding",
    ctaText: "Configure Onboarding",
    icon: ClipboardList
  },
  {
    title: "Risk Score Rules",
    description: "Define risk scoring rules based on fintech data standards.",
    imagePath: "/assets/thumbnail_rules.png",
    route: "/builder/risk-rules",
    ctaText: "Set Up Rules",
    icon: Scale
  },
  {
    title: "Automated Reporting",
    description: "Configure system monitoring and notification settings.",
    imagePath: "/assets/thumbnail_reports.png",
    route: "/builder/reporting",
    ctaText: "Manage Reports",
    icon: Bell
  },
  {
    title: "User Groups",
    description: "Create and manage user groups with custom permissions.",
    imagePath: "/assets/thumbnail_groups.png",
    route: "/builder/groups",
    ctaText: "Manage Groups",
    icon: Users
  }
];

export function BuilderPage() {
  console.log('BuilderPage: Rendering page');
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {console.log('BuilderPage: About to render PageHeader')}
        <PageHeader
          title="Platform Builder"
          description="Design and customize your fintech platform's functionality with our comprehensive suite of builder tools"
        />
        {console.log('BuilderPage: PageHeader rendered')}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {builderCards.map((card) => (
            <BuilderCard key={card.route} {...card} />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}