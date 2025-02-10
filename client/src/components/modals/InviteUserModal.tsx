import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
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
import { cn } from "@/lib/utils";

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

  const form = useForm<InviteUserData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: "",
      fullName: "",
    }
  });

  // Helper function to extract and format name from email
  const extractNameFromEmail = (email: string): string => {
    const [localPart] = email.split('@');
    return localPart
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  };

  // Handle email field change
  const handleEmailChange = (email: string) => {
    if (email && !form.getValues('fullName')) {
      const extractedName = extractNameFromEmail(email);
      form.setValue('fullName', extractedName);
    }
    form.setValue('email', email);
  };

  const { mutate: sendInvite, isPending } = useMutation({
    mutationFn: async (data: InviteUserData) => {
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          companyId,
          companyName
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
        title: "Invitation Sent",
        description: "The user has been invited to join the company.",
        duration: 2000,
        className: "border-l-4 border-green-500",
      });

      form.reset();
      setServerError(null);
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
                        serverError && "border-destructive"
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
                </FormItem>
              )}
            />

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
                        serverError && "border-destructive"
                      )}
                      disabled={isPending}
                      aria-label="User's full name"
                    />
                  </FormControl>
                  <FormMessage />
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