import * as React from "react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { BreadcrumbNav } from "@/components/dashboard/BreadcrumbNav";
import type { PageTemplateProps } from "@/types/layout";

export function PageTemplate({
  children,
  drawer,
  drawerOpen = false,
  onDrawerOpenChange,
  className,
  title,
  description,
  headerActions,
  showBreadcrumbs = false
}: PageTemplateProps) {
  return (
    <div className="flex-1 flex overflow-x-hidden">
      <div className={cn(
        "flex-1 min-w-0 transition-all duration-300",
        drawerOpen ? "mr-[25.75rem]" : "",
        className
      )}>
        {showBreadcrumbs && <BreadcrumbNav />}
        {(title || description || headerActions) && (
          <div className="mb-6">
            <PageHeader
              title={title || ""}
              description={description}
              actions={headerActions}
            />
          </div>
        )}
        {children}
      </div>
      {drawerOpen && drawer}
    </div>
  );
}