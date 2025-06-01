import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface CompanyLogoProps {
  companyId?: number;
  companyName?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-10 h-10"
};

export const CompanyLogo = memo(({ companyId, companyName, size = "sm", className }: CompanyLogoProps) => {
  // Early return for invalid props
  if (!companyId || !companyName) {
    return (
      <div className={cn(
        sizeClasses[size],
        "flex items-center justify-center rounded-md bg-muted",
        className
      )}>
        <span className="text-xs font-medium text-muted-foreground">
          {companyName ? companyName.charAt(0).toUpperCase() : "?"}
        </span>
      </div>
    );
  }

  const { data: logoResult, error } = useQuery({
    queryKey: [`company-logo-${companyId}`],
    queryFn: async () => {
      try {
        console.log(`Debug - Fetching logo for company ${companyId} (${companyName})`);
        // Add cache-busting timestamp parameter
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/companies/${companyId}/logo?t=${timestamp}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.debug(`Logo fetch failed for ${companyName}:`, {
            status: response.status,
            code: errorData.code,
            message: errorData.message
          });
          return { error: errorData };
        }

        const blob = await response.blob();
        return { url: URL.createObjectURL(blob) };
      } catch (error) {
        console.error(`Error fetching logo for ${companyName || 'unknown'}:`, error);
        return { error: { message: "Network error", code: "FETCH_ERROR" } };
      }
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    retry: false,
    enabled: !!companyId && !!companyName,
  });

  if (error || (logoResult && 'error' in logoResult)) {
    return (
      <div className={cn(
        sizeClasses[size],
        "flex items-center justify-center rounded-md bg-primary/10",
        className
      )}>
        <span className="text-xs font-medium text-primary">
          {companyName.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  if (logoResult && 'url' in logoResult) {
    return (
      <div className={cn(
        sizeClasses[size],
        "flex items-center justify-center overflow-hidden rounded-md",
        className
      )}>
        <img
          src={logoResult.url}
          alt={`${companyName} logo`}
          className="w-full h-full object-contain rounded-md"
          loading="lazy"
          onError={(e) => {
            console.debug(`Image load error for ${companyName} logo`);
            const img = e.target as HTMLImageElement;
            const parent = img.parentElement;
            if (parent) {
              const fallback = document.createElement('div');
              fallback.className = cn(
                "w-full h-full flex items-center justify-center rounded-md bg-primary/10"
              );
              fallback.innerHTML = `
                <span class="text-xs font-medium text-primary">${(companyName || '?').charAt(0).toUpperCase()}</span>
              `;
              parent.replaceChild(fallback, img);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className={cn(
      sizeClasses[size],
      "flex items-center justify-center rounded-md bg-muted animate-pulse",
      className
    )}>
      <span className="sr-only">Loading {companyName} logo...</span>
    </div>
  );
});

CompanyLogo.displayName = 'CompanyLogo';