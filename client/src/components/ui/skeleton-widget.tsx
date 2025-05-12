import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonWidgetProps {
  className?: string;
  height?: string;
  headerHeight?: string;
  contentLines?: number;
  showGraph?: boolean;
}

export function SkeletonWidget({
  className,
  height = "h-[300px]",
  headerHeight = "h-[60px]",
  contentLines = 3,
  showGraph = false
}: SkeletonWidgetProps) {
  return (
    <Card className={cn("w-full overflow-hidden", height, className)}>
      <CardHeader className={cn("p-4", headerHeight)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {contentLines > 0 && (
          <div className="space-y-3">
            {Array.from({ length: contentLines }).map((_, i) => (
              <Skeleton key={i} className={`h-4 w-${Math.floor(Math.random() * 40) + 60}%`} />
            ))}
          </div>
        )}
        
        {showGraph && (
          <div className="mt-4">
            <Skeleton className="h-[120px] w-full rounded-md" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}