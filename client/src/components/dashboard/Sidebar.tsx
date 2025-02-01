import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  HomeIcon,
  CheckCircleIcon,
  BookIcon,
  BarChartIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

export function Sidebar({ isExpanded, onToggleExpanded }: SidebarProps) {
  const [location] = useLocation();
  const menuItems = [
    { 
      icon: HomeIcon,
      label: "Dashboard", 
      href: "/" 
    },
    { 
      icon: CheckCircleIcon,
      label: "Task Center", 
      href: "/task-center" 
    },
    { 
      icon: BookIcon,
      label: "Registry", 
      href: "/registry" 
    },
    { 
      icon: BarChartIcon,
      label: "Insights", 
      href: "/insights" 
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
        {menuItems.map(({ icon: Icon, label, href }) => {
          const isActive = location === href;
          return (
            <Link key={href} href={href}>
              <div className={cn(
                "flex items-center h-12 px-4 rounded-lg mx-2 mb-1 cursor-pointer",
                "transition-all duration-200",
                !isExpanded && "justify-center",
                isActive 
                  ? "bg-[hsl(228,89%,96%)] text-primary dark:bg-primary/20" 
                  : "hover:bg-muted hover:text-foreground dark:hover:bg-primary/10 dark:hover:text-primary-foreground"
              )}>
                <Icon className={cn(
                  "h-5 w-5",
                  isActive && "stroke-[2.5]"
                )} />
                {isExpanded && (
                  <span className={cn(
                    "ml-3",
                    isActive ? "font-semibold" : "text-foreground/90 dark:text-foreground/80"
                  )}>
                    {label}
                  </span>
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