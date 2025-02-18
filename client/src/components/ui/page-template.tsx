import * as React from "react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { BreadcrumbNav } from "@/components/dashboard/BreadcrumbNav";
import type { PageTemplateProps } from "@/types/layout";

/**
 * Standard page template component that MUST be used for all pages
 * in the application (except auth, error pages).
 */
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
        <div className="p-6">
          {showBreadcrumbs && <BreadcrumbNav />}

          {(title || description || headerActions) && (
            <PageHeader
              title={title}
              description={description}
              actions={headerActions}
            />
          )}

          {children}
        </div>
      </div>
      {drawer}
    </div>
  );
}