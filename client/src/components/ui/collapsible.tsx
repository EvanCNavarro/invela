/**
 * Collapsible UI Component Suite - Expandable content container system
 * 
 * Provides complete collapsible component system built on Radix UI primitives with
 * sophisticated expand/collapse functionality for content organization. Optimized for
 * disclosure interfaces with design system integration and accessibility compliance
 * including proper ARIA attributes, keyboard navigation, and smooth animation support
 * for various collapsible use cases including accordions, details panels, and menus.
 * 
 * Features:
 * - Complete collapsible composition system (Root, Trigger, Content)
 * - Radix UI primitives integration for robust collapsible functionality
 * - Accessibility compliance with proper ARIA attributes and keyboard navigation
 * - Smooth animation support with CSS transitions and transforms
 * - Design system integration with consistent styling patterns
 * - Flexible content organization with expandable disclosure patterns
 * - Screen reader support with proper state announcements
 * - Controlled and uncontrolled component modes for various use cases
 */

// ========================================
// IMPORTS
// ========================================

// Radix UI Collapsible primitives for robust expandable functionality
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

// ========================================
// COMPONENT DEFINITIONS
// ========================================

/**
 * Collapsible root component for expandable content containers
 * 
 * Provides the root context and state management for collapsible functionality.
 * Built on Radix UI primitives for accessibility compliance and robust behavior
 * with support for controlled and uncontrolled modes, animation integration,
 * and comprehensive keyboard navigation for optimal user experience.
 */
const Collapsible = CollapsiblePrimitive.Root;

/**
 * Collapsible trigger component for expand/collapse controls
 * 
 * Renders the interactive trigger element that controls the collapsible state.
 * Provides proper accessibility attributes, keyboard event handling, and focus
 * management for optimal user interaction with collapsible content containers
 * while maintaining design system consistency and responsive behavior.
 */
const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;

/**
 * Collapsible content component for expandable content areas
 * 
 * Renders the collapsible content container with smooth animation support and
 * proper accessibility attributes. Provides responsive content management with
 * overflow handling, height transitions, and proper ARIA states for screen
 * reader compatibility and optimal content disclosure experience.
 */
const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;

// ========================================
// EXPORTS
// ========================================

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
