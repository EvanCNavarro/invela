import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Card variants for different styles
const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground shadow-sm",
  {
    variants: {
      variant: {
        default: "border-border",
        destructive: "border-destructive",
        success: "border-green-500",
        warning: "border-yellow-500",
        info: "border-blue-500",
      },
      hover: {
        true: "transition-all duration-200 hover:shadow-md",
      },
      responsive: {
        true: "p-3 sm:p-4 md:p-6",
      },
    },
    defaultVariants: {
      variant: "default",
      hover: false,
      responsive: false,
    },
  }
)

export interface CardProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /**
   * If true, the card will have a hover effect
   */
  hover?: boolean;
  /**
   * If true, the card will have responsive padding
   */
  responsive?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, hover, responsive, ...props }, ref) => {
    // Validate props
    if (props.onClick && !props.role) {
      console.warn("Card with onClick should have a role attribute for accessibility");
    }
    
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, hover, responsive }), className)}
        {...props}
      />
    )
  }
)
Card.displayName = "Card"

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * If true, the header will have responsive padding
   */
  responsive?: boolean;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, responsive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col space-y-1.5",
        responsive ? "p-3 sm:p-4 md:p-6" : "p-6",
        className
      )}
      {...props}
    />
  )
)
CardHeader.displayName = "CardHeader"

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /**
   * If true, the title will be responsive
   */
  responsive?: boolean;
}

const CardTitle = React.forwardRef<HTMLParagraphElement, CardTitleProps>(
  ({ className, responsive, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "font-semibold leading-none tracking-tight",
        responsive ? "text-lg sm:text-xl md:text-2xl" : "text-2xl",
        className
      )}
      {...props}
    />
  )
)
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * If true, the content will have responsive padding
   */
  responsive?: boolean;
}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, responsive, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn(
        responsive ? "p-3 pt-0 sm:p-4 sm:pt-0 md:p-6 md:pt-0" : "p-6 pt-0", 
        className
      )} 
      {...props} 
    />
  )
)
CardContent.displayName = "CardContent"

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * If true, the footer will have responsive padding
   */
  responsive?: boolean;
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, responsive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center",
        responsive ? "p-3 pt-0 sm:p-4 sm:pt-0 md:p-6 md:pt-0" : "p-6 pt-0",
        className
      )}
      {...props}
    />
  )
)
CardFooter.displayName = "CardFooter"

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  cardVariants
}
