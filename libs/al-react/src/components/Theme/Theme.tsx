'use client';

import React from 'react';
import { createComponent } from '@lit/react';
import { ALTheme as ALWebTheme } from 'al-web-components/components/theme';
import register from 'al-web-components/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebTheme.el, ALWebTheme],
  suffix: PackageJson.version
});

const ALThemeBase = createComponent({
  react: React,
  tagName: elementMap.get(ALWebTheme.el) as string,
  elementClass: ALWebTheme,
  events: {}
});

/**
 * The seven axes (spec 2026-08-20-token-axes-expansion added `shape`;
 * `motion` was already listed here even before any preset wrote it).
 * `components/theme/theme.scss` and the generated
 * `styles/dist-v5/scss/host/*.scss` partials select on them with ATTRIBUTE
 * selectors — `:host([brand='southleft'])`, `:host([mode='dark'])`, and so on.
 */
const AXES = ['brand', 'mode', 'density', 'contrast', 'motion', 'shape'] as const;

export type ALThemeProps = React.ComponentPropsWithoutRef<typeof ALThemeBase>;

/**
 * React wrapper for `<al-theme>`.
 *
 * WHY THIS IS NOT THE BARE `createComponent` CALL EVERY OTHER WRAPPER IS
 * (measured, not assumed — spec 2026-07-28-react-storybook-preset-switcher):
 *
 * `@lit/react`'s `createComponent` routes any prop whose name is `in
 * elementClass.prototype` through `setProperty`, which does `node[name] =
 * value` (`@lit/react/development/create-component.js`). All five axes are
 * `@property accessor`s on `ALTheme.prototype`, and none declares
 * `reflect: true` — deliberately, because reflecting would put `mode="light"`
 * on every bare `<al-theme>` and silently re-light dark pages
 * (2026-07-28-scoped-token-emission-brand-wiring §1). So a React prop set the
 * property and produced no attribute, and the `:host([...])` rules that
 * actually carry the tokens matched nothing.
 *
 * Measured in the running React Storybook against the plop-generated wrapper,
 * on `<ALTheme brand="southleft" mode="dark">`:
 *
 *   element properties   brand='southleft', mode='dark'    correct
 *   element attributes   data-al-preset only               NO axes
 *   --al-theme-color-background-primary-default
 *                        #4375ff (altitude blue)           WRONG
 *                        southleft resolves to #f05735
 *
 * So the axes are mirrored to attributes here, in a layout effect that runs
 * after `createComponent`'s own (child effects flush before parent effects).
 * Writing an attribute calls back into Lit's `attributeChangedCallback`, which
 * re-sets the property to the value it already holds — `hasChanged` is false,
 * so there is no second render and no loop.
 *
 * Only axes the caller actually passed are written; `undefined` REMOVES the
 * attribute. That preserves the preset model's "density/contrast are optional,
 * an absent attribute means this preset takes no position" semantics, and is
 * the reason this cannot simply be `reflect: true` on the element.
 */
export const ALTheme = React.forwardRef<ALWebTheme, ALThemeProps>(function ALTheme(props, forwardedRef) {
  const innerRef = React.useRef<ALWebTheme | null>(null);

  // No dependency array — same shape as `createComponent`'s own effect, so an
  // axis that changes on any re-render (a Storybook toolbar switch, say) is
  // always mirrored.
  React.useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    for (const axis of AXES) {
      const value = (props as Record<string, unknown>)[axis];
      if (value === undefined || value === null || value === '') el.removeAttribute(axis);
      else el.setAttribute(axis, String(value));
    }
  });

  return React.createElement(ALThemeBase, {
    ...props,
    ref: (node: ALWebTheme | null) => {
      innerRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<ALWebTheme | null>).current = node;
    }
  });
});
