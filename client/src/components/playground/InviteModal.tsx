import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { NetworkSearch } from "./NetworkSearch";
import type { Company } from "@/types/company";
import confetti from 'canvas-confetti';

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

// Unified schema for both user and fintech invitations
const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email address").transform(val => val.toLowerCase()),
  full_name: z.string().min(1, "Full name is required"),
  company_name: z.string().min(1, "Company name is required"),
  company_id: z.number().optional(),
  sender_name: z.string()
});

type InviteData = z.infer<typeof inviteSchema>;

interface InviteModalProps {
  variant: 'user' | 'fintech';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: number;
  companyName?: string;
  onSuccess?: () => void;
}

export function InviteModal({ variant, open, onOpenChange, companyId, companyName, onSuccess }: InviteModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [existingCompany, setExistingCompany] = useState<Company | null>(null);

  const form = useForm<InviteData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      full_name: "",
      company_name: variant === 'user' ? companyName || "" : "",
      company_id: companyId,
      sender_name: user?.fullName || "",
    }
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    enabled: variant === 'fintech'
  });

  const { mutate: sendInvite, isPending } = useMutation({
    mutationFn: async (formData: InviteData) => {
      const endpoint = variant === 'user' ? '/api/users/invite' : '/api/fintech/invite';

      // Create a clean payload without undefined values
      const payload = {
        email: formData.email.toLowerCase().trim(),
        full_name: formData.full_name.trim(),
        company_name: formData.company_name.trim(),
        sender_name: user?.fullName,
        ...(existingCompany?.id && { company_id: existingCompany.id })
      };

      console.log(`[InviteModal] Sending ${variant} invitation:`, payload);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

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

      toast({
        title: "Invitation Sent Successfully",
        description: `${form.getValues('full_name')} has been invited to join ${form.getValues('company_name')}.`,
      });

      form.reset();
      setServerError(null);
      setExistingCompany(null);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      setServerError(error.message);
      toast({
        title: "Error Sending Invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCompanySelect = (company: Company) => {
    console.log('[InviteModal] Company selected:', company);
    form.setValue('company_name', company.name, { 
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true
    });
    setExistingCompany(company);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Invite a New {variant === 'user' ? 'User' : 'FinTech'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1.5 mb-6">
            Please provide details to send a {variant === 'user' ? 'user' : 'FinTech'} invitation.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(data => sendInvite(data))} className="space-y-6">
            {variant === 'user' ? (
              <div>
                <div className="text-sm font-semibold mb-2">Company</div>
                <div className="w-full px-3 py-2 border rounded-md bg-muted text-muted-foreground">
                  {companyName}
                </div>
              </div>
            ) : (
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <div className="text-sm font-semibold mb-2">Company</div>
                    <FormControl>
                      <NetworkSearch
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        onCompanySelect={handleCompanySelect}
                        onExistingCompanyChange={setExistingCompany}
                        data={companies}
                        isValid={!existingCompany && field.value !== ""}
                        isError={!!form.formState.errors.company_name}
                      />
                    </FormControl>
                    <FormMessage />
                    {field.value && !form.formState.errors.company_name && !existingCompany && (
                      <p className="text-sm text-green-500 mt-1 flex items-center gap-1">
                        <Check className="h-4 w-4" />
                        Company name is available
                      </p>
                    )}
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <div className="text-sm font-semibold mb-2">Full Name</div>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      className="w-full"
                      disabled={isPending}
                      placeholder="John Doe"
                      aria-label="Full name"
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
                  <div className="text-sm font-semibold mb-2">Email Address</div>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      className="w-full"
                      disabled={isPending}
                      placeholder="user@company.com"
                      aria-label="Email address"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md whitespace-pre-line">
                {serverError}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                className="gap-2"
                disabled={isPending || (variant === 'fintech' && existingCompany !== null)}
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