/**
 * Simple Diagnostic Test - No External Dependencies
 */
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

const TestButton: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <button 
    style={{ 
      padding: '12px 24px', 
      backgroundColor: '#8B5CF6', 
      color: 'white', 
      border: 'none', 
      borderRadius: '6px',
      fontFamily: 'system-ui',
      cursor: 'pointer'
    }}
    onClick={() => alert('✅ Component Working!')}
  >
    {children}
  </button>
);

const meta: Meta<typeof TestButton> = {
  title: 'Test/Simple Button',
  component: TestButton,
  parameters: { layout: 'centered' }
};

export default meta;
type Story = StoryObj<typeof TestButton>;

export const Working: Story = {
  args: { children: '🎯 Test Button - Click Me!' }
};