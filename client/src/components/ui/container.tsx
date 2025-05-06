import React from "react";
import { cn } from "@/lib/utils";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "full" | "none";
}

export const Container: React.FC<ContainerProps> = ({
  children,
  maxWidth = "xl",
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        "w-full mx-auto px-4 sm:px-6",
        {
          "max-w-xs": maxWidth === "xs",
          "max-w-sm": maxWidth === "sm",
          "max-w-md": maxWidth === "md",
          "max-w-lg": maxWidth === "lg",
          "max-w-xl": maxWidth === "xl",
          "max-w-2xl": maxWidth === "2xl",
          "max-w-full": maxWidth === "full",
          "max-w-none": maxWidth === "none",
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Container;