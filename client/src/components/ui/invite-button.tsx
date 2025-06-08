import * as React from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface InviteButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'user' | 'fintech';
  pulse?: boolean;
}

export const InviteButton = React.forwardRef<HTMLButtonElement, InviteButtonProps>(
  ({ variant, pulse = false, className, ...props }, ref) => (
    <Button
      ref={ref}
      className={cn("gap-2", pulse && "animate-pulse-ring", className)}
      data-element={`invite-${variant}-button`}
      {...props}
    >
      <Send className="h-4 w-4" />
      Invite a New {variant === 'user' ? 'User' : 'Data Recipient'}
    </Button>
  )
);

InviteButton.displayName = "InviteButton";
