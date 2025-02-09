import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, ToggleGroup, ToggleGroupItem, Badge, RotateCcw } from "@/components/ui";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { cn } from "@/lib/utils";
import { availableIcons, Sidebar, SidebarTab } from "@/components/sidebar";
import { useState } from "react";

interface TabState {
  selectedIcon: React.ElementType;
  tabLabel: string;
  isTabActive: boolean;
  tabVariant: 'default' | 'invela';
  tabNotifications: boolean;
  tabPulsingDot: boolean;
}

const handleLockState = (locked: boolean, setters: {
  setIsTabDisabled: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedIcon: React.Dispatch<React.SetStateAction<React.ElementType>>;
  setIsTabActive: React.Dispatch<React.SetStateAction<boolean>>;
  setTabVariant: React.Dispatch<React.SetStateAction<'default' | 'invela'>>;
  setTabNotifications: React.Dispatch<React.SetStateAction<boolean>>;
  setTabPulsingDot: React.Dispatch<React.SetStateAction<boolean>>;
}, previousState?: TabState) => {
  const {
    setIsTabDisabled,
    setSelectedIcon,
    setIsTabActive,
    setTabVariant,
    setTabNotifications,
    setTabPulsingDot,
  } = setters;

  setIsTabDisabled(locked);
  if (locked) {
    setSelectedIcon(availableIcons.Locked.icon);
    setIsTabActive(false);
    setTabVariant('default');
    setTabNotifications(false);
    setTabPulsingDot(false);
  } else if (previousState) {
    // Restore previous state when unlocking
    setSelectedIcon(previousState.selectedIcon);
    setIsTabActive(previousState.isTabActive);
    setTabVariant(previousState.tabVariant);
    setTabNotifications(previousState.tabNotifications);
    setTabPulsingDot(previousState.tabPulsingDot);
  }
};

export default function PlaygroundPage() {
  // State management for sidebar playground
  const [isExpanded, setIsExpanded] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(5);
  const [pulsingDot, setPulsingDot] = useState(false);
  const [showInvelaTabs, setShowInvelaTabs] = useState(false);

  // State for sidebar tab preview
  const [selectedIcon, setSelectedIcon] = useState(availableIcons.Dashboard.icon);
  const [tabLabel, setTabLabel] = useState("Dashboard");
  const [isTabActive, setIsTabActive] = useState(true);
  const [tabVariant, setTabVariant] = useState<'default' | 'invela'>('default');
  const [tabNotifications, setTabNotifications] = useState(false);
  const [tabPulsingDot, setTabPulsingDot] = useState(false);
  const [isTabDisabled, setIsTabDisabled] = useState(false);

  // Store previous state before locking
  const [previousState, setPreviousState] = useState<TabState | undefined>();

  const handleReset = () => {
    setSelectedIcon(availableIcons.Dashboard.icon);
    setTabLabel("Dashboard");
    setIsTabActive(true);
    setTabVariant("default");
    setTabNotifications(false);
    setTabPulsingDot(false);
    setIsTabDisabled(false);
    setPreviousState(undefined);
  };

  const handleAccessToggle = () => {
    const newLockedState = !isTabDisabled;

    // Store current state before locking
    if (newLockedState) {
      setPreviousState({
        selectedIcon,
        tabLabel,
        isTabActive,
        tabVariant,
        tabNotifications,
        tabPulsingDot
      });
    }

    handleLockState(newLockedState, {
      setIsTabDisabled,
      setSelectedIcon,
      setIsTabActive,
      setTabVariant,
      setTabNotifications,
      setTabPulsingDot,
    }, newLockedState ? undefined : previousState);
  };

  const handleIconSelection = (value: string) => {
    const iconData = availableIcons[value as keyof typeof availableIcons];
    if (value === "Locked") {
      // Store state before locking via icon selection
      setPreviousState({
        selectedIcon,
        tabLabel,
        isTabActive,
        tabVariant,
        tabNotifications,
        tabPulsingDot
      });
      handleLockState(true, {
        setIsTabDisabled,
        setSelectedIcon,
        setIsTabActive,
        setTabVariant,
        setTabNotifications,
        setTabPulsingDot,
      });
    } else {
      setSelectedIcon(iconData.icon);
      setTabLabel(iconData.label);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentComponent.code);
  };

  const handleDownloadCode = () => {
    const blob = new Blob([currentComponent.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentComponent.id}.tsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [currentComponent, setCurrentComponent] = useState(playgroundComponents[0]);
  const playgroundComponents = [
    {
      id: "sidebar-tab",
      name: "Sidebar Tab",
      code: `// Code for Sidebar Tab component`,
      usageLocations: [
        {
          path: "/dashboard",
          description: "Used in the main dashboard",
          viewInApp: true,
        },
      ],
      referencedAs: "SidebarTab",
    },
    {
      id: "sidebar-menu",
      name: "Sidebar Menu",
      code: `// Code for Sidebar Menu component`,
      usageLocations: [
        {
          path: "/settings",
          description: "Used in the settings page",
          viewInApp: true,
        },
      ],
      referencedAs: "Sidebar",
    },
  ];


  return (
    <DashboardLayout>
      <div className="flex h-full flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Playground</h1>
          <Select
            value={currentComponent.id}
            onValueChange={(value) =>
              setCurrentComponent(playgroundComponents.find((c) => c.id === value)!)
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a component" />
            </SelectTrigger>
            <SelectContent>
              {playgroundComponents.map((component) => (
                <SelectItem key={component.id} value={component.id}>
                  {component.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold">Preview</CardTitle>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Controls Panel */}
            <div className="flex flex-wrap gap-4 pb-6 border-b">
              {/* Access Control */}
              <div className="space-y-2 min-w-[200px] flex-1">
                <p className="text-sm font-medium text-foreground">Access</p>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-full justify-start",
                    isTabDisabled
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : ""
                  )}
                  onClick={handleAccessToggle}
                >
                  {isTabDisabled ? "Locked" : "Enabled"}
                </Button>
              </div>

              {/* Icon Selection */}
              <div className="space-y-2 min-w-[200px] flex-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isTabDisabled ? "text-muted-foreground" : "text-foreground"
                  )}
                >
                  Icon
                </p>
                <Select
                  value={
                    Object.keys(availableIcons).find(
                      (key) =>
                        availableIcons[key].icon === selectedIcon
                    ) || "Dashboard"
                  }
                  onValueChange={handleIconSelection}
                  disabled={
                    isTabDisabled &&
                    selectedIcon !== availableIcons.Locked.icon
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(() => {
                        const iconKey = Object.keys(availableIcons).find(
                          key => availableIcons[key].icon === selectedIcon
                        ) || 'Dashboard';
                        const iconData = availableIcons[iconKey as keyof typeof availableIcons];
                        const IconComponent = iconData.icon;
                        return (
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4" />
                            <span>{iconData.label}</span>
                          </div>
                        );
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(availableIcons).map(
                      ([key, { icon: Icon, label }]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span>{label}</span>
                          </div>
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Label Input - Always enabled */}
              <div className="space-y-2 min-w-[200px] flex-1">
                <p className="text-sm font-medium text-foreground">
                  Label
                </p>
                <Input
                  placeholder="Tab Label"
                  value={tabLabel}
                  onChange={(e) => setTabLabel(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Tab Variant */}
              <div className="space-y-2 min-w-[200px] flex-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isTabDisabled ? "text-muted-foreground" : "text-foreground"
                  )}
                >
                  Variant
                </p>
                <Select
                  value={tabVariant}
                  onValueChange={(value: "default" | "invela") => setTabVariant(value)}
                  disabled={isTabDisabled}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select variant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Standard</SelectItem>
                    <SelectItem value="invela">Invela Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tab State */}
              <div className="space-y-2 min-w-[200px] flex-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isTabDisabled ? "text-muted-foreground" : "text-foreground"
                  )}
                >
                  State</p>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-full justify-start",
                    isTabActive
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : ""
                  )}
                  onClick={() => setIsTabActive(!isTabActive)}
                  disabled={isTabDisabled}
                >
                  {isTabActive ? "Active" : "Inactive"}
                </Button>
              </div>

              {/* Indicators */}
              <div className="space-y-2 min-w-[300px] flex-2">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isTabDisabled ? "text-muted-foreground" : "text-foreground"
                  )}
                >
                  Indicators
                </p>
                <ToggleGroup
                  type="single"
                  value={
                    tabNotifications
                      ? "notifications"
                      : tabPulsingDot
                        ? "pulse"
                        : "none"
                  }
                  onValueChange={(value) => {
                    if (!isTabDisabled) {
                      setTabNotifications(value === "notifications");
                      setTabPulsingDot(value === "pulse");
                    }
                  }}
                  disabled={isTabDisabled}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-full"
                >
                  <ToggleGroupItem
                    value="none"
                    aria-label="Toggle none"
                    className={cn(
                      "flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                      "data-[state=on]:bg-white data-[state=on]:text-foreground data-[state=on]:shadow",
                      "hover:bg-background/50"
                    )}
                  >
                    None
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="notifications"
                    aria-label="Toggle notifications"
                    className={cn(
                      "flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                      "data-[state=on]:bg-white data-[state=on]:text-foreground data-[state=on]:shadow",
                      "hover:bg-background/50"
                    )}
                  >
                    <Badge
                      variant="secondary"
                      className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs mr-2"
                    >
                      5
                    </Badge>
                    Tasks
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="pulse"
                    aria-label="Toggle pulse"
                    className={cn(
                      "flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                      "data-[state=on]:bg-white data-[state=on]:text-foreground data-[state=on]:shadow",
                      "hover:bg-background/50"
                    )}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full mr-2",
                        pulsingDot ? "bg-primary animate-pulse" : "bg-muted-foreground"
                      )}
                    />
                    Pulse
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>

            {/* Preview Area */}
            <div className="w-[300px] mx-auto bg-background rounded-lg border">
              <div className="p-4">
                <SidebarTab
                  icon={selectedIcon}
                  label={tabLabel}
                  href="#"
                  isActive={isTabActive}
                  isExpanded={true}
                  isDisabled={isTabDisabled}
                  notificationCount={tabNotifications ? 5 : 0}
                  showPulsingDot={tabPulsingDot}
                  variant={tabVariant}
                  isPlayground={true}
                  onClick={() => {
                    if (!isTabDisabled) {
                      setIsTabActive(true);
                    }
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}