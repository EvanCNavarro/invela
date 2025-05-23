/**
 * ========================================
 * Storybook Main Configuration
 * ========================================
 * 
 * Enterprise-grade Storybook configuration for the risk assessment platform.
 * Configured with comprehensive addon ecosystem for design system documentation,
 * accessibility testing, and component development best practices.
 * 
 * Features:
 * - React/TypeScript support with Vite builder
 * - Tailwind CSS integration matching production
 * - Accessibility testing with a11y addon
 * - Interactive testing capabilities
 * - Responsive design testing
 * - Auto-discovery of story files
 * 
 * @module .storybook/main
 * @version 1.0.0
 * @since 2025-05-23
 */

import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  /**
   * Story file discovery patterns
   * Searches for stories in components, pages, and dedicated stories directories
   */
  stories: [
    '../client/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../docs/**/*.stories.@(js|jsx|mjs|ts|tsx)'
  ],
  
  /**
   * Essential addons for enterprise component development
   * Provides comprehensive tooling for design system documentation
   */
  addons: [
    '@storybook/addon-essentials',     // Core functionality (docs, controls, actions)
    '@storybook/addon-a11y',           // Accessibility testing
    '@storybook/addon-interactions',   // User interaction testing
    '@storybook/addon-viewport',       // Responsive design testing
  ],
  
  /**
   * Framework configuration
   * Uses Vite builder for fast development and build times
   */
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  
  /**
   * TypeScript configuration
   * Enables type checking and IntelliSense for stories
   */
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
  
  /**
   * Documentation configuration
   * Auto-generates component documentation from TypeScript interfaces
   */
  docs: {
    autodocs: 'tag',
    defaultName: 'Documentation',
  },
  
  /**
   * Vite configuration customization
   * Ensures Storybook works with existing project setup
   */
  async viteFinal(config) {
    return mergeConfig(config, {
      // Ensure proper path resolution for imports
      resolve: {
        alias: {
          '@': '/client/src',
        },
      },
      // Define environment variables for Storybook context
      define: {
        'process.env.STORYBOOK': true,
      },
    });
  },
};

export default config;