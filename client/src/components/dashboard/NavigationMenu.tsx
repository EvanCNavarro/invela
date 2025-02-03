import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function NavigationMenu() {
  const { logoutMutation } = useAuth();

  return (
    <div className="p-4 flex justify-between items-center border-b">
      <img src="/invela-logo.svg" alt="Invela" className="h-8" />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => logoutMutation.mutate()}
        className="text-muted-foreground hover:text-foreground"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Logout
      </Button>
    </div>
  );
}
