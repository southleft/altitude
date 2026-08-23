/**
 * THE component registry — the single generated source of truth for this site.
 *
 * Spec 2026-08-22-altitude-docs-site, central rule: "everything
 * component-shaped MUST be generated from libs/al-web-components/
 * custom-elements.json at build time. Sidebar taxonomy, ATOMS/MOLECULES/
 * ORGANISMS counts, the 'SEARCH n COMPONENTS' label, the props tables — none
 * of it may be hand-maintained."
 *
 * So: there is not one component name, and not one count, typed anywhere in
 * this file or in any template that consumes it. Every list below is derived
 * from machine sources in the library:
 *
 *   1. `libs/al-web-components/custom-elements.json` — the CEM. Tag names,
 *      descriptions, attributes, slots, events, CSS parts, CSS custom
 *      properties, public methods, deprecation.
 *   2. `libs/al-web-components/components/<c>/<c>.stories.ts` — the atomic
 *      tier (the `title:` field's first path segment: Atoms / Molecules /
 *      Organisms) and the lifecycle status (`status: { type: 'beta' }`).
 *      The CEM carries no taxonomy field, and Storybook's title is the only
 *      machine-readable tier the library actually maintains next to each
 *      component, so that is what is read. It is authored beside the
 *      component, not here, which is what the rule is protecting.
 *   3. `libs/al-react/src/index.ts` — which components have a React wrapper,
 *      for the HTML/React framework switcher.
 *
 * WHAT COUNTS AS A COMPONENT — a structural rule, not a name list. The CEM
 * declares 105 custom elements, but 37 of those are the concrete icon glyphs
 * emitted from `components/icon/icons/*.ts` (al-icon-add, al-icon-bell, …),
 * which are payloads of the one `al-icon` component rather than components in
 * their own right. The rule "the element declared by
 * `components/<dir>/<dir>.ts`" separates them exactly, and independently
 * reproduces the 68-component set that `.altitude/migration.json` tracks.
 */
import fs from 'node:fs';
import path from 'node:path';
import { repoRoot } from './repo-root.mjs';

const REPO_ROOT = repoRoot();
const WC_ROOT = path.join(REPO_ROOT, 'libs', 'al-web-components');
const CEM_PATH = path.join(WC_ROOT, 'custom-elements.json');
const COMPONENTS_DIR = path.join(WC_ROOT, 'components');
const REACT_INDEX = path.join(REPO_ROOT, 'libs', 'al-react', 'src', 'index.ts');

/** `components/button/button.ts` → the one module that declares a component. */
const CANONICAL_MODULE = /^components\/([a-z0-9-]+)\/\1\.ts$/;

const cem = JSON.parse(fs.readFileSync(CEM_PATH, 'utf8'));

/* ------------------------------------------------------------------ tiers */

/**
 * Storybook titles nest ('Atoms/Form/Input', 'Molecules/Navigation/Tabs'), so
 * the tier is the first segment and the display name is the last. Order here
 * is render order in the sidebar; it is a taxonomy, not a component list.
 */
const TIER_ORDER = ['atoms', 'molecules', 'organisms'];
const TIER_LABEL = { atoms: 'ATOMS', molecules: 'MOLECULES', organisms: 'ORGANISMS' };
/**
 * A component whose story title is outside the atomic taxonomy (today:
 * `Foundations/Layout`, and `al-theme`, which ships no story at all) is a
 * structural host — it composes other components and is never composed into
 * one — so it sorts with the organisms. Recorded on the record as
 * `tierInferred` and reported by `registryReport()` so the fallback stays
 * visible instead of silently absorbing a future mis-titled component.
 */
const FALLBACK_TIER = 'organisms';

/* --------------------------------------------------------- library probes */

/** Storybook metadata for one component, read from its stories file. */
function readStoryMeta(slug) {
  const file = path.join(COMPONENTS_DIR, slug, `${slug}.stories.ts`);
  let source;
  try {
    source = fs.readFileSync(file, 'utf8');
  } catch {
    return { title: null, tier: null, name: null, status: null };
  }
  const title = source.match(/^\s*title:\s*'([^']+)'/m)?.[1] ?? null;
  const status = source.match(/status:\s*\{\s*type:\s*'([a-z]+)'/)?.[1] ?? null;
  if (!title) return { title: null, tier: null, name: null, status };
  const segments = title.split('/');
  const tier = segments[0].toLowerCase();
  return {
    title,
    tier: TIER_ORDER.includes(tier) ? tier : null,
    name: segments[segments.length - 1],
    status,
  };
}

/** Which components ship an al-react wrapper (parsed from its barrel file). */
const reactWrappers = (() => {
  const set = new Set();
  try {
    const source = fs.readFileSync(REACT_INDEX, 'utf8');
    for (const m of source.matchAll(/from '\.\/components\/([A-Za-z0-9]+)'/g)) set.add(m[1]);
  } catch {
    /* al-react not present (partial checkout) — the switcher degrades to HTML only. */
  }
  return set;
})();

/* --------------------------------------------------------------- helpers */

const pascal = (slug) => slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('');
const titleCase = (slug) => slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

/** First sentence of a CEM description, minus the `Component: al-x` stub. */
function summarize(description, tag) {
  if (!description) return '';
  const text = description.replace(new RegExp(`^Component:\\s*${tag}\\s*`), '').trim();
  if (!text) return '';
  const [first] = text.split(/\n\s*\n/);
  return first.replace(/\s+/g, ' ').trim();
}

/** CEM attribute + its backing field → one props-table row. */
function propRow(attribute, members) {
  const field = members.find((m) => m.kind === 'field' && m.name === attribute.fieldName);
  const description = (attribute.description ?? field?.description ?? '').trim();
  return {
    name: attribute.name,
    field: attribute.fieldName ?? attribute.name,
    type: attribute.type?.text ?? field?.type?.text ?? 'string',
    // The CEM only records a default when the source assigns one. 494 of the
    // library's 606 attributes genuinely have none; an em dash is the truth,
    // not a placeholder.
    default: field?.default ?? attribute.default ?? '—',
    description,
    /** Enum unions become playground controls; booleans become checkboxes. */
    options: enumOptions(attribute.type?.text ?? field?.type?.text ?? ''),
    isBoolean: /^boolean$/.test((attribute.type?.text ?? field?.type?.text ?? '').trim()),
  };
}

/** `'a' | 'b' | 'c'` → ['a','b','c']; anything else → []. */
function enumOptions(typeText) {
  const parts = typeText.split('|').map((p) => p.trim());
  if (parts.length < 2) return [];
  const literals = parts.filter((p) => /^'[^']*'$/.test(p)).map((p) => p.slice(1, -1));
  return literals.length === parts.length ? literals : [];
}

/* -------------------------------------------------------------- the build */

const records = [];

for (const module of cem.modules) {
  const match = CANONICAL_MODULE.exec(module.path);
  if (!match) continue;
  const slug = match[1];
  const declaration = (module.declarations ?? []).find((d) => d.tagName);
  if (!declaration) continue;

  const story = readStoryMeta(slug);
  const members = declaration.members ?? [];
  const reactName = reactWrappers.has(pascal(slug)) ? `AL${pascal(slug)}` : null;

  records.push({
    slug,
    tag: declaration.tagName,
    className: declaration.name,
    name: story.name ?? titleCase(slug),
    tier: story.tier ?? FALLBACK_TIER,
    tierInferred: story.tier === null,
    storyTitle: story.title,
    /** 'beta' etc. from the story's `status` param; 'deprecated' wins. */
    status: declaration.deprecated ? 'deprecated' : story.status,
    deprecated: Boolean(declaration.deprecated),
    modulePath: module.path,
    importPath: `al-web-components/components/${slug}`,
    description: declaration.description ?? '',
    summary: summarize(declaration.description, declaration.tagName),
    react: reactName,
    props: (declaration.attributes ?? []).map((a) => propRow(a, members)),
    slots: (declaration.slots ?? []).map((s) => ({
      name: s.name || '(default)',
      rawName: s.name || '',
      description: (s.description ?? '').replace(/\s+/g, ' ').trim(),
    })),
    events: (declaration.events ?? []).map((e) => ({
      name: e.name,
      type: e.type?.text ?? 'CustomEvent',
      description: (e.description ?? '').replace(/\s+/g, ' ').trim(),
    })),
    cssParts: (declaration.cssParts ?? []).map((p) => ({
      name: p.name,
      description: (p.description ?? '').replace(/\s+/g, ' ').trim(),
    })),
    cssProperties: (declaration.cssProperties ?? []).map((p) => ({
      name: p.name,
      default: p.default ?? '—',
      description: (p.description ?? '').replace(/\s+/g, ' ').trim(),
    })),
    methods: members
      .filter((m) => m.kind === 'method' && !m.privacy && !m.static)
      .map((m) => ({
        name: m.name,
        description: (m.description ?? '').replace(/\s+/g, ' ').trim(),
      })),
  });
}

records.sort((a, b) => a.name.localeCompare(b.name));

/** Every component, alphabetical. */
export const COMPONENTS = records;

/** Component count — the number behind "SEARCH n COMPONENTS". */
export const COMPONENT_COUNT = records.length;

/** Sidebar / index taxonomy, in render order, with live counts. */
export const TIERS = TIER_ORDER.map((id) => {
  const components = records.filter((c) => c.tier === id);
  return { id, label: TIER_LABEL[id], count: components.length, components };
});

/**
 * Lifecycle groups — the second axis of the sidebar hierarchy (Primer's
 * Components / Experimental / Deprecated split). Derived, like everything
 * else: `deprecated` from the CEM, everything else from each story's own
 * `status: { type: … }` parameter. A component with neither declares nothing,
 * and lands in `undeclared` — which is the honest label for it, and the one
 * that makes the gap visible.
 *
 * The order below is a lifecycle, not a component list; the groups that
 * actually appear (and their counts) come entirely from what the library says.
 */
const LIFECYCLE_ORDER = ['stable', 'alpha', 'beta', 'experimental', 'deprecated', 'undeclared'];

export const LIFECYCLE = (() => {
  const buckets = new Map();
  for (const component of records) {
    const id = component.status ?? 'undeclared';
    if (!buckets.has(id)) buckets.set(id, []);
    buckets.get(id).push(component);
  }
  return [...buckets.entries()]
    .map(([id, components]) => ({ id, label: id.toUpperCase(), count: components.length, components }))
    .sort((a, b) => {
      const ai = LIFECYCLE_ORDER.indexOf(a.id);
      const bi = LIFECYCLE_ORDER.indexOf(b.id);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.id.localeCompare(b.id);
    });
})();

/** Icon glyphs — the CEM tags that are payloads of `al-icon`, not components. */
export const ICON_GLYPHS = cem.modules
  .filter((m) => /^components\/icon\/icons\/[a-z0-9-]+\.ts$/.test(m.path))
  .flatMap((m) => (m.declarations ?? []).filter((d) => d.tagName).map((d) => d.tagName))
  .sort();

/** Totals the Overview screen quotes, all derived. */
export const STATS = {
  components: records.length,
  icons: ICON_GLYPHS.length,
  documentedProps: records.reduce((n, c) => n + c.props.filter((p) => p.description).length, 0),
  totalProps: records.reduce((n, c) => n + c.props.length, 0),
  withReact: records.filter((c) => c.react).length,
  cemTags: cem.modules.reduce((n, m) => n + (m.declarations ?? []).filter((d) => d.tagName).length, 0),
};

export function findComponent(slug) {
  return records.find((c) => c.slug === slug);
}

/**
 * Build-time transparency: what the generator inferred rather than read.
 * Printed by `scripts/check-docs-coverage.mjs` and by the Astro integration so
 * a mis-titled new component surfaces instead of quietly landing in the
 * fallback tier.
 */
export function registryReport() {
  return {
    total: records.length,
    tiers: TIERS.map((t) => `${t.label}=${t.count}`).join(' '),
    inferredTier: records.filter((c) => c.tierInferred).map((c) => c.slug),
    lifecycle: LIFECYCLE.map((l) => `${l.label}=${l.count}`).join(' '),
    missingReactWrapper: records.filter((c) => !c.react).map((c) => c.slug),
    icons: ICON_GLYPHS.length,
  };
}
