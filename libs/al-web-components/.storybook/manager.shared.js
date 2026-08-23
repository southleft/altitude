// The manager UI both Storybooks run: parity badges on the sidebar labels plus
// the one-click light/dark toggle.
//
// EXTRACTED, NOT REWRITTEN. This file is `.storybook/manager.js` verbatim with
// two things turned into arguments — the manager `theme` and the pair of preset
// ids the toggle flips between — so the Southleft Storybook
// (`.storybook-sl/manager.js`, port 6007) can run the identical UI over its own
// branding and its own presets instead of a 200-line copy that would drift.
// Both `manager.js` files are now a handful of lines: import, call, done.
//
// The parity report URL is an argument too: both Storybooks serve the same
// `../dist` staticDir, so the two reports are told apart by FILENAME —
// `parity.json` (Altitude) and `parity.southleft.json` — rather than by which
// directory wins at a shared path. See the MULTI-PROJECT note in
// `./parity-emitter.mjs` for why a shared basename cannot work.

import React from 'react';
import { addons, types, useGlobals } from 'storybook/manager-api';
import { IconButton } from 'storybook/internal/components';
import { MoonIcon, SunIcon } from '@storybook/icons';

/**
 * Figma <-> code parity badges on the sidebar.
 *
 * `.storybook/parity-emitter.mjs` (run from main.ts) writes the report, which
 * dev serves — and static builds bake — at `/parity.json`. Each entry is
 * keyed by the component's sidebar kind id (`atoms-button`), computed with the
 * same title→id algorithm the MCP uses (libs/altitude-mcp/src/lib/stories.mjs),
 * so the lookup below is a straight `item.id` match.
 *
 * The store is module-level with a listener set because `renderLabel` renders
 * before the fetch resolves: each badge subscribes and re-renders when data
 * lands. Polling keeps badges live in dev (the emitter rewrites the file when
 * component source or the parity manifest changes); in a static build the file
 * never changes and the poll is harmless.
 *
 * HONESTY: `status` distinguishes three situations that used to render
 * IDENTICALLY (no badge at all) — a clean report, an engine that threw
 * (`parity-emitter.mjs` writes an `{ error: {...} }`-shaped report on failure),
 * and a report the manager simply could not fetch. `null` = not loaded yet,
 * `'ok'` = a real report, `'engine-error'` = the emitter caught and reported a
 * failure, `'unreachable'` = several fetches in a row failed outright.
 */
const parityStore = {
  byKind: null,
  observation: null,
  status: null,
  errorMessage: null,
  consecutiveFailures: 0,
  listeners: new Set(),
};

/** Two in a row (~20s at the 10s poll interval) before flipping to 'unreachable' — one blip should not paint every badge grey. */
const FAILURE_THRESHOLD = 2;

function notifyUnreachable() {
  parityStore.consecutiveFailures += 1;
  if (parityStore.consecutiveFailures < FAILURE_THRESHOLD) return;
  if (parityStore.status === 'unreachable') return; // already flagged — don't re-render every poll
  parityStore.status = 'unreachable';
  parityStore.listeners.forEach((l) => l());
}

async function loadParity(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      notifyUnreachable();
      return;
    }
    const report = await res.json();
    parityStore.consecutiveFailures = 0;

    // The emitter's error-shaped report (see parity-emitter.mjs) — tolerant of
    // `error` being either the `{ message, at }` object it writes today or a
    // bare string, in case an older report is still on disk.
    if (report && report.error) {
      parityStore.status = 'engine-error';
      parityStore.errorMessage = typeof report.error === 'string' ? report.error : (report.error?.message ?? 'unknown error');
      parityStore.byKind = {};
      parityStore.observation = null;
      parityStore.listeners.forEach((l) => l());
      return;
    }

    const byKind = {};
    for (const c of report.components ?? []) {
      if (c.kindId) byKind[c.kindId] = c;
    }
    parityStore.status = 'ok';
    parityStore.byKind = byKind;
    // Tolerant of extra/unknown fields — another agent is actively extending
    // the engine's report shape (brand-layer `origin`) concurrently with this.
    parityStore.observation = report.observation ?? null;
    parityStore.listeners.forEach((l) => l());
  } catch {
    notifyUnreachable();
  }
}
/** Armed once, by the first `setupManager` call — a manager runs one Storybook. */
function startParityPolling(url) {
  loadParity(url);
  setInterval(() => loadParity(url), 10000);
}

/** Monochrome code glyph (chevrons), tintable. */
const CodeGlyph = ({ color, title }) =>
  React.createElement(
    'svg',
    { viewBox: '0 0 24 24', width: 12, height: 12, fill: color, 'aria-hidden': false, role: 'img' },
    React.createElement('title', null, title),
    React.createElement('path', {
      d: 'M9.4 16.6 4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0 4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z',
    }),
  );

/** Monochrome Figma logo mark, tintable. */
const FigmaGlyph = ({ color, title }) =>
  React.createElement(
    'svg',
    { viewBox: '0 0 38 57', width: 9, height: 13, fill: color, 'aria-hidden': false, role: 'img' },
    React.createElement('title', null, title),
    React.createElement('path', { d: 'M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z' }),
    React.createElement('path', { d: 'M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z' }),
    React.createElement('path', { d: 'M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z' }),
    React.createElement('path', { d: 'M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z' }),
    React.createElement('path', { d: 'M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z' }),
  );

/** Green check-in-circle for full parity. */
const CheckGlyph = ({ title }) =>
  React.createElement(
    'svg',
    { viewBox: '0 0 24 24', width: 12, height: 12, 'aria-hidden': false, role: 'img' },
    React.createElement('title', null, title),
    React.createElement('circle', { cx: 12, cy: 12, r: 10, fill: '#16a34a' }),
    React.createElement('path', {
      d: 'M10.2 15.9 6.6 12.3l1.4-1.4 2.2 2.2 5-5 1.4 1.4z',
      fill: '#fff',
    }),
  );

const AMBER = '#f59e0b';
const RED = '#ef4444';
const GREY = '#9ca3af';

/** Grey struck circle — "parity data is not trustworthy right now", distinct from every real status color. */
const ErrorGlyph = ({ title }) =>
  React.createElement(
    'svg',
    { viewBox: '0 0 24 24', width: 12, height: 12, 'aria-hidden': false, role: 'img' },
    React.createElement('title', null, title),
    React.createElement('circle', { cx: 12, cy: 12, r: 10, fill: GREY }),
    React.createElement('path', { d: 'M7 12h10', stroke: '#fff', strokeWidth: 2, strokeLinecap: 'round' }),
  );

/**
 * Status -> glyph(s). The colored glyph points at WHERE the unmatched/newer
 * truth lives: yellow = that side drifted ahead since the last confirmed sync,
 * red = the component is missing entirely on the OTHER side.
 *
 * `observation` is the engine's honesty block (see parity-emitter.mjs / the
 * `computeParity` report). When Figma has never been read at all
 * (`everObserved === false`), every glyph's tooltip gets a one-line caveat —
 * a code-drift badge in that state is a guess about the code side only, not a
 * confirmed drift against Figma.
 */
function glyphsFor(entry, observation) {
  const f = entry.figma?.name ? ` — Figma set "${entry.figma.name}"` : '';
  const suffix = observation && observation.everObserved === false
    ? ' — Figma never observed; code-drift may be false-positive; run parity:refresh'
    : '';
  const t = (title) => `${title}${suffix}`;
  switch (entry.status) {
    case 'in-sync':
      return [React.createElement(CheckGlyph, { key: 'ok', title: t(`In sync with Figma${f}`) })];
    case 'code-drift':
      return [React.createElement(CodeGlyph, { key: 'c', color: AMBER, title: t(`Code changed since last Figma sync${f}`) })];
    case 'figma-drift':
      return [React.createElement(FigmaGlyph, { key: 'f', color: AMBER, title: t(`Figma changed since last sync — code is behind${f}`) })];
    case 'conflict':
      return [
        React.createElement(CodeGlyph, { key: 'c', color: AMBER, title: t('Both code and Figma changed since last sync') }),
        React.createElement(FigmaGlyph, { key: 'f', color: AMBER, title: t('Both code and Figma changed since last sync') }),
      ];
    case 'missing-in-figma':
      return [React.createElement(CodeGlyph, { key: 'c', color: RED, title: t('Exists in code only — no Figma component set') })];
    case 'missing-in-code':
      return [React.createElement(FigmaGlyph, { key: 'f', color: RED, title: t('Exists in Figma only — no code component') })];
    default:
      return []; // 'excluded' and anything unknown: no badge
  }
}

/** One sidebar label: the item name plus its parity badge, live-updating. */
const ParityLabel = ({ item }) => {
  const [, force] = React.useReducer((n) => n + 1, 0);
  React.useEffect(() => {
    parityStore.listeners.add(force);
    return () => parityStore.listeners.delete(force);
  }, []);

  // Engine failure or a report the manager cannot reach: say so, rather than
  // rendering nothing — indistinguishable-from-in-sync is the bug this fixes.
  if (parityStore.status === 'engine-error' || parityStore.status === 'unreachable') {
    const title =
      parityStore.status === 'engine-error'
        ? `parity engine error — see terminal${parityStore.errorMessage ? ` (${parityStore.errorMessage})` : ''}`
        : 'parity report unavailable';
    return React.createElement(
      'span',
      { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
      item.name,
      React.createElement(ErrorGlyph, { key: 'err', title }),
    );
  }

  const kindId = String(item.id ?? '').replace(/--docs$/, '');
  const entry = parityStore.byKind?.[kindId];
  if (!entry) return item.name;

  return React.createElement(
    'span',
    { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
    item.name,
    ...glyphsFor(entry, parityStore.observation),
  );
};

/**
 * Configure one Storybook manager.
 *
 * @param {object} options
 * @param {object} options.theme          A `storybook/theming/create` result.
 * @param {string} options.lightPresetId  `globals.alPreset` the toggle writes in light.
 * @param {string} options.darkPresetId   ...and in dark.
 * @param {string} [options.parityUrl]    Report to fetch, relative to the
 *                                        Storybook root. One per project.
 * @param {string} [options.addonId]      Unique per Storybook; cosmetic, but keeps
 *                                        the two apart in the addon registry.
 */
export function setupManager({ theme, lightPresetId, darkPresetId, addonId = 'altitude/mode-toggle', parityUrl = './parity.json' }) {
  const TOOL_ID = `${addonId}/tool`;

  startParityPolling(parityUrl);

  addons.setConfig({
    theme: theme,
    sidebar: {
      renderLabel: (item) =>
        item.type === 'component' || item.type === 'docs' || item.type === 'story'
          ? React.createElement(ParityLabel, { item })
          : item.name,
    },
  });

  /**
   * Light / dark toggle, replacing the seven-entry "Preset" dropdown.
   *
   * The dropdown existed to switch brand x mode x density x contrast x shape x
   * motion recipes; Storybook is documentation, and documentation needs one
   * question answered — how does this look in light, and in dark. The other axes
   * are still live on `<al-theme>` and are documented in `.altitude/AXES.md`.
   *
   * This is a MANAGER tool rather than a `globalTypes.toolbar` entry because core
   * renders `globalTypes` toolbars as dropdowns only; a real one-click toggle has
   * to be registered here. It writes the same `globals.alPreset` value the
   * dropdown wrote, so `.storybook/with-preset.ts` is unchanged and @southleft/al-react —
   * which still uses the core dropdown over the same `presets.ts` — keeps working.
   *
   * Written with `React.createElement` rather than JSX so this file can stay
   * plain `.js`; Storybook's manager builder would handle `.tsx`, but plain JS
   * is one less thing tied to the builder's transform config.
   */
  const ModeToggle = () => {
    const [globals, updateGlobals] = useGlobals();
    const isDark = globals.alPreset !== lightPresetId;

    return React.createElement(
      IconButton,
      {
        key: TOOL_ID,
        active: false,
        title: isDark ? 'Switch to light mode' : 'Switch to dark mode',
        onClick: () => updateGlobals({ alPreset: isDark ? lightPresetId : darkPresetId }),
      },
      React.createElement(isDark ? MoonIcon : SunIcon),
    );
  };

  addons.register(addonId, () => {
    addons.add(TOOL_ID, {
      type: types.TOOL,
      title: 'Mode',
      // Hide on docs-only pages that render no story (Resources/*), where there
      // is nothing for the toggle to affect. `viewMode` is 'docs' for every
      // component page too, so match on the story id instead: the unattached
      // Resources MDX pages all live under `resources-`.
      match: ({ storyId }) => !String(storyId ?? '').startsWith('resources-'),
      render: ModeToggle,
    });
  });
}
