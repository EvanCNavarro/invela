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
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className={cn(
                  "transition-colors duration-200",
                  "text-[#64758B] hover:text-[#020817]"
                )}
              >
                <path fillRule="evenodd" clipRule="evenodd" d="M12.0001 6C12.0001 4.89543 12.8955 4 14.0001 4H18.0001C19.1047 4 20.0001 4.89543 20.0001 6V10C20.0001 11.1046 19.1047 12 18.0001 12H14.0001C12.8955 12 12.0001 11.1046 12.0001 10V6Z" fill="currentColor"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M4 6C4 4.89543 4.89543 4 6 4H10C11.1046 4 12 4.89543 12 6V10C12 11.1046 11.1046 12 10 12H6C4.89543 12 4 11.1046 4 10V6Z" fill="currentColor"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M4 14C4 12.8954 4.89543 12 6 12H10C11.1046 12 12 12.8954 12 14V18C12 19.1046 11.1046 20 10 20H6C4.89543 20 4 19.1046 4 18V14Z" fill="currentColor"/>
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