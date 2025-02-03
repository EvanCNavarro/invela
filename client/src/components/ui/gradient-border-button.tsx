import { ButtonHTMLAttributes, forwardRef } from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface GradientBorderButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  showGradient?: boolean;
}

export const GradientBorderButton = forwardRef<HTMLButtonElement, GradientBorderButtonProps>(
  ({ className, showGradient = false, children, ...props }, ref) => {
    return (
      <div className="relative">
        {showGradient && (
          <div
            className="box__bg absolute -inset-[1px] rounded-md bg-[#070707]"
            style={{ height: 'auto', width: 'auto' }}
          />
        )}
        <Button
          ref={ref}
          className={cn(
            "relative w-full font-bold hover:opacity-90",
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