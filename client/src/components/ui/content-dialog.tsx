import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

/**
 * Content Dialog
 * 
 * A specialized Dialog component that overlays only on the content area,
 * preserving access to navbar and sidebar.
 * 
 * This component uses React Portal to render the dialog in the content area
 * and positions it properly relative to the content rather than the viewport.
 */

const ContentDialog = DialogPrimitive.Root

const ContentDialogTrigger = DialogPrimitive.Trigger

// Content area portal (renders into content area instead of body)
const ContentDialogPortal = ({ 
  children, 
  container 
}: { 
  children: React.ReactNode 
  container?: HTMLElement | null
}) => {
  // Use a ref to track if we're mounted
  const [mounted, setMounted] = React.useState(false)
  
  // Find the content element to portal into
  const [contentElement, setContentElement] = React.useState<HTMLElement | null>(null)
  
  // After component mounts, find the content element
  React.useEffect(() => {
    setMounted(true)
    
    // Use provided container or find the main content element
    if (container) {
      setContentElement(container)
    } else {
      // We're targeting the main content area which follows the sidebar and navbar
      const content = document.querySelector('.main-content-container') || 
                     document.querySelector('main') ||
                     document.getElementById('content') ||
                     document.body
                     
      setContentElement(content as HTMLElement)
    }
  }, [container])
  
  // Don't render before mount or if no content element found
  if (!mounted || !contentElement) return null
  
  // Use React createPortal to render dialog inside content element
  return createPortal(children, contentElement)
}

// Specialized overlay that only covers the content area
const ContentDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "absolute inset-0 z-50 bg-black/20 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
ContentDialogOverlay.displayName = "ContentDialogOverlay"

// Specialized content that positions itself within the content area
const ContentDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    showCloseButton?: boolean
  }
>(({ className, children, showCloseButton = false, ...props }, ref) => {
  // Create event handlers to prevent auto-focusing behavior
  const handleOpenAutoFocus = (e: Event) => e.preventDefault();
  const handleCloseAutoFocus = (e: Event) => e.preventDefault();
  
  return (
    <ContentDialogPortal>
      <ContentDialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed z-50 w-[600px] max-w-[90%] rounded-lg border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          // Center in the content area instead of the viewport
          "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          className
        )}
        onOpenAutoFocus={handleOpenAutoFocus}
        onCloseAutoFocus={handleCloseAutoFocus}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
            </svg>
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </ContentDialogPortal>
  );
})
ContentDialogContent.displayName = "ContentDialogContent"

const ContentDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 px-6 pt-6 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
ContentDialogHeader.displayName = "ContentDialogHeader"

const ContentDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex items-center border-t p-6 sm:justify-between",
      className
    )}
    {...props}
  />
)
ContentDialogFooter.displayName = "ContentDialogFooter"

const ContentDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
ContentDialogTitle.displayName = "ContentDialogTitle"

const ContentDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-base text-muted-foreground mt-2", className)}
    {...props}
  />
))
ContentDialogDescription.displayName = "ContentDialogDescription"

// Export all components
export {
  ContentDialog,
  ContentDialogPortal,
  ContentDialogOverlay,
  ContentDialogTrigger,
  ContentDialogContent,
  ContentDialogHeader,
  ContentDialogFooter,
  ContentDialogTitle,
  ContentDialogDescription,
}