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

const components = [
  {
    id: "loading-spinner",
    name: "Invela Logo Loading Spinner",
    usageLocations: [
      { path: "/dashboard", description: "During data fetch" },
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

        <div className="space-y-8">
          {/* Component Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Select Component</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {currentComponent?.id === "loading-spinner" && (
            <>
              {/* Sizes Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Sizes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-8 p-4">
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

              {/* Usage Examples */}
              <Card>
                <CardHeader>
                  <CardTitle>Usage Examples</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {currentComponent.usageLocations.map((location, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                          <h4 className="font-medium">{location.description}</h4>
                          <p className="text-sm text-muted-foreground">{location.path}</p>
                        </div>
                        <Link href={location.path}>
                          <Button variant="outline">View Live</Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Loading Table Example */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Interactive Example</CardTitle>
                    <Button 
                      variant="outline"
                      onClick={() => setIsTableLoading(!isTableLoading)}
                    >
                      Toggle Loading State
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
                            <TableCell colSpan={3} className="h-[200px]">
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
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}