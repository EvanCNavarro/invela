/**
 * ========================================
 * Enhanced Table Component - Storybook Stories
 * ========================================
 * 
 * Comprehensive Storybook documentation for the enterprise Table component.
 * Showcases all enhanced features including sorting, selection, search highlighting,
 * and responsive design. Provides interactive examples with realistic demo data
 * for testing and development purposes.
 * 
 * Features Demonstrated:
 * - Basic table with professional styling
 * - Sortable columns with visual indicators
 * - Row selection with bulk actions
 * - Search result highlighting
 * - Dropdown action menus
 * - Empty states and loading scenarios
 * - Responsive design patterns
 * 
 * @module stories/data-display/Table
 * @version 1.0.0
 * @since 2025-05-23
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { within, userEvent, expect } from '@storybook/testing-library';
import { EnhancedTable, type Column } from '@/components/ui/table';

/**
 * Enhanced Logger for Story Operations
 * Provides comprehensive tracking of story interactions and component behavior
 */
const storyLogger = {
  info: (message: string, data?: any) => {
    console.log(`%c[Table Story] ${message}`, 'color: #4CAF50; font-weight: bold;', data || '');
  },
  action: (message: string, data?: any) => {
    console.log(`%c[Table Action] ${message}`, 'color: #2196F3; font-weight: bold;', data || '');
    action(message)(data);
  }
};

/**
 * Demo Data Interface
 * Represents typical enterprise data structure for risk assessment
 */
interface DemoFileItem {
  id: string;
  name: string;
  size: number;
  status: 'uploaded' | 'processing' | 'completed' | 'error';
  uploadedAt: string;
  type: string;
  riskScore?: number;
}

/**
 * Realistic Demo Data
 * Enterprise file management data reflecting real-world usage patterns
 */
const demoFiles: DemoFileItem[] = [
  {
    id: '1',
    name: 'Financial_Statement_Q3_2024.pdf',
    size: 2457600,
    status: 'completed',
    uploadedAt: '2024-11-15T10:30:00Z',
    type: 'PDF',
    riskScore: 85
  },
  {
    id: '2',
    name: 'Bank_Statement_November.csv',
    size: 1024000,
    status: 'processing',
    uploadedAt: '2024-11-18T14:22:00Z',
    type: 'CSV',
    riskScore: 72
  },
  {
    id: '3',
    name: 'KYC_Documentation_Update.docx',
    size: 512000,
    status: 'uploaded',
    uploadedAt: '2024-11-20T09:15:00Z',
    type: 'DOCX',
    riskScore: 91
  },
  {
    id: '4',
    name: 'Compliance_Report_2024.xlsx',
    size: 3145728,
    status: 'error',
    uploadedAt: '2024-11-12T16:45:00Z',
    type: 'XLSX',
    riskScore: 68
  },
  {
    id: '5',
    name: 'Risk_Assessment_Framework.pdf',
    size: 1843200,
    status: 'completed',
    uploadedAt: '2024-11-10T11:20:00Z',
    type: 'PDF',
    riskScore: 94
  }
];

/**
 * Utility Functions for Demo Data
 * Helper functions for formatting and display
 */
const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusBadge = (status: string) => {
  const statusConfig = {
    completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
    processing: { label: 'Processing', className: 'bg-blue-100 text-blue-800' },
    uploaded: { label: 'Uploaded', className: 'bg-gray-100 text-gray-800' },
    error: { label: 'Error', className: 'bg-red-100 text-red-800' }
  };
  
  const config = statusConfig[status as keyof typeof statusConfig];
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
};

const getRiskScoreBadge = (score?: number) => {
  if (!score) return <span className="text-gray-400">N/A</span>;
  
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-red-100 text-red-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(score)}`}>
      {score}
    </span>
  );
};

/**
 * Column Definitions
 * Professional table column configuration with enhanced features
 */
const fileColumns: Column<DemoFileItem>[] = [
  {
    id: 'name',
    header: 'File Name',
    sortable: true,
    cell: (item) => (
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
          <span className="text-xs font-medium text-blue-600">
            {item.type}
          </span>
        </div>
        <span className="font-medium text-gray-900">{item.name}</span>
      </div>
    ),
  },
  {
    id: 'size',
    header: 'Size',
    sortable: true,
    cell: (item) => (
      <span className="text-sm text-gray-600">
        {formatFileSize(item.size)}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    sortable: true,
    cell: (item) => getStatusBadge(item.status),
  },
  {
    id: 'riskScore',
    header: 'Risk Score',
    sortable: true,
    cell: (item) => getRiskScoreBadge(item.riskScore),
  },
  {
    id: 'uploadedAt',
    header: 'Uploaded',
    sortable: true,
    cell: (item) => (
      <span className="text-sm text-gray-600">
        {formatDate(item.uploadedAt)}
      </span>
    ),
  },
];

/**
 * Meta Configuration
 * Storybook component metadata and controls
 */
const meta: Meta<typeof EnhancedTable> = {
  title: 'Data Display/Enhanced Table',
  component: EnhancedTable,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# Enhanced Table Component

A professional, feature-rich table component designed for enterprise risk assessment applications. 
Built with accessibility, performance, and user experience in mind.

## Key Features

- **Sortable Columns**: Click column headers to sort data ascending/descending
- **Row Selection**: Select individual rows or use bulk selection
- **Search Highlighting**: Highlights search matches in table content
- **Dropdown Actions**: Contextual actions for each row
- **Responsive Design**: Adapts to different screen sizes
- **Professional Styling**: Consistent with design system tokens

## Usage

\`\`\`tsx
import { EnhancedTable, type Column } from '@/components/ui/table';

const columns: Column<DataType>[] = [
  {
    id: 'name',
    header: 'Name',
    sortable: true,
    cell: (item) => <span>{item.name}</span>,
  },
  // ... more columns
];

<EnhancedTable
  data={data}
  columns={columns}
  selectable={true}
  onSort={(field, direction) => handleSort(field, direction)}
  onSelectionChange={(selectedIds) => handleSelection(selectedIds)}
/>
\`\`\`
        `
      }
    },
  },
  argTypes: {
    data: {
      control: false,
      description: 'Array of data items to display in the table',
      table: {
        type: { summary: 'T[]' },
      },
    },
    columns: {
      control: false,
      description: 'Column definitions with headers, cell renderers, and sorting config',
      table: {
        type: { summary: 'Column<T>[]' },
      },
    },
    selectable: {
      control: 'boolean',
      description: 'Enable row selection with checkboxes',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    selectedItems: {
      control: false,
      description: 'Set of currently selected item IDs',
      table: {
        type: { summary: 'Set<string>' },
      },
    },
    onSort: {
      action: 'sorted',
      description: 'Callback fired when column sorting changes',
      table: {
        type: { summary: '(field: string, direction: "asc" | "desc") => void' },
      },
    },
    onSelectionChange: {
      action: 'selection-changed',
      description: 'Callback fired when row selection changes',
      table: {
        type: { summary: '(selectedIds: Set<string>) => void' },
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-lg shadow-sm border">
          <Story />
        </div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof EnhancedTable>;

/**
 * Default Story
 * Basic table implementation with professional styling
 */
export const Default: Story = {
  args: {
    data: demoFiles,
    columns: fileColumns,
    selectable: false,
    getItemId: (item) => item.id,
    onSort: (field, direction) => {
      storyLogger.action('Sort triggered', { field, direction });
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    storyLogger.info('Default table story loaded', { itemCount: demoFiles.length });
    
    // Verify table renders
    const table = await canvas.findByRole('table');
    expect(table).toBeInTheDocument();
    
    // Verify headers are present
    const nameHeader = await canvas.findByText('File Name');
    expect(nameHeader).toBeInTheDocument();
  },
};

/**
 * Sortable Columns Story
 * Demonstrates column sorting functionality
 */
export const SortableColumns: Story = {
  args: {
    data: demoFiles,
    columns: fileColumns,
    selectable: false,
    getItemId: (item) => item.id,
    onSort: (field, direction) => {
      storyLogger.action('Column sorted', { field, direction });
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    storyLogger.info('Sortable columns story loaded');
    
    // Click on size column to test sorting
    const sizeHeader = await canvas.findByText('Size');
    await userEvent.click(sizeHeader);
    
    storyLogger.info('Size column clicked for sorting test');
  },
};

/**
 * Row Selection Story
 * Demonstrates row selection with checkboxes
 */
export const WithRowSelection: Story = {
  args: {
    data: demoFiles,
    columns: fileColumns,
    selectable: true,
    getItemId: (item) => item.id,
    onSelectionChange: (selectedIds) => {
      storyLogger.action('Selection changed', { 
        selectedCount: selectedIds.size,
        selectedIds: Array.from(selectedIds)
      });
    },
    onSort: (field, direction) => {
      storyLogger.action('Sort with selection', { field, direction });
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    storyLogger.info('Row selection story loaded');
    
    // Find and click first checkbox
    const checkboxes = await canvas.findAllByRole('checkbox');
    if (checkboxes.length > 1) {
      await userEvent.click(checkboxes[1]); // Skip header checkbox
      storyLogger.info('First row selected');
    }
  },
};

/**
 * Search Results Story
 * Demonstrates search result highlighting
 */
export const WithSearchResults: Story = {
  args: {
    data: demoFiles,
    columns: fileColumns,
    selectable: true,
    searchResults: [
      {
        item: demoFiles[0],
        matches: [
          {
            indices: [[0, 9]] as [number, number][],
            key: 'name',
            value: 'Financial_Statement_Q3_2024.pdf',
          },
        ],
      },
      {
        item: demoFiles[2],
        matches: [
          {
            indices: [[0, 3]] as [number, number][],
            key: 'name',
            value: 'KYC_Documentation_Update.docx',
          },
        ],
      },
    ],
    getItemId: (item) => item.id,
    onSelectionChange: (selectedIds) => {
      storyLogger.action('Selection with search', { selectedIds: Array.from(selectedIds) });
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows how search results are highlighted within table content, making it easy to identify matching items.',
      },
    },
  },
};

/**
 * Empty State Story
 * Demonstrates empty state handling
 */
export const EmptyState: Story = {
  args: {
    data: [],
    columns: fileColumns,
    selectable: true,
    emptyState: (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-2">No files found</div>
        <div className="text-gray-500 text-sm">
          Upload your first document to get started with risk assessment
        </div>
      </div>
    ),
    getItemId: (item) => item.id,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    storyLogger.info('Empty state story loaded');
    
    // Verify empty state message
    const emptyMessage = await canvas.findByText('No files found');
    expect(emptyMessage).toBeInTheDocument();
  },
};

/**
 * Loading State Story
 * Demonstrates loading state with skeleton rows
 */
export const LoadingState: Story = {
  args: {
    data: [],
    columns: fileColumns,
    selectable: false,
    emptyState: (
      <div className="animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 py-4 border-b">
            <div className="w-8 h-8 bg-gray-200 rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    ),
    getItemId: (item) => item.id,
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state with skeleton animation while data is being fetched.',
      },
    },
  },
};

/**
 * Large Dataset Story
 * Demonstrates performance with larger datasets
 */
export const LargeDataset: Story = {
  args: {
    data: Array.from({ length: 100 }, (_, i) => ({
      id: `file-${i + 1}`,
      name: `Document_${String(i + 1).padStart(3, '0')}_${['Financial', 'Legal', 'Compliance', 'Risk'][i % 4]}.pdf`,
      size: Math.floor(Math.random() * 5000000) + 100000,
      status: ['completed', 'processing', 'uploaded', 'error'][i % 4] as any,
      uploadedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      type: ['PDF', 'CSV', 'DOCX', 'XLSX'][i % 4],
      riskScore: Math.floor(Math.random() * 40) + 60,
    })),
    columns: fileColumns,
    selectable: true,
    getItemId: (item) => item.id,
    onSort: (field, direction) => {
      storyLogger.action('Large dataset sort', { field, direction });
    },
    onSelectionChange: (selectedIds) => {
      storyLogger.action('Large dataset selection', { count: selectedIds.size });
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance demonstration with 100 items, showing how the table handles larger datasets efficiently.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    storyLogger.info('Large dataset story loaded', { itemCount: 100 });
    
    // Verify table performance
    const table = await canvas.findByRole('table');
    expect(table).toBeInTheDocument();
  },
};