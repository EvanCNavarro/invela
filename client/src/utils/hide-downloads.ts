/**
 * Hide Downloads Utility
 * 
 * This utility provides a feature flag to hide download buttons across the application.
 * It can be centrally managed here and then imported wherever download functionality exists.
 */

// Set this to true to hide all download buttons
export const HIDE_DOWNLOAD_BUTTONS = true;

// Feature flag checker function
export function shouldHideDownloadButtons(): boolean {
  return HIDE_DOWNLOAD_BUTTONS;
}