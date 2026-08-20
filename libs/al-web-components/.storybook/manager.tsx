// Manager-side entry: the Altitude sidebar chrome.
//
// The AI Theme manager panel (prompt-driven token console) that used to live
// here was removed by spec 2026-08-20-brand-pruning-and-storybook-de-bloat —
// Storybook is documentation now, not a synthetic-brand showcase. The engine
// it was built on (`.storybook/ai-theme/{engine,oklch,ramps,personalities,
// constants,types,apply}.ts`) and its dev-server counterpart
// (`.storybook/ai-theme/vite-plugin-theme-api.ts`, mounting
// `functions/api/theme.js`) are NOT removed — they back the `/api/theme`
// endpoint, a still-shipping product feature the upcoming Southleft example
// app consumes. Only the manager-panel UI that drove them from inside
// Storybook is gone.

import React from 'react';
import { addons } from 'storybook/manager-api';

import managerTheme from './theme';

/* ------------------------------------------------------------ sidebar chrome */

/**
 * Atomic-level tags. These live in `tags` rather than `parameters` on purpose:
 * the manager's story index is built from `index.json`, which carries `tags` but
 * NOT `parameters` — parameters are backfilled one story at a time only after a
 * story has actually rendered (`prepared: !!item.parameters`). Reading a level
 * from parameters here would work for whichever story you happened to visit and
 * silently fail for every other row.
 *
 * Storybook propagates the *intersection* of child tags up to the component
 * node, so tagging every story of a component makes the level readable on the
 * component row too — which is where we want to show it.
 */
const LEVEL_TAGS: Record<string, string> = {
  atom: 'Atom',
  molecule: 'Molecule',
  organism: 'Organism',
  template: 'Template',
  page: 'Page',
};

const levelOf = (item: any): string | null => {
  const tags = item?.tags;
  if (!Array.isArray(tags)) return null;
  for (const tag of tags) {
    if (LEVEL_TAGS[tag]) return LEVEL_TAGS[tag];
  }
  return null;
};

/**
 * Renders the sidebar row label.
 *
 * Returning a falsy value makes Storybook fall back to `item.name`, so section
 * headers and stories are left alone and styled purely in `manager-head.html`.
 * Only component rows get extra chrome (level badge + story count), because
 * that is the only information CSS cannot reach on its own.
 */
const renderLabel = (item: any) => {
  if (item?.type !== 'component') return null;

  // A component's children include its autodocs entry (`…--docs`) alongside the
  // real stories. Counting those made the sidebar disagree with the "N stories"
  // line on the docs page itself (11 vs 10 for Chip).
  const count = Array.isArray(item.children)
    ? item.children.filter((id: string) => !String(id).endsWith('--docs')).length
    : 0;
  const level = levelOf(item);

  return (
    <span className="al-label">
      <span>{item.name}</span>
      {level && <span className="al-level">{level}</span>}
      {count > 0 && <span className="al-count">{String(count)}</span>}
    </span>
  );
};

addons.setConfig({
  theme: managerTheme,

  // Bottom dock. This is already the 10.4.5 default, but it is load-bearing for
  // the layout so it is stated rather than inherited.
  panelPosition: 'bottom',
  navSize: 272,
  bottomPanelHeight: 206,

  sidebar: {
    // Render the first title segment (Actions, Forms & inputs, …) as a section
    // header instead of a collapsible folder. This is what turns the tree into
    // the reference layout.
    showRoots: true,
    renderLabel,
  },
});
