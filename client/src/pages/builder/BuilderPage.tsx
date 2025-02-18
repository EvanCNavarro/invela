import { PageHeader } from "@/components/ui/page-header";
import { BuilderCard } from "@/components/builder/BuilderCard";
import { ClipboardList, Scale, Bell, Users } from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout";

const builderCards = [
  {
    title: "Onboarding Configuration",
    description: "Configure fintech onboarding questionnaires and requirements.",
    imagePath: "/builder/onboarding.svg",
    route: "/builder/onboarding",
    ctaText: "Configure Onboarding",
    icon: ClipboardList
  },
  {
    title: "Risk Score Rules",
    description: "Define risk scoring rules based on fintech data standards.",
    imagePath: "/builder/risk-rules.svg",
    route: "/builder/risk-rules",
    ctaText: "Set Up Rules",
    icon: Scale
  },
  {
    title: "Automated Reporting",
    description: "Configure system monitoring and notification settings.",
    imagePath: "/builder/reporting.svg",
    route: "/builder/reporting",
    ctaText: "Manage Reports",
    icon: Bell
  },
  {
    title: "User Groups",
    description: "Create and manage user groups with custom permissions.",
    imagePath: "/builder/groups.svg",
    route: "/builder/groups",
    ctaText: "Manage Groups",
    icon: Users
  }
];

export function BuilderPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          heading="Builder"
          subtext="Configure and customize your platform's core functionalities"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {builderCards.map((card) => (
            <BuilderCard key={card.route} {...card} />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}