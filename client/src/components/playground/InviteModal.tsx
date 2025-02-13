import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  const [existingCompany, setExistingCompany] = useState<any>(null);

  useEffect(() => {
    console.log('[InviteModal] Component state:', {
      variant,
      companyId,
      companyName,
      isValidCompanySelection
    });
  }, [variant, companyId, companyName, isValidCompanySelection]);

  const form = useForm<InviteData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      full_name: "",
      company_name: variant === 'user' ? companyName || "" : "",
      sender_name: user?.fullName || "",
    }
  });

  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      console.log('[InviteModal] Form value changed:', {
        field: name,
        type,
        value,
        allValues: form.getValues(),
        formState: {
          isDirty: form.formState.isDirty,
          isValid: form.formState.isValid,
          errors: form.formState.errors
        }
      });
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const { mutate: sendInvite, isPending } = useMutation({
    mutationFn: async (data: InviteData) => {
      // Pre-validation logging
      console.log('[InviteModal] Starting mutation with data:', {
        endpoint: variant === 'user' ? '/api/users/invite' : '/api/fintech/invite',
        data: JSON.stringify(data, null, 2),
        formState: {
          isValid: form.formState.isValid,
          errors: form.formState.errors,
          dirtyFields: form.formState.dirtyFields
        }
      });

      // Create the payload
      const payload = {
        email: data?.email?.toLowerCase()?.trim() || '',
        full_name: data?.full_name?.trim() || '',
        company_name: data?.company_name?.trim() || '',
        sender_name: data?.sender_name?.trim() || ''
      };

      // Detailed validation with specific error messages
      const validationErrors = [];
      if (!payload.email) validationErrors.push('Email is required');
      if (!payload.company_name) validationErrors.push('Company name is required');
      if (!payload.full_name) validationErrors.push('Full name is required');
      if (!payload.sender_name) validationErrors.push('Sender name is required');

      console.log('[InviteModal] Payload validation:', {
        payload,
        hasEmail: Boolean(payload.email),
        hasCompanyName: Boolean(payload.company_name),
        validationErrors
      });

      if (validationErrors.length > 0) {
        console.error('[InviteModal] Payload validation failed:', {
          payload,
          validationErrors
        });
        throw new Error(validationErrors.join(', '));
      }

      // Final request logging
      console.log('[InviteModal] Sending request:', {
        url: variant === 'user' ? '/api/users/invite' : '/api/fintech/invite',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload, null, 2)
      });

      const response = await fetch(variant === 'user' ? '/api/users/invite' : '/api/fintech/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();
      console.log('[InviteModal] Server response:', responseData);

      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || 'Failed to send invitation');
      }

      return responseData;
    },
    onError: (error: Error) => {
      console.error('[InviteModal] Mutation error:', {
        error,
        formData: form.getValues(),
        formState: {
          isValid: form.formState.isValid,
          errors: form.formState.errors,
          dirtyFields: form.formState.dirtyFields
        }
      });
      setServerError(error.message);
      toast({
        title: "Error sending invitation",
        description: error.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      console.log('[InviteModal] Mutation succeeded');
      toast({
        title: "Invitation sent successfully",
        description: `${form.getValues('full_name')} has been invited to join ${form.getValues('company_name')}.`,
      });

      form.reset();
      setServerError(null);
      setIsValidCompanySelection(false);
      setExistingCompany(null);
      onOpenChange(false);
    },
  });

  const onSubmit = (formData: InviteData) => {
    // Don't allow submission if company already exists
    if (existingCompany) {
      toast({
        title: "Cannot invite to existing company",
        description: `${existingCompany.name} already exists. Please visit their company profile to invite new users.`,
        variant: "warning",
      });
      return;
    }

    // Pre-submission validation and logging
    console.log('[InviteModal] Form submission started:', {
      rawFormData: formData,
      formState: {
        isValid: form.formState.isValid,
        errors: form.formState.errors,
        isDirty: form.formState.isDirty,
        dirtyFields: Object.keys(form.formState.dirtyFields),
        touchedFields: Object.keys(form.formState.touchedFields)
      }
    });

    // Additional validation for fintech variant
    if (variant === 'fintech' && !isValidCompanySelection) {
      console.log('[InviteModal] Invalid company selection');
      form.setError('company_name', {
        type: 'manual',
        message: 'Please select a valid company'
      });
      return;
    }

    sendInvite(formData);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (variant === 'fintech' && form.getValues('company_name') && isValidCompanySelection) {
        const emailInput = document.querySelector('input[name="email"]') as HTMLElement;
        emailInput?.focus();
      }
    }
  };

  // Query to get companies and check for existing companies
  const { data: companies = [] } = useQuery({
    queryKey: ["/api/companies"],
    enabled: variant === 'fintech'
  });

  // Function to check if company exists when selected
  const handleCompanySelect = async (selectedCompany: string) => {
    const existingComp = companies.find(c => c.name.toLowerCase() === selectedCompany.toLowerCase());
    if (existingComp) {
      setExistingCompany(existingComp);
      setIsValidCompanySelection(false);
    } else {
      setExistingCompany(null);
      setIsValidCompanySelection(true);
    }
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
                          handleCompanySelect(company);
                        }}
                        placeholder={`Add company to ${user?.company?.name || ''}'s Network`}
                        className="w-full"
                        isValid={isValidCompanySelection}
                        existingCompany={existingCompany}
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