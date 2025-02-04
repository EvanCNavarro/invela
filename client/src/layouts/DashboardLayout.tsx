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
      {/* Sidebar with dynamic width */}
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
        {/* Floating navbar that stretches full width */}
        <div className={cn(
          "fixed top-0 right-0 z-30 backdrop-blur-sm bg-background/80",
          "transition-all duration-300 ease-in-out",
          isSidebarExpanded 
            ? "left-64" // When sidebar is expanded, start from sidebar width
            : "left-20" // When sidebar is collapsed, start from collapsed width
        )}>
          <TopNav />
        </div>

        {/* Main content area with padding for navbar */}
        <main className="flex-1 pt-14"> {/* Reduced from pt-16 to pt-14 */}
          <div className="px-4 md:px-6 py-3 md:py-4 w-full overflow-x-hidden"> {/* Reduced vertical padding */}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}