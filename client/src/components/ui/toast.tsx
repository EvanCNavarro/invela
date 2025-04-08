import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Upload, Clipboard } from "lucide-react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 gap-3 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-1 overflow-hidden rounded-md border border-gray-100 p-4 pr-8 shadow-lg bg-white transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full md:max-w-[440px] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1",
  {
    variants: {
      variant: {
        default: "text-gray-900 before:bg-gray-300",
        success: "success group text-gray-900 before:bg-[#4CAF50]",
        info: "info group text-gray-900 before:bg-[#2196F3]",
        warning: "warning group text-gray-900 before:bg-[#F9A825]",
        error: "error group text-gray-900 before:bg-[#EE6565]",
        "file-upload": "file-upload group text-gray-900 before:bg-[#6357C2]",
        clipboard: "clipboard group text-gray-900 before:bg-[#757575]",
        destructive: "destructive group text-gray-900 before:bg-[#EE6565]", // Kept for backward compatibility
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

// New Toast Icon Component
export const ToastIcon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { 
    variant: "success" | "info" | "warning" | "error" | "file-upload" | "clipboard" | "destructive" | "default" 
  }
>(({ className, variant = "default", ...props }, ref) => {
  const icons = {
    success: <CheckCircle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    "file-upload": <Upload className="h-5 w-5" />,
    clipboard: <Clipboard className="h-5 w-5" />,
    destructive: <AlertCircle className="h-5 w-5" />, // For backward compatibility
    default: null,
  };

  const iconColorClasses = {
    success: "bg-[#E8F5E9] text-[#4CAF50] border-[#C8E6C9]",
    info: "bg-[#E3F2FD] text-[#2196F3] border-[#BBDEFB]",
    warning: "bg-[#FFF8E1] text-[#F9A825] border-[#FFECB3]",
    error: "bg-[#FFEBEE] text-[#EE6565] border-[#FFCDD2]",
    "file-upload": "bg-[#EDE7F6] text-[#6357C2] border-[#D1C4E9]",
    clipboard: "bg-[#F5F5F5] text-[#757575] border-[#E0E0E0]",
    destructive: "bg-[#FFEBEE] text-[#EE6565] border-[#FFCDD2]", // For backward compatibility
    default: "",
  };

  if (!icons[variant]) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-center min-w-11 min-h-11 w-11 h-11 rounded-md border mr-3",
        iconColorClasses[variant],
        className
      )}
      {...props}
    >
      {icons[variant]}
    </div>
  );
});
ToastIcon.displayName = "ToastIcon";

// Enhanced Toast with Framer Motion
const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, children, ...props }, ref) => {
  // Ensure we have a valid variant
  const safeVariant = variant || 'default';
  
  // Check if we have content
  if (!children) {
    return null;
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.3 }}
      className="mb-3" // Add margin-bottom to each toast for extra separation
    >
      <ToastPrimitives.Root
        ref={ref}
        className={cn(toastVariants({ variant: safeVariant }), className)}
        {...props}
      >
        {children}
      </ToastPrimitives.Root>
    </motion.div>
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border-0 px-3 text-sm font-medium transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50",
      // Special styling for file upload actions
      "group-[.file-upload]:text-indigo-600 group-[.file-upload]:hover:text-indigo-700 group-[.file-upload]:bg-transparent",
      // Default for other variants
      "text-gray-600 hover:text-gray-900",
      className
    )}
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
      "absolute right-2 top-2 rounded-md p-1 text-gray-500 opacity-100 transition-opacity hover:text-gray-900 focus:outline-none focus:ring-2",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-bold text-gray-900", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm leading-relaxed text-gray-600", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
