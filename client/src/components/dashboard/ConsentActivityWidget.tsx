import { Widget } from "@/components/dashboard/Widget";
import { ConsentActivityChart } from "@/components/insights/ConsentActivityChart";
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { BarChart2 } from "lucide-react";
import { useState } from "react";
import { TimeframeOption } from "@/components/insights/ConsentActivityChart";

interface ConsentActivityWidgetProps {
  companyId?: number;
  onToggle: () => void;
  isVisible: boolean;
}

/**
 * Dashboard widget for Consent Activity visualization
 */
export function ConsentActivityWidget({ 
  companyId, 
  onToggle, 
  isVisible 
}: ConsentActivityWidgetProps) {
  // State for selected timeframe
  const [timeframe, setTimeframe] = useState<TimeframeOption>('1year');
  
  // Handle timeframe change
  const handleTimeframeChange = (value: string) => {
    if (value === '1day' || value === '30days' || value === '1year') {
      console.log('[ConsentActivityWidget] Timeframe changed:', value);
      setTimeframe(value as TimeframeOption);
    }
  };

  return (
    <Widget
      title="Consent Activity"
      subtitle="Track active and newly granted consents over time."
      icon={<BarChart2 className="h-5 w-5" />}
      onVisibilityToggle={onToggle}
      isVisible={isVisible}
      className="h-full flex flex-col"
    >
      <div className="flex items-center justify-end mb-2">
        <ToggleGroup
          type="single"
          value={timeframe}
          onValueChange={handleTimeframeChange}
          className="justify-start"
          size="sm"
        >
          <ToggleGroupItem value="1day" aria-label="1 Day view" className="text-xs px-2">
            1D
          </ToggleGroupItem>
          <ToggleGroupItem value="30days" aria-label="30 Days view" className="text-xs px-2">
            30D
          </ToggleGroupItem>
          <ToggleGroupItem value="1year" aria-label="1 Year view" className="text-xs px-2">
            1Y
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      
      <div className="flex-grow">
        <ConsentActivityChart
          companyId={companyId}
          timeframe={timeframe}
          showDropdown={false}
          className="shadow-none border-none h-full p-0"
        />
      </div>
    </Widget>
  );
}