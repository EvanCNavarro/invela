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
    <div className="flex h-screen overflow-hidden bg-[hsl(220,33%,97%)]">
      {/* Sidebar with fixed positioning */}
      <div className="fixed left-0 top-0 z-40 h-full">
        <Sidebar 
          isExpanded={isSidebarExpanded}
          onToggleExpanded={() => setIsSidebarExpanded(!isSidebarExpanded)}
          isNewUser={isNewUser}
        />
      </div>

      {/* Main content area that adjusts with sidebar */}
      <main className={cn(
        "flex-1 min-h-screen w-full transition-all duration-300 ease-in-out",
        isSidebarExpanded ? "lg:ml-64" : "lg:ml-20",
        "ml-0" // Mobile: no left margin
      )}>
        <TopNav />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}