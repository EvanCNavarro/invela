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
      <aside className={cn(
        "shrink-0 sticky top-0 z-40 h-screen transition-all duration-300 ease-in-out",
        isSidebarExpanded ? "w-64" : "w-20"
      )}>
        <Sidebar 
          isExpanded={isSidebarExpanded}
          onToggleExpanded={() => setIsSidebarExpanded(!isSidebarExpanded)}
          isNewUser={isNewUser}
        />
      </aside>

      <div className="flex-1 flex flex-col min-h-screen relative">
        <div className={cn(
          "fixed top-0 right-0 z-30 backdrop-blur-sm bg-background/80",
          "transition-all duration-300 ease-in-out",
          isSidebarExpanded 
            ? "left-64" 
            : "left-20"
        )}>
          <TopNav />
        </div>

        <main className="flex-1 pt-20">
          <div className="px-6 md:px-8 py-4 w-full overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}