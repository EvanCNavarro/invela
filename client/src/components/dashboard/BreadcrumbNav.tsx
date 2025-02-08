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

// Helper function to apply APA title case
function toAPACase(text: string): string {
  // Words that should remain lowercase in APA style (unless they're the first word)
  const minorWords = new Set([
    'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 
    'of', 'off', 'on', 'or', 'per', 'the', 'to', 'up', 'via'
  ]);

  // Split the text into words, considering spaces and hyphens
  const words = text.split(/(?<=-)|\s+/);

  return words.map((word, index) => {
    // Skip empty strings
    if (!word) return word;

    // Preserve original casing if it contains mixed case (likely a proper noun or acronym)
    if (word !== word.toLowerCase() && word !== word.toUpperCase()) {
      return word;
    }

    // Convert to lowercase first
    word = word.toLowerCase();

    // Always capitalize first and last word
    if (index === 0 || index === words.length - 1) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }

    // Capitalize if it's not in the minor words list or if it's 4+ letters
    if (!minorWords.has(word) || word.length >= 4) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }

    return word;
  }).join(' ');
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
    let label = segment.split("-").join(" ");

    // Handle dynamic segments (those with parameters)
    if (segment.includes(":")) {
      label = "Details";
    }

    // Apply APA title case
    label = toAPACase(label);

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
              <div className="relative w-3.5 h-3.5">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn(
                  "h-3.5 w-3.5 hover:opacity-0",
                  "transition-opacity duration-200"
                )}>
                  <path d="M2.3134 6.81482H4.54491V9.03704H2.3134V6.81482Z" fill="#64758B"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M13.7685 8C13.7685 11.191 11.1709 13.7778 7.96656 13.7778C5.11852 13.7778 2.74691 11.7323 2.25746 9.03704H0C0.510602 12.9654 3.88272 16 7.96656 16C12.4033 16 16 12.4183 16 8C16 3.58172 12.4033 0 7.96656 0C3.9342 0 0.595742 2.95856 0.0206721 6.81482H2.28637C2.83429 4.19289 5.17116 2.22222 7.96656 2.22222C11.1709 2.22222 13.7685 4.80902 13.7685 8Z" fill="#64758B"/>
                </svg>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn(
                  "h-3.5 w-3.5 opacity-0 hover:opacity-100",
                  "transition-opacity duration-200",
                  "absolute top-0 left-0"
                )}>
                  <path d="M2.3134 6.81482H4.54491V9.03704H2.3134V6.81482Z" fill="#020817"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M13.7685 8C13.7685 11.191 11.1709 13.7778 7.96656 13.7778C5.11852 13.7778 2.74691 11.7323 2.25746 9.03704H0C0.510602 12.9654 3.88272 16 7.96656 16C12.4033 16 16 12.4183 16 8C16 3.58172 12.4033 0 7.96656 0C3.9342 0 0.595742 2.95856 0.0206721 6.81482H2.28637C2.83429 4.19289 5.17116 2.22222 7.96656 2.22222C11.1709 2.22222 13.7685 4.80902 13.7685 8Z" fill="#020817"/>
                </svg>
              </div>
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