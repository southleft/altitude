// JSX typings for the shared Foundations documentation elements.
//
// These are Lit custom elements defined in @southleft/al-web-components source
// (`.storybook/components/**`) and rendered directly as JSX by the
// `*.stories.tsx` files in this directory. React 19 passes an unknown
// hyphenated tag straight to `document.createElement` and writes string props
// as attributes, so no wrapper is needed at RUNTIME — but TypeScript still
// needs to be told the tags exist, or every one is an "unknown element" error.
//
// Documentation elements only. Real components keep their generated
// `@lit/react` wrappers in `src/components/**`; nothing here is public API.

import type { DetailedHTMLProps, HTMLAttributes } from 'react';

type DocElement = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      // Foundations/Utilities
      'utilities-grid': DocElement;
      'utilities-spacing': DocElement;
      'utilities-typography': DocElement;

      // Foundations/Icons
      'icon-catalog': DocElement;

      // Foundations/Tokens — Tier 1
      'tier-1-animation': DocElement;
      'tier-1-border': DocElement;
      'tier-1-breakpoints': DocElement;
      'tier-1-colors': DocElement;
      'tier-1-icons': DocElement;
      'tier-1-layout': DocElement;
      'tier-1-opacity': DocElement;
      'tier-1-shadows': DocElement;
      'tier-1-space': DocElement;
      'tier-1-typography': DocElement;
      'tier-1-zindex': DocElement;

      // Foundations/Tokens — Tier 2
      'tier-2-animation': DocElement;
      'tier-2-border': DocElement;
      'tier-2-colors': DocElement;
      'tier-2-icons': DocElement;
      'tier-2-layout': DocElement;
      'tier-2-opacity': DocElement;
      'tier-2-shadows': DocElement;
      'tier-2-space': DocElement;
      'tier-2-typography': DocElement;
    }
  }
}
