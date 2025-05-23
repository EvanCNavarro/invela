/**
 * ========================================
 * Utility Functions - Core Application Foundation
 * ========================================
 * 
 * Essential utility functions for the enterprise risk assessment platform.
 * Provides foundational utilities for CSS class management, file operations,
 * and common data processing tasks used throughout the application.
 * 
 * Key Features:
 * - CSS class name composition with Tailwind CSS optimization
 * - File size formatting utilities
 * - Type-safe utility functions
 * - Performance-optimized implementations
 * 
 * Dependencies:
 * - clsx: Conditional CSS class composition
 * - tailwind-merge: Tailwind CSS class deduplication
 * 
 * @module lib/utils
 * @version 1.0.0
 * @since 2025-05-23
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * CSS Class Name Composer
 * 
 * Combines and optimizes CSS class names using clsx and tailwind-merge.
 * Automatically deduplicates conflicting Tailwind classes and handles
 * conditional class application.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Add classNames as an alias for cn
export const classNames = cn;

export function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}