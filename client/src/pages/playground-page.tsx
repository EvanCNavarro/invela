import { useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { RiskMeter } from "@/components/dashboard/RiskMeter";
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
  }
];

export default function PlaygroundPage() {
  const [selectedComponent, setSelectedComponent] = useState(components[0].id);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [riskScore, setRiskScore] = useState(250);
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
                          <TableRow>
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
            </div>
          )}

          {currentComponent?.id === "risk-meter" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Risk Levels Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold">Risk Levels</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col items-center gap-2">
                        <RiskMeter score={0} />
                        <span className="text-sm text-muted-foreground">No Risk</span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <RiskMeter score={250} />
                        <span className="text-sm text-muted-foreground">Low Risk</span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <RiskMeter score={750} />
                        <span className="text-sm text-muted-foreground">Medium Risk</span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <RiskMeter score={1250} />
                        <span className="text-sm text-muted-foreground">High Risk</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Interactive Risk Meter */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold">Interactive Example</CardTitle>
                      <Select
                        value={String(riskScore)}
                        onValueChange={(value) => setRiskScore(Number(value))}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select risk score" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">No Risk (0)</SelectItem>
                          <SelectItem value="250">Low Risk (250)</SelectItem>
                          <SelectItem value="750">Medium Risk (750)</SelectItem>
                          <SelectItem value="1250">High Risk (1250)</SelectItem>
                          <SelectItem value="1500">Critical Risk (1500)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-center">
                      <RiskMeter score={riskScore} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {currentComponent?.id === "page-header" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Examples */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold">Basic Examples</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <PageHeader 
                        title="Simple Header" 
                      />
                    </div>
                    <div className="pt-6 border-t">
                      <PageHeader 
                        title="With Description" 
                        description="A detailed explanation of this section."
                      />
                    </div>
                    <div className="pt-6 border-t">
                      <PageHeader 
                        title="Custom Styling" 
                        description="Header with custom text colors."
                        className="text-primary"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Responsive Design */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold">Responsive Design</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <div className="w-full md:w-2/3">
                          <PageHeader 
                            title="Responsive Width"
                            description="This header adjusts its width based on screen size."
                          />
                        </div>
                      </div>
                      <div className="pt-6 border-t">
                        <PageHeader 
                          title="Mobile Friendly"
                          description="The text and spacing automatically adjust for smaller screens."
                          className="text-center md:text-left"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
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
                                    "transition-colors hover:bg-accent/50",
                                    selectedLine === index && "bg-emerald-950/5"
                                  )}
                                >
                                  <td 
                                    className="select-none pr-4 text-right text-xs text-muted-foreground border-r cursor-pointer hover:text-foreground"
                                    onClick={() => setSelectedLine(index)}
                                    style={{ minWidth: '3rem' }}
                                  >
                                    {index + 1}
                                  </td>
                                  <td className="pl-4 font-mono text-sm whitespace-pre-wrap text-foreground/90">
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
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}