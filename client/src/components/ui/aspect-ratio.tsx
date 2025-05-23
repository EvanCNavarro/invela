/**
 * Aspect Ratio UI Component - Responsive container with fixed proportions
 * 
 * Provides responsive aspect ratio container component built on Radix UI primitives
 * for maintaining consistent proportional layouts across different screen sizes.
 * Optimized for media content, responsive images, and video embeds with design
 * system integration and comprehensive accessibility features.
 * 
 * Features:
 * - Radix UI AspectRatio primitive for accessibility compliance
 * - Flexible ratio configuration for various content types
 * - Responsive behavior with proportional scaling
 * - Media-friendly container for images and videos
 * - Clean semantic structure for optimal screen reader support
 * - Design system integration with consistent styling
 */

// ========================================
// IMPORTS
// ========================================

// Radix UI primitive for accessible aspect ratio functionality
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";

// ========================================
// COMPONENT ALIASES
// ========================================

/**
 * Responsive aspect ratio container component
 * 
 * Provides proportional container that maintains consistent aspect ratio
 * across different screen sizes and viewport changes. Built on Radix UI
 * primitives for optimal accessibility and semantic structure while
 * ensuring responsive media content presentation.
 */
const AspectRatio = AspectRatioPrimitive.Root;

// ========================================
// EXPORTS
// ========================================

export { AspectRatio };
