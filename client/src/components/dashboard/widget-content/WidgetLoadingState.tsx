import { cn } from "@/lib/utils";

interface WidgetLoadingStateProps {
  message?: string;
  className?: string;
}

export function WidgetLoadingState({ 
  message = "Loading...", 
  className 
}: WidgetLoadingStateProps) {
  return (
    <div className={cn(
      "flex items-center justify-center min-h-[200px]",
      className
    )}>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
