import { useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { RiskMeter } from "@/components/dashboard/RiskMeter";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Sidebar } from "@/components/dashboard/Sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTab } from "@/components/dashboard/SidebarTab";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  HomeIcon,
  ListTodoIcon,
  NetworkIcon,
  FolderIcon,
  BarChartIcon,
  MousePointer2Icon,
  LockIcon,
  Copy,
  Download,
  XCircle,
  Columns as ColumnsIcon,
  List as ListIcon,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ArrowUpRight,
} from "lucide-react";
import { SearchBar } from "@/components/playground/SearchBar";
import SearchBarPlayground from "@/components/playground/SearchBarPlayground"; // Import the new component
import { DropdownPlayground } from "@/components/playground/DropdownPlayground";


// Define the Component interface
interface PlaygroundComponent {
  id: string;
  name: string;
  code?: string;
  usageLocations?: { path: string; description: string; viewInApp?: boolean }[];
  referencedAs?: string;
}

// Define available components
const components: PlaygroundComponent[] = [
  {
    id: "loading-spinner",
    name: "Loading Spinner",
    code: `import { LoadingSpinner } from "@/components/ui/loading-spinner";

export function Example() {
  return (
    <div className="flex gap-4">
      <LoadingSpinner size="sm" />
      <LoadingSpinner size="md" />
      <LoadingSpinner size="lg" />
    </div>
  );
}
`,
  },
  {
    id: "risk-meter",
    name: "Risk Meter",
    code: `import { RiskMeter } from "@/components/dashboard/RiskMeter";

export function Example() {
  return (
    <div className="w-48">
      <RiskMeter score={750} />
    </div>
  );
}
`,
  },
  {
    id: "page-header",
    name: "Page Header",
    code: `import { PageHeader } from "@/components/ui/page-header";

export function Example() {
  return (
    <PageHeader
      title="Example Header"
      description="This is an example description that provides additional context."
    />
  );
}
`,
  },
  {
    id: "data-table",
    name: "Data Table",
    code: `import { DataTable } from "@/components/ui/data-table";

export function Example() {
  const data = [
    { id: 1, name: "Example 1", status: "Active", date: "2025-02-09" },
    { id: 2, name: "Example 2", status: "Pending", date: "2025-02-08" }
  ];

  return (
    <DataTable
      data={data}
      columns={[
        { key: 'name', header: 'Name', type: 'icon', sortable: true },
        { key: 'status', header: 'Status', type: 'status', sortable: true },
        { key: 'date', header: 'Date', sortable: true }
      ]}
    />
  );
}
`,
  },
  {
    id: "sidebar-menu",
    name: "Sidebar Menu",
    code: `import { Sidebar } from "@/components/dashboard/Sidebar";

export function Example() {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Sidebar
      isExpanded={isExpanded}
      onToggleExpanded={() => setIsExpanded(!isExpanded)}
      isNewUser={false}
      notificationCount={5}
    />
  );
}
`,
  },
  {
    id: "sidebar-tab",
    name: "Sidebar Tab",
    code: `import { SidebarTab } from "@/components/dashboard/SidebarTab";
import { HomeIcon } from "lucide-react";

export function Example() {
  return (
    <SidebarTab
      icon={HomeIcon}
      label="Dashboard"
      href="/"
      isActive={true}
      isExpanded={true}
    />
  );
}
`,
  },
  {
    id: "search-bar",
    name: "Search Bar",
    code: `import { SearchBar } from "@/components/playground/SearchBar";

export function Example() {
  const handleSearch = (value: string) => {
    console.log('Searching for:', value);
  };

  return (
    <div className="space-y-4">
      <SearchBar 
        placeholder="Search..."
        onSearch={handleSearch}
        showClearButton={true}
        iconPosition="left"
      />
    </div>
  );
}
`,
  },
  {
    id: "unified-dropdown",
    name: "Unified Dropdown",
    code: `import { UnifiedDropdown } from "@/components/ui/unified-dropdown";
import { Settings } from "lucide-react";

export function Example() {
  return (
    <UnifiedDropdown
      trigger={{
        text: "Customize Dashboard",
        leftIcon: Settings
      }}
      title="Visible Widgets"
      items={[
        { id: 'announcements', label: 'Announcements', selected: true },
        { id: 'quick_actions', label: 'Quick Actions', selected: true },
        { id: 'company_score', label: 'Company Score' },
        { id: 'network', label: 'Network Visualization' },
      ]}
    />
  );
}
`,
  },
];

// Update availableIcons mapping to include all options in sidebar order with proper labels
const availableIcons: Record<string, { icon: React.ElementType; label: string }> = {
  Dashboard: { icon: HomeIcon, label: "Dashboard" },
  TaskCenter: { icon: ListTodoIcon, label: "Task Center" },
  Network: { icon: NetworkIcon, label: "Network" },
  FileVault: { icon: FolderIcon, label: "File Vault" },
  Insights: { icon: BarChartIcon, label: "Insights" },
  Playground: { icon: MousePointer2Icon, label: "Playground" },
  Locked: { icon: LockIcon, label: "Locked" },
};

// Add helper functions for handling lock state
const handleLockState = (locked: boolean, setters: {
  setIsTabDisabled: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedIcon: React.Dispatch<React.SetStateAction<React.ElementType>>;
  setTabLabel: React.Dispatch<React.SetStateAction<string>>;
  setIsTabActive: React.Dispatch<React.SetStateAction<boolean>>;
  setTabVariant: React.Dispatch<React.SetStateAction<'default' | 'invela'>>;
  setTabNotifications: React.Dispatch<React.SetStateAction<boolean>>;
  setTabPulsingDot: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const {
    setIsTabDisabled,
    setSelectedIcon,
    setTabLabel,
    setIsTabActive,
    setTabVariant,
    setTabNotifications,
    setTabPulsingDot,
  } = setters;

  setIsTabDisabled(locked);
  if (locked) {
    setSelectedIcon(availableIcons.Locked.icon);
    setTabLabel("Locked");
    setIsTabActive(false);
    setTabVariant('default');
    setTabNotifications(false);
    setTabPulsingDot(false);
  }
};

export default function PlaygroundPage() {
  // Component state management
  const [selectedComponent, setSelectedComponent] = useState("loading-spinner");
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [riskScore, setRiskScore] = useState(250);
  const { toast } = useToast();

  // Sidebar playground state
  const [isExpanded, setIsExpanded] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);
  const [pulsingDot, setPulsingDot] = useState(false);
  const [showInvelaTabs, setShowInvelaTabs] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // SidebarTab preview states
  const [selectedIcon, setSelectedIcon] = useState<React.ElementType>(
    availableIcons.Dashboard.icon
  );
  const [tabLabel, setTabLabel] = useState("Dashboard");
  const [isTabActive, setIsTabActive] = useState(false);
  const [tabVariant, setTabVariant] = useState<'default' | 'invela'>('default');
  const [isTabDisabled, setIsTabDisabled] = useState(false);
  const [tabPulsingDot, setTabPulsingDot] = useState(false);
  const [tabNotifications, setTabNotifications] = useState(false);

  // Handle functions for SidebarTab controls
  const handleReset = () => {
    setIsTabDisabled(false);
    setSelectedIcon(availableIcons.Dashboard.icon);
    setTabLabel("Dashboard");
    setIsTabActive(false);
    setTabVariant('default');
    setTabNotifications(false);
    setTabPulsingDot(false);
  };

  const handleAccessToggle = () => {
    const newLockedState = !isTabDisabled;
    handleLockState(newLockedState, {
      setIsTabDisabled,
      setSelectedIcon,
      setTabLabel,
      setIsTabActive,
      setTabVariant,
      setTabNotifications,
      setTabPulsingDot,
    });
  };

  // When rendering the sidebar tab preview section
  const generateSampleData = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `Company ${i + 1}`,
      status: ["Active", "Pending", "Completed", "Error"][i % 4],
      date: new Date(2025, 1, 9 - i)
        .toISOString()
        .split("T")[0],
      logo: "",
    }));
  };

  const [tableData, setTableData] = useState(generateSampleData(100));
  const [tableSortConfig, setTableSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  }>({
    key: "name",
    direction: "asc",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [selectedRows, setSelectedRows] = useState(new Set<number>());
  const [itemCount, setItemCount] = useState("5"); // Default to 5 items
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [enabledColumns, setEnabledColumns] = useState({
    checkbox: true,
    icon: true,
    status: true,
    actions: true,
    view: true,
  });

  const defaultFilters = {
    checkbox: true,
    icon: true,
    status: true,
    actions: true,
    view: true,
  };

  const handleClearFilters = () => {
    setEnabledColumns(defaultFilters);
    setTableSortConfig({ key: "name", direction: "asc" });
    setSelectedRows(new Set());
    setCurrentPage(1);
    setItemCount("5"); // Reset to default 5 items
  };

  const handleTableSort = (key: string) => {
    setTableSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleRowSelect = (id: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === tableData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(tableData.map((row) => row.id)));
    }
  };

  const totalPages = Math.ceil(tableData.length / Number(itemCount));

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const enabledColumnCount = Object.values(enabledColumns).filter(Boolean).length;

  const currentComponent = components.find(
    (c) => c.id === selectedComponent
  );

  const handleCopyCode = () => {
    if (currentComponent?.code) {
      navigator.clipboard.writeText(currentComponent.code);
      toast({
        description: "Code copied to clipboard",
        duration: 2000,
      });
    }
  };

  const handleDownloadCode = () => {
    if (currentComponent?.code) {
      const fileName = `invela_app_code_${currentComponent.id}.tsx`;
      const blob = new Blob([currentComponent.code], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Code Downloaded",
        description: `File saved as ${fileName}`,
        duration: 3000,
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Component Playground"
          description="Test and preview UI components in different states."
        />

        <div className="space-y-6">
          <div className="px-1">
            <h3 className="text-sm font-bold mb-2">Select Component</h3>
            <Select
              value={selectedComponent}
              onValueChange={setSelectedComponent}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select a component">
                  {components.find(c => c.id === selectedComponent)?.name || "Select a component"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {components.map((component) => (
                  <SelectItem key={component.id} value={component.id}>
                    {component.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {currentComponent && (
            <>
              {currentComponent.id === "loading-spinner" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-bold">Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-8">
                    <div className="flex items-center gap-8">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Small
                        </p>
                        <LoadingSpinner size="sm" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Medium
                        </p>
                        <LoadingSpinner size="md" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Large
                        </p>
                        <LoadingSpinner size="lg" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {currentComponent.id === "risk-meter" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-bold">Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center gap-8">
                      <div className="flex flex-wrap justify-center gap-8">
                        <div className="w-48">
                          <p className="text-sm text-muted-foreground mb-2 text-center">
                            Low Risk
                          </p>
                          <RiskMeter score={250} />
                        </div>
                        <div className="w-48">
                          <p className="text-sm text-muted-foreground mb-2 text-center">
                            Medium Risk
                          </p>
                          <RiskMeter score={750} />
                        </div>
                        <div className="w-48">
                          <p className="text-sm text-muted-foreground mb-2 text-center">
                            High Risk
                          </p>
                          <RiskMeter score={1200} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {currentComponent.id === "page-header" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-bold">Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-8">
                      <div>
                        <p className="text-sm text-muted-foreground mb-4">
                          With Description
                        </p>
                        <PageHeader
                          title="Example Header"
                          description="This is an example description that provides additional context."
                        />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Without Description
                        </p>
                        <PageHeader title="Example Header" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {currentComponent.id === "data-table" && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold">
                        Interactive Table
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClearFilters}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <ColumnsIcon className="h-4 w-4 mr-2" />
                              {enabledColumnCount} Columns
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-[200px]"
                          >
                            <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                              className="flex items-center py-2"
                              checked={enabledColumns.checkbox}
                              onCheckedChange={(checked) =>
                                setEnabledColumns((prev) => ({
                                  ...prev,
                                  checkbox: checked,
                                }))
                              }
                            >
                              <span className="font-medium">Selection</span>
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                              className="flex items-center py-2"
                              checked={enabledColumns.icon}
                              onCheckedChange={(checked) =>
                                setEnabledColumns((prev) => ({
                                  ...prev,
                                  icon: checked,
                                }))
                              }
                            >
                              <span className="font-medium">Icon Column</span>
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                              className="flex items-center py-2"
                              checked={enabledColumns.status}
                              onCheckedChange={(checked) =>
                                setEnabledColumns((prev) => ({
                                  ...prev,
                                  status: checked,
                                }))
                              }
                            >
                              <span className="font-medium">Status</span>
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                              className="flex items-center py-2"
                              checked={enabledColumns.actions}
                              onCheckedChange={(checked) =>
                                setEnabledColumns((prev) => ({
                                  ...prev,
                                  actions: checked,
                                }))
                              }
                            >
                              <span className="font-medium">Actions</span>
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                              className="flex items-center py-2"
                              checked={enabledColumns.view}
                              onCheckedChange={(checked) =>
                                setEnabledColumns((prev) => ({
                                  ...prev,
                                  view: checked,
                                }))
                              }
                            >
                              <span className="font-medium">View</span>
                            </DropdownMenuCheckboxItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Select value={itemCount} onValueChange={setItemCount}>
                          <SelectTrigger className="w-[130px]">
                            <ListIcon className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Show items">
                              {`${itemCount} items`}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 items</SelectItem>
                            <SelectItem value="10">10 items</SelectItem>
                            <SelectItem value="25">25 items</SelectItem>
                            <SelectItem value="50">50 items</SelectItem>
                            <SelectItem value="100">100 items</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-[120px]"
                          onClick={() => setIsTableLoading(!isTableLoading)}
                        >
                          {isTableLoading ? "Stop Loading" : "Show Loading"}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <DataTable
                        data={tableData.slice(
                          (currentPage - 1) * Number(itemCount),
                          currentPage * Number(itemCount)
                        )}
                        columns={[
                          ...(enabledColumns.checkbox
                            ? [{ key: "select", header: "", type: "checkbox" as const }]
                            : []),
                          ...(enabledColumns.icon
                            ? [{ key: "name", header: "Name", type: "icon" as const, sortable: true }]
                            : []),
                          ...(enabledColumns.status
                            ? [{ key: "status", header: "Status", type: "status" as const, sortable: true }]
                            : []),
                          { key: "date", header: "Date", sortable: true },
                          ...(enabledColumns.actions
                            ? [{ key: "actions", header: "", type: "actions" as const }]
                            : []),
                          ...(enabledColumns.view
                            ? [{ key: "view", header: "", type: "view" as const }]
                            : []),
                        ]}
                        isLoading={isTableLoading}
                        sortConfig={tableSortConfig}
                        onSort={handleTableSort}
                        selectedRows={selectedRows}
                        onRowSelect={handleRowSelect}
                        onSelectAll={handleSelectAll}
                      />

                      {tableData.length > 5 && (
                        <div className="flex items-center justify-between px-2">
                          <div className="flex-1 text-sm text-muted-foreground">
                            Showing{" "}
                            {Math.min(
                              (currentPage - 1) * Number(itemCount) + 1,
                              tableData.length
                            )}{" "}
                            to{" "}
                            {Math.min(
                              currentPage * Number(itemCount),
                              tableData.length
                            )}{" "}
                            of {tableData.length} entries
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(1)}
                              disabled={currentPage === 1}
                            >
                              <ChevronsLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium">
                              Page {currentPage} of {totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage === totalPages}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(totalPages)}
                              disabled={currentPage === totalPages}
                            >
                              <ChevronsRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
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
                      {/* Preview container */}
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
                              onToggleExpanded={() =>
                                setIsExpanded(!isExpanded)
                              }
                              isNewUser={false}
                              notificationCount={
                                showNotifications ? notificationCount : 0
                              }
                              showPulsingDot={pulsingDot}
                              showInvelaTabs={showInvelaTabs}
                              isPlayground={true}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Controls */}
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

              {currentComponent.id === "sidebar-tab" && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold">
                        Preview
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                      >
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
                        <p className="text-sm font-medium text-foreground">
                          Access
                        </p>
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
                          onValueChange={(value) => {
                            const iconData = availableIcons[
                              value as keyof typeof availableIcons
                            ];
                            if (value === "Locked") {
                              handleLockState(true, {
                                setIsTabDisabled,
                                setSelectedIcon,
                                setTabLabel,
                                setIsTabActive,
                                setTabVariant,
                                setTabNotifications,
                                setTabPulsingDot,
                              });
                            } else {
                              setSelectedIcon(iconData.icon);
                              setTabLabel(iconData.label);
                            }
                          }}
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

                      {/* Label Input */}
                      <div className="space-y-2 min-w-[200px] flex-1">
                        <p className="text-sm font-medium text-foreground">
                          Label
                        </p>
                        <Input
                          placeholder="Tab Label"
                          value={tabLabel}
                          onChange={(e) => setTabLabel(e.target.value)}
                          className="w-full"
                          disabled={isTabDisabled}
                        />
                      </div>

                      {/* Tab Variant */}
                      <div className="space-y-2 min-w-[200px] flex-1">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            isTabDisabled
                              ? "text-muted-foreground"
                              : "text-foreground"
                          )}
                        >
                          Variant
                        </p>
                        <Select
                          value={tabVariant}
                          onValueChange={(
                            value: "default" | "invela"
                          ) => setTabVariant(value)}
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
                            isTabDisabled
                              ? "text-muted-foreground"
                              : "text-foreground"
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
                            isTabDisabled
                              ? "text-muted-foreground"
                              : "text-foreground"
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
              {currentComponent.id === "search-bar" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-bold">Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-8">
                      {/* Global Search Examples */}
                      <div className="space-y-4">
                        <p className="text-sm font-medium">Global Application Search</p>
                        <p className="text-sm text-muted-foreground">
                          Used in the top navigation bar for application-wide search functionality
                        </p>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Default State</p>
                            <SearchBar
                              isGlobalSearch
                              onSearch={console.log}
                            />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Loading State</p>
                            <SearchBar
                              isGlobalSearch
                              isLoading={true}
                              onSearch={console.log}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Contextual Search Example */}
                      <div className="border-t pt-8">
                        <div className="space-y-4">
                          <p className="text-sm font-medium">Contextual Search</p>
                          <p className="text-sm text-muted-foreground">
                            Context-specific search with fuzzy matching for tables and filtered views
                          </p>
                          <SearchBarPlayground />
                        </div>
                      </div>
                    </div>
                  </CardContent>

                </Card>
              )}

              {/* Usage Examples section second */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-bold">Usage Examples</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {currentComponent.usageLocations?.map((location, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-muted/50 rounded-lg p-4"
                      >
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

              {/* Code Example section last */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold">Code Example</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Referenced As: <code className="bg-muted px-1 py-0.5 rounded">{currentComponent.referencedAs}</code>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyCode}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadCode}
                    >
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
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}