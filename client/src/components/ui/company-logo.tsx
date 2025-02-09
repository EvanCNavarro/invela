import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface CompanyLogoProps {
  companyId: number;
  companyName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-10 h-10"
};

export const CompanyLogo = memo(({ companyId, companyName, size = "sm", className }: CompanyLogoProps) => {
  const { data: logoResult, error } = useQuery({
    queryKey: [`company-logo-${companyId}`],
    queryFn: async () => {
      try {
        console.log(`Debug - Fetching logo for company ${companyId} (${companyName})`);
        const response = await fetch(`/api/companies/${companyId}/logo`);

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
        console.error(`Error fetching logo for ${companyName}:`, error);
        return { error: { message: "Network error", code: "FETCH_ERROR" } };
      }
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 10,   // Keep in cache for 10 minutes
    retry: false,              // Don't retry failed requests
  });

  // Handle various error cases with appropriate fallbacks
  if (error || (logoResult && 'error' in logoResult)) {
    const errorCode = logoResult?.error?.code;
    const tooltipText = errorCode === 'LOGO_NOT_ASSIGNED' ? 
      'Logo not yet assigned' : 
      errorCode === 'LOGO_FILE_MISSING' ? 
        'Logo file unavailable' : 
        'Error loading logo';

    return (
      <div 
        className={cn(
          sizeClasses[size],
          "flex items-center justify-center rounded-lg bg-primary/10",
          "relative group cursor-help",
          className
        )}
        title={tooltipText}
      >
        <span className="text-xs font-medium text-primary">
          {companyName.charAt(0).toUpperCase()}
        </span>
        <span className="absolute invisible group-hover:visible bg-black/75 text-white text-xs px-2 py-1 rounded -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          {tooltipText}
        </span>
      </div>
    );
  }

  // If we have a valid logo URL
  if (logoResult && 'url' in logoResult) {
    return (
      <div className={cn(sizeClasses[size], "flex items-center justify-center overflow-hidden", className)}>
        <img
          src={logoResult.url}
          alt={`${companyName} logo`}
          className="w-full h-full object-contain"
          loading="lazy"
          onError={(e) => {
            console.debug(`Image load error for ${companyName} logo`);
            const img = e.target as HTMLImageElement;
            const parent = img.parentElement;
            if (parent) {
              const fallback = document.createElement('div');
              fallback.className = cn(
                "w-full h-full flex items-center justify-center rounded-lg bg-primary/10",
                "relative group cursor-help"
              );
              fallback.innerHTML = `
                <span class="text-xs font-medium text-primary">${companyName.charAt(0).toUpperCase()}</span>
                <span class="absolute invisible group-hover:visible bg-black/75 text-white text-xs px-2 py-1 rounded -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  Error loading logo
                </span>
              `;
              parent.replaceChild(fallback, img);
            }
          }}
        />
      </div>
    );
  }

  // Loading state
  return (
    <div className={cn(
      sizeClasses[size],
      "flex items-center justify-center rounded-lg bg-muted animate-pulse",
      className
    )}>
      <span className="sr-only">Loading {companyName} logo...</span>
    </div>
  );
});

CompanyLogo.displayName = 'CompanyLogo';
