import { Widget } from "@/components/dashboard/Widget";
import { NetworkVisualization } from "@/components/network";
import { Globe } from "lucide-react";

interface NetworkVisualizationWidgetProps {
  onToggle: () => void;
  isVisible: boolean;
}

export function NetworkVisualizationWidget({ onToggle, isVisible }: NetworkVisualizationWidgetProps) {
  return (
    <Widget
      title="Network Visualization"
      icon={<Globe className="h-5 w-5 text-muted-foreground" />}
      onVisibilityToggle={onToggle}
      isVisible={isVisible}
      headerClassName="pb-2"
      className="h-full"
    >
      <div className="h-full">
        <NetworkVisualization className="shadow-none border-none h-full" />
      </div>
    </Widget>
  )
}