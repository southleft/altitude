# Story UI AI Considerations

This file contains specific instructions and considerations for the AI when generating stories for your component library. You can customize this file to match your design system's requirements.

## Component Library Details

**Library Name**: al-react
**Import Path**: Use relative imports from local component files (NOT from 'al-react' package)

## Core Principles

<!-- Add the fundamental principles of your design system -->
-
-
-

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

### CRITICAL: Component Imports
**⚠️ IMPORTANT**: When generating stories in this library, components MUST be imported using relative paths from the local component files, NOT from the package name 'al-react'.

### Correct Import Pattern
```javascript
// ✅ CORRECT - Use relative imports from component directories
import { ALButton } from '../../components/Button';
import { ALCard } from '../../components/Card';
import { ALInput } from '../../components/Input';
```

### Incorrect Import Pattern
```javascript
// ❌ WRONG - Do NOT import from 'al-react' package
import { ALButton } from 'al-react'; // This will cause Module not found errors
```

### Import Path Structure
- Stories are located in: `src/stories/generated/`
- Components are located in: `src/components/[ComponentName]/`
- Therefore, use `../../components/[ComponentName]` for imports

### Example for Different Components
```javascript
// For Button component
import { ALButton } from '../../components/Button';

// For multiple components
import { ALCard } from '../../components/Card';
import { ALBadge } from '../../components/Badge';
import { ALAlert } from '../../components/Alert';
```

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

### Example 1: [Component Name]
```jsx
// Show a complete, correct example
```

### Example 2: [Component Name]
```jsx
// Show another complete, correct example
```

## Error Patterns to Avoid

<!-- List common mistakes and how to avoid them -->
1. **Wrong**: `import { ALButton } from 'al-react';`
   **Right**: `import { ALButton } from '../../components/Button';`
   **Why**: The 'al-react' package doesn't exist as an external dependency. Components must be imported from their local file paths.

2. **Wrong**: `import ALButton from '../../components/Button';` (default import)
   **Right**: `import { ALButton } from '../../components/Button';` (named import)
   **Why**: Components are exported as named exports, not default exports.

3. **Wrong**: `import { Button } from '../../components/Button';`
   **Right**: `import { ALButton } from '../../components/Button';`
   **Why**: All components are prefixed with 'AL' (Altitude) namespace.
