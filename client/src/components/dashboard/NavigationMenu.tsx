import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Network, 
  ClipboardList, 
  LineChart, 
  FolderOpen 
} from "lucide-react";

const menuItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/network", icon: Network, label: "Network" },
  { href: "/tasks", icon: ClipboardList, label: "Tasks" },
  { href: "/insights", icon: LineChart, label: "Insights" },
  { href: "/files", icon: FolderOpen, label: "Files" }
];

export function NavigationMenu() {
  const [location] = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <nav className="flex flex-col gap-2 p-4">
      {menuItems.map(({ href, icon: Icon, label }) => (
        <Link key={href} href={href}>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-4",
              location === href && "bg-emerald-950/5"
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Button>
        </Link>
      ))}
    </nav>
  );
}