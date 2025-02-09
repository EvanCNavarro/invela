import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface WidgetEmptyStateProps {
  icon?: LucideIcon;
  message: string;
  className?: string;
}

export function WidgetEmptyState({ 
  icon: Icon,
  message,
  className 
}: WidgetEmptyStateProps) {
  return (
    <div className={cn(
      "flex items-center justify-center min-h-[200px]",
      className
    )}>
      <div className="space-y-2 text-center">
        {Icon && <Icon className="h-8 w-8 mx-auto text-muted-foreground" />}
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
