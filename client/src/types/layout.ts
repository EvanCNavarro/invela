/**
 * @file layout.ts
 * This file defines the core layout types and standards for the application.
 * 
 * IMPORTANT: All pages in the application MUST use the PageTemplate component
 * as their base layout structure. The only exceptions are:
 * - Authentication pages (login/register)
 * - Error pages (404, 500)
 * - Special landing pages
 * 
 * Any customizations should be done through props and composition, not by
 * creating new template structures.
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
