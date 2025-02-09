import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface WidgetButtonAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
  dataElement?: string;
}

interface WidgetButtonGridProps {
  actions: WidgetButtonAction[];
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function WidgetButtonGrid({ 
  actions,
  columns = 2,
  className 
}: WidgetButtonGridProps) {
  return (
    <div className={cn(
      "grid gap-2",
      columns === 1 && "grid-cols-1",
      columns === 2 && "grid-cols-2",
      columns === 3 && "grid-cols-3",
      columns === 4 && "grid-cols-4",
      className
    )}>
      {actions.map((action, index) => (
        <Button
          key={index}
          variant={action.variant || "outline"}
          className={cn(
            "w-full font-medium",
            action.className
          )}
          onClick={action.onClick}
          data-element={action.dataElement}
        >
          {action.icon && (
            <action.icon className="h-4 w-4 mr-2" />
          )}
          {action.label}
        </Button>
      ))}
    </div>
  );
}
