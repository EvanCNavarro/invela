import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  HomeIcon,
  CheckCircleIcon,
  BookIcon,
  BarChartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LockIcon,
  FileIcon,
  Network,
  MousePointer2Icon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { usePlaygroundVisibility } from "@/hooks/use-playground-visibility";

interface SidebarProps {
  isExpanded: boolean;
  onToggleExpanded: () => void;
  isNewUser?: boolean;
}

interface Task {
  id: number;
  title: string;
  taskType: 'user_onboarding' | 'file_request';
  createdBy: number;
  assignedTo: number | null;
}

export function Sidebar({ isExpanded, onToggleExpanded, isNewUser = false }: SidebarProps) {
  const [location] = useLocation();
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: company } = useQuery({
    queryKey: ["/api/companies/current"],
  });

  // Get total task count
  const totalTasks = tasks.length;

  const menuItems = [
    { 
      icon: HomeIcon,
      label: "Dashboard", 
      href: "/",
      locked: isNewUser
    },
    { 
      icon: CheckCircleIcon,
      label: "Task Center", 
      href: "/task-center",
      locked: false, // Always accessible
      count: totalTasks
    },
    { 
      icon: Network,
      label: "Network", 
      href: "/network",
      locked: isNewUser 
    },
    { 
      icon: FileIcon,
      label: "File Vault", 
      href: "/file-vault",
      locked: isNewUser 
    },
    { 
      icon: BarChartIcon,
      label: "Insights", 
      href: "/insights",
      locked: isNewUser
    }
  ];

  // Admin menu items (only for Invela users)
  const { isVisible: showPlayground } = usePlaygroundVisibility();
  const adminMenuItems = [];
  if (company?.category === 'Invela' && showPlayground) {
    adminMenuItems.push({
      icon: MousePointer2Icon,
      label: "Playground",
      href: "/playground",
      locked: false,
      isPlayground: true
    });
  }

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-200 z-50",
      isExpanded ? "w-64" : "w-20"
    )}>
      <div className={cn(
        "flex items-center h-16",
        isExpanded ? "px-4" : "justify-center"
      )}>
        <img 
          src="/invela-logo.svg" 
          alt="Invela"
          className="h-6 w-6"
        />
        {isExpanded && (
          <span className="ml-3 font-semibold text-lg text-foreground">Invela</span>
        )}
      </div>

      <nav className="mt-8 flex flex-col justify-between h-[calc(100vh-4rem-2rem)]">
        <div className="space-y-1">
          <div>
            {menuItems.map(({ icon: Icon, label, href, locked, count }) => {
              const isActive = location === href;
              const isDisabled = locked;

              return (
                <Link key={href} href={isDisabled ? "#" : href}>
                  <div className={cn(
                    "flex items-center h-12 px-4 rounded-lg mx-2 mb-1",
                    "transition-all duration-200 relative",
                    !isExpanded && "justify-center",
                    isActive 
                      ? "bg-[hsl(228,89%,96%)] text-primary dark:bg-primary/20"
                      : isDisabled
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-muted hover:text-foreground dark:hover:bg-primary/10 dark:hover:text-primary-foreground cursor-pointer"
                  )}>
                    <Icon className={cn(
                      "h-5 w-5",
                      isActive && "stroke-[2.5]"
                    )} />
                    {isExpanded && (
                      <>
                        <span className={cn(
                          "ml-3 flex-1",
                          isActive ? "font-semibold" : "text-foreground/90 dark:text-foreground/80"
                        )}>
                          {label}
                        </span>
                        {count !== undefined && (
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
                            {count}
                          </Badge>
                        )}
                      </>
                    )}
                    {isDisabled && isExpanded && (
                      <LockIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {adminMenuItems.length > 0 && (
            <>
              {isExpanded ? (
                <>
                  <div className="px-4 pt-4 pb-2">
                    <span className="text-[#707F95] text-xs font-medium tracking-wider uppercase">
                      Invela Only
                    </span>
                  </div>
                  <Separator className="mx-2 bg-border/60" />
                </>
              ) : (
                <Separator className="mx-2 my-4 bg-border/60" />
              )}
              <div className="pt-2">
                {adminMenuItems.map(({ icon: Icon, label, href, locked, isPlayground }) => {
                  const isActive = location === href;
                  const isDisabled = locked;

                  return (
                    <Link key={href} href={isDisabled ? "#" : href}>
                      <div className={cn(
                        "flex items-center h-12 px-4 rounded-lg mx-2 mb-1",
                        "transition-all duration-200 relative",
                        !isExpanded && "justify-center",
                        isActive 
                          ? "bg-indigo-50/80 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300"
                          : isDisabled
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-indigo-50/60 hover:text-indigo-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300 cursor-pointer"
                      )}>
                        <Icon className={cn(
                          "h-5 w-5",
                          isActive 
                            ? "stroke-[2.5] text-indigo-500"
                            : "text-foreground/90 dark:text-foreground/80"
                        )} />
                        {isExpanded && (
                          <span className={cn(
                            "ml-3 flex-1",
                            isActive 
                              ? "font-semibold text-indigo-600 dark:text-indigo-300"
                              : "text-foreground/90 dark:text-foreground/80"
                          )}>
                            {label}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleExpanded}
          className="mx-4 mb-4 text-foreground/80 hover:text-foreground dark:text-foreground/60 dark:hover:text-foreground"
        >
          {isExpanded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </Button>
      </nav>
    </aside>
  );
}