import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import {
  HelpCircleIcon,
  BellIcon,
  LogOutIcon,
  SettingsIcon,
  UserIcon,
  EyeIcon,
  EyeOffIcon,
  Building2Icon,
  ShieldIcon,
  Landmark,
  ChevronDown,
  ChevronUp,
  GlobeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SearchBar } from "@/components/ui/search-bar";
// WebSocket functionality is still maintained but the icon has been removed
import { useWebSocketContext } from "@/providers/websocket-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import React, { useState, useMemo } from "react";
// Playground functionality has been removed during cleanup
import { cn } from "@/lib/utils";
import { useCurrentCompany } from "@/hooks/use-current-company";
import { usePreventFocus } from "@/hooks/use-prevent-focus";

export function TopNav() {
  const { user, logoutMutation } = useAuth();
  const { company } = useCurrentCompany();
  const [location, setLocation] = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isWebsitePopoverOpen, setIsWebsitePopoverOpen] = useState(false);
  
  // Handle popover timing for smooth interactions
  const handlePopoverEnter = () => {
    setIsWebsitePopoverOpen(true);
  };
  
  const handlePopoverLeave = () => {
    // Small delay to prevent flickering when moving between trigger and content
    setTimeout(() => setIsWebsitePopoverOpen(false), 100);
  };
  
  // Prevent any automatic focus when the component mounts or refreshes
  usePreventFocus();

  // Determine company type and set appropriate icon and color
  const companyProfile = useMemo(() => {
    // Default to FinTech (green) if we can't determine the type
    let icon = UserIcon;
    let bgColor = "bg-gradient-to-br from-emerald-400 to-emerald-600";
    let textColor = "text-white";
    let companyName = "Unknown Company";
    let companyType = "FinTech"; // Default company type
    
    if (company) {
      // Get company name from the current company data
      companyName = company.name || companyName;
      
      // Determine company type from category or name
      if (company.category) {
        companyType = company.category;
      } else if (company.id === 1 || companyName === "Invela") {
        companyType = "Invela";
      } else if (companyName.toLowerCase().includes("bank")) {
        companyType = "Bank";
      }
      
      // Set color and icon based on company type
      if (companyType === "Invela" || company.id === 1) {
        // Invela company (blue with shield)
        icon = ShieldIcon;
        bgColor = "bg-gradient-to-br from-blue-500 to-blue-700";
      } else if (companyType === "Bank") {
        // Bank (purple with landmark icon)
        icon = Landmark;
        bgColor = "bg-gradient-to-br from-purple-500 to-purple-700";
      } else {
        // FinTech (green with user icon)
        icon = UserIcon;
        bgColor = "bg-gradient-to-br from-emerald-400 to-emerald-600";
      }
    }
    
    return { icon, bgColor, textColor, companyName, companyType };
  }, [company]);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => setLocation('/login')
    });
  };

  const handleSearch = (value: string) => {
    console.log('Search query:', value);
  };

  // Playground toggle function removed during cleanup

  return (
    <div className="w-full h-full">
      <div className="h-14 px-6 flex justify-between items-center w-full">
        <div className="min-w-0 w-auto">
          <SearchBar
            isGlobalSearch
            onSearch={handleSearch}
            containerClassName="w-[350px]"
            autoFocus={false}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <div className="hidden sm:flex items-center gap-2">
            {/* WebSocket functionality still maintained in the context provider */}
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <BellIcon className="h-4 w-4" />
            </Button>

            <Popover open={isWebsitePopoverOpen} onOpenChange={setIsWebsitePopoverOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 shrink-0"
                  onMouseEnter={handlePopoverEnter}
                  onMouseLeave={handlePopoverLeave}
                  aria-label="Learn more about Invela Trust Network"
                  aria-describedby="invela-popover"
                >
                  <GlobeIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                id="invela-popover"
                className="w-80 p-0 shadow-lg border border-gray-200" 
                align="end"
                sideOffset={8}
                onMouseEnter={handlePopoverEnter}
                onMouseLeave={handlePopoverLeave}
                onOpenAutoFocus={(event) => event.preventDefault()}
              >
                <div className="p-4 space-y-4">
                  {/* Header with Logo */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <GlobeIcon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Invela Trust Network</h3>
                      <p className="text-xs text-muted-foreground">Compliance Made Simple</p>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <p className="text-sm text-foreground leading-relaxed">
                      The comprehensive platform for financial compliance and risk management across the modern fintech ecosystem.
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                        Risk Assessment
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium">
                        Compliance
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-medium">
                        Trust Network
                      </span>
                    </div>
                  </div>

                  {/* Call to Action */}
                  <div className="pt-2 border-t border-gray-100">
                    <button
                      onClick={() => window.open('https://invela.com', '_blank')}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <GlobeIcon className="h-3.5 w-3.5" />
                      Visit invela.com
                    </button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          {/* PAIR Support Button - Only shown for FinTech companies */}
          {companyProfile.companyType === "FinTech" && (
            <Button 
              className="h-8 flex items-center gap-1.5 px-3 text-xs font-semibold text-gray-800 shadow-sm bg-gray-100 border-2 border-transparent relative hover:bg-gray-50 transition-colors"
              style={{
                backgroundClip: 'padding-box',
                position: 'relative',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
              onClick={() => {
                console.log("PAIR Support button clicked");
                // This would typically open a support chat or modal
              }}
            >
              <div
                className="absolute inset-0 rounded-md"
                style={{
                  margin: '-2px',
                  background: 'linear-gradient(to right, rgba(59, 130, 246, 0.3), rgba(45, 212, 191, 0.3), rgba(74, 222, 128, 0.3))',
                  zIndex: -1,
                  borderRadius: '0.375rem',
                }}
              />
              <HelpCircleIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Need help?</span>
              <span className="sm:hidden">Need help?</span>
            </Button>
          )}

          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                <div className={cn("w-6 h-6 flex items-center justify-center rounded-md shadow-sm", companyProfile.bgColor, companyProfile.textColor)}>
                  {React.createElement(companyProfile.icon, { className: "h-3.5 w-3.5" })}
                </div>
                <div className="hidden md:block">
                  <p className="text-xs font-medium leading-tight">{user?.full_name}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{companyProfile.companyName}</p>
                </div>
                {isDropdownOpen ? (
                  <ChevronUp className="h-3.5 w-3.5 text-gray-500 ml-1" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-gray-500 ml-1" />
                )}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-72"
              sideOffset={4}
              onCloseAutoFocus={(event) => {
                event.preventDefault();
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 flex items-start gap-3">
                <div className={cn("w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-md shadow-sm", companyProfile.bgColor, companyProfile.textColor)}>
                  {React.createElement(companyProfile.icon, { className: "h-4 w-4" })}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user?.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate mb-1">{user?.email}</p>
                  <p className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded-sm inline-block">{companyProfile.companyName}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="cursor-pointer"
              >
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="cursor-pointer"
              >
                <SettingsIcon className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              {/* Playground toggle removed during cleanup */}
              <DropdownMenuSeparator className="sm:hidden" />
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
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  handleLogout();
                }}
                className="text-red-600 focus:text-red-600 cursor-pointer"
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