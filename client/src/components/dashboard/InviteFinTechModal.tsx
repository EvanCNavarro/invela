import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import confetti from 'canvas-confetti';
import { CheckCircle2 } from "lucide-react";

const inviteFormSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  email: z.string().email("Please enter a valid email address")
});

type InviteFormData = z.infer<typeof inviteFormSchema>;

interface InviteFinTechModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteFinTechModal({ isOpen, onOpenChange }: InviteFinTechModalProps) {
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      companyName: "",
      email: ""
    }
  });

  const { mutate: sendInvite, isPending } = useMutation({
    mutationFn: async (data: InviteFormData) => {
      const response = await fetch('/api/fintech/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to send invitation');
      }

      return result;
    },
    onSuccess: () => {
      const addFinTechButton = document.querySelector('[data-element="add-fintech-button"]');
      if (addFinTechButton) {
        const rect = addFinTechButton.getBoundingClientRect();
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
        description: "The FinTech has been invited to join.",
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

  const handleSendInvite = (data: InviteFormData) => {
    setServerError(null);
    sendInvite(data);
  };

  const handleInputChange = () => {
    if (serverError) {
      setServerError(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Invite a New FinTech</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1.5 mb-6">
            Please provide details to send a FinTech invitation.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSendInvite)} className="space-y-6">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <div className="text-sm font-semibold mb-2">Company Name</div>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      className={cn(
                        "w-full",
                        serverError && "border-destructive"
                      )}
                      disabled={isPending}
                      aria-label="FinTech company name"
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
                  <div className="text-sm font-semibold mb-2">Invitee Email</div>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      className={cn(
                        "w-full",
                        serverError && "border-destructive"
                      )}
                      disabled={isPending}
                      aria-label="FinTech representative email"
                      onChange={(e) => {
                        field.onChange(e);
                        handleInputChange();
                      }}
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
            <div className="flex justify-end">
              <Button
                type="submit"
                className="gap-2"
                disabled={isPending}
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