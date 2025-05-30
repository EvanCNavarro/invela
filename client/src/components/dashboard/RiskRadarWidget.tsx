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
      subtitle="Risk breakdown across six key dimensions."
      icon={<Shield className="h-5 w-5" />}
      onVisibilityToggle={onToggle}
      isVisible={isVisible}
      headerClassName="pb-1" /* Reduce padding below header */
      className="h-full flex flex-col"
    >
      <div className="flex-grow">
        <RiskRadarChart 
          companyId={companyId} 
          showDropdown={false}
          className="shadow-none border-none h-full p-0"
        />
      </div>
    </Widget>
  )
}