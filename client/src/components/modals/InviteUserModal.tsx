import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import confetti from 'canvas-confetti';
import { useAuth } from "@/hooks/use-auth";
import Fuse from 'fuse.js';

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
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

const inviteUserSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  fullName: z.string().min(1, "Full name is required"),
});

type InviteUserData = z.infer<typeof inviteUserSchema>;

interface InviteUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: number;
  companyName: string;
}

export function InviteUserModal({ open, onOpenChange, companyId, companyName }: InviteUserModalProps) {
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [companyMismatchWarning, setCompanyMismatchWarning] = useState<string | null>(null);
  const { user } = useAuth();

  const form = useForm<InviteUserData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: "",
      fullName: "",
    }
  });

  // Helper function to title case a string
  const toTitleCase = (str: string) => {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Helper function to extract and format name from email
  const extractNameFromEmail = (email: string): { firstName: string; lastName: string; fullName: string } => {
    const [localPart] = email.split('@');

    // Split by common separators and remove empty parts
    const parts = localPart.split(/[._-]/).filter(Boolean);

    // If we have at least two parts, use them as first and last name
    if (parts.length >= 2) {
      const firstName = toTitleCase(parts[0]);
      const lastName = toTitleCase(parts[parts.length - 1]);
      return {
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`
      };
    }

    // If only one part, use it as the first name
    return {
      firstName: toTitleCase(parts[0]),
      lastName: "",
      fullName: toTitleCase(parts[0])
    };
  };

  // Function to check company name similarity
  const checkCompanyDomainMatch = (email: string, companyName: string) => {
    const domain = email.split('@')[1]?.split('.')[0];
    if (!domain) return false;

    const fuse = new Fuse([companyName], {
      threshold: 0.4,
      location: 0,
      distance: 100,
      minMatchCharLength: 1,
    });

    const result = fuse.search(domain);
    return result.length === 0; // No matches found indicates mismatch
  };

  // Handle email field change
  const handleEmailChange = (email: string) => {
    if (email) {
      // Extract name from email
      const { fullName } = extractNameFromEmail(email);
      form.setValue('fullName', fullName);

      // Check for company domain mismatch
      const hasMismatch = checkCompanyDomainMatch(email, companyName);
      if (hasMismatch) {
        setCompanyMismatchWarning(
          `Note: The email domain doesn't match the company name "${companyName}". You can still proceed if this is intended.`
        );
      } else {
        setCompanyMismatchWarning(null);
      }
    }
    form.setValue('email', email);
  };

  const { mutate: sendInvite, isPending } = useMutation({
    mutationFn: async (data: InviteUserData) => {
      const { firstName } = extractNameFromEmail(data.email);
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          companyId,
          companyName,
          senderName: user?.fullName,
          senderCompany: companyName,
          greeting: `Hello ${toTitleCase(firstName)}, you've been invited`
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to send invitation');
      }

      return result;
    },
    onSuccess: () => {
      const inviteButton = document.querySelector('[data-element="invite-user-button"]');
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
        title: <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          Invitation Sent
        </div>,
        description: "The user has been invited to join the company.",
        duration: 2000,
        className: "border-l-4 border-green-500",
      });

      form.reset();
      setServerError(null);
      setCompanyMismatchWarning(null);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      setServerError(error.message);
    },
  });

  const handleInputChange = () => {
    if (serverError) {
      setServerError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Invite a New User</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1.5 mb-6">
            Please provide details to send a user invitation.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => sendInvite(data))} className="space-y-6">
            {/* Company Information (Locked) */}
            <div>
              <div className="text-sm font-semibold mb-2">Company</div>
              <div className="w-full px-3 py-2 border rounded-md bg-muted text-muted-foreground">
                {companyName}
              </div>
            </div>

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
                      className={cn(
                        "w-full",
                        serverError && "border-destructive",
                        field.value && !form.formState.errors.email && "border-green-500"
                      )}
                      disabled={isPending}
                      aria-label="User's email address"
                      onChange={(e) => {
                        handleEmailChange(e.target.value);
                        handleInputChange();
                      }}
                      autoFocus
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
                  {field.value && !form.formState.errors.email && (
                    <p className="text-sm text-green-500 mt-1 flex items-center gap-1">
                      <Check className="h-4 w-4" />
                      Valid email address
                    </p>
                  )}
                </FormItem>
              )}
            />

            {companyMismatchWarning && (
              <Alert variant="warning" className="bg-yellow-50/50">
                <AlertDescription className="text-yellow-800">
                  {companyMismatchWarning}
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <div className="text-sm font-semibold mb-2">Full Name</div>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      className={cn(
                        "w-full",
                        serverError && "border-destructive",
                        field.value && !form.formState.errors.fullName && "border-green-500"
                      )}
                      disabled={isPending}
                      aria-label="User's full name"
                    />
                  </FormControl>
                  <FormMessage />
                  {field.value && !form.formState.errors.fullName && (
                    <p className="text-sm text-green-500 mt-1 flex items-center gap-1">
                      <Check className="h-4 w-4" />
                      Name looks good
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
                data-element="invite-user-button"
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