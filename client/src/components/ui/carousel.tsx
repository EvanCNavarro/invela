/**
 * Carousel UI Component Suite - Advanced slider system with comprehensive navigation
 * 
 * Provides complete carousel component system built on Embla Carousel with sophisticated
 * features including context management, keyboard navigation, orientation support, and
 * accessibility compliance. Optimized for content slider interfaces with design system
 * integration and comprehensive customization options for various carousel use cases
 * including image galleries, testimonials, and content showcases.
 * 
 * Features:
 * - Complete carousel composition system (Root, Content, Item, Navigation)
 * - Embla Carousel integration for robust slider functionality
 * - Context-based state management with React Context API
 * - Keyboard navigation support with arrow key controls
 * - Horizontal and vertical orientation support
 * - Advanced scroll state management with prev/next detection
 * - Accessibility compliance with proper ARIA attributes and roles
 * - Screen reader support with descriptive navigation labels
 * - Responsive design with flexible item sizing and spacing
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality for component creation and context management
import * as React from "react";

// Embla Carousel for advanced slider functionality
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react";

// Lucide React icons for navigation controls
import { ArrowLeft, ArrowRight } from "lucide-react";

// Internal utility for conditional class names
import { cn } from "@/lib/utils";

// Button component for navigation controls
import { Button } from "@/components/ui/button";

// ========================================
// CONSTANTS
// ========================================

/**
 * Default carousel orientation for consistent behavior
 * Defines preferred scroll direction for carousel navigation
 */
const DEFAULT_ORIENTATION = "horizontal";

/**
 * Carousel container styling classes for region definition
 * Defines relative positioning for carousel container
 */
const CAROUSEL_CONTAINER_CLASSES = "relative";

/**
 * Carousel content overflow styling for smooth scrolling
 * Defines overflow management for carousel content area
 */
const CAROUSEL_CONTENT_OVERFLOW_CLASSES = "overflow-hidden";

/**
 * Carousel content flex styling classes for item arrangement
 * Defines flex layout for carousel items arrangement
 */
const CAROUSEL_CONTENT_FLEX_CLASSES = "flex";

/**
 * Horizontal carousel content spacing classes
 * Defines negative margin for horizontal item spacing
 */
const HORIZONTAL_CONTENT_SPACING_CLASSES = "-ml-4";

/**
 * Vertical carousel content spacing classes
 * Defines negative margin and flex direction for vertical layout
 */
const VERTICAL_CONTENT_SPACING_CLASSES = "-mt-4 flex-col";

/**
 * Base carousel item styling classes for content containers
 * Defines minimum width and padding for carousel items
 */
const CAROUSEL_ITEM_BASE_CLASSES = "min-w-0 shrink-0 grow-0 basis-full";

/**
 * Horizontal carousel item spacing classes
 * Defines left padding for horizontal item spacing
 */
const HORIZONTAL_ITEM_SPACING_CLASSES = "pl-4";

/**
 * Vertical carousel item spacing classes
 * Defines top padding for vertical item spacing
 */
const VERTICAL_ITEM_SPACING_CLASSES = "pt-4";

/**
 * Navigation button base styling classes
 * Defines absolute positioning and circular design for navigation buttons
 */
const NAV_BUTTON_BASE_CLASSES = "absolute h-8 w-8 rounded-full";

/**
 * Previous button positioning classes for horizontal orientation
 * Defines left positioning and center alignment for horizontal navigation
 */
const PREV_BUTTON_HORIZONTAL_CLASSES = "-left-12 top-1/2 -translate-y-1/2";

/**
 * Previous button positioning classes for vertical orientation
 * Defines top positioning and center alignment for vertical navigation
 */
const PREV_BUTTON_VERTICAL_CLASSES = "-top-12 left-1/2 -translate-x-1/2 rotate-90";

/**
 * Next button positioning classes for horizontal orientation
 * Defines right positioning and center alignment for horizontal navigation
 */
const NEXT_BUTTON_HORIZONTAL_CLASSES = "-right-12 top-1/2 -translate-y-1/2";

/**
 * Next button positioning classes for vertical orientation
 * Defines bottom positioning and center alignment for vertical navigation
 */
const NEXT_BUTTON_VERTICAL_CLASSES = "-bottom-12 left-1/2 -translate-x-1/2 rotate-90";

/**
 * Navigation icon styling classes for arrow controls
 * Defines consistent icon dimensions for navigation buttons
 */
const NAV_ICON_CLASSES = "h-4 w-4";

/**
 * Screen reader text for previous navigation button
 * Provides descriptive text for assistive technologies
 */
const PREVIOUS_BUTTON_LABEL = "Previous slide";

/**
 * Screen reader text for next navigation button
 * Provides descriptive text for assistive technologies
 */
const NEXT_BUTTON_LABEL = "Next slide";

/**
 * Error message for invalid carousel hook usage
 * Provides clear error context for development debugging
 */
const CAROUSEL_CONTEXT_ERROR = "useCarousel must be used within a <Carousel />";

/**
 * ARIA role description for carousel region
 * Provides semantic description for assistive technologies
 */
const CAROUSEL_ARIA_ROLE_DESCRIPTION = "carousel";

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Carousel API type from Embla Carousel
 * Provides type-safe access to carousel functionality
 */
type CarouselApi = UseEmblaCarouselType[1];

/**
 * Use carousel parameters type for configuration
 * Extracts parameter types from Embla Carousel hook
 */
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;

/**
 * Carousel options type for configuration
 * Defines available options for carousel behavior
 */
type CarouselOptions = UseCarouselParameters[0];

/**
 * Carousel plugin type for extensions
 * Defines plugin interface for carousel functionality
 */
type CarouselPlugin = UseCarouselParameters[1];

/**
 * Enhanced carousel properties interface
 * Defines configuration options for carousel component
 */
interface CarouselProps {
  /** Carousel configuration options for behavior customization */
  opts?: CarouselOptions;
  /** Plugin array for extending carousel functionality */
  plugins?: CarouselPlugin;
  /** Scroll orientation - horizontal or vertical */
  orientation?: "horizontal" | "vertical";
  /** Callback function for accessing carousel API */
  setApi?: (api: CarouselApi) => void;
}

/**
 * Comprehensive carousel context properties interface
 * Defines complete context state for carousel management
 */
interface CarouselContextProps extends CarouselProps {
  /** Carousel reference from Embla Carousel hook */
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  /** Carousel API instance from Embla Carousel hook */
  api: ReturnType<typeof useEmblaCarousel>[1];
  /** Function to scroll to previous item */
  scrollPrev: () => void;
  /** Function to scroll to next item */
  scrollNext: () => void;
  /** Boolean indicating if previous scroll is available */
  canScrollPrev: boolean;
  /** Boolean indicating if next scroll is available */
  canScrollNext: boolean;
}

/**
 * Carousel component properties interface
 * Combines carousel props with HTML div attributes
 */
interface CarouselComponentProps extends React.HTMLAttributes<HTMLDivElement>, CarouselProps {}

/**
 * Carousel content component properties interface
 * Extends HTML div attributes for content customization
 */
interface CarouselContentProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Carousel item component properties interface
 * Extends HTML div attributes for item customization
 */
interface CarouselItemProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Carousel navigation button properties interface
 * Extends Button component props for navigation customization
 */
interface CarouselNavigationProps extends React.ComponentProps<typeof Button> {}

// ========================================
// CONTEXT MANAGEMENT
// ========================================

/**
 * Carousel context for state management
 * Provides centralized state management for carousel components
 */
const CarouselContext = React.createContext<CarouselContextProps | null>(null);

/**
 * Custom hook for accessing carousel context
 * 
 * Provides type-safe access to carousel context state and functions.
 * Throws descriptive error when used outside carousel provider for
 * better development experience and debugging.
 * 
 * @returns Carousel context properties and methods
 * @throws Error when used outside carousel provider
 */
function useCarousel(): CarouselContextProps {
  const context = React.useContext(CarouselContext);

  if (!context) {
    throw new Error(CAROUSEL_CONTEXT_ERROR);
  }

  return context;
}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Advanced carousel root component with context management and keyboard navigation
 * 
 * Renders comprehensive carousel container with sophisticated state management,
 * keyboard navigation support, and accessibility compliance. Built on Embla Carousel
 * for robust slider functionality while providing context-based state management,
 * orientation support, and comprehensive customization options for various use cases.
 * 
 * @param props Component properties including orientation and configuration options
 * @param ref React ref for accessing the underlying carousel container element
 * @returns JSX element containing the advanced carousel container with context provider
 */
const Carousel = React.forwardRef<
  HTMLDivElement,
  CarouselComponentProps
>(
  (
    {
      orientation = DEFAULT_ORIENTATION,
      opts,
      setApi,
      plugins,
      className,
      children,
      ...props
    },
    ref
  ) => {
    // Initialize Embla Carousel with orientation-based axis configuration
    const [carouselRef, api] = useEmblaCarousel(
      {
        ...opts,
        axis: orientation === "horizontal" ? "x" : "y",
      },
      plugins
    );
    
    // State management for scroll navigation availability
    const [canScrollPrev, setCanScrollPrev] = React.useState(false);
    const [canScrollNext, setCanScrollNext] = React.useState(false);

    // Callback for updating scroll state on carousel selection change
    const onSelect = React.useCallback((api: CarouselApi) => {
      if (!api) {
        return;
      }

      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
    }, []);

    // Memoized scroll functions for navigation control
    const scrollPrev = React.useCallback(() => {
      api?.scrollPrev();
    }, [api]);

    const scrollNext = React.useCallback(() => {
      api?.scrollNext();
    }, [api]);

    // Keyboard navigation handler for arrow key controls
    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          scrollPrev();
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          scrollNext();
        }
      },
      [scrollPrev, scrollNext]
    );

    // Effect for exposing carousel API to parent component
    React.useEffect(() => {
      if (!api || !setApi) {
        return;
      }

      setApi(api);
    }, [api, setApi]);

    // Effect for managing carousel event listeners and state updates
    React.useEffect(() => {
      if (!api) {
        return;
      }

      onSelect(api);
      api.on("reInit", onSelect);
      api.on("select", onSelect);

      return () => {
        api?.off("select", onSelect);
      };
    }, [api, onSelect]);

    return (
      <CarouselContext.Provider
        value={{
          carouselRef,
          api: api,
          opts,
          orientation:
            orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
          scrollPrev,
          scrollNext,
          canScrollPrev,
          canScrollNext,
        }}
      >
        <div
          ref={ref}
          onKeyDownCapture={handleKeyDown}
          className={cn(CAROUSEL_CONTAINER_CLASSES, className)}
          role="region"
          aria-roledescription={CAROUSEL_ARIA_ROLE_DESCRIPTION}
          {...props}
        >
          {children}
        </div>
      </CarouselContext.Provider>
    );
  }
);
Carousel.displayName = "Carousel";

/**
 * Carousel content component with orientation-based layout management
 * 
 * Renders carousel content container with overflow management and orientation-specific
 * spacing. Provides flex layout for carousel items with proper spacing management
 * and scrollable content area for smooth carousel navigation experience.
 * 
 * @param props Component properties including HTML div attributes
 * @param ref React ref for accessing the underlying content element
 * @returns JSX element containing the carousel content container with proper overflow handling
 */
const CarouselContent = React.forwardRef<
  HTMLDivElement,
  CarouselContentProps
>(({ className, ...props }, ref) => {
  const { carouselRef, orientation } = useCarousel();

  return (
    <div ref={carouselRef} className={CAROUSEL_CONTENT_OVERFLOW_CLASSES}>
      <div
        ref={ref}
        className={cn(
          CAROUSEL_CONTENT_FLEX_CLASSES,
          orientation === "horizontal" ? HORIZONTAL_CONTENT_SPACING_CLASSES : VERTICAL_CONTENT_SPACING_CLASSES,
          className
        )}
        {...props}
      />
    </div>
  );
});
CarouselContent.displayName = "CarouselContent";

/**
 * Carousel item component with orientation-based spacing and accessibility
 * 
 * Renders individual carousel item with proper accessibility attributes and
 * orientation-specific spacing. Provides semantic slide structure with proper
 * ARIA roles and responsive sizing for optimal carousel item presentation.
 * 
 * @param props Component properties including HTML div attributes
 * @param ref React ref for accessing the underlying item element
 * @returns JSX element containing the accessible carousel item with proper spacing
 */
const CarouselItem = React.forwardRef<
  HTMLDivElement,
  CarouselItemProps
>(({ className, ...props }, ref) => {
  const { orientation } = useCarousel();

  return (
    <div
      ref={ref}
      role="group"
      aria-roledescription="slide"
      className={cn(
        CAROUSEL_ITEM_BASE_CLASSES,
        orientation === "horizontal" ? HORIZONTAL_ITEM_SPACING_CLASSES : VERTICAL_ITEM_SPACING_CLASSES,
        className
      )}
      {...props}
    />
  );
});
CarouselItem.displayName = "CarouselItem";

/**
 * Carousel previous navigation button with orientation-based positioning
 * 
 * Renders previous navigation button with orientation-specific positioning and
 * scroll state management. Provides accessible navigation control with proper
 * button styling and disabled state management for optimal user experience.
 * 
 * @param props Component properties including Button component attributes
 * @param ref React ref for accessing the underlying button element
 * @returns JSX element containing the accessible previous navigation button
 */
const CarouselPrevious = React.forwardRef<
  HTMLButtonElement,
  CarouselNavigationProps
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel();

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        NAV_BUTTON_BASE_CLASSES,
        orientation === "horizontal"
          ? PREV_BUTTON_HORIZONTAL_CLASSES
          : PREV_BUTTON_VERTICAL_CLASSES,
        className
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ArrowLeft className={NAV_ICON_CLASSES} />
      <span className="sr-only">{PREVIOUS_BUTTON_LABEL}</span>
    </Button>
  );
});
CarouselPrevious.displayName = "CarouselPrevious";

/**
 * Carousel next navigation button with orientation-based positioning
 * 
 * Renders next navigation button with orientation-specific positioning and
 * scroll state management. Provides accessible navigation control with proper
 * button styling and disabled state management for optimal user experience.
 * 
 * @param props Component properties including Button component attributes
 * @param ref React ref for accessing the underlying button element
 * @returns JSX element containing the accessible next navigation button
 */
const CarouselNext = React.forwardRef<
  HTMLButtonElement,
  CarouselNavigationProps
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, scrollNext, canScrollNext } = useCarousel();

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        NAV_BUTTON_BASE_CLASSES,
        orientation === "horizontal"
          ? NEXT_BUTTON_HORIZONTAL_CLASSES
          : NEXT_BUTTON_VERTICAL_CLASSES,
        className
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ArrowRight className={NAV_ICON_CLASSES} />
      <span className="sr-only">{NEXT_BUTTON_LABEL}</span>
    </Button>
  );
});
CarouselNext.displayName = "CarouselNext";

// ========================================
// EXPORTS
// ========================================

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
};
