# Story UI AI Considerations

This file contains specific instructions and considerations for the AI when generating stories for your component library. You can customize this file to match your design system's requirements.

## Component Library Details

**Library Name**: al-react (Altitude Design System)
**Import Path**: `al-react`
**Framework**: React wrapper components for Lit web components
**Component Discovery**: Components are dynamically discovered by Story UI from the components directory

## Core Principles

- Use the Altitude Design System components (prefix: AL)
- Follow the design tokens and tier system (tier-1, tier-2, tier-3)
- Maintain consistency with existing Storybook stories
- Use semantic props like `variant`, `size`, `styleModifier`

## Component Usage Rules

### Layout Components
<!-- Describe how layouts should be structured -->
-
-
-

### Spacing and Sizing
<!-- Explain your spacing/sizing system -->
-
-
-

### Color System
<!-- Describe how colors should be used -->
-
-
-

## Import Guidelines

### Import Pattern for Generated Stories
Stories should import components from the library package name:
```javascript
import { ALButton, ALCard, ALHeading, ALBadge } from 'al-react';
```

**Note**: The Story UI MCP will dynamically discover available components from the components directory. Components are automatically available for import without needing to list them explicitly.


## Common Patterns

### Card Layouts
```jsx
// Example of proper card structure
```

### Form Layouts
```jsx
// Example of proper form structure
```

### Grid Layouts
```jsx
// Example of proper grid structure
```

## Do's and Don'ts

### ✅ DO
-
-
-

### ❌ DON'T
-
-
-

## Special Considerations

<!-- Add any library-specific quirks or important notes -->
-
-
-

## Examples of Correct Usage

### Example 1: Complete Story File Structure
```jsx
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ALButton } from '../../components/ALButton';
import { ALCard } from '../../components/ALCard';

const meta = {
  title: 'Generated/Example Story',
  parameters: {
    layout: 'padded',
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ALCard>
      <ALButton variant="primary">Click Me</ALButton>
    </ALCard>
  )
};
```

## Error Patterns to Avoid

1. **Wrong**: Using relative imports for components
   **Right**: `import { ALButton } from 'al-react';`
   **Why**: Story UI is configured to handle imports from the library package name

2. **Wrong**: Using inline styles for everything
   **Right**: Use component props like `variant`, `size`, `styleModifier` when available
   **Why**: The design system has built-in styles that should be leveraged

3. **Wrong**: Using random placeholder images
   **Right**: Use appropriate placeholder services or local assets
   **Why**: Ensures consistent and professional appearance
