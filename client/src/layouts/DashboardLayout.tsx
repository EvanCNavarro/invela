import { useState } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { cn } from "@/lib/utils";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [location] = useLocation();

  // Get page title based on current route
  const getPageTitle = () => {
    const routes: Record<string, string> = {
      "/": "Dashboard",
      "/task-center": "Task Center",
      "/registry": "Registry",
      "/insights": "Insights"
    };
    return routes[location] || "Dashboard";
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        isExpanded={isSidebarExpanded}
        onToggleExpanded={() => setIsSidebarExpanded(!isSidebarExpanded)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-semibold text-foreground mb-6">
              {getPageTitle()}
            </h1>
            
            <div className={cn(
              "transition-all duration-200",
              isSidebarExpanded ? "ml-64" : "ml-20"
            )}>
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
