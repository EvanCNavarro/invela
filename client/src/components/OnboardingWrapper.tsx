import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface OnboardingWrapperProps {
  children: React.ReactNode;
}

export function OnboardingWrapper({ children }: OnboardingWrapperProps) {
  const { user } = useAuth();

  return (
    <div className="flex flex-col min-h-screen">
      {!user?.onboardingCompleted && (
        <Alert className="mx-4 md:mx-6 mt-4">
          <Info className="h-4 w-4" />
          <AlertTitle className="text-sm font-medium">Welcome to Invela</AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground">
            Complete your tasks in the Task Center to unlock all features.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex-1 p-4 md:p-6">
        {children}
      </div>
    </div>
  );
}