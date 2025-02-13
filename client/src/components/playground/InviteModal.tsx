import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { NetworkSearch } from "./NetworkSearch";
import type { Company } from "@/types/company";

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

const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email address").transform(val => val.toLowerCase()),
  full_name: z.string().min(1, "Full name is required"),
  company_name: z.string().min(1, "Company name is required"),
  sender_name: z.string(),
});

type InviteData = z.infer<typeof inviteSchema>;

interface InviteModalProps {
  variant: 'user' | 'fintech';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: number;
  companyName?: string;
}

export function InviteModal({ variant, open, onOpenChange, companyId, companyName }: InviteModalProps) {
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
      sender_name: user?.fullName || "",
    }
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    enabled: variant === 'fintech'
  });

  const { mutate: sendInvite, isPending } = useMutation({
    mutationFn: async (data: InviteData) => {
      console.log('[InviteModal] Sending invitation:', { data });

      const payload = {
        email: data.email.toLowerCase().trim(),
        full_name: data.full_name.trim(),
        company_name: data.company_name.trim(),
        sender_name: data.sender_name.trim()
      };

      const response = await fetch(variant === 'user' ? '/api/users/invite' : '/api/fintech/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || 'Failed to send invitation');
      }

      return responseData;
    },
    onError: (error: Error) => {
      setServerError(error.message);
      toast({
        title: "Error sending invitation",
        description: error.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent successfully",
        description: `${form.getValues('full_name')} has been invited to join ${form.getValues('company_name')}.`,
      });

      form.reset();
      setServerError(null);
      setExistingCompany(null);
      onOpenChange(false);
    },
  });

  const onSubmit = (formData: InviteData) => {
    console.log('[InviteModal] Form submitted:', { 
      formData,
      existingCompany: existingCompany?.name 
    });

    // For fintech variant, validate company name and existence
    if (variant === 'fintech') {
      if (!formData.company_name) {
        form.setError('company_name', {
          type: 'manual',
          message: 'Please enter a company name'
        });
        return;
      }

      // Block submission if company already exists
      if (existingCompany) {
        toast({
          title: "Cannot invite to existing company",
          description: `${existingCompany.name} already exists. Please visit their company profile to invite new users.`,
          variant: "destructive",
        });
        return;
      }
    }

    // At this point, we're either:
    // 1. Sending a user invite to an existing company (variant === 'user')
    // 2. Creating a new company and sending an invite (variant === 'fintech' && !existingCompany)
    sendInvite(formData);
  };

  const handleCompanySelect = (company: string) => {
    console.log('[InviteModal] Company selected:', company);
    form.setValue('company_name', company, { 
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true
    });
  };

  const handleExistingCompanyChange = (company: Company | null) => {
    console.log('[InviteModal] Existing company changed:', company?.name);
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        onChange={(e) => {
                          field.onChange(e.target.value);
                        }}
                        onCompanySelect={handleCompanySelect}
                        onAddNewCompany={handleCompanySelect}
                        existingCompany={existingCompany}
                        onExistingCompanyChange={handleExistingCompanyChange}
                        data={companies}
                        isValid={!existingCompany && field.value !== ""}
                        isError={!!form.formState.errors.company_name}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                disabled={isPending || existingCompany !== null}
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