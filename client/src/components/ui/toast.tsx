import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = React.memo(ToastPrimitives.Provider)

export interface ToastViewportProps 
  extends React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport> {
  /**
   * Position of the toast viewport
   */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  ToastViewportProps
>(({ className, position = 'bottom-right', ...props }, ref) => {
  // Determine position classes based on the position prop
  const positionClasses = React.useMemo(() => {
    switch (position) {
      case 'top-right':
        return 'top-0 right-0 flex-col-reverse';
      case 'top-left':
        return 'top-0 left-0 flex-col-reverse';
      case 'bottom-right':
        return 'bottom-0 right-0 flex-col';
      case 'bottom-left':
        return 'bottom-0 left-0 flex-col';
      case 'top-center':
        return 'top-0 left-1/2 -translate-x-1/2 flex-col-reverse';
      case 'bottom-center':
        return 'bottom-0 left-1/2 -translate-x-1/2 flex-col';
      default:
        return 'bottom-0 right-0 flex-col';
    }
  }, [position]);

  return (
    <ToastPrimitives.Viewport
      ref={ref}
      className={cn(
        "fixed z-[100] flex max-h-screen w-full p-4 md:max-w-[420px]",
        positionClasses,
        className
      )}
      {...props}
    />
  );
})
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
        success:
          "success group border-green-500 bg-green-500/10 text-green-700 dark:text-green-400",
        warning:
          "warning group border-yellow-500 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
        info:
          "info group border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-400",
      },
      size: {
        default: "p-6 pr-8",
        sm: "p-4 pr-6",
        lg: "p-8 pr-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ToastProps 
  extends React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root>,
    VariantProps<typeof toastVariants> {
  /**
   * Custom icon to display in the toast
   */
  icon?: React.ReactNode;
}

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  ToastProps
>(({ className, variant, size, icon, children, ...props }, ref) => {
  // Validate duration
  if (props.duration && props.duration < 0) {
    console.warn('Toast duration should be a positive number');
  }
  
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant, size }), className)}
      // Improve accessibility
      role={variant === "destructive" ? "alert" : "status"}
      aria-live={variant === "destructive" ? "assertive" : "polite"}
      {...props}
    >
      {icon && (
        <div className="mr-2 flex-shrink-0">
          {icon}
        </div>
      )}
      <div className="flex-1">{children}</div>
    </ToastPrimitives.Root>
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

export interface ToastActionProps 
  extends React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action> {
  /**
   * If true, the action will be styled as a destructive action
   */
  destructive?: boolean;
  /**
   * If true, the action will be styled as a primary action
   */
  primary?: boolean;
}

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  ToastActionProps
>(({ className, destructive, primary, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      destructive && "group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      primary && "bg-primary text-primary-foreground hover:bg-primary/90",
      className
    )}
    // Improve accessibility
    aria-label={props["aria-label"] || "Toast action"}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className
    )}
    toast-close=""
    // Improve accessibility
    aria-label="Close toast"
    {...props}
  >
    <X className="h-4 w-4" aria-hidden="true" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

export interface ToastTitleProps 
  extends React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title> {
  /**
   * If true, the title will have responsive text size
   */
  responsive?: boolean;
}

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  ToastTitleProps
>(({ className, responsive, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn(
      "font-semibold",
      responsive ? "text-xs sm:text-sm" : "text-sm",
      className
    )}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

export interface ToastDescriptionProps 
  extends React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description> {
  /**
   * If true, the description will have responsive text size
   */
  responsive?: boolean;
}

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  ToastDescriptionProps
>(({ className, responsive, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn(
      "opacity-90",
      responsive ? "text-xs sm:text-sm" : "text-sm",
      className
    )}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastActionElement = React.ReactElement<typeof ToastAction>

/**
 * A simple toast component that combines all parts
 */
interface SimpleToastProps {
  /**
   * Title of the toast
   */
  title?: React.ReactNode;
  /**
   * Description of the toast
   */
  description?: React.ReactNode;
  /**
   * Action element to display in the toast
   */
  action?: ToastActionElement;
  /**
   * If true, the toast will have a close button
   */
  hasCloseButton?: boolean;
  /**
   * Custom icon to display in the toast
   */
  icon?: React.ReactNode;
  /**
   * Variant of the toast
   */
  variant?: VariantProps<typeof toastVariants>["variant"];
  /**
   * Size of the toast
   */
  size?: VariantProps<typeof toastVariants>["size"];
  /**
   * Custom class name for the toast
   */
  className?: string;
  /**
   * Duration of the toast in milliseconds
   */
  duration?: number;
  /**
   * Whether the toast is open
   */
  open?: boolean;
  /**
   * Callback when the toast open state changes
   */
  onOpenChange?: (open: boolean) => void;
}

const SimpleToast = React.forwardRef<
  React.ElementRef<typeof Toast>,
  SimpleToastProps
>(({ 
  title, 
  description, 
  action, 
  hasCloseButton = true,
  ...props 
}, ref) => (
  <Toast ref={ref} {...props}>
    <div className="grid gap-1">
      {title && <ToastTitle>{title}</ToastTitle>}
      {description && <ToastDescription>{description}</ToastDescription>}
    </div>
    {action && <div className="ml-auto">{action}</div>}
    {hasCloseButton && <ToastClose />}
  </Toast>
))
SimpleToast.displayName = "SimpleToast"

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  SimpleToast,
  type ToastActionElement,
}
