/**
 * Avatar UI Component Suite - User profile image display system
 * 
 * Provides complete avatar component system built on Radix UI primitives with
 * sophisticated features including image loading states, fallback displays,
 * and responsive sizing. Optimized for user profile representations with
 * design system integration and comprehensive accessibility features including
 * screen reader support and proper image alt text handling.
 * 
 * Features:
 * - Complete avatar composition system (Root, Image, Fallback)
 * - Radix UI Avatar primitives for accessibility compliance
 * - Automatic fallback handling for failed image loads
 * - Responsive circular design with overflow management
 * - Flexible sizing with consistent aspect ratios
 * - Image loading states with smooth transitions
 * - Accessibility-compliant image and fallback structure
 * - Design system integration with theme-aware styling
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality for component creation
import * as React from "react";

// Radix UI primitive for accessible avatar functionality
import * as AvatarPrimitive from "@radix-ui/react-avatar";

// Internal utility for conditional class names
import { cn } from "@/lib/utils";

// ========================================
// CONSTANTS
// ========================================

/**
 * Avatar root styling classes for container appearance
 * Defines circular container with overflow management and consistent sizing
 */
const AVATAR_ROOT_CLASSES = "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full";

/**
 * Avatar image styling classes for image display
 * Defines full-size image with proper aspect ratio maintenance
 */
const AVATAR_IMAGE_CLASSES = "aspect-square h-full w-full";

/**
 * Avatar fallback styling classes for placeholder content
 * Defines centered fallback display with background styling
 */
const AVATAR_FALLBACK_CLASSES = "flex h-full w-full items-center justify-center rounded-full bg-muted";

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Avatar component properties interface
 * Extends Radix UI Root primitive with styling options
 */
interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {}

/**
 * Avatar image component properties interface
 * Extends Radix UI Image primitive with styling options
 */
interface AvatarImageProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> {}

/**
 * Avatar fallback component properties interface
 * Extends Radix UI Fallback primitive with styling options
 */
interface AvatarFallbackProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> {}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Avatar root component with responsive circular design
 * 
 * Renders circular avatar container with overflow management and flexible
 * sizing. Built on Radix UI primitives for optimal accessibility while
 * providing consistent circular design with proper image containment and
 * responsive behavior for various avatar sizes.
 * 
 * @param props Component properties including Radix UI Root attributes
 * @param ref React ref for accessing the underlying avatar container element
 * @returns JSX element containing the circular avatar container
 */
const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(AVATAR_ROOT_CLASSES, className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

/**
 * Avatar image component with automatic loading states
 * 
 * Renders user profile image with automatic loading state management and
 * fallback handling. Built on Radix UI primitives for optimal accessibility
 * while providing smooth image loading transitions and proper aspect ratio
 * maintenance with full container coverage.
 * 
 * @param props Component properties including Radix UI Image attributes
 * @param ref React ref for accessing the underlying image element
 * @returns JSX element containing the responsive avatar image
 */
const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  AvatarImageProps
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn(AVATAR_IMAGE_CLASSES, className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

/**
 * Avatar fallback component for placeholder content display
 * 
 * Renders fallback content when avatar image fails to load or is unavailable.
 * Built on Radix UI primitives for optimal accessibility while providing
 * centered placeholder display with consistent styling and proper content
 * alignment for initials, icons, or other fallback content.
 * 
 * @param props Component properties including Radix UI Fallback attributes
 * @param ref React ref for accessing the underlying fallback element
 * @returns JSX element containing the centered avatar fallback content
 */
const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  AvatarFallbackProps
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(AVATAR_FALLBACK_CLASSES, className)}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

// ========================================
// EXPORTS
// ========================================

export { Avatar, AvatarImage, AvatarFallback };
