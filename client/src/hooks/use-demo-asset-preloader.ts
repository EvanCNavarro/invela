/**
 * ========================================
 * Demo Asset Preloader Hook
 * ========================================
 * 
 * Optimizes demo step transitions by preloading next step assets using
 * browser-native preloading capabilities. Integrates seamlessly with the
 * existing demo visual system to provide instant navigation experience.
 * 
 * Key Features:
 * - Browser-native asset preloading for optimal performance
 * - Smart next-step prediction based on current demo step
 * - Graceful handling of loading errors and edge cases
 * - Integration with existing demo step configuration
 * - Minimal performance overhead with cleanup on unmount
 * 
 * Dependencies:
 * - React useEffect: For lifecycle management and cleanup
 * - Browser Link Preloading: Native browser optimization feature
 * 
 * @module hooks/use-demo-asset-preloader
 * @version 1.0.0
 * @since 2025-05-25
 */

import { useEffect } from "react";

// ========================================
// TYPES & INTERFACES
// ========================================

/**
 * Demo step asset configuration interface
 * Mirrors the structure used in DemoStepVisual component
 */
interface DemoStepAssets {
  staticImage: string;
  animatedGif: string;
}

/**
 * Complete demo step configuration interface
 * Maintains consistency with existing demo step structure
 */
interface DemoStepConfig {
  id: number;
  title: string;
  description: string;
  assets: DemoStepAssets;
}

/**
 * Hook configuration options interface
 */
interface PreloaderOptions {
  /** Enable/disable preloading functionality */
  enabled?: boolean;
  /** Preload static images in addition to animated GIFs */
  includeStaticImages?: boolean;
}

// ========================================
// CONSTANTS & CONFIGURATION
// ========================================

/**
 * Demo step configuration with asset paths
 * 
 * Maintains exact consistency with DemoStepVisual component configuration
 * to ensure preloading targets the correct assets that will be displayed.
 * 
 * Asset Path Convention:
 * - Static images: /assets/demo/steps/step-{number}-static.{ext}
 * - Animated GIFs: /assets/demo/steps/step-{number}-animated.gif
 */
const DEMO_STEPS: DemoStepConfig[] = [
  {
    id: 1,
    title: "Platform Overview",
    description: "Introduction to the Invela Trust Network ecosystem",
    assets: {
      staticImage: "/assets/demo/steps/step-1-static.png",
      animatedGif: "/assets/demo/steps/step-1-animated.gif"
    }
  },
  {
    id: 2,
    title: "Interactive Experience", 
    description: "Hands-on demonstration of key platform features",
    assets: {
      staticImage: "/assets/demo/steps/step-2-static.png",
      animatedGif: "/assets/demo/steps/step-2-animated.gif"
    }
  },
  {
    id: 3,
    title: "Results & Insights",
    description: "Comprehensive view of assessment outcomes and next steps",
    assets: {
      staticImage: "/assets/demo/steps/step-3-static.png",
      animatedGif: "/assets/demo/steps/step-3-animated.gif"
    }
  }
];

/**
 * Default preloader configuration
 */
const DEFAULT_OPTIONS: Required<PreloaderOptions> = {
  enabled: true,
  includeStaticImages: false
} as const;

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Creates a preload link element for the specified asset
 * 
 * Uses browser-native link preloading which provides optimal performance
 * and integrates seamlessly with browser caching mechanisms.
 * 
 * @param assetUrl - The URL of the asset to preload
 * @param assetType - The type of asset for proper browser handling
 * @returns The created link element for cleanup purposes
 */
const createPreloadLink = (assetUrl: string, assetType: 'image' | 'video' = 'image'): HTMLLinkElement => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = assetUrl;
  link.as = assetType;
  
  // Add error handling to prevent console warnings
  link.onerror = () => {
    console.warn(`[DemoAssetPreloader] Failed to preload asset: ${assetUrl}`);
  };
  
  document.head.appendChild(link);
  return link;
};

/**
 * Determines the next step configuration based on current step
 * 
 * @param currentStep - The currently active demo step (1-3)
 * @returns The next step configuration or null if at final step
 */
const getNextStepConfig = (currentStep: number): DemoStepConfig | null => {
  return DEMO_STEPS.find(step => step.id === currentStep + 1) || null;
};

// ========================================
// MAIN HOOK
// ========================================

/**
 * Demo Asset Preloader Hook
 * 
 * Automatically preloads assets for the next demo step to ensure instant
 * transitions when users navigate through the demo flow. Uses browser-native
 * preloading for optimal performance and minimal overhead.
 * 
 * Implementation Strategy:
 * - Preloads next step's animated GIF (primary optimization target)
 * - Optionally preloads static images based on configuration
 * - Cleans up preload links on step change or component unmount
 * - Gracefully handles edge cases (final step, loading errors)
 * 
 * Performance Benefits:
 * - Eliminates visible loading delays during step transitions
 * - Leverages browser's native caching and optimization
 * - Minimal memory footprint with automatic cleanup
 * - No impact on initial page load performance
 * 
 * @param currentStep - The currently active demo step (1-3)
 * @param options - Optional configuration for preloader behavior
 * 
 * @example
 * ```typescript
 * // Basic usage in demo component
 * function DemoComponent({ currentStep }: { currentStep: number }) {
 *   useDemoAssetPreloader(currentStep);
 *   return <DemoContent />;
 * }
 * 
 * // Advanced usage with options
 * function DemoComponent({ currentStep }: { currentStep: number }) {
 *   useDemoAssetPreloader(currentStep, {
 *     enabled: true,
 *     includeStaticImages: true
 *   });
 *   return <DemoContent />;
 * }
 * ```
 */
export function useDemoAssetPreloader(
  currentStep: number,
  options: PreloaderOptions = {}
): void {
  // Merge options with defaults
  const config = { ...DEFAULT_OPTIONS, ...options };

  useEffect(() => {
    // Early return if preloading is disabled
    if (!config.enabled) {
      return;
    }

    // Get next step configuration
    const nextStep = getNextStepConfig(currentStep);
    
    // No preloading needed if at final step
    if (!nextStep) {
      console.log(`[DemoAssetPreloader] At final step ${currentStep}, no preloading needed`);
      return;
    }

    console.log(`[DemoAssetPreloader] Preloading assets for step ${nextStep.id}`);

    // Track created preload links for cleanup
    const preloadLinks: HTMLLinkElement[] = [];

    try {
      // Always preload the animated GIF (primary optimization target)
      preloadLinks.push(createPreloadLink(nextStep.assets.animatedGif, 'image'));
      
      // Optionally preload static image
      if (config.includeStaticImages) {
        preloadLinks.push(createPreloadLink(nextStep.assets.staticImage, 'image'));
      }

      console.log(`[DemoAssetPreloader] Successfully initiated preloading for ${preloadLinks.length} assets`);
    } catch (error) {
      console.error('[DemoAssetPreloader] Error during asset preloading:', error);
    }

    // Cleanup function to remove preload links
    return () => {
      preloadLinks.forEach(link => {
        try {
          if (link.parentNode) {
            link.parentNode.removeChild(link);
          }
        } catch (cleanupError) {
          console.warn('[DemoAssetPreloader] Error during preload link cleanup:', cleanupError);
        }
      });
      
      if (preloadLinks.length > 0) {
        console.log(`[DemoAssetPreloader] Cleaned up ${preloadLinks.length} preload links`);
      }
    };
  }, [currentStep, config.enabled, config.includeStaticImages]);
}

/**
 * Default export for convenient importing
 */
export default useDemoAssetPreloader;