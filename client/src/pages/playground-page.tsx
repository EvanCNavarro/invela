import { useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, Copy, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  // Add more components here
];

export default function PlaygroundPage() {
  const [selectedComponent, setSelectedComponent] = useState(components[0].id);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const { toast } = useToast();

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

          {currentComponent?.id === "loading-spinner" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sizes Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold">Sizes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-8">
                      <div className="flex flex-col items-center gap-2">
                        <LoadingSpinner size="sm" />
                        <span className="text-sm text-muted-foreground">Small</span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <LoadingSpinner size="md" />
                        <span className="text-sm text-muted-foreground">Medium</span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <LoadingSpinner size="lg" />
                        <span className="text-sm text-muted-foreground">Large</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Loading Table Example */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold">Interactive Example</CardTitle>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => setIsTableLoading(!isTableLoading)}
                      >
                        Toggle Loading
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isTableLoading ? (
                            <TableRow>
                              <TableCell colSpan={3} className="h-[120px]">
                                <div className="flex items-center justify-center w-full h-full">
                                  <LoadingSpinner size="lg" />
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            <>
                              <TableRow>
                                <TableCell>John Doe</TableCell>
                                <TableCell>Active</TableCell>
                                <TableCell>2025-02-09</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Jane Smith</TableCell>
                                <TableCell>Pending</TableCell>
                                <TableCell>2025-02-08</TableCell>
                              </TableRow>
                            </>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* In the Code Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold">In the Code</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="references" className="w-full">
                    <TabsList className="w-full">
                      <TabsTrigger value="references" className="flex-1">References</TabsTrigger>
                      <TabsTrigger value="code" className="flex-1">Code</TabsTrigger>
                    </TabsList>
                    <TabsContent value="references" className="mt-4">
                      <div className="rounded-lg bg-muted p-4">
                        <code className="text-sm font-mono">{currentComponent.references}</code>
                      </div>
                    </TabsContent>
                    <TabsContent value="code" className="mt-4">
                      <div className="relative rounded-lg bg-muted">
                        <div className="absolute right-4 top-4 flex gap-2 p-2 rounded-lg bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopyCode}
                            className="h-8 w-8 p-0"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDownloadCode}
                            className="h-8 w-8 p-0"
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
                                    "transition-colors hover:bg-accent/50",
                                    selectedLine === index && "bg-emerald-950/10"
                                  )}
                                >
                                  <td 
                                    className="select-none pr-4 text-right text-xs text-muted-foreground border-r cursor-pointer hover:text-foreground"
                                    onClick={() => setSelectedLine(index)}
                                    style={{ minWidth: '3rem' }}
                                  >
                                    {index + 1}
                                  </td>
                                  <td className="pl-4 font-mono text-sm whitespace-pre-wrap">
                                    {line}
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

              {/* Usage Examples */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold">Usage Examples</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-w-2xl">
                    {currentComponent.usageLocations.map((location, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-medium truncate">{location.description}</h4>
                          <p className="text-xs text-muted-foreground truncate">{location.path}</p>
                        </div>
                        <Link href={location.path}>
                          <Button variant="outline" size="sm" className="ml-3 whitespace-nowrap">
                            <span>View Within App</span>
                            <ArrowUpRight className="ml-1 h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}