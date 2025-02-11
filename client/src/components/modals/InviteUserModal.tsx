import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import confetti from 'canvas-confetti';
import { useAuth } from "@/hooks/use-auth";
import { TaskStatus } from "@db/schema";

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

// Define schema with exact field names matching the backend
const inviteUserSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  full_name: z.string().min(1, "Full name is required"),
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
      full_name: "",
    }
  });

  const { mutate: sendInvite, isPending } = useMutation({
    mutationFn: async (data: InviteUserData) => {
      try {
        // Create a payload with normalized field names
        const payload = {
          email: data.email.trim(),
          full_name: data.full_name.trim(),
          company_id: companyId,
          company_name: companyName,
          sender_name: user?.fullName || '',
          sender_company: "Invela", // Hardcoded for now since this is the parent company
          initial_status: TaskStatus.EMAIL_SENT, // Explicitly set the initial status
        };

        // Debug log the exact payload being sent
        console.debug('Sending invitation payload:', JSON.stringify(payload, null, 2));

        const response = await fetch('/api/users/invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const responseData = await response.json();
        console.debug('Server response:', JSON.stringify(responseData, null, 2));

        if (!response.ok) {
          if (responseData.details) {
            // Handle detailed validation errors
            const errorMessages = Object.entries(responseData.details)
              .filter(([_, message]) => message)
              .map(([field, message]) => `${field}: ${message}`)
              .join('\n');
            throw new Error(errorMessages);
          }
          throw new Error(responseData.message || 'Failed to send invitation');
        }

        return responseData;
      } catch (error) {
        console.error('Invitation error:', error);
        throw error;
      }
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
        title: "Invitation sent",
        description: "The user has been invited to join.",
      });

      form.reset();
      setServerError(null);
      onOpenChange(false);
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
            {/* Company Information (Read-only) */}
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
                      aria-label="User's full name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
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