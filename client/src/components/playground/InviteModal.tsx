import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
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

// Schema for both user and fintech invites
const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email address").transform(val => val.toLowerCase()),
  full_name: z.string().min(1, "Full name is required"),
  company_id: z.number().optional(),
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
  const [selectedCompany, setSelectedCompany] = useState("");
  const [isValidCompanySelection, setIsValidCompanySelection] = useState(false);
  const [showCompanyError, setShowCompanyError] = useState(false);

  const form = useForm<InviteData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      full_name: "",
      company_id: companyId,
      company_name: variant === 'user' ? companyName : "",
      sender_name: user?.fullName || "",
    }
  });

  const { mutate: sendInvite, isPending } = useMutation({
    mutationFn: async (formData: InviteData) => {
      const endpoint = variant === 'user' ? '/api/users/invite' : '/api/fintech/invite';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
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
        description: variant === 'user' 
          ? `${form.getValues('full_name')} has been invited to join ${companyName}.`
          : `${form.getValues('full_name')} from ${form.getValues('company_name')} has been invited to join the network.`,
      });

      form.reset();
      setServerError(null);
      setSelectedCompany("");
      setIsValidCompanySelection(false);
      setShowCompanyError(false);
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
    if (e.key === 'Enter' && form.getValues('company_name') && isValidCompanySelection) {
      e.preventDefault();
      const emailInput = document.querySelector('input[name="email"]') as HTMLElement;
      emailInput?.focus();
    }
  };

  const handleCompanyBlur = () => {
    if (variant === 'fintech' && !isValidCompanySelection) {
      setShowCompanyError(true);
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
            Please provide details to send {variant === 'user' ? 'a user' : 'a FinTech'} invitation.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(data => sendInvite(data))} className="space-y-6">
            {/* Company Field - Always First */}
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
                        value={selectedCompany}
                        onChange={(e) => {
                          setSelectedCompany(e.target.value);
                          setIsValidCompanySelection(false);
                          setShowCompanyError(false);
                          field.onChange(e.target.value);
                        }}
                        onCompanySelect={(company) => {
                          setSelectedCompany(company);
                          setIsValidCompanySelection(true);
                          setShowCompanyError(false);
                          field.onChange(company);
                        }}
                        placeholder={`Add company to ${user?.company?.name || ''}'s Network`}
                        className="w-full"
                        isValid={isValidCompanySelection}
                        isError={showCompanyError}
                        onKeyDown={handleKeyDown}
                        onBlur={handleCompanyBlur}
                      />
                    </FormControl>
                    {showCompanyError && (
                      <p className="text-sm font-medium text-destructive mt-2">
                        Please select a valid company from the search results
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Email Field - Second */}
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

            {/* Full Name Field - Third */}
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
                disabled={isPending || (variant === 'fintech' && !isValidCompanySelection)}
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