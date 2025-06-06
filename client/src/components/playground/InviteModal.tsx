import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send, AlertTriangle, ExternalLink } from "lucide-react";
import { useUnifiedToast } from "@/hooks/use-unified-toast";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentCompany } from "@/hooks/use-current-company";
import confetti from 'canvas-confetti';
import { Link } from "wouter";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  full_name: z.string().min(1, "Full name is required"),
  company_name: z.string().min(1, "Company name is required")
});

type InviteData = z.infer<typeof inviteSchema>;

interface InviteModalProps {
  variant: 'user' | 'fintech';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  companyId?: number;
  companyName?: string;
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w-]+/g, '')  // Remove all non-word chars
    .replace(/--+/g, '-');    // Replace multiple - with single -
}

export function InviteModal({ variant, open, onOpenChange, onSuccess, companyId, companyName }: InviteModalProps) {
  const unifiedToast = useUnifiedToast();
  const { user } = useAuth();
  const { company } = useCurrentCompany();
  const [serverError, setServerError] = useState<string | null>(null);
  const [existingCompany, setExistingCompany] = useState<{ id: number; name: string; category: string; } | null>(null);
  const [isCheckingCompany, setIsCheckingCompany] = useState(false);
  const [isDemoFintech, setIsDemoFintech] = useState(true); // Default to true

  const form = useForm<InviteData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      full_name: "",
      company_name: companyName || ""
    }
  });

  const checkExistingCompany = async (companyName: string) => {
    if (!companyName || (variant === 'user' && companyId)) return;

    setIsCheckingCompany(true);
    try {
      const response = await fetch('/api/fintech/check-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: companyName })
      });

      if (response.status === 409) {
        const data = await response.json();
        setExistingCompany(data.existingCompany);
      } else {
        setExistingCompany(null);
      }
    } catch (error) {
      console.error('Error checking company:', error);
    } finally {
      setIsCheckingCompany(false);
    }
  };

  const { mutate: sendInvite, isPending } = useMutation({
    mutationFn: async (formData: InviteData) => {
      const endpoint = variant === 'user' ? '/api/users/invite' : '/api/fintech/invite';

      const payload = {
        email: formData.email.toLowerCase().trim(),
        full_name: formData.full_name.trim(),
        company_name: formData.company_name.trim(),
        sender_name: user?.full_name,
        sender_company: 'Invela', // Simplified to use a default value
        ...(variant === 'user' && { company_id: companyId }), // Only include company_id for user invites
        ...(variant === 'fintech' && { is_demo: isDemoFintech }) // Include is_demo flag for fintech invites
      };

      console.log(`[InviteModal] Sending ${variant} invitation with payload:`, payload);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.status === 409) {
        const data = await response.json();
        setExistingCompany(data.existingCompany);
        throw new Error("COMPANY_EXISTS");
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || `Failed to send ${variant} invitation`);
      }

      return response.json();
    },
    onSuccess: () => {
      const inviteButton = document.querySelector(`[data-element="invite-${variant}-button"]`);
      if (inviteButton) {
        const rect = inviteButton.getBoundingClientRect();
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

      unifiedToast.success(
        "Invitation Sent Successfully", 
        `${form.getValues('full_name')} has been invited to join ${form.getValues('company_name')}.`
      );

      form.reset({
        email: "",
        full_name: "",
        company_name: companyName || ""
      });
      setServerError(null);
      setExistingCompany(null);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      if (error.message !== "COMPANY_EXISTS") {
        setServerError(error.message);
        unifiedToast.error(
          "Error Sending Invitation", 
          error.message
        );
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Invite a New {variant === 'user' ? 'User' : 'Data Recipient'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1.5 mb-6">
            Please provide details to send a {variant === 'user' ? 'user' : 'data recipient'} invitation.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(data => sendInvite(data))} className="space-y-6">
            <FormField
              control={form.control}
              name="company_name"
              render={({ field }) => (
                <FormItem>
                  <div className="text-sm font-semibold mb-2">Company</div>
                  {companyName ? (
                    <div className="w-full px-3 py-2 border rounded-md bg-muted/50 text-foreground">
                      {companyName}
                    </div>
                  ) : (
                    <FormControl>
                      <Input
                        {...field}
                        className={`w-full ${existingCompany ? 'border-amber-500 focus:ring-amber-500' : ''}`}
                        placeholder="Enter company name"
                        autoFocus
                        onChange={(e) => {
                          field.onChange(e);
                          setExistingCompany(null);
                        }}
                        onBlur={(e) => {
                          field.onBlur();
                          if (e.target.value) {
                            checkExistingCompany(e.target.value);
                          }
                        }}
                      />
                    </FormControl>
                  )}
                  {existingCompany && !companyName && (
                    <Alert className="mt-2 bg-amber-50/50">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="mt-0">
                        <div className="flex flex-col gap-2">
                          <p className="text-sm font-medium text-amber-900">
                            "{existingCompany.name}" already exists in the network. If you'd like to invite a user under this company, click the button below to navigate to the Company's Profile page.
                          </p>
                          <Button
                            variant="outline"
                            className="w-full justify-between bg-white hover:bg-gray-50"
                            asChild
                          >
                            <Link to={`/network/company/${slugify(existingCompany.name)}?tab=users`}>
                              <span>View Company Profile</span>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <div className="text-sm font-semibold mb-2">Full Name</div>
                  <FormControl>
                    <Input
                      {...field}
                      className="w-full"
                      placeholder="John Doe"
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
                  <div className="text-sm font-semibold mb-2">Email Address</div>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      className="w-full"
                      placeholder="user@company.com"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Demo FinTech checkbox - only shown for Invela company users inviting a fintech */}
            {variant === 'fintech' && company?.category === 'Invela' && (
              <div className="flex items-center space-x-2 mt-2 p-3 rounded-md bg-blue-50">
                <Checkbox 
                  id="demo-fintech-checkbox" 
                  checked={isDemoFintech}
                  disabled={true} // Read-only checkbox
                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <Label 
                  htmlFor="demo-fintech-checkbox" 
                  className="text-sm font-medium text-blue-700"
                >
                  Create as Demo Data Recipient
                </Label>
              </div>
            )}
            {serverError && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md whitespace-pre-line">
                {serverError}
              </div>
            )}
            <div className="flex justify-end">
              <Button
                type="submit"
                className="gap-2"
                disabled={isPending || existingCompany !== null}
                data-element={`invite-${variant}-button`}
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
  );
}