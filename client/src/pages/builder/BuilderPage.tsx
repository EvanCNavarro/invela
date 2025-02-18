import { PageHeader } from "@/components/ui/page-header";
import { BuilderCard } from "@/components/builder/BuilderCard";

const builderCards = [
  {
    title: "Onboarding Configuration",
    description: "Set up questionnaires, surveys, and file requests for fintech onboarding process",
    imagePath: "/builder/onboarding.svg",
    route: "/builder/onboarding",
    ctaText: "Configure Onboarding"
  },
  {
    title: "Risk Score Rules",
    description: "Define dynamic risk scoring rules based on fintech data and certification standards",
    imagePath: "/builder/risk-rules.svg",
    route: "/builder/risk-rules",
    ctaText: "Set Up Rules"
  },
  {
    title: "Automated Reporting",
    description: "Configure system monitoring, audits, alerts, and notification settings",
    imagePath: "/builder/reporting.svg",
    route: "/builder/reporting",
    ctaText: "Manage Reports"
  },
  {
    title: "User Groups",
    description: "Create and manage user groups with custom permissions and notification settings",
    imagePath: "/builder/groups.svg",
    route: "/builder/groups",
    ctaText: "Manage Groups"
  }
];

export function BuilderPage() {
  return (
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
  );
}
