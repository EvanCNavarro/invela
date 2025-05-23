/**
 * Sheet UI Component Suite - Advanced slide-out panel system with directional variants
 * 
 * Provides complete sheet component system built on Radix UI Dialog primitives with
 * sophisticated directional sliding animations and class-variance-authority integration.
 * Optimized for slide-out panels and drawer interfaces with design system integration
 * and comprehensive accessibility features including keyboard navigation, focus trapping,
 * and screen reader support with full directional positioning control.
 * 
 * Features:
 * - Complete sheet composition system (Root, Portal, Overlay, Trigger, Content, etc.)
 * - Radix UI Dialog primitives for accessibility compliance
 * - Advanced class-variance-authority integration for directional variants
 * - Sophisticated slide animations from all four directions (top, bottom, left, right)
 * - Portal rendering for proper z-index layering
 * - Responsive sizing with mobile-first approach
 * - Integrated close button with accessibility features
 * - Flexible layout components (Header, Footer, Title, Description)
 * - Custom animation durations for smooth transitions
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality for component creation
import * as React from "react";

// Radix UI Dialog primitive for accessible sheet functionality
import * as SheetPrimitive from "@radix-ui/react-dialog";

// Class-variance-authority for advanced variant management
import { cva, type VariantProps } from "class-variance-authority";

// Lucide React icon for close button functionality
import { X } from "lucide-react";

// Internal utility for conditional class names
import { cn } from "@/lib/utils";

// ========================================
// CONSTANTS
// ========================================

/**
 * Sheet overlay styling classes for backdrop appearance
 * Defines full-screen overlay with backdrop blur and fade animations
 */
const SHEET_OVERLAY_CLASSES = "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";

/**
 * Sheet close button styling classes for accessibility and interaction
 * Defines close button appearance with focus states and positioning
 */
const SHEET_CLOSE_BUTTON_CLASSES = "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary";

/**
 * Sheet header styling classes for title section layout
 * Defines header layout with responsive text alignment
 */
const SHEET_HEADER_CLASSES = "flex flex-col space-y-2 text-center sm:text-left";

/**
 * Sheet footer styling classes for action section layout
 * Defines footer layout with responsive button arrangement
 */
const SHEET_FOOTER_CLASSES = "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2";

/**
 * Sheet title styling classes for heading typography
 * Defines title appearance with proper hierarchy and foreground color
 */
const SHEET_TITLE_CLASSES = "text-lg font-semibold text-foreground";

/**
 * Sheet description styling classes for subtitle typography
 * Defines description appearance with muted foreground color
 */
const SHEET_DESCRIPTION_CLASSES = "text-sm text-muted-foreground";

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

/**
 * Default sheet side position for consistent behavior
 * Defines preferred slide direction for sheet panels
 */
const DEFAULT_SHEET_SIDE = "right";

// ========================================
// CLASS-VARIANCE-AUTHORITY CONFIGURATION
// ========================================

/**
 * Advanced sheet variants configuration with directional slide animations
 * 
 * Provides comprehensive variant system for sheet positioning and animations
 * using class-variance-authority for type-safe styling management. Supports
 * all four directional slides with responsive sizing and proper border styling.
 */
const sheetVariants = cva(
  // Base classes applied to all sheet variants
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        /**
         * Top slide variant for header-style sheets
         * Slides down from top with horizontal full width
         */
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        
        /**
         * Bottom slide variant for footer-style sheets
         * Slides up from bottom with horizontal full width
         */
        bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        
        /**
         * Left slide variant for navigation-style sheets
         * Slides in from left with responsive width constraints
         */
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        
        /**
         * Right slide variant for sidebar-style sheets
         * Slides in from right with responsive width constraints
         */
        right: "inset-y-0 right-0 h-full w-3/4  border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: DEFAULT_SHEET_SIDE,
    },
  }
);

// ========================================
// COMPONENT ALIASES
// ========================================

/**
 * Sheet root component for state management
 * Manages sheet open/close state and interactions
 */
const Sheet = SheetPrimitive.Root;

/**
 * Sheet trigger component for activation control
 * Element that triggers sheet display on interaction
 */
const SheetTrigger = SheetPrimitive.Trigger;

/**
 * Sheet close component for dismissal control
 * Provides programmatic close functionality
 */
const SheetClose = SheetPrimitive.Close;

/**
 * Sheet portal component for rendering control
 * Manages portal rendering for proper DOM placement
 */
const SheetPortal = SheetPrimitive.Portal;

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Sheet overlay component properties interface
 * Extends Radix UI Overlay primitive with styling options
 */
interface SheetOverlayProps extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay> {}

/**
 * Enhanced sheet content properties interface
 * Combines Radix UI Content primitive with class-variance-authority variants
 */
interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

/**
 * Sheet header component properties interface
 * Extends HTML div attributes for layout customization
 */
interface SheetHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Sheet footer component properties interface
 * Extends HTML div attributes for layout customization
 */
interface SheetFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Sheet title component properties interface
 * Extends Radix UI Title primitive with styling options
 */
interface SheetTitleProps extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title> {}

/**
 * Sheet description component properties interface
 * Extends Radix UI Description primitive with styling options
 */
interface SheetDescriptionProps extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description> {}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Accessible sheet overlay component with backdrop functionality
 * 
 * Renders full-screen overlay with backdrop blur and fade animations.
 * Provides visual separation between sheet content and background while
 * maintaining accessibility features and smooth transition effects.
 * 
 * @param props Component properties including Radix UI Overlay attributes
 * @param ref React ref for accessing the underlying overlay element
 * @returns JSX element containing the accessible sheet backdrop overlay
 */
const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  SheetOverlayProps
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(SHEET_OVERLAY_CLASSES, className)}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

/**
 * Advanced sheet content component with directional variants and portal rendering
 * 
 * Renders slide-out sheet content with sophisticated directional animations,
 * variant-based positioning, and portal rendering for proper z-index management.
 * Includes integrated close button and comprehensive accessibility features
 * with responsive design and class-variance-authority variant system.
 * 
 * @param props Component properties including directional variants and styling options
 * @param ref React ref for accessing the underlying sheet content element
 * @returns JSX element containing the advanced directional sheet content panel
 */
const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = DEFAULT_SHEET_SIDE, className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side }), className)}
      {...props}
    >
      {children}
      <SheetPrimitive.Close className={SHEET_CLOSE_BUTTON_CLASSES}>
        <X className={CLOSE_ICON_CLASSES} />
        <span className="sr-only">{CLOSE_BUTTON_LABEL}</span>
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = SheetPrimitive.Content.displayName;

/**
 * Sheet header component for title section organization
 * 
 * Renders header section for sheet titles and descriptions with
 * responsive layout and consistent spacing. Provides semantic
 * structure for better accessibility and visual organization.
 * 
 * @param props Component properties including HTML div attributes
 * @returns JSX element containing the sheet header layout section
 */
const SheetHeader = ({ className, ...props }: SheetHeaderProps) => (
  <div
    className={cn(SHEET_HEADER_CLASSES, className)}
    {...props}
  />
);
SheetHeader.displayName = "SheetHeader";

/**
 * Sheet footer component for action section organization
 * 
 * Renders footer section for sheet actions and buttons with
 * responsive layout and consistent spacing. Provides semantic
 * structure for better accessibility and visual organization.
 * 
 * @param props Component properties including HTML div attributes
 * @returns JSX element containing the sheet footer layout section
 */
const SheetFooter = ({ className, ...props }: SheetFooterProps) => (
  <div
    className={cn(SHEET_FOOTER_CLASSES, className)}
    {...props}
  />
);
SheetFooter.displayName = "SheetFooter";

/**
 * Accessible sheet title component with semantic heading
 * 
 * Renders sheet title with proper typography hierarchy and
 * accessibility features. Built on Radix UI primitives for
 * optimal screen reader support and semantic structure.
 * 
 * @param props Component properties including Radix UI Title attributes
 * @param ref React ref for accessing the underlying title element
 * @returns JSX element containing the accessible sheet title heading
 */
const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  SheetTitleProps
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn(SHEET_TITLE_CLASSES, className)}
    {...props}
  />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

/**
 * Accessible sheet description component with semantic structure
 * 
 * Renders sheet description with proper typography and
 * accessibility features. Built on Radix UI primitives for
 * optimal screen reader support and semantic structure.
 * 
 * @param props Component properties including Radix UI Description attributes
 * @param ref React ref for accessing the underlying description element
 * @returns JSX element containing the accessible sheet description text
 */
const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  SheetDescriptionProps
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn(SHEET_DESCRIPTION_CLASSES, className)}
    {...props}
  />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

// ========================================
// EXPORTS
// ========================================

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
