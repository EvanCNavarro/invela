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
import { ArrowUpRight } from "lucide-react";

const components = [
  {
    id: "loading-spinner",
    name: "Invela Logo Loading Spinner",
    usageLocations: [
      { path: "/", description: "During data fetch" },
      { path: "/insights", description: "Chart loading states" },
      { path: "/network", description: "Company list loading" }
    ]
  },
  // Add more components here
];

export default function PlaygroundPage() {
  const [selectedComponent, setSelectedComponent] = useState(components[0].id);
  const [isTableLoading, setIsTableLoading] = useState(true);

  const currentComponent = components.find(c => c.id === selectedComponent);

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
            <h3 className="text-sm font-medium mb-2">Select Component</h3>
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

              {/* Usage Examples */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold">Usage Examples</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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