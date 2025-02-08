import { useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Widget } from "@/components/dashboard/Widget";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import {
  Settings,
  BarChart3,
  Globe,
  Zap,
  Bell,
  Check,
  Activity,
  LayoutGrid,
  AlertTriangle,
  Send,
  CheckCircle2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import confetti from 'canvas-confetti';
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { RiskMeter } from "@/components/dashboard/RiskMeter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Company } from "@/types/company";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";

const DEFAULT_WIDGETS = {
  updates: true,
  announcements: true,
  quickActions: true,
  companyScore: true,
  networkVisualization: true
};

const inviteFormSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  email: z.string().email("Please enter a valid email address")
});

type InviteFormData = z.infer<typeof inviteFormSchema>;

export default function DashboardPage() {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();
  const [visibleWidgets, setVisibleWidgets] = useState(DEFAULT_WIDGETS);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      companyName: "",
      email: ""
    }
  });

  const { data: companyData, isLoading } = useQuery<Company>({
    queryKey: ["/api/companies/current"],
    enabled: !!user
  });

  const toggleWidget = (widgetId: keyof typeof DEFAULT_WIDGETS) => {
    setVisibleWidgets(prev => ({
      ...prev,
      [widgetId]: !prev[widgetId]
    }));
  };

  const allWidgetsHidden = Object.values(visibleWidgets).every(v => !v);

  const { mutate: sendInvite, isPending } = useMutation({
    mutationFn: async (data: InviteFormData) => {
      const response = await fetch('/api/fintech/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to send invitation');
      }

      return result;
    },
    onSuccess: () => {
      const addFinTechButton = document.querySelector('[data-element="add-fintech-button"]');
      if (addFinTechButton) {
        const rect = addFinTechButton.getBoundingClientRect();
        confetti({
          particleCount: 75,
          spread: 52,
          origin: {
            x: rect.left / window.innerWidth + (rect.width / window.innerWidth) / 2,
            y: rect.top / window.innerHeight
          },
          colors: ['#4965EC', '#F4F6FA', '#FCFDFF'],
          ticks: 200,
          gravity: 0.8,
          scalar: 0.8,
          shapes: ["circle"]
        });
      }

      toast({
        title: (
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Invitation Sent
          </span>
        ),
        description: "The FinTech has been invited to join.",
        duration: 2000,
        className: "border-l-4 border-green-500",
      });

      form.reset();
      setServerError(null);
      setIsModalOpen(false);
    },
    onError: (error: Error) => {
      setServerError(error.message);
    },
  });

  const handleSendInvite = (data: InviteFormData) => {
    setServerError(null);
    sendInvite(data);
  };

  const handleInputChange = () => {
    if (serverError) {
      setServerError(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <PageHeader
            title="Dashboard"
            description="Get an overview of your company's performance and recent activities."
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-56 justify-start">
                <Settings className="h-4 w-4 mr-2" />
                <span>Customize Dashboard</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56"
              sideOffset={4}
            >
              <DropdownMenuLabel>Visible Widgets</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.entries(visibleWidgets).map(([key, isVisible]) => (
                <DropdownMenuItem
                  key={key}
                  onSelect={(event) => {
                    event.preventDefault();
                    toggleWidget(key as keyof typeof DEFAULT_WIDGETS);
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="w-4">
                    {isVisible ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <div className="h-4 w-4" />
                    )}
                  </div>
                  <span className={cn(
                    "flex-1",
                    isVisible ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {allWidgetsHidden ? (
          <div className="grid grid-cols-3 gap-4 min-h-[400px]">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="border-2 border-dashed border-muted rounded-lg flex items-center justify-center p-6 text-center bg-background/40 backdrop-blur-sm"
              >
                <div className="space-y-2">
                  <LayoutGrid className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No widgets selected. Click "Customize Dashboard" to add widgets.
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {visibleWidgets.updates && (
              <Widget
                title="Recent Updates"
                icon={<Activity className="h-5 w-5" />}
                size="double"
                onVisibilityToggle={() => toggleWidget('updates')}
                isVisible={visibleWidgets.updates}
              >
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    No recent updates to show.
                  </p>
                </div>
              </Widget>
            )}

            {visibleWidgets.announcements && (
              <Widget
                title="Announcements"
                icon={<Bell className="h-5 w-5" />}
                onVisibilityToggle={() => toggleWidget('announcements')}
                isVisible={visibleWidgets.announcements}
              >
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Welcome to Invela! Check out our latest features.
                  </p>
                </div>
              </Widget>
            )}

            {visibleWidgets.quickActions && (
              <Widget
                id="quick-actions-widget"
                title="Quick Actions"
                icon={<Zap className="h-5 w-5" />}
                size="double"
                onVisibilityToggle={() => toggleWidget('quickActions')}
                isVisible={visibleWidgets.quickActions}
                actions={[
                  {
                    label: "Customize Actions",
                    onClick: () => console.log("Customize actions"),
                    icon: <Settings className="h-4 w-4" />
                  }
                ]}
              >
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="w-full pulse-border font-medium"
                    onClick={() => setIsModalOpen(true)}
                    data-element="add-fintech-button"
                  >
                    Add New FinTech
                  </Button>
                  <Button variant="outline" className="w-full font-medium">
                    Add User
                  </Button>
                  <Button variant="outline" className="w-full font-medium">
                    Set Risk Tracker
                  </Button>
                  <Button variant="outline" className="w-full font-medium">
                    View Reports
                  </Button>
                </div>

                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-semibold">Invite a New FinTech</DialogTitle>
                      <DialogDescription className="text-sm text-muted-foreground mt-1.5 mb-6">
                        Please provide details to send a FinTech invitation.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleSendInvite)} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <div className="text-sm font-semibold mb-2">Company Name</div>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="text"
                                  className={cn(
                                    "w-full",
                                    serverError && "border-destructive"
                                  )}
                                  disabled={isPending}
                                  aria-label="FinTech company name"
                                  autoFocus
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <div className="text-sm font-semibold mb-2">Invitee Email</div>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="email"
                                  className={cn(
                                    "w-full",
                                    serverError && "border-destructive"
                                  )}
                                  disabled={isPending}
                                  aria-label="FinTech representative email"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleInputChange();
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                              {serverError && (
                                <p className="text-sm font-medium text-destructive mt-2">
                                  {serverError.includes("mailbox")
                                    ? "This email address does not exist. Please try again."
                                    : serverError}
                                </p>
                              )}
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end">
                          <Button
                            type="submit"
                            className="gap-2"
                            disabled={isPending}
                          >
                            {isPending ? (
                              <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4" />
                                Send Invite
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </Widget>
            )}

            {visibleWidgets.companyScore && (
              <Widget
                title="Company Score"
                icon={<AlertTriangle className="h-5 w-5" />}
                onVisibilityToggle={() => toggleWidget('companyScore')}
                isVisible={visibleWidgets.companyScore}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center min-h-[200px]">
                    <p className="text-sm text-muted-foreground">Loading company data...</p>
                  </div>
                ) : companyData ? (
                  <div className="space-y-1">
                    <div className="bg-muted/50 rounded-lg py-2 px-3 flex items-center justify-center space-x-3">
                      {companyData.logoId ? (
                        <img
                          src={`/api/companies/${companyData.id}/logo`}
                          alt={`${companyData.name} logo`}
                          className="w-6 h-6 object-contain"
                        />
                      ) : null}
                      <span className="text-sm font-medium">{companyData.name}</span>
                    </div>
                    <RiskMeter score={companyData.riskScore || 0} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center min-h-[200px]">
                    <p className="text-sm text-muted-foreground">No company data available</p>
                  </div>
                )}
              </Widget>
            )}

            {visibleWidgets.networkVisualization && (
              <Widget
                title="Network Visualization"
                icon={<Globe className="h-5 w-5" />}
                size="triple"
                onVisibilityToggle={() => toggleWidget('networkVisualization')}
                isVisible={visibleWidgets.networkVisualization}
              >
                <div className="flex items-center justify-center min-h-[200px]">
                  <p className="text-sm text-muted-foreground">
                    Network visualization coming soon
                  </p>
                </div>
              </Widget>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}