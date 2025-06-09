/**
 * ========================================
 * System Overview Widget - Invela Dashboard Component
 * ========================================
 * 
 * Dashboard widget providing comprehensive system-wide enrollment statistics
 * and insights exclusively for Invela companies. Features real-time data
 * integration showing all companies and accreditations across the platform.
 * 
 * Key Features:
 * - System-wide enrollment data visualization
 * - Timeframe selection (1 day, 30 days, 1 year)
 * - Interactive bar chart with proper legend spacing
 * - Responsive design optimized for dashboard context
 * - Invela-exclusive access control
 * 
 * Data Sources:
 * - All companies in the system (1,210 total)
 * - All active accreditations (800 active)
 * - Real-time enrollment trends
 * 
 * @module components/dashboard/SystemOverviewWidget
 * @version 1.0.0
 * @since 2025-06-06
 */

import { Widget } from "@/components/dashboard/Widget";
import { SystemOverviewInsight } from "@/components/insights/SystemOverviewInsight";
import { BarChart3 } from "lucide-react";

interface SystemOverviewWidgetProps {
  onToggle: () => void;
  isVisible: boolean;
}

export function SystemOverviewWidget({ onToggle, isVisible }: SystemOverviewWidgetProps) {
  console.log('🔍 SystemOverviewWidget render:', { isVisible });
  
  return (
    <Widget
      title="System Overview"
      icon={<BarChart3 className="h-5 w-5 text-gray-700" />}
      onVisibilityToggle={onToggle}
      isVisible={isVisible}
      headerClassName="pb-2"
      className="h-full flex flex-col"
    >
      <div className="flex-grow overflow-hidden min-h-0">
        <div className="w-full h-full max-h-[500px] min-h-[400px]">
          <SystemOverviewInsight className="shadow-none border-none h-full" />
        </div>
      </div>
    </Widget>
  );
}