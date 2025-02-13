import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import confetti from 'canvas-confetti';
import { useAuth } from "@/hooks/use-auth";
import { NetworkSearch } from "./NetworkSearch";

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
  const [serverError, setServerError] = useState<string | null>(null);
  const { user } = useAuth();
  const [isValidCompanySelection, setIsValidCompanySelection] = useState(false);

  // Fetch companies for network search
  const { data: companies = [] } = useQuery({
    queryKey: ["/api/companies"],
    enabled: variant === 'fintech'
  });

  const form = useForm<InviteData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      full_name: "",
      company_name: variant === 'user' ? companyName || "" : "",
      sender_name: user?.fullName || "",
    }
  });

  // Debug logging for form values
  form.watch((data) => {
    console.log('[InviteModal] Form values updated:', {
      data,
      errors: form.formState.errors,
      isDirty: form.formState.isDirty,
      isValid: form.formState.isValid
    });
  });

  const { mutate: sendInvite, isPending } = useMutation({
    mutationFn: async (data: InviteData) => {
      const endpoint = variant === 'user' ? '/api/users/invite' : '/api/fintech/invite';

      console.log('[InviteModal] Starting mutation with data:', {
        endpoint,
        data,
        formState: {
          isValid: form.formState.isValid,
          errors: form.formState.errors,
          dirtyFields: form.formState.dirtyFields
        }
      });

      // Validate required fields before sending
      if (!data.email || !data.company_name) {
        console.error('[InviteModal] Validation failed:', {
          email: data.email,
          company_name: data.company_name
        });
        throw new Error('Email and company name are required');
      }

      console.log('[InviteModal] Sending request to server:', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('[InviteModal] Server error:', responseData);
        throw new Error(responseData.message || responseData.error || 'Failed to send invitation');
      }

      console.log('[InviteModal] Server response success:', responseData);
      return responseData;
    },
    onError: (error: Error) => {
      console.error('[InviteModal] Mutation error:', {
        error,
        formData: form.getValues(),
        formState: form.formState
      });
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

      console.log('[InviteModal] Success - Resetting form');
      form.reset();
      setServerError(null);
      setIsValidCompanySelection(false);
      onOpenChange(false);

      const buttonSelector = variant === 'user' 
        ? '[data-element="invite-user-button"]'
        : '[data-element="invite-fintech-button"]';

      const inviteButton = document.querySelector(buttonSelector);
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
    },
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (variant === 'fintech' && form.getValues('company_name') && isValidCompanySelection) {
        const emailInput = document.querySelector('input[name="email"]') as HTMLElement;
        emailInput?.focus();
      }
    }
  };

  const onSubmit = (formData: InviteData) => {
    console.log('[InviteModal] Form submission started:', {
      formData,
      variant,
      isValidCompanySelection,
      formState: {
        isValid: form.formState.isValid,
        errors: form.formState.errors,
        dirtyFields: form.formState.dirtyFields,
        values: form.getValues()
      }
    });

    if (variant === 'fintech' && !isValidCompanySelection) {
      console.log('[InviteModal] Invalid company selection');
      form.setError('company_name', {
        type: 'manual',
        message: 'Please select a valid company'
      });
      return;
    }

    if (!formData.company_name) {
      console.error('[InviteModal] Company name missing in form data');
      return;
    }

    sendInvite(formData);
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
            {/* Company Field */}
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
                          console.log('[InviteModal] Company search onChange:', {
                            value: e.target.value,
                            previousValue: field.value
                          });
                          field.onChange(e.target.value);
                          setIsValidCompanySelection(false);
                        }}
                        onCompanySelect={(company) => {
                          console.log('[InviteModal] Company selected:', {
                            company,
                            previousValue: field.value
                          });
                          field.onChange(company);
                          setIsValidCompanySelection(true);
                        }}
                        placeholder={`Add company to ${user?.company?.name || ''}'s Network`}
                        className="w-full"
                        isValid={isValidCompanySelection}
                        onKeyDown={handleKeyDown}
                        data={companies}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Email Field */}
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

            {/* Full Name Field */}
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
                disabled={isPending}
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