import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import confetti from 'canvas-confetti';
import { useAuth } from "@/hooks/use-auth";

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

// Form schema matches user input fields only
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
  const { user } = useAuth();

  const form = useForm<InviteUserData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: "",
      fullName: "",
    }
  });

  const { mutate: sendInvite, isPending } = useMutation({
    mutationFn: async (formData: InviteUserData) => {
      // Ensure we have all required data
      if (!user?.fullName) {
        throw new Error("Missing sender information. Please try logging in again.");
      }

      if (!companyId || !companyName) {
        throw new Error("Missing company information. Please refresh the page.");
      }

      // Construct the invitation payload using all available data sources
      const payload = {
        // From form input
        email: formData.email.trim().toLowerCase(),
        fullName: formData.fullName.trim(),

        // From company profile being viewed
        company_id: companyId,  
        company_name: companyName,

        // From logged-in user context
        sender_name: user.fullName,
        sender_company: companyName // Company name of the profile being viewed
      };

      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.message || 'Failed to send invitation');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Invitation sent successfully",
        description: `${data.user.fullName} has been invited to join ${companyName}.`,
      });

      // Reset form and close modal
      form.reset();
      setServerError(null);
      onOpenChange(false);

      // Show success animation
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
    },
    onError: (error: Error) => {
      console.error('Mutation error:', error);
      setServerError(error.message);
      toast({
        title: "Error sending invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
                      className="w-full"
                      disabled={isPending}
                      placeholder="user@company.com"
                      aria-label="User's email address"
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
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
                      className="w-full"
                      disabled={isPending}
                      placeholder="John Doe"
                      aria-label="User's full name"
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