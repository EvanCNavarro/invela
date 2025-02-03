import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Lock } from "lucide-react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [location] = useLocation();
  const { user } = useAuth();
  const [, params] = useRoute('/task-center');
  const isTaskCenter = params !== null;

  // New user who hasn't completed onboarding
  const isNewUser = user?.onboardingCompleted === false;

  // Only allow task center for new users
  if (isNewUser && !isTaskCenter) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4 px-4">
          <Lock className="w-12 h-12 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-semibold">Section Locked</h1>
          <p className="text-muted-foreground max-w-md">
            Complete your onboarding tasks in the Task Center to unlock all features.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[hsl(220,33%,97%)]">
      {/* Sidebar */}
      <div className={cn(
        "h-screen sticky top-0 z-40 transition-all duration-300 ease-in-out",
        isSidebarExpanded ? "w-64" : "w-20"
      )}>
        <Sidebar 
          isExpanded={isSidebarExpanded}
          onToggleExpanded={() => setIsSidebarExpanded(!isSidebarExpanded)}
          isNewUser={isNewUser}
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen">
        <TopNav />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}