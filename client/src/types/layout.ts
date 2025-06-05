/**
 * ========================================
 * Layout Type Definitions
 * ========================================
 * 
 * Core layout types and standards for the enterprise risk assessment platform.
 * Defines the standardized page template structure and component interfaces
 * used throughout the application for consistent layout management.
 * 
 * Layout Standards:
 * - All pages MUST use PageTemplate component as base structure
 * - Exceptions: auth pages, error pages, special landing pages
 * - Customizations through props and composition only
 * 
 * @module types/layout
 * @version 1.0.0
 * @since 2025-05-23
 */

import { ReactNode } from "react";

export interface PageTemplateProps {
  /** Main content of the page */
  children: ReactNode;
  
  /** Optional side drawer content */
  drawer?: ReactNode;
  
  /** Controls drawer visibility */
  drawerOpen?: boolean;
  
  /** Callback when drawer state changes */
  onDrawerOpenChange?: (open: boolean) => void;
  
  /** Custom class name for the main content area */
  className?: string;
  
  /** Title shown in page header */
  title?: string;
  
  /** Description shown in page header */
  description?: string;
  
  /** Additional actions to show in the header */
  headerActions?: ReactNode;
  
  /** Whether to show breadcrumb navigation */
  showBreadcrumbs?: boolean;
}

/**
 * Standard page structure used across the application
 * 
 * Layout hierarchy:
 * ```
 * DashboardLayout (Root, no padding)
 * └── PageTemplate (flex-1 flex overflow-x-hidden)
 *     ├── Main Content Area (flex-1 min-w-0)
 *     │   └── Content Wrapper (p-6)
 *     │       ├── BreadcrumbNav (if showBreadcrumbs)
 *     │       ├── PageHeader (if title/description)
 *     │       └── Page Content
 *     │
 *     └── PageSideDrawer (when drawer provided)
 *         └── Drawer Container (fixed, width: 25.75rem)
 *             └── Inner Container
 *                 ├── Header
 *                 └── Content
 * ```
 */
export type PageLayoutType = (props: PageTemplateProps) => JSX.Element;
