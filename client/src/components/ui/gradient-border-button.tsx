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
            className="absolute -inset-[1px] rounded-md bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500"
            style={{
              maskImage: 'radial-gradient(at center, black, transparent)',
              WebkitMaskImage: 'radial-gradient(at center, black, transparent)',
              animation: 'border-animation 3s linear infinite',
            }}
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
