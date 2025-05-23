/**
 * Dialog UI Component Suite - Advanced modal dialog system with comprehensive features
 * 
 * Provides complete dialog modal component system built on Radix UI primitives with
 * sophisticated features including portal rendering, overlay management, focus control,
 * and extensive layout options. Optimized for modal interactions and content display
 * with design system integration and comprehensive accessibility features including
 * keyboard navigation, focus trapping, and screen reader support.
 * 
 * Features:
 * - Complete dialog composition system (Root, Portal, Overlay, Trigger, Content, etc.)
 * - Radix UI Dialog primitives for accessibility compliance
 * - Advanced portal rendering for proper z-index layering
 * - Sophisticated overlay system with backdrop animations
 * - Custom focus management with auto-focus prevention
 * - Rich animation system with fade, zoom, and slide transitions
 * - Flexible layout components (Header, Footer, Title, Description)
 * - Integrated close button with accessibility features
 * - Responsive design with mobile-first approach
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality for component creation
import * as React from "react";

// Radix UI primitive for accessible dialog functionality
import * as DialogPrimitive from "@radix-ui/react-dialog";

// Lucide React icon for close button functionality
import { X } from "lucide-react";

// Internal utility for conditional class names
import { cn } from "@/lib/utils";

// ========================================
// CONSTANTS
// ========================================

/**
 * Dialog overlay styling classes for backdrop appearance
 * Defines full-screen overlay with backdrop blur and fade animations
 */
const DIALOG_OVERLAY_CLASSES = "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";

/**
 * Dialog content styling classes for modal panel appearance
 * Defines comprehensive modal styling with animations, positioning, and responsiveness
 */
const DIALOG_CONTENT_CLASSES = "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg";

/**
 * Dialog close button styling classes for accessibility and interaction
 * Defines close button appearance with focus states and positioning
 */
const DIALOG_CLOSE_BUTTON_CLASSES = "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground";

/**
 * Dialog header styling classes for title section layout
 * Defines header layout with responsive text alignment
 */
const DIALOG_HEADER_CLASSES = "flex flex-col space-y-1.5 text-center sm:text-left";

/**
 * Dialog footer styling classes for action section layout
 * Defines footer layout with responsive button arrangement
 */
const DIALOG_FOOTER_CLASSES = "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2";

/**
 * Dialog title styling classes for heading typography
 * Defines title appearance with proper hierarchy and spacing
 */
const DIALOG_TITLE_CLASSES = "text-lg font-semibold leading-none tracking-tight";

/**
 * Dialog description styling classes for subtitle typography
 * Defines description appearance with muted foreground color
 */
const DIALOG_DESCRIPTION_CLASSES = "text-sm text-muted-foreground";

/**
 * Close icon styling classes for button icon sizing
 * Defines consistent icon dimensions for close functionality
 */
const CLOSE_ICON_CLASSES = "h-4 w-4";

/**
 * Screen reader text for close button accessibility
 * Provides descriptive text for assistive technologies
 */
const CLOSE_BUTTON_LABEL = "Close";

// ========================================
// COMPONENT ALIASES
// ========================================

/**
 * Dialog root component for state management
 * Manages dialog open/close state and interactions
 */
const Dialog = DialogPrimitive.Root;

/**
 * Dialog trigger component for activation control
 * Element that triggers dialog display on interaction
 */
const DialogTrigger = DialogPrimitive.Trigger;

/**
 * Dialog portal component for rendering control
 * Manages portal rendering for proper DOM placement
 */
const DialogPortal = DialogPrimitive.Portal;

/**
 * Dialog close component for dismissal control
 * Provides programmatic close functionality
 */
const DialogClose = DialogPrimitive.Close;

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Dialog overlay component properties interface
 * Extends Radix UI Overlay primitive with styling options
 */
interface DialogOverlayProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> {}

/**
 * Dialog content component properties interface
 * Extends Radix UI Content primitive with styling and layout options
 */
interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {}

/**
 * Dialog header component properties interface
 * Extends HTML div attributes for layout customization
 */
interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Dialog footer component properties interface
 * Extends HTML div attributes for layout customization
 */
interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Dialog title component properties interface
 * Extends Radix UI Title primitive with styling options
 */
interface DialogTitleProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> {}

/**
 * Dialog description component properties interface
 * Extends Radix UI Description primitive with styling options
 */
interface DialogDescriptionProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description> {}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Accessible dialog overlay component with backdrop functionality
 * 
 * Renders full-screen overlay with backdrop blur and fade animations.
 * Provides visual separation between dialog content and background while
 * maintaining accessibility features and smooth transition effects.
 * 
 * @param props Component properties including Radix UI Overlay attributes
 * @param ref React ref for accessing the underlying overlay element
 * @returns JSX element containing the accessible dialog backdrop overlay
 */
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  DialogOverlayProps
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(DIALOG_OVERLAY_CLASSES, className)}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/**
 * Advanced dialog content component with portal rendering and focus management
 * 
 * Renders modal dialog content with sophisticated positioning, animations,
 * and portal rendering for proper z-index management. Includes custom focus
 * management, integrated close button, and comprehensive accessibility features
 * with responsive design and smooth transition effects.
 * 
 * @param props Component properties including content and styling options
 * @param ref React ref for accessing the underlying dialog content element
 * @returns JSX element containing the advanced modal dialog content panel
 */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, ...props }, ref) => {
  /**
   * Prevent automatic focus behavior on dialog open
   * Maintains current focus state for better user experience
   */
  const handleOpenAutoFocus = (e: Event) => e.preventDefault();
  
  /**
   * Prevent automatic focus behavior on dialog close
   * Maintains current focus state for better user experience
   */
  const handleCloseAutoFocus = (e: Event) => e.preventDefault();
  
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(DIALOG_CONTENT_CLASSES, className)}
        onOpenAutoFocus={handleOpenAutoFocus}
        onCloseAutoFocus={handleCloseAutoFocus}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className={DIALOG_CLOSE_BUTTON_CLASSES}>
          <X className={CLOSE_ICON_CLASSES} />
          <span className="sr-only">{CLOSE_BUTTON_LABEL}</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

/**
 * Dialog header component for title section organization
 * 
 * Renders header section for dialog titles and descriptions with
 * responsive layout and consistent spacing. Provides semantic
 * structure for better accessibility and visual organization.
 * 
 * @param props Component properties including HTML div attributes
 * @returns JSX element containing the dialog header layout section
 */
const DialogHeader = ({ className, ...props }: DialogHeaderProps) => (
  <div
    className={cn(DIALOG_HEADER_CLASSES, className)}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

/**
 * Dialog footer component for action section organization
 * 
 * Renders footer section for dialog actions and buttons with
 * responsive layout and consistent spacing. Provides semantic
 * structure for better accessibility and visual organization.
 * 
 * @param props Component properties including HTML div attributes
 * @returns JSX element containing the dialog footer layout section
 */
const DialogFooter = ({ className, ...props }: DialogFooterProps) => (
  <div
    className={cn(DIALOG_FOOTER_CLASSES, className)}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

/**
 * Accessible dialog title component with semantic heading
 * 
 * Renders dialog title with proper typography hierarchy and
 * accessibility features. Built on Radix UI primitives for
 * optimal screen reader support and semantic structure.
 * 
 * @param props Component properties including Radix UI Title attributes
 * @param ref React ref for accessing the underlying title element
 * @returns JSX element containing the accessible dialog title heading
 */
const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  DialogTitleProps
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(DIALOG_TITLE_CLASSES, className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

/**
 * Accessible dialog description component with semantic structure
 * 
 * Renders dialog description with proper typography and
 * accessibility features. Built on Radix UI primitives for
 * optimal screen reader support and semantic structure.
 * 
 * @param props Component properties including Radix UI Description attributes
 * @param ref React ref for accessing the underlying description element
 * @returns JSX element containing the accessible dialog description text
 */
const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  DialogDescriptionProps
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(DIALOG_DESCRIPTION_CLASSES, className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

// ========================================
// EXPORTS
// ========================================

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};