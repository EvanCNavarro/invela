/**
 * ========================================
 * Input Component - Storybook Stories
 * ========================================
 * 
 * Comprehensive documentation for the enterprise Input component.
 * Showcases all variants, states, and accessibility features
 * following the design system standards.
 * 
 * @module stories/ui-components/Input
 * @version 1.0.0
 * @since 2025-05-23
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { Search, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Meta Configuration
 * Storybook component metadata and controls
 */
const meta: Meta<typeof Input> = {
  title: 'UI Components/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
# Input Component

Professional input component built with accessibility and user experience in mind.
Supports various types, states, and styling options for form interactions.

## Key Features

- **Multiple Types**: Text, email, password, search, number, and more
- **State Management**: Focus, error, disabled, and readonly states
- **Icon Integration**: Leading and trailing icons with proper spacing
- **Accessibility**: Full ARIA support and keyboard navigation
- **Validation**: Built-in validation styling and error states

## Usage

\`\`\`tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="Enter your email"
    onChange={handleChange}
  />
</div>
\`\`\`
        `
      }
    },
  },
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'search', 'number', 'tel', 'url'],
      description: 'Input type attribute',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'text' },
      },
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
      table: {
        type: { summary: 'string' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the input is disabled',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    readOnly: {
      control: 'boolean',
      description: 'Whether the input is read-only',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    onChange: {
      action: 'changed',
      description: 'Change event handler',
      table: {
        type: { summary: '(event: ChangeEvent<HTMLInputElement>) => void' },
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Input>;

/**
 * Default Story
 * Standard text input
 */
export const Default: Story = {
  args: {
    placeholder: 'Enter text here...',
    onChange: (e) => action('input-changed')(e.target.value),
  },
};

/**
 * Input Types Story
 * Different input types
 */
export const InputTypes: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="text-input">Text Input</Label>
        <Input
          id="text-input"
          type="text"
          placeholder="Enter text"
          onChange={(e) => action('text-changed')(e.target.value)}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email-input">Email Input</Label>
        <Input
          id="email-input"
          type="email"
          placeholder="Enter your email"
          onChange={(e) => action('email-changed')(e.target.value)}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password-input">Password Input</Label>
        <Input
          id="password-input"
          type="password"
          placeholder="Enter password"
          onChange={(e) => action('password-changed')(e.target.value)}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="search-input">Search Input</Label>
        <Input
          id="search-input"
          type="search"
          placeholder="Search..."
          onChange={(e) => action('search-changed')(e.target.value)}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="number-input">Number Input</Label>
        <Input
          id="number-input"
          type="number"
          placeholder="Enter number"
          onChange={(e) => action('number-changed')(e.target.value)}
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different input types with appropriate keyboard behaviors.',
      },
    },
  },
};

/**
 * States Story
 * Different input states
 */
export const States: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="normal-input">Normal State</Label>
        <Input
          id="normal-input"
          placeholder="Normal input"
          onChange={(e) => action('normal-changed')(e.target.value)}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="disabled-input">Disabled State</Label>
        <Input
          id="disabled-input"
          placeholder="Disabled input"
          disabled
          onChange={(e) => action('disabled-changed')(e.target.value)}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="readonly-input">Read-only State</Label>
        <Input
          id="readonly-input"
          value="Read-only value"
          readOnly
          onChange={(e) => action('readonly-changed')(e.target.value)}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="error-input" className="text-red-600">Error State</Label>
        <Input
          id="error-input"
          placeholder="Input with error"
          className="border-red-500 focus:border-red-500 focus:ring-red-500"
          onChange={(e) => action('error-changed')(e.target.value)}
        />
        <p className="text-sm text-red-600">This field is required</p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different input states including error styling.',
      },
    },
  },
};

/**
 * With Icons Story
 * Inputs with leading and trailing icons
 */
export const WithIcons: Story = {
  render: () => {
    const [showPassword, setShowPassword] = React.useState(false);
    
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="search-with-icon">Search with Icon</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="search-with-icon"
              type="search"
              placeholder="Search files..."
              className="pl-10"
              onChange={(e) => action('search-with-icon-changed')(e.target.value)}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email-with-icon">Email with Icon</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="email-with-icon"
              type="email"
              placeholder="your@email.com"
              className="pl-10"
              onChange={(e) => action('email-with-icon-changed')(e.target.value)}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password-with-toggle">Password with Toggle</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="password-with-toggle"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter password"
              className="pl-10 pr-10"
              onChange={(e) => action('password-with-toggle-changed')(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
              onClick={() => {
                setShowPassword(!showPassword);
                action('password-toggle-clicked')(!showPassword);
              }}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Inputs with icons and interactive elements like password toggle.',
      },
    },
  },
};

/**
 * Form Integration Story
 * Real-world form usage examples
 */
export const FormIntegration: Story = {
  render: () => {
    const [formData, setFormData] = React.useState({
      companyName: '',
      email: '',
      website: '',
      employees: '',
    });
    
    const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormData(prev => ({ ...prev, [field]: value }));
      action(`${field}-changed`)(value);
    };
    
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Company Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name *</Label>
              <Input
                id="company-name"
                type="text"
                placeholder="Acme Corporation"
                value={formData.companyName}
                onChange={handleChange('companyName')}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="business-email">Business Email *</Label>
              <Input
                id="business-email"
                type="email"
                placeholder="contact@company.com"
                value={formData.email}
                onChange={handleChange('email')}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://company.com"
                value={formData.website}
                onChange={handleChange('website')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="employee-count">Number of Employees</Label>
              <Input
                id="employee-count"
                type="number"
                placeholder="50"
                value={formData.employees}
                onChange={handleChange('employees')}
                min="1"
              />
            </div>
          </div>
        </div>
        
        <div className="text-sm text-gray-500">
          * Required fields
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Real-world form integration example with validation and layout.',
      },
    },
  },
};