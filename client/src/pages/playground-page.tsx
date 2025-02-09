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
import {
  ArrowUpRight,
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
  ChevronRight as ChevronRightIcon
} from "lucide-react";
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

// Define status badge variants once
const getStatusBadgeVariant = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'completed':
      return 'success';
    case 'error':
      return 'destructive';
    default:
      return 'outline';
  }
};

// Sort components alphabetically and set LoadingSpinner as default
const components = [
  {
    id: "data-table",
    name: "Data Table",
    usageLocations: [
      { path: "/file-vault", description: "File management list", viewInApp: true },
      { path: "/network", description: "Company network table", viewInApp: true },
      { path: "/insights", description: "Analytics data grid", viewInApp: true }
    ],
    references: "Table, TableHeader, TableBody, TableRow, TableCell",
    referencedAs: "@/components/ui/data-table",
    code: `// Data Table component code example
interface DataTableProps<T> {
  data: T[];
  columns: {
    key: string;
    header: string;
    sortable?: boolean;
    type?: 'checkbox' | 'icon' | 'status' | 'actions' | 'text';
  }[];
  isLoading?: boolean;
  // ... other props
}

export function DataTable<T extends Record<string, any>>({ 
  data,
  columns,
  isLoading,
  // ... other props
}: DataTableProps<T>) {
  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Table>
      <TableHeader>
        {/* Header implementation */}
      </TableHeader>
      <TableBody>
        {/* Body implementation */}
      </TableBody>
    </Table>
  );
}`
  },
  {
    id: "loading-spinner",
    name: "Loading Spinner",
    usageLocations: [
      { path: "/", description: "During data fetch", viewInApp: true },
      { path: "/insights", description: "Chart loading states", viewInApp: true },
      { path: "/network", description: "Company list loading", viewInApp: true }
    ],
    references: "LoadingSpinner",
    referencedAs: "@/components/ui/loading-spinner",
    code: `interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({ 
  className, 
  size = "md" 
}: LoadingSpinnerProps) {
  return (
    <div className={cn(
      "flex items-center justify-center",
      size === "sm" && "h-4 w-4",
      size === "md" && "h-8 w-8",
      size === "lg" && "h-12 w-12",
      className
    )}>
      {/* SVG implementation */}
    </div>
  );
}`
  },
  {
    id: "page-header",
    name: "Page Header",
    usageLocations: [
      { path: "/file-vault", description: "File management header", viewInApp: true },
      { path: "/insights", description: "Analytics dashboard header", viewInApp: true },
      { path: "/network", description: "Network view header", viewInApp: true }
    ],
    references: "PageHeader",
    referencedAs: "@/components/ui/page-header",
    code: `interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export function PageHeader({ 
  title, 
  description, 
  className 
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <h1 className="text-2xl font-semibold mb-1">
        {title}
      </h1>
      {description && (
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}`
  },
  {
    id: "risk-meter",
    name: "Risk Meter",
    usageLocations: [
      { path: "/", description: "Company risk overview", viewInApp: true },
      { path: "/network/company/:id", description: "Detailed company risk", viewInApp: true },
      { path: "/insights", description: "Risk analytics", viewInApp: true }
    ],
    references: "RiskMeter",
    referencedAs: "@/components/dashboard/RiskMeter",
    code: `interface RiskMeterProps {
  score: number;
  className?: string;
}

export function RiskMeter({ 
  score = 0, 
  className 
}: RiskMeterProps) {
  const normalizedScore = Math.min(
    Math.max(0, score), 
    1500
  );

  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-4",
      className
    )}>
      {/* Implementation */}
    </div>
  );
}`
  },
  {
    id: "sidebar-menu",
    name: "Sidebar Menu",
    usageLocations: [
      { path: "/", description: "Main dashboard navigation", viewInApp: true },
      { path: "/network", description: "Network view navigation", viewInApp: true },
      { path: "/insights", description: "Analytics navigation", viewInApp: true }
    ],
    references: "Sidebar",
    referencedAs: "@/components/dashboard/Sidebar",
    code: `interface SidebarProps {
  isExpanded: boolean;
  onToggleExpanded: () => void;
  isNewUser?: boolean;
  notificationCount?: number;
  showPulsingDot?: boolean;
  showInvelaTabs?: boolean;
}

export function Sidebar({ 
  isExpanded,
  onToggleExpanded,
  // ... other props
}: SidebarProps) {
  return (
    <div className={cn(
      "h-full bg-background/95",
      isExpanded ? "w-64" : "w-20"
    )}>
      {/* Implementation */}
    </div>
  );
}`
  }
].sort((a, b) => a.name.localeCompare(b.name));

export default function PlaygroundPage() {
  // Set LoadingSpinner as default component
  const [selectedComponent, setSelectedComponent] = useState("loading-spinner");
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [riskScore, setRiskScore] = useState(250);
  const { toast } = useToast();

  // Add new state for sidebar playground
  const [isExpanded, setIsExpanded] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);
  const [pulsingDot, setPulsingDot] = useState(false);
  const [showInvelaTabs, setShowInvelaTabs] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Generate sample data for pagination testing
  const generateSampleData = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `Company ${i + 1}`,
      status: ['Active', 'Pending', 'Completed', 'Error'][i % 4],
      date: new Date(2025, 1, 9 - i).toISOString().split('T')[0],
      logo: ""
    }));
  };

  const [tableData, setTableData] = useState(generateSampleData(100));
  const [tableSortConfig, setTableSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({
    key: 'name',
    direction: 'asc'
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
    view: true
  });

  const defaultFilters = {
    checkbox: true,
    icon: true,
    status: true,
    actions: true,
    view: true
  };

  const handleClearFilters = () => {
    setEnabledColumns(defaultFilters);
    setTableSortConfig({ key: 'name', direction: 'asc' });
    setSelectedRows(new Set());
    setCurrentPage(1);
    setItemCount("5"); // Reset to default 5 items
  };

  const handleTableSort = (key: string) => {
    setTableSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
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
      setSelectedRows(new Set(tableData.map(row => row.id)));
    }
  };

  const totalPages = Math.ceil(tableData.length / Number(itemCount));

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const enabledColumnCount = Object.values(enabledColumns).filter(Boolean).length;

  const currentComponent = components.find(c => c.id === selectedComponent);

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
      const blob = new Blob([currentComponent.code], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
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
                <SelectValue placeholder="Select a component" />
              </SelectTrigger>
              <SelectContent>
                {components.map(component => (
                  <SelectItem key={component.id} value={component.id}>
                    {component.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {currentComponent && (
            <>
              {/* Preview section first */}
              {currentComponent.id === "loading-spinner" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-bold">Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-8">
                    <div className="flex items-center gap-8">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Small</p>
                        <LoadingSpinner size="sm" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Medium</p>
                        <LoadingSpinner size="md" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Large</p>
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
                          <p className="text-sm text-muted-foreground mb-2 text-center">Low Risk</p>
                          <RiskMeter score={250} />
                        </div>
                        <div className="w-48">
                          <p className="text-sm text-muted-foreground mb-2 text-center">Medium Risk</p>
                          <RiskMeter score={750} />
                        </div>
                        <div className="w-48">
                          <p className="text-sm text-muted-foreground mb-2 text-center">High Risk</p>
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
                        <p className="text-sm text-muted-foreground mb-4">With Description</p>
                        <PageHeader
                          title="Example Header"
                          description="This is an example description that provides additional context."
                        />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-4">Without Description</p>
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
                      <CardTitle className="text-sm font-bold">Interactive Table</CardTitle>
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
                          <DropdownMenuContent align="end" className="w-[200px]">
                            <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                              className="flex items-center py-2"
                              checked={enabledColumns.checkbox}
                              onCheckedChange={(checked) =>
                                setEnabledColumns(prev => ({ ...prev, checkbox: checked }))
                              }
                            >
                              <span className="font-medium">Selection</span>
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                              className="flex items-center py-2"
                              checked={enabledColumns.icon}
                              onCheckedChange={(checked) =>
                                setEnabledColumns(prev => ({ ...prev, icon: checked }))
                              }
                            >
                              <span className="font-medium">Icon Column</span>
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                              className="flex items-center py-2"
                              checked={enabledColumns.status}
                              onCheckedChange={(checked) =>
                                setEnabledColumns(prev => ({ ...prev, status: checked }))
                              }
                            >
                              <span className="font-medium">Status</span>
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                              className="flex items-center py-2"
                              checked={enabledColumns.actions}
                              onCheckedChange={(checked) =>
                                setEnabledColumns(prev => ({ ...prev, actions: checked }))
                              }
                            >
                              <span className="font-medium">Actions</span>
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                              className="flex items-center py-2"
                              checked={enabledColumns.view}
                              onCheckedChange={(checked) =>
                                setEnabledColumns(prev => ({ ...prev, view: checked }))
                              }
                            >
                              <span className="font-medium">View</span>
                            </DropdownMenuCheckboxItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Select value={itemCount} onValueChange={setItemCount}>
                          <SelectTrigger className="w-[130px]">
                            <ListIcon className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Show items" />
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
                        data={tableData.slice((currentPage - 1) * Number(itemCount), currentPage * Number(itemCount))}
                        columns={[
                          ...(enabledColumns.checkbox ? [{ key: 'select', header: '', type: 'checkbox' as const }] : []),
                          ...(enabledColumns.icon ? [{ key: 'name', header: 'Name', type: 'icon' as const, sortable: true }] : []),
                          ...(enabledColumns.status ? [{ key: 'status', header: 'Status', type: 'status' as const, sortable: true }] : []),
                          { key: 'date', header: 'Date', sortable: true },
                          ...(enabledColumns.actions ? [{ key: 'actions', header: '', type: 'actions' as const }] : []),
                          ...(enabledColumns.view ? [{ key: 'view', header: '', type: 'view' as const }] : [])
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
                            Showing {Math.min((currentPage - 1) * Number(itemCount) + 1, tableData.length)} to{" "}
                            {Math.min(currentPage * Number(itemCount), tableData.length)} of {tableData.length} entries
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
                          <div className={cn(
                            "absolute top-0 left-0 h-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
                            isExpanded ? "w-64" : "w-20"
                          )}>
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

                      {/* Controls */}
                      <div className="flex-1 space-y-6">
                        <div className="space-y-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className={cn(
                              "w-[200px] justify-start",
                              isExpanded ? "bg-primary/10 text-primary hover:bg-primary/20" : ""
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
                              showNotifications ? "bg-primary/10 text-primary hover:bg-primary/20" : ""
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
                              pulsingDot ? "bg-primary/10 text-primary hover:bg-primary/20" : ""
                            )}
                            onClick={() => setPulsingDot(!pulsingDot)}
                          >
                            <span className={cn(
                              "h-2 w-2 rounded-full mr-2",
                              pulsingDot ? "bg-primary animate-pulse" : "bg-muted-foreground"
                            )} />
                            <span>Pulsing Dot</span>
                          </Button>

                          <Button 
                            variant="outline" 
                            size="sm"
                            className={cn(
                              "w-[200px] justify-start",
                              showInvelaTabs ? "bg-primary/10 text-primary hover:bg-primary/20" : ""
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

              {/* Usage Examples section second */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-bold">Usage Examples</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {currentComponent.usageLocations.map((location, index) => (
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