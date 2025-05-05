import { cn } from "@/lib/utils";
import { LockIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useEffect } from "react";

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
  externalLink?: boolean;
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
  externalLink = false,
  onClick
}: SidebarTabProps) {
  const content = (
    <div
      data-menu-item={href.replace('/', '')}
      className={cn(
        "flex items-center h-12 px-4 rounded-lg mx-2 mb-1",
        "transition-all duration-75 relative", // Faster transition for immediate visual feedback
        !isExpanded && "justify-center",
        isActive && !isDisabled
          ? variant === 'invela'
            ? "bg-[#E6F5F3] text-[#079669] dark:bg-emerald-500/20 dark:text-emerald-300"
            : "bg-[hsl(228,89%,96%)] text-primary dark:bg-primary/20"
          : isDisabled
            ? "opacity-50 cursor-not-allowed bg-muted/50"
            : "hover:bg-muted hover:text-foreground dark:hover:bg-primary/10 dark:hover:text-primary-foreground cursor-pointer",
        /* no special styles for file-vault tab */
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

  // Use regular anchor tag with target="_blank" for external links
  if (externalLink && !isDisabled) {
    return (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        className="no-underline"
      >
        {content}
      </a>
    );
  }
  
  // Use Wouter Link for internal navigation
  // The access control for tabs is now handled by the unified tab service on the server.
  // The 'isDisabled' prop is derived from the 'availableTabs' array in the company record,
  // which is the single source of truth for tab access control.
  // 
  // File Vault tab access is controlled by the server based on form submissions.
  // No special client-side handling is needed anymore, making the code much cleaner.
  // We only need to check this once when the tab is first rendered
  // or when its disabled state changes, not on every render
  const isFileVaultTab = (label === "File Vault");
  
  // Using useEffect with proper dependency array to only log when isDisabled changes
  useEffect(() => {
    if (isFileVaultTab && process.env.NODE_ENV === 'development') {
      console.debug(`[SidebarTab] File Vault tab state: isDisabled=${isDisabled}`);
    }
  }, [isFileVaultTab, isDisabled]); // Only re-run when these values change
  
  return (
    <Link 
      href={href} 
      onClick={(e) => {
        // Log all sidebar tab clicks for debugging
        console.log(`[SidebarTab] Clicked ${label} tab, href=${href}, isDisabled=${isDisabled}`);
        
        if (isDisabled) {
          e.preventDefault();
          console.log(`[SidebarTab] Tab "${label}" is locked. Redirecting to task-center.`);
          // Don't use window.location.href as it causes full page refresh
          // Use the wouter routing mechanism which preserves React state
          window.history.pushState({}, '', '/task-center');
          window.dispatchEvent(new PopStateEvent('popstate'));
          return;
        }
        
        // Simplified File Vault tab handling
        // No special handling needed since access is controlled by the server
        if (href === '/file-vault') {
          console.log(`[SidebarTab] File Vault tab clicked - using standard navigation`);
          
          // We'll log the event for tracking purposes
          try {
            localStorage.setItem('file_vault_access_timestamp', new Date().toISOString());
          } catch (error) {
            console.error('[SidebarTab] Failed to update localStorage timestamp:', error);
          }
        }
      }}
    >
      {content}
    </Link>
  );
}