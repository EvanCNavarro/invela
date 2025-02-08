import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  CheckCircleIcon,
  BookIcon,
  BarChartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LockIcon,
  FileIcon,
  Network
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Player } from "@lordicon/react";
import { useState } from "react";

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
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const totalTasks = tasks.length;

  const menuItems = [
    { 
      icon: () => (
        <Player
          size={24}
          src="https://cdn.lordicon.com/osuxyevn.json" 
          trigger="hover"
          state={hoveredIcon === "home" ? "hover-home-2" : "loop"}
        />
      ),
      label: "Dashboard", 
      href: "/",
      locked: isNewUser
    },
    { 
      icon: CheckCircleIcon,
      label: "Task Center", 
      href: "/task-center",
      locked: false,
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

      <nav className="mt-8">
        {menuItems.map(({ icon: Icon, label, href, locked, count }) => {
          const isActive = location === href;
          const isDisabled = locked;

          return (
            <Link key={href} href={isDisabled ? "#" : href}>
              <div 
                className={cn(
                  "flex items-center h-12 px-4 rounded-lg mx-2 mb-1",
                  "transition-all duration-200 relative group",
                  !isExpanded && "justify-center",
                  isActive 
                    ? "bg-[hsl(228,89%,96%)] text-primary dark:bg-primary/20" 
                    : isDisabled
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-muted hover:text-foreground dark:hover:bg-primary/10 dark:hover:text-primary-foreground cursor-pointer"
                )}
                onMouseEnter={() => label === "Dashboard" && setHoveredIcon("home")}
                onMouseLeave={() => label === "Dashboard" && setHoveredIcon(null)}
              >
                <div className="w-5 h-5 flex items-center justify-center"> {/* Added div wrapper for better icon placement */}
                  {typeof Icon === 'function' ? (
                    Icon()
                  ) : (
                    <Icon className={cn(
                      "h-5 w-5",
                      isActive && "stroke-[2.5]"
                    )} />
                  )}
                </div>
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
      </nav>

      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleExpanded}
        className="absolute bottom-4 right-4 text-foreground/80 hover:text-foreground dark:text-foreground/60 dark:hover:text-foreground"
      >
        {isExpanded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
      </Button>
    </aside>
  );
}