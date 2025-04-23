import { Widget } from "@/components/dashboard/Widget";
import { RiskRadarChart } from "@/components/insights/RiskRadarChart";
import { Shield } from "lucide-react";

interface RiskRadarWidgetProps {
  companyId: number;
  onToggle: () => void;
  isVisible: boolean;
}

export function RiskRadarWidget({ companyId, onToggle, isVisible }: RiskRadarWidgetProps) {
  return (
    <Widget
      title="Risk Radar"
      icon={<Shield className="h-5 w-5" />}
      onVisibilityToggle={onToggle}
      isVisible={isVisible}
      headerClassName="pb-0" /* Minimal padding below header */
      className="h-full flex flex-col"
      contentClassName="p-0" /* No padding in content area */
    >
      <RiskRadarChart 
        companyId={companyId} 
        showDropdown={false}
        className="shadow-none border-none h-full p-0"
      />
    </Widget>
  )
}