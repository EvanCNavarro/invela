import {
  Badge,
} from "@/components/ui/badge";
import {
  Button,
} from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Input,
} from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

import { DashboardLayout } from "@/layouts/dashboard-layout";
import { cn } from "@/lib/utils";
import { Metadata } from "@/components/metadata";
import { useState } from "react";
import { availableIcons, Sidebar, SidebarTab } from "@/components/dashboard";
import { RotateCcw, ChevronLeftIcon, ChevronRightIcon, ArrowUpRight, Copy, Download } from "lucide-react";
import { Link } from "wouter";

interface TabState {
  selectedIcon: React.ElementType;
  tabLabel: string;
  isTabActive: boolean;
  tabVariant: 'default' | 'invela';
  tabNotifications: boolean;
  tabPulsingDot: boolean;
}

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

export default function PlaygroundPage() {
  const [currentComponent, setCurrentComponent] = useState(playgroundComponents[0]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(5);
  const [pulsingDot, setPulsingDot] = useState(false);
  const [showInvelaTabs, setShowInvelaTabs] = useState(false);

  // SidebarTab states
  const [selectedIcon, setSelectedIcon] = useState<React.ElementType>(availableIcons.Dashboard.icon);
  const [tabLabel, setTabLabel] = useState("Dashboard");
  const [isTabActive, setIsTabActive] = useState(false);
  const [tabVariant, setTabVariant] = useState<'default' | 'invela'>('default');
  const [tabNotifications, setTabNotifications] = useState(false);
  const [tabPulsingDot, setTabPulsingDot] = useState(false);
  const [isTabDisabled, setIsTabDisabled] = useState(false);

  // Store previous state before locking
  const [previousState, setPreviousState] = useState<TabState | undefined>();

  const handleReset = () => {
    setSelectedIcon(availableIcons.Dashboard.icon);
    setTabLabel("Dashboard");
    setIsTabActive(false);
    setTabVariant("default");
    setTabNotifications(false);
    setTabPulsingDot(false);
    setIsTabDisabled(false);
    setPreviousState(undefined);
  };

  const handleAccessToggle = () => {
    const newLockedState = !isTabDisabled;

    if (newLockedState) {
      // Store current state before locking
      setPreviousState({
        selectedIcon,
        tabLabel,
        isTabActive,
        tabVariant,
        tabNotifications,
        tabPulsingDot
      });

      // Apply locked state
      setIsTabDisabled(true);
      setSelectedIcon(availableIcons.Locked.icon);
      setIsTabActive(false);
      setTabVariant('default');
      setTabNotifications(false);
      setTabPulsingDot(false);
    } else if (previousState) {
      // Restore previous state
      setSelectedIcon(previousState.selectedIcon);
      setTabLabel(previousState.tabLabel);
      setIsTabActive(previousState.isTabActive);
      setTabVariant(previousState.tabVariant);
      setTabNotifications(previousState.tabNotifications);
      setTabPulsingDot(previousState.tabPulsingDot);
      setIsTabDisabled(false);
    }
  };

  const handleIconSelection = (value: string) => {
    const iconData = availableIcons[value as keyof typeof availableIcons];
    if (value === "Locked") {
      // Store current state before locking via icon selection
      setPreviousState({
        selectedIcon,
        tabLabel,
        isTabActive,
        tabVariant,
        tabNotifications,
        tabPulsingDot
      });

      // Apply locked state
      setIsTabDisabled(true);
      setSelectedIcon(iconData.icon);
      setIsTabActive(false);
      setTabVariant('default');
      setTabNotifications(false);
      setTabPulsingDot(false);
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

  return (
    <DashboardLayout>
      <Metadata title="Component Playground" description="Interactive component playground" />
      <div className="flex h-full flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">
            {currentComponent.name} Playground
          </h1>
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

        <div className="flex flex-wrap gap-8">
          {currentComponent.id === "sidebar-tab" && (
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
                          (key) => availableIcons[key as keyof typeof availableIcons].icon === selectedIcon
                        ) || "Dashboard"
                      }
                      onValueChange={handleIconSelection}
                      disabled={isTabDisabled && selectedIcon !== availableIcons.Locked.icon}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {(() => {
                            const iconKey = Object.keys(availableIcons).find(
                              key => availableIcons[key as keyof typeof availableIcons].icon === selectedIcon
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
                        {Object.entries(availableIcons).map(([key, { icon: Icon, label }]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span>{label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Label Input */}
                  <div className="space-y-2 min-w-[200px] flex-1">
                    <p className="text-sm font-medium text-foreground">Label</p>
                    <Input
                      placeholder="Tab Label"
                      value={tabLabel}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTabLabel(e.target.value)}
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
                      onValueChange={(value: 'default' | 'invela') => setTabVariant(value)}
                      disabled={isTabDisabled}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {tabVariant === 'default' ? 'Standard' : 'Invela Only'}
                        </SelectValue>
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
                      State
                    </p>
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
                      onValueChange={(value: string) => {
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
                            "bg-primary"
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
          )}

          {currentComponent.id === "sidebar-menu" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-8">
                  <div className="w-[300px] h-[600px] bg-muted/50 rounded-lg p-4 overflow-hidden">
                    <div className="relative h-full">
                      <div
                        className={cn(
                          "absolute top-0 left-0 h-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
                          isExpanded ? "w-64" : "w-20"
                        )}
                      >
                        <Sidebar
                          isExpanded={isExpanded}
                          onToggleExpanded={() => setIsExpanded(!isExpanded)}
                          isNewUser={false}
                          notificationCount={showNotifications ? notificationCount : 0}
                          showPulsingDot={pulsingDot}
                          showInvelaTabs={showInvelaTabs}
                          isPlayground={true}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-6">
                    <div className="space-y-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-[200px] justify-start",
                          isExpanded
                            ? "bg-primary/10 text-primary hover:bg-primary/20"
                            : ""
                        )}
                        onClick={() => setIsExpanded(!isExpanded)}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronLeftIcon className="h-4 w-4 mr-2" />
                            <span>Collapse</span>
                          </>
                        ) : (
                          <>
                            <ChevronRightIcon className="h-4 w-4 mr-2" />
                            <span>Expand</span>
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-[200px] justify-start",
                          showNotifications
                            ? "bg-primary/10 text-primary hover:bg-primary/20"
                            : ""
                        )}
                        onClick={() => {
                          setShowNotifications(!showNotifications);
                          if (!showNotifications) {
                            setNotificationCount(5);
                          } else {
                            setNotificationCount(0);
                          }
                        }}
                      >
                        <Badge
                          variant="secondary"
                          className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs mr-2"
                        >
                          {showNotifications ? 5 : 0}
                        </Badge>
                        <span>Task Notifications</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-[200px] justify-start",
                          pulsingDot
                            ? "bg-primary/10 text-primary hover:bg-primary/20"
                            : ""
                        )}
                        onClick={() => setPulsingDot(!pulsingDot)}
                      >
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full mr-2",
                            pulsingDot ? "bg-primary animate-pulse" : "bg-muted-foreground"
                          )}
                        />
                        <span>Pulsing Dot</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-[200px] justify-start",
                          showInvelaTabs
                            ? "bg-primary/10 text-primary hover:bg-primary/20"
                            : ""
                        )}
                        onClick={() => setShowInvelaTabs(!showInvelaTabs)}
                      >
                        {showInvelaTabs ? (
                          <span>Hide Invela-Only Tabs</span>
                        ) : (
                          <span>Show Invela-Only Tabs</span>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold">Usage Examples</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentComponent.usageLocations?.map((location, index) => (
                <div key={index} className="flex items-center justify-between bg-muted/50 rounded-lg p-4">
                  <div>
                    <p className="font-medium">{location.path}</p>
                    <p className="text-sm text-muted-foreground">{location.description}</p>
                  </div>
                  {location.viewInApp && (
                    <Link href={location.path}>
                      <Button variant="outline" size="sm">
                        View in App
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold">Code Example</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Referenced As: <code className="bg-muted px-1 py-0.5 rounded">{currentComponent.referencedAs}</code>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyCode}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadCode}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="p-4 rounded-lg bg-muted overflow-x-auto">
              <code className="text-sm whitespace-pre-wrap break-words font-mono">
                {currentComponent.code}
              </code>
            </pre>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}