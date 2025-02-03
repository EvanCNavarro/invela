import { useState } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { cn } from "@/lib/utils";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [location] = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(220,33%,97%)]">
      <Sidebar 
        isExpanded={isSidebarExpanded}
        onToggleExpanded={() => setIsSidebarExpanded(!isSidebarExpanded)}
      />

      <div className={cn(
        "flex-1 flex flex-col transition-all duration-200",
        isSidebarExpanded ? "ml-64" : "ml-20"
      )}>
        <TopNav />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}