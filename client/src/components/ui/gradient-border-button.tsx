import { ButtonHTMLAttributes, forwardRef } from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface GradientBorderButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  showGradient?: boolean;
}

export const GradientBorderButton = forwardRef<HTMLButtonElement, GradientBorderButtonProps>(
  ({ className, showGradient = false, children, ...props }, ref) => {
    return (
      <div className={cn("relative", showGradient && "fancy-border-button")}>
        <Button
          ref={ref}
          className={cn(
            "relative w-full font-bold hover:opacity-90 z-10",
            className
          )}
          {...props}
        >
          {children}
        </Button>
      </div>
    );
  }
);

GradientBorderButton.displayName = "GradientBorderButton";