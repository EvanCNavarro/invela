import { cn } from "@/lib/utils";
import { LockIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

interface SidebarTabProps {
  icon: React.ElementType;
  label: string;
  href: string;
  isActive: boolean;
  isExpanded: boolean;
  isDisabled?: boolean;
  notificationCount?: number;
  showPulsingDot?: boolean;
  variant?: 'default' | 'invela';
  isPlayground?: boolean;
  onClick?: () => void;
}

export function SidebarTab({
  icon: Icon,
  label,
  href,
  isActive,
  isExpanded,
  isDisabled = false,
  notificationCount = 0,
  showPulsingDot = false,
  variant = 'default',
  isPlayground = false,
  onClick
}: SidebarTabProps) {
  const content = (
    <div
      data-menu-item={href.replace('/', '')}
      data-locked={isDisabled ? 'true' : 'false'}
      className={cn(
        "flex items-center h-12 px-4 rounded-lg mx-2 mb-1",
        "transition-all duration-200 relative",
        !isExpanded && "justify-center",
        isActive && !isDisabled
          ? variant === 'invela'
            ? "bg-[#E6F5F3] text-[#079669] dark:bg-emerald-500/20 dark:text-emerald-300"
            : "bg-[hsl(228,89%,96%)] text-primary dark:bg-primary/20"
          : isDisabled
            ? "opacity-50 cursor-not-allowed bg-muted/50"
            : "hover:bg-muted hover:text-foreground dark:hover:bg-primary/10 dark:hover:text-primary-foreground cursor-pointer"
      )}
      onClick={(e) => {
        if (isPlayground) {
          e.preventDefault();
          if (!isDisabled && onClick) {
            onClick();
          }
        }
      }}
    >
      {isDisabled ? (
        <LockIcon className="h-5 w-5 text-muted-foreground" />
      ) : (
        <Icon 
          className={cn(
            "h-5 w-5",
            isActive && variant === 'invela'
              ? "stroke-[2.5] text-[#079669]"
              : isActive && "stroke-[2.5]"
          )} 
        />
      )}
      {isExpanded && (
        <>
          <span className={cn(
            "ml-3 flex-1",
            isActive && !isDisabled && variant === 'invela'
              ? "font-semibold text-[#079669] dark:text-emerald-300"
              : isActive && !isDisabled
                ? "font-semibold"
                : "text-foreground/90 dark:text-foreground/80"
          )}>
            {label}
          </span>
          {!isDisabled && notificationCount > 0 && (
            <Badge
              variant={isActive ? "default" : "secondary"}
              className={cn(
                "ml-2 px-1.5 h-5 min-w-[20px] flex items-center justify-center",
                "rounded-md text-xs font-medium",
                isActive
                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {notificationCount}
            </Badge>
          )}
          {!isDisabled && showPulsingDot && (
            <span className={cn(
              "ml-2 h-5 w-5 flex items-center justify-center",
              "before:absolute before:h-2 before:w-2",
              "before:rounded-full before:bg-primary",
              "after:absolute after:h-2 after:w-2",
              "after:rounded-full after:bg-primary/40",
              "after:animate-ping"
            )} />
          )}
        </>
      )}
    </div>
  );

  if (isPlayground) {
    return <div>{content}</div>;
  }

  return (
    <Link href={isDisabled ? "#" : href}>
      {content}
    </Link>
  );
}