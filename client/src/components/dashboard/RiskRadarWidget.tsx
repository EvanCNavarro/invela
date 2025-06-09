/**
 * ========================================
 * Risk Radar Widget - Multi-Dimensional Risk Analysis
 * ========================================
 * 
 * Specialized dashboard widget providing comprehensive risk assessment
 * visualization across six key risk dimensions. Implements interactive
 * radar chart visualization for executive risk monitoring and analysis.
 * 
 * Key Features:
 * - Six-dimensional risk assessment visualization
 * - Interactive radar chart with real-time data
 * - Responsive design with flexible layout
 * - Professional styling and shadcn UI integration
 * - Optimized rendering performance
 * 
 * Risk Dimensions:
 * - Operational Risk
 * - Financial Risk
 * - Compliance Risk
 * - Cyber Security Risk
 * - Reputational Risk
 * - Strategic Risk
 * 
 * @module components/dashboard/RiskRadarWidget
 * @version 1.0.0
 * @since 2025-05-23
 */

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
      icon={<Shield className="h-5 w-5 text-muted-foreground" />}
      onVisibilityToggle={onToggle}
      isVisible={isVisible}
      headerClassName="pb-1" /* Reduce padding below header */
      className="h-full flex flex-col"
    >
      <div className="flex-grow overflow-hidden min-h-0">
        <div className="w-full h-full max-h-[360px] min-h-[300px]">
          <RiskRadarChart 
            companyId={companyId} 
            showDropdown={false}
            className="shadow-none border-none w-full h-full"
          />
        </div>
      </div>
    </Widget>
  )
}