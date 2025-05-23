/**
 * ========================================
 * Storybook Manager Configuration
 * ========================================
 * 
 * Configuration for the Storybook manager UI, including
 * branding, theme, and navigation customization for the
 * enterprise risk assessment design system.
 * 
 * @module .storybook/manager
 * @version 1.0.0
 * @since 2025-05-23
 */

import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming/create';

// Custom theme for the design system
const customTheme = create({
  base: 'light',
  
  // Brand configuration
  brandTitle: 'Risk Assessment Design System',
  brandUrl: 'https://your-main-domain.replit.app',
  brandImage: undefined, // Add your logo URL here if available
  brandTarget: '_self',
  
  // Colors
  colorPrimary: '#2563eb', // Professional blue
  colorSecondary: '#64748b', // Neutral gray
  
  // UI colors
  appBg: '#ffffff',
  appContentBg: '#ffffff',
  appBorderColor: '#e2e8f0',
  appBorderRadius: 8,
  
  // Typography
  fontBase: '"Inter", "Segoe UI", sans-serif',
  fontCode: '"Fira Code", "Consolas", monospace',
  
  // Text colors
  textColor: '#1e293b',
  textInverseColor: '#ffffff',
  
  // Toolbar colors
  barTextColor: '#64748b',
  barSelectedColor: '#2563eb',
  barBg: '#ffffff',
  
  // Input colors
  inputBg: '#ffffff',
  inputBorder: '#d1d5db',
  inputTextColor: '#374151',
  inputBorderRadius: 6,
});

// Configure the manager
addons.setConfig({
  theme: customTheme,
  
  // Panel configuration
  panelPosition: 'bottom',
  selectedPanel: 'controls',
  
  // Sidebar configuration
  sidebar: {
    showRoots: true,
    collapsedRoots: ['design-system'],
  },
  
  // Toolbar configuration
  toolbar: {
    title: { hidden: false },
    zoom: { hidden: false },
    eject: { hidden: true },
    copy: { hidden: false },
    fullscreen: { hidden: false },
  },
  
  // Initial active tab
  initialActive: 'sidebar',
});