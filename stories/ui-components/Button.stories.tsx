/**
 * ========================================
 * Button Component - Storybook Stories
 * ========================================
 * 
 * Comprehensive documentation for the enterprise Button component.
 * Demonstrates all variants, sizes, states, and interactive behaviors
 * following the design system standards.
 * 
 * @module stories/ui-components/Button
 * @version 1.0.0
 * @since 2025-05-23
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { Play, Download, Trash2, Settings } from 'lucide-react';
import { Button } from '../../client/src/components/ui/button';

/**
 * Meta Configuration
 * Storybook component metadata and controls
 */
const meta: Meta<typeof Button> = {
  title: 'UI Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
# Button Component

Professional button component built with Radix UI primitives and Tailwind CSS.
Supports multiple variants, sizes, and states for consistent user interactions.

## Key Features

- **Multiple Variants**: Default, destructive, outline, secondary, ghost, link
- **Flexible Sizing**: Small, medium, large, and icon-only variants
- **Loading States**: Built-in loading spinner and disabled state
- **Icon Support**: Leading and trailing icons with proper spacing
- **Accessibility**: Full keyboard navigation and screen reader support

## Usage

\`\`\`tsx
import { Button } from '@/components/ui/button';

<Button variant="default" size="md" onClick={handleClick}>
  Click me
</Button>
\`\`\`
        `
      }
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
      description: 'Visual style variant of the button',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'default' },
      },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'icon'],
      description: 'Size of the button',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'md' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    asChild: {
      control: 'boolean',
      description: 'Render as child element instead of button',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    onClick: {
      action: 'clicked',
      description: 'Click event handler',
      table: {
        type: { summary: '() => void' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

/**
 * Default Story
 * Standard button with primary styling
 */
export const Default: Story = {
  args: {
    children: 'Default Button',
    onClick: () => action('default-button-clicked')(),
  },
};

/**
 * Variants Story
 * Showcases all button variants
 */
export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="default" onClick={() => action('default-clicked')()}>
        Default
      </Button>
      <Button variant="destructive" onClick={() => action('destructive-clicked')()}>
        Destructive
      </Button>
      <Button variant="outline" onClick={() => action('outline-clicked')()}>
        Outline
      </Button>
      <Button variant="secondary" onClick={() => action('secondary-clicked')()}>
        Secondary
      </Button>
      <Button variant="ghost" onClick={() => action('ghost-clicked')()}>
        Ghost
      </Button>
      <Button variant="link" onClick={() => action('link-clicked')()}>
        Link
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All available button variants with their distinctive styling.',
      },
    },
  },
};

/**
 * Sizes Story
 * Demonstrates different button sizes
 */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm" onClick={() => action('small-clicked')()}>
        Small
      </Button>
      <Button size="md" onClick={() => action('medium-clicked')()}>
        Medium
      </Button>
      <Button size="lg" onClick={() => action('large-clicked')()}>
        Large
      </Button>
      <Button size="icon" onClick={() => action('icon-clicked')()}>
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different button sizes including icon-only variant.',
      },
    },
  },
};

/**
 * With Icons Story
 * Buttons with leading and trailing icons
 */
export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button onClick={() => action('play-clicked')()}>
        <Play className="mr-2 h-4 w-4" />
        Play Video
      </Button>
      <Button variant="outline" onClick={() => action('download-clicked')()}>
        <Download className="mr-2 h-4 w-4" />
        Download Report
      </Button>
      <Button variant="destructive" onClick={() => action('delete-clicked')()}>
        <Trash2 className="mr-2 h-4 w-4" />
        Delete Item
      </Button>
      <Button variant="secondary" onClick={() => action('settings-clicked')()}>
        Settings
        <Settings className="ml-2 h-4 w-4" />
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Buttons with icons demonstrating proper spacing and alignment.',
      },
    },
  },
};

/**
 * States Story
 * Different button states including disabled
 */
export const States: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button onClick={() => action('normal-clicked')()}>
        Normal State
      </Button>
      <Button disabled onClick={() => action('disabled-clicked')()}>
        Disabled State
      </Button>
      <Button variant="outline" disabled onClick={() => action('outline-disabled-clicked')()}>
        Outline Disabled
      </Button>
      <Button variant="destructive" disabled onClick={() => action('destructive-disabled-clicked')()}>
        Destructive Disabled
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Button states including disabled variants across different styles.',
      },
    },
  },
};

/**
 * Loading State Story
 * Simulated loading state with spinner
 */
export const LoadingState: Story = {
  render: () => {
    const [loading, setLoading] = React.useState(false);
    
    const handleClick = () => {
      setLoading(true);
      action('loading-started')();
      setTimeout(() => {
        setLoading(false);
        action('loading-completed')();
      }, 2000);
    };
    
    return (
      <div className="flex gap-4">
        <Button onClick={handleClick} disabled={loading}>
          {loading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Processing...
            </>
          ) : (
            'Submit Form'
          )}
        </Button>
        <Button variant="outline" disabled={loading}>
          {loading ? 'Please wait...' : 'Secondary Action'}
        </Button>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive loading state with spinner animation.',
      },
    },
  },
};

/**
 * Real World Examples Story
 * Common button patterns in enterprise applications
 */
export const RealWorldExamples: Story = {
  render: () => (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3 text-gray-600">Header Actions</h3>
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Risk Assessment Dashboard</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => action('export-clicked')()}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button size="sm" onClick={() => action('create-clicked')()}>
              Create Report
            </Button>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3 text-gray-600">Form Actions</h3>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => action('cancel-clicked')()}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => action('save-draft-clicked')()}>
            Save Draft
          </Button>
          <Button onClick={() => action('submit-clicked')()}>
            Submit for Review
          </Button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="border border-red-200 rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3 text-red-600">Danger Zone</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-900">Delete this assessment</p>
            <p className="text-xs text-gray-500">This action cannot be undone.</p>
          </div>
          <Button variant="destructive" onClick={() => action('delete-assessment-clicked')()}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Assessment
          </Button>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Real-world button usage patterns in enterprise applications.',
      },
    },
  },
};