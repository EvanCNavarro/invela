import { Link } from "wouter";
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
  const menuItems = [
    { icon: HomeIcon, label: "Dashboard", href: "/" },
    { icon: CheckCircleIcon, label: "Task Center", href: "/task-center" },
    { icon: BookIcon, label: "Registry", href: "/registry" },
    { icon: BarChartIcon, label: "Insights", href: "/insights" }
  ];

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-200 z-50",
      isExpanded ? "w-64" : "w-20"
    )}>
      <div className="flex items-center h-16 px-4">
        <img 
          src="/invela-logo.svg" 
          alt="Invela"
          className="h-8 w-8"
        />
        {isExpanded && (
          <span className="ml-3 font-semibold text-lg">Invela</span>
        )}
      </div>

      <nav className="mt-8">
        {menuItems.map(({ icon: Icon, label, href }) => (
          <Link key={href} href={href}>
            <div className={cn(
              "flex items-center h-12 px-4 text-sidebar-foreground hover:bg-sidebar-accent rounded-lg mx-2 mb-1 cursor-pointer",
              !isExpanded && "justify-center"
            )}>
              <Icon className="h-5 w-5" />
              {isExpanded && <span className="ml-3">{label}</span>}
            </div>
          </Link>
        ))}
      </nav>

      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleExpanded}
        className="absolute bottom-4 right-4"
      >
        {isExpanded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
      </Button>
    </aside>
  );
}