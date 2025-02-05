import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { 
  SearchIcon, 
  HelpCircleIcon,
  BellIcon,
  LogOutIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function TopNav() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => setLocation('/login')
    });
  };

  return (
    <div className="w-full">
      <div className="h-14 px-6 flex items-center">
        <div className="relative w-full max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input 
            placeholder="Search..." 
            className="pl-9 h-8 w-full"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <div className="hidden sm:flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <HelpCircleIcon className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="icon" className="h-8 w-8">
              <BellIcon className="h-4 w-4" />
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-8 w-8 cursor-pointer bg-white">
                <AvatarFallback className="text-sm">
                  {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-56"
              onCloseAutoFocus={(event) => {
                event.preventDefault();
              }}
              onOpenAutoFocus={(event) => {
                event.preventDefault();
              }}
            >
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium truncate">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <SettingsIcon className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="sm:hidden px-2 py-1.5">
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <HelpCircleIcon className="mr-2 h-4 w-4" />
                  Help
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <BellIcon className="mr-2 h-4 w-4" />
                  Notifications
                </Button>
              </div>
              <DropdownMenuSeparator className="sm:hidden" />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  handleLogout();
                }}
                className="text-red-600 focus:text-red-600"
              >
                <LogOutIcon className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}