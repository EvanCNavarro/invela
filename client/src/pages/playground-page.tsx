import { useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { RiskMeter } from "@/components/dashboard/RiskMeter";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, Copy, Download, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

const components = [
  {
    id: "loading-spinner",
    name: "Invela Logo Loading Spinner",
    usageLocations: [
      { path: "/", description: "During data fetch" },
      { path: "/insights", description: "Chart loading states" },
      { path: "/network", description: "Company list loading" }
    ],
    references: "LoadingSpinner",
    code: `import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({ className, size = "md" }: LoadingSpinnerProps) {
  return (
    <div className={cn(
      "flex items-center justify-center",
      size === "sm" && "h-4 w-4",
      size === "md" && "h-8 w-8",
      size === "lg" && "h-12 w-12",
      className
    )}>
      <svg 
        viewBox="0 0 28 28" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        xmlns:anim="http://www.w3.org/2000/anim" 
        anim="" 
        anim:transform-origin="50% 50%" 
        anim:duration="1" 
        anim:ease="ease-in-out"
        className="animate-spin"
      >
        <g id="Frame 427319720">
          <g id="Invela Icon" anim:rotation="0[0:1:360:ease-in-out]">
            <path d="M4.11091 11.9259H7.96489V15.8148H4.11091V11.9259Z" fill="#4965EC" fillOpacity="0.5"></path>
            <path fillRule="evenodd" clipRule="evenodd" d="M23.8947 14C23.8947 19.5842 19.4084 24.1111 13.8743 24.1111C8.95555 24.1111 4.85962 20.5316 4.01429 15.8148H0.115504C0.99735 22.6895 6.82123 28 13.8743 28C21.5369 28 27.7486 21.732 27.7486 14C27.7486 6.26801 21.5369 0 13.8743 0C6.91015 0 1.14439 5.17749 0.151206 11.9259H4.06422C5.01052 7.33757 9.04646 3.88889 13.8743 3.88889C19.4084 3.88889 23.8947 8.41579 23.8947 14ZM8.50022e-05 13.9505C2.83495e-05 13.967 0 13.9835 0 14C0 14.0165 2.83495e-05 14.033 8.50022e-05 14.0495V13.9505Z" fill="#4965EC" fillOpacity="0.5"></path>
          </g>
        </g>
      </svg>
    </div>
  );
}
`
  },
  {
    id: "risk-meter",
    name: "Risk Assessment Meter",
    usageLocations: [
      { path: "/", description: "Company risk overview" },
      { path: "/network/company/:id", description: "Detailed company risk" },
      { path: "/insights", description: "Risk analytics" }
    ],
    references: "RiskMeter",
    code: `import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RiskMeterProps {
  score: number;
  className?: string;
}

export function RiskMeter({ score = 0, className }: RiskMeterProps) {
  const normalizedScore = Math.min(Math.max(0, score), 1500);

  const getRiskLevel = (score: number) => {
    if (score === 0) return { level: 'No Risk', color: 'bg-gray-100 text-gray-800' };
    if (score <= 499) return { level: 'Low Risk', color: 'bg-[hsl(209,99%,50%)] text-white' };
    if (score <= 999) return { level: 'Medium Risk', color: 'bg-yellow-100 text-yellow-800' };
    if (score <= 1449) return { level: 'High Risk', color: 'bg-red-100 text-red-800' };
    return { level: 'Critical Risk', color: 'bg-red-100 text-red-800' };
  };

  const { level, color } = getRiskLevel(normalizedScore);

  return (
    <div className={cn("flex flex-col items-center justify-center py-4", className)}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-6xl font-bold mb-2"
      >
        {normalizedScore}
      </motion.div>
      <div className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
        color
      )}>
        {level}
      </div>
    </div>
  );
}
`
  },
  {
    id: "page-header",
    name: "Page Header",
    usageLocations: [
      { path: "/file-vault", description: "File management header" },
      { path: "/insights", description: "Analytics dashboard header" },
      { path: "/network", description: "Network view header" }
    ],
    references: "PageHeader",
    code: `import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export function PageHeader({ title, description, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <h1 className="text-2xl font-semibold mb-1">{title}</h1>
      {description && (
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
`
  },
  {
    id: "data-table",
    name: "Data Table",
    usageLocations: [
      { path: "/file-vault", description: "File management list" },
      { path: "/network", description: "Company network table" },
      { path: "/insights", description: "Analytics data grid" }
    ],
    references: "Table, TableHeader, TableBody, TableRow, TableCell",
    code: `import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpIcon, ArrowDownIcon, ArrowUpDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface DataTableProps<T> {
  data: T[];
  columns: {
    key: string;
    header: string;
    sortable?: boolean;
    type?: 'checkbox' | 'icon' | 'status' | 'actions' | 'text';
  }[];
  isLoading?: boolean;
  sortConfig?: {
    key: string;
    direction: 'asc' | 'desc';
  };
  onSort?: (key: string) => void;
  selectedRows?: Set<number>;
  onRowSelect?: (id: number) => void;
  onSelectAll?: () => void;
}

export function DataTable<T extends Record<string, any>>({ 
  data,
  columns,
  isLoading,
  sortConfig,
  onSort,
  selectedRows,
  onRowSelect,
  onSelectAll
}: DataTableProps<T>) {
  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDownIcon className="h-4 w-4 text-muted-foreground" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUpIcon className="h-4 w-4 text-primary" />
      : <ArrowDownIcon className="h-4 w-4 text-primary" />;
  };

  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key}>{column.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 3 }).map((_, index) => (
            <TableRow key={index} className="animate-pulse">
              {columns.map((column) => (
                <TableCell key={column.key}>
                  <div className="h-4 bg-muted rounded w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.key}>
              {column.sortable ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8 data-[state=open]:bg-accent"
                  onClick={() => onSort?.(column.key)}
                >
                  {column.header}
                  {getSortIcon(column.key)}
                </Button>
              ) : (
                column.header
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, index) => (
          <TableRow key={index} className={selectedRows?.has(row.id) ? 'bg-primary/10' : ''}>
            {columns.map((column) => {
              if (column.type === 'checkbox') {
                return (
                  <TableCell key={column.key}>
                    <Checkbox checked={selectedRows?.has(row.id)} onCheckedChange={() => onRowSelect?.(row.id)} />
                  </TableCell>
                );
              }
              if (column.type === 'icon') {
                return <TableCell key={column.key}><img src={row.logo} alt={row.name} className="h-6 w-6 rounded-full" /></TableCell>
              }
              if (column.type === 'status') {
                return (
                  <TableCell key={column.key} className={`text-${row.status.toLowerCase()}`}>
                    {row.status}
                  </TableCell>
                );
              }
              if (column.type === 'actions') {
                return (
                  <TableCell key={column.key}>
                    <Button variant="ghost" size="sm">Edit</Button>
                    <Button variant="ghost" size="sm" className="ml-2">Delete</Button>
                  </TableCell>
                )
              }
              if (column.type === 'view') {
                return (
                  <TableCell key={column.key}>
                    <Button variant="ghost" size="sm">View</Button>
                  </TableCell>
                )
              }
              return <TableCell key={column.key}>{row[column.key]}</TableCell>;
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
`
  }
];

export default function PlaygroundPage() {
  const [selectedComponent, setSelectedComponent] = useState(components[0].id);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [riskScore, setRiskScore] = useState(250);
  const { toast } = useToast();
  const [tableData, setTableData] = useState([
    { id: 1, name: "Acme Corp", status: "Active", date: "2025-02-09" },
    { id: 2, name: "TechStart", status: "Pending", date: "2025-02-08" },
    { id: 3, name: "Global Inc", status: "Completed", date: "2025-02-07" }
  ]);
  const [tableSortConfig, setTableSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({
    key: 'name',
    direction: 'asc'
  });
  const [selectedRows, setSelectedRows] = useState(new Set<number>());
  const [itemCount, setItemCount] = useState("10");
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [enabledColumns, setEnabledColumns] = useState({
    checkbox: true,
    icon: true,
    status: true,
    actions: true,
    view: true
  });

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
          {/* Component Selector */}
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

          {currentComponent?.id === "data-table" && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold">Interactive Table</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRows(new Set());
                          setTableSortConfig({ key: 'name', direction: 'asc' });
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Clear Filters
                      </Button>
                      <Select value={itemCount} onValueChange={setItemCount}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue placeholder="Show items" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">All</SelectItem>
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
                        onClick={() => setIsTableLoading(!isTableLoading)}
                      >
                        Toggle Loading
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <label className="flex items-center gap-2">
                        <Checkbox 
                          checked={enabledColumns.checkbox}
                          onCheckedChange={(checked) => 
                            setEnabledColumns(prev => ({ ...prev, checkbox: !!checked }))
                          }
                        />
                        <span className="text-sm">Checkbox</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={enabledColumns.icon}
                          onCheckedChange={(checked) =>
                            setEnabledColumns(prev => ({ ...prev, icon: !!checked }))
                          }
                        />
                        <span className="text-sm">Icon Column</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={enabledColumns.status}
                          onCheckedChange={(checked) =>
                            setEnabledColumns(prev => ({ ...prev, status: !!checked }))
                          }
                        />
                        <span className="text-sm">Status</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={enabledColumns.actions}
                          onCheckedChange={(checked) =>
                            setEnabledColumns(prev => ({ ...prev, actions: !!checked }))
                          }
                        />
                        <span className="text-sm">Actions</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={enabledColumns.view}
                          onCheckedChange={(checked) =>
                            setEnabledColumns(prev => ({ ...prev, view: !!checked }))
                          }
                        />
                        <span className="text-sm">View</span>
                      </label>
                    </div>

                    <DataTable
                      data={Number(itemCount) === 0 ? tableData : tableData.slice(0, Number(itemCount))}
                      columns={[
                        ...(enabledColumns.checkbox ? [{ key: 'select', header: '', type: 'checkbox' as const }] : []),
                        ...(enabledColumns.icon ? [{ key: 'name', header: 'Name', type: 'icon' as const, sortable: true }] : []),
                        ...(enabledColumns.status ? [{ key: 'status', header: 'Status', type: 'status' as const, sortable: true }] : []),
                        { key: 'date', header: 'Date', sortable: true, type: 'text' as const },
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
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Code Section */}
          {currentComponent && (
            <>
              {/* Usage Examples */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold">Usage Examples</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-w-2xl">
                    {currentComponent.usageLocations.map((location, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-medium text-foreground truncate">{location.description}</h4>
                          <p className="text-xs text-muted-foreground truncate">{location.path}</p>
                        </div>
                        <Link href={location.path}>
                          <Button variant="outline" size="sm" className="ml-3 whitespace-nowrap hover:bg-accent/50">
                            <span>View Within App</span>
                            <ArrowUpRight className="ml-1 h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Code Display */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold">Code</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="references" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-11 bg-muted/50 p-1 mb-2">
                      <TabsTrigger 
                        value="references" 
                        className="data-[state=active]:bg-[#E6EBFF] data-[state=active]:text-primary data-[state=active]:shadow-none"
                      >
                        References
                      </TabsTrigger>
                      <TabsTrigger 
                        value="code" 
                        className="data-[state=active]:bg-[#E6EBFF] data-[state=active]:text-primary data-[state=active]:shadow-none"
                      >
                        Code
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="references" className="mt-4">
                      <div className="rounded-lg bg-muted/50 p-4">
                        <code className="text-sm font-mono">{currentComponent.references}</code>
                      </div>
                    </TabsContent>
                    <TabsContent value="code" className="mt-4">
                      <div className="relative rounded-lg bg-muted/50">
                        <div className="absolute right-4 top-4 flex gap-2 p-2 rounded-lg bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopyCode}
                            className="h-8 w-8 p-0 hover:bg-accent/50"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDownloadCode}
                            className="h-8 w-8 p-0 hover:bg-accent/50"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="overflow-auto max-h-[400px] pt-16 px-4 pb-4">
                          <table className="w-full border-collapse">
                            <tbody>
                              {currentComponent.code.split('\n').map((line, index) => (
                                <tr
                                  key={index}
                                  className={cn(
                                    "hover:bg-muted/50",
                                    selectedLine === index && "bg-muted"
                                  )}
                                  onClick={() => setSelectedLine(index)}
                                >
                                  <td className="py-1 pr-4 text-sm text-muted-foreground select-none text-right">
                                    {index + 1}
                                  </td>
                                  <td className="py-1 font-mono text-sm">
                                    <pre className="text-left">{line}</pre>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}