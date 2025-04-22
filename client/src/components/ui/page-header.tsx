import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
  actions?: ReactNode;
  icon?: ReactNode;
  meta?: ReactNode;
}

export function PageHeader({ 
  title, 
  description, 
  className,
  actions,
  icon,
  meta 
}: PageHeaderProps) {
  return (
    <div className={cn(
      "flex flex-col space-y-1",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && (
            <div className="flex-shrink-0">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      {meta && (
        <div className="mt-1">
          {meta}
        </div>
      )}
    </div>
  );
}