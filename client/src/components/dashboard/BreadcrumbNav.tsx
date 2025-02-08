import { Link, useLocation } from "wouter";
import { 
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

interface RouteSegment {
  label: string;
  href: string;
  skipLink?: boolean;
}

export function BreadcrumbNav() {
  const [location] = useLocation();

  // Don't show breadcrumbs for root or single-level routes
  if (location === "/" || location.split("/").filter(Boolean).length < 2) {
    return null;
  }

  const segments = location.split("/").filter(Boolean);
  const breadcrumbs: RouteSegment[] = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    // Convert URL-friendly format to display format
    let label = segment.split("-").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");

    // Handle dynamic segments (those with parameters)
    if (segment.includes(":")) {
      label = "Details";
    }

    // Skip linking for the "company" segment
    const skipLink = segment === "company";

    return { label, href, skipLink };
  });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className={cn(
                  "transition-colors duration-200",
                  "text-[#64758B] hover:text-[#020817]"
                )}
              >
                <path 
                  d="M12 2L2 7L12 12L22 7L12 2Z" 
                  fill="currentColor"
                />
                <path 
                  d="M2 17L12 22L22 17" 
                  fill="currentColor"
                />
                <path 
                  d="M2 12L12 17L22 12" 
                  fill="currentColor"
                />
              </svg>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />

        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const previousValidItem = breadcrumbs.slice(0, index)
            .reverse()
            .find(segment => !segment.skipLink);

          return (
            <BreadcrumbItem key={item.href}>
              {isLast ? (
                <BreadcrumbPage className="font-semibold">{item.label}</BreadcrumbPage>
              ) : (
                <>
                  <BreadcrumbLink asChild>
                    <Link href={item.skipLink ? (previousValidItem?.href || "/") : item.href}>
                      <span className={cn(
                        "text-sm hover:underline",
                        "text-[#64758B] hover:text-[#020817]"
                      )}>
                        {item.label}
                      </span>
                    </Link>
                  </BreadcrumbLink>
                  <BreadcrumbSeparator />
                </>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}