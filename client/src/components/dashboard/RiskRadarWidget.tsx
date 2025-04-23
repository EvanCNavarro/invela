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
      headerClassName="pb-1" /* Reduce padding below header */
      className="h-full w-full flex flex-col"
    >
      <div className="flex-grow w-full h-full">
        <RiskRadarChart 
          companyId={companyId} 
          showDropdown={false}
          className="shadow-none border-none h-full w-full p-0"
        />
      </div>
    </Widget>
  )
}