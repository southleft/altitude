# Task B — Scaffold a new component (attempt {{ATTEMPT}})

Scaffold a brand-new component for the Altitude design system:

**Component:** `<al-stat-card>`
**What it shows:**
- A large numeric value (e.g. "1,234")
- A label beneath (e.g. "Monthly active users")
- An optional trend indicator with direction (up/down/none) and a delta string (e.g. "+12%")
- An optional leading icon (slot)

Return strict JSON matching the scaffold schema. Each entry in `files` should be a production-quality skeleton (not pseudocode) for the file at `path`:
- Component class file (.ts)
- Sass file (.scss)
- Storybook stories file (.stories.ts)
- Registry update or registration call if relevant

Your scaffolding MUST follow Altitude conventions:
- Extends `ALElement`
- Uses Lit `@property accessor` reactive properties
- Class-level JSDoc with `@slot` / `@event` / `@csspart` / `@cssproperty` tags
- Imports SCSS as `import styles from './stat-card.scss'`
- SCSS uses `@use '../../styles/component' as *;` and wraps rules in `@layer al.component`
- Stories file uses CSF3 with `tags: ['autodocs']`

In `patternChoices` explicitly list each convention you chose to follow (e.g. "extends ALElement", "uses cascade layer al.component", etc.) so the judge can verify. In `unknowns` list anything the docs left ambiguous.

Every CSS custom property you reference MUST exist in `{{TMPDIR}}/ai-readiness-tokens-digest.json`. Do not invent token names.
