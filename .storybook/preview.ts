/**
 * ========================================
 * Storybook Preview Configuration
 * ========================================
 * 
 * Global configuration for all stories, including theming, decorators,
 * and parameter defaults. Ensures consistency across the design system
 * and provides proper context for component development.
 * 
 * Features:
 * - Tailwind CSS integration
 * - Dark/light theme support
 * - Responsive viewport presets
 * - Accessibility testing configuration
 * - Global decorators for consistent context
 * 
 * @module .storybook/preview
 * @version 1.0.0
 * @since 2025-05-23
 */

import type { Preview } from '@storybook/react';
import React from 'react';
import '../client/src/index.css'; // Import Tailwind CSS styles

/**
 * Enhanced Logger for Storybook Operations
 * Provides comprehensive tracking of story interactions and state changes
 */
const storybookLogger = {
  info: (message: string, data?: any) => {
    console.log(`%c[Storybook] ${message}`, 'color: #2196F3; font-weight: bold;', data || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`%c[Storybook] ${message}`, 'color: #FF9800; font-weight: bold;', data || '');
  },
  error: (message: string, data?: any) => {
    console.error(`%c[Storybook] ${message}`, 'color: #F44336; font-weight: bold;', data || '');
  }
};

/**
 * Global preview configuration
 * Defines parameters, decorators, and global settings for all stories
 */
const preview: Preview = {
  /**
   * Global parameters applied to all stories
   * Configures addons and default behaviors
   */
  parameters: {
    /**
     * Controls addon configuration
     * Provides interactive controls for component props
     */
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
      expanded: true,
      sort: 'requiredFirst',
    },
    
    /**
     * Actions addon configuration
     * Automatically detects and logs component events
     */
    actions: { 
      argTypesRegex: '^on[A-Z].*' 
    },
    
    /**
     * Docs addon configuration
     * Auto-generates documentation from component definitions
     */
    docs: {
      toc: true,
      extractComponentDescription: (component: any, { notes }: any) => {
        if (notes) {
          return typeof notes === 'string' ? notes : notes.markdown || notes.text;
        }
        return null;
      },
    },
    
    /**
     * Viewport addon configuration
     * Defines responsive breakpoints matching production
     */
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: { width: '375px', height: '667px' },
        },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '1440px', height: '900px' },
        },
        wide: {
          name: 'Wide Desktop',
          styles: { width: '1920px', height: '1080px' },
        },
      },
      defaultViewport: 'desktop',
    },
    
    /**
     * Accessibility addon configuration
     * Enables comprehensive a11y testing
     */
    a11y: {
      element: '#storybook-root',
      config: {},
      options: {},
      manual: true,
    },
    
    /**
     * Background addon configuration
     * Provides theme and background testing options
     */
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#1a1a1a',
        },
        {
          name: 'gray',
          value: '#f5f5f5',
        },
      ],
    },
  },
  
  /**
   * Global decorators applied to all stories
   * Provides consistent context and styling
   */
  decorators: [
    (Story, context) => {
      // Log story rendering for debugging
      storybookLogger.info(`Rendering story: ${context.name}`, {
        component: context.component?.name,
        args: context.args,
        parameters: context.parameters,
      });

      return React.createElement('div', 
        { className: "min-h-screen bg-background text-foreground" },
        React.createElement('div', 
          { className: "container mx-auto p-4" },
          React.createElement(Story)
        )
      );
    },
  ],
  
  /**
   * Global argument types
   * Defines common prop types across all components
   */
  argTypes: {
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'undefined' },
      },
    },
    children: {
      control: 'text',
      description: 'Child components or content',
      table: {
        type: { summary: 'React.ReactNode' },
      },
    },
  },
  
  /**
   * Global args (default prop values)
   * Provides sensible defaults for common props
   */
  args: {
    className: '',
  },
};

// Initialize Storybook logger
storybookLogger.info('Storybook preview configuration loaded', {
  timestamp: new Date().toISOString(),
  version: '1.0.0',
});

export default preview;