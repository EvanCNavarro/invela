import { useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function PlaygroundPage() {
  const [isTableLoading, setIsTableLoading] = useState(true);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Component Playground"
          description="Test and preview UI components in different states."
        />

        <div className="space-y-8">
          {/* Loading Spinner Sizes */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Loading Spinner Sizes</h2>
            <div className="flex items-center gap-8 p-4 bg-white rounded-lg border">
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
          </div>

          {/* Loading Table Example */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Loading Table Example</h2>
              <Button 
                variant="outline"
                onClick={() => setIsTableLoading(!isTableLoading)}
              >
                Toggle Loading State
              </Button>
            </div>

            <div className="bg-background rounded-lg border">
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
                      <TableCell colSpan={3} className="h-[400px]">
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
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}