# Toast System Implementation Plan

## Overview
Create a unified toast notification system for the Invela platform with standardized styling, consistent behavior, and specialized templates for different notification types.

## Components to Create/Modify

### 1. Enhanced Toast Component (`toast.tsx`)
- Add new variants: success, info, warning, error, file-upload, clipboard
- Implement consistent styling with color-coded icon containers
- Integrate Framer Motion for animations

### 2. New Toast Icon Component
- Square icon container with rounded corners
- Light gray border
- Background color matching the icon but lighter
- Appropriate icon for each toast type

### 3. Unified Toast Hook (`use-unified-toast.ts`)
- Standard methods for all toast types
- Specialized methods for file operations
- Consistent 4000ms display duration

### 4. Toast Demo Button (Temporary)
- Add button to login page next to "Back to Website"
- Cycle through all toast variants when clicked
- Include a simulated file upload progress toast

## Implementation Steps

### Phase 1: Core Component Updates
- [ ] Update `toast.tsx` with new variants and styling
- [ ] Create ToastIcon component
- [ ] Modify Toaster component to include icons
- [ ] Add Framer Motion animation

### Phase 2: Toast Hook Creation
- [ ] Create unified toast hook with standard methods
- [ ] Implement specialized templates for common operations
- [ ] Update general toast duration to 4000ms

### Phase 3: Demo Implementation
- [ ] Add temporary toast demo button to login page
- [ ] Implement toast cycling functionality
- [ ] Create simulated file upload with progress

### Phase 4: Migration
- [ ] Update existing toast usages with new system
- [ ] Document new toast system for other developers
- [ ] Remove temporary toast demo button after approval

## Toast Types and Styling

### Success Toast
- Green icon and accents
- Check mark icon
- Used for successful operations

### Info Toast
- Invela Blue icon and accents
- Information icon
- Used for general information

### Warning Toast
- Yellow-Orange icon and accents
- Warning triangle icon
- Used for potential issues

### Error Toast
- Red icon and accents
- X icon or error symbol
- Used for errors and failures

### File Upload Toast
- Purple icon and accents
- Upload icon
- Progress bar for tracking uploads
- Converts to success toast when complete

### Clipboard Toast
- Grayscale icon and accents
- Clipboard icon
- Used for copy/paste operations

## Testing Plan
- Test each toast type individually
- Verify animations and timing
- Confirm proper stacking behavior
- Test on multiple screen sizes