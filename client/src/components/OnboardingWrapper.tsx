import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface OnboardingWrapperProps {
  children: React.ReactNode;
}

export function OnboardingWrapper({ children }: OnboardingWrapperProps) {
  const { user } = useAuth();

  return (
    <div>
      {!user?.onboardingCompleted && (
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>Welcome to Invela!</AlertTitle>
          <AlertDescription>
            Complete your onboarding tasks in the Task Center to unlock all features.
          </AlertDescription>
        </Alert>
      )}
      {children}
    </div>
  );
}
