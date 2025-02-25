import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

// Default delay values for better UX
const DEFAULT_DELAY_DURATION = 300
const DEFAULT_SKIP_DELAY_DURATION = 0

/**
 * Provider component for tooltips
 * Must wrap all tooltip components
 */
const TooltipProvider = ({
  delayDuration = DEFAULT_DELAY_DURATION, 
  skipDelayDuration = DEFAULT_SKIP_DELAY_DURATION, 
  ...props
}: TooltipPrimitive.TooltipProviderProps) => (
  <TooltipPrimitive.Provider 
    delayDuration={delayDuration} 
    skipDelayDuration={skipDelayDuration}
    {...props} 
  />
)
TooltipProvider.displayName = "TooltipProvider"

/**
 * Root tooltip component
 */
const Tooltip = TooltipPrimitive.Root

/**
 * Trigger element for the tooltip
 */
const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ ...props }, ref) => (
  <TooltipPrimitive.Trigger 
    ref={ref} 
    {...props} 
    // Ensure tooltip trigger is accessible via keyboard
    tabIndex={props.tabIndex || 0}
  />
))
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName

export interface TooltipContentProps 
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {
  /**
   * If true, the tooltip will have a responsive width
   */
  responsive?: boolean;
  /**
   * If true, the tooltip will have a wider max-width
   */
  wide?: boolean;
}

/**
 * Content component for the tooltip
 */
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(({ 
  className, 
  sideOffset = 4, 
  responsive,
  wide,
  children,
  ...props 
}, ref) => {
  // Validate children
  React.Children.forEach(children, child => {
    if (!React.isValidElement(child)) {
      console.warn("TooltipContent should contain valid React elements");
    }
  });
  
  return (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        responsive && "max-w-[200px] sm:max-w-[250px] md:max-w-[300px]",
        wide && "max-w-[350px]",
        className
      )}
      // Improve accessibility
      role="tooltip"
      aria-live="polite"
      {...props}
    />
  )
})
TooltipContent.displayName = TooltipPrimitive.Content.displayName

/**
 * A simple tooltip component that combines all parts
 */
function SimpleTooltip({ 
  children, 
  content, 
  delayDuration,
  side = "top",
  align = "center",
  ...props 
}: { 
  children: React.ReactNode; 
  content: React.ReactNode;
  delayDuration?: number;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
} & Omit<TooltipContentProps, "content">) {
  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} align={align} {...props}>
        {content}
      </TooltipContent>
    </Tooltip>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, SimpleTooltip }
