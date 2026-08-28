#!/usr/bin/env node
/**
 * emit-contracts.mjs — build a per-component, per-project CONTRACT: the
 * canvas-expressible API surface (props, events, slots, states, anatomy,
 * token bindings, a11y facts, code/Figma bindings) captured from what the
 * repo's own pipeline already produces.
 *
 * Sources (never a second source of truth — this is a READER, like
 * libs/altitude-mcp/src/lib/parity.mjs):
 *   - CEM (custom-elements.json, base or brand)      -> props/events/slots
 *   - the project's parity manifest                  -> Figma bindings, scope
 *   - scripts/figma-atoms/token-map.mjs               -> code token -> Figma variable
 *   - scripts/figma-atoms/measure-components.mjs output (spec-light.json)
 *                                                      -> anatomy (BEST-EFFORT —
 *     see .altitude/contracts/README.md "Anatomy availability is best-effort";
 *     never fabricated, `anatomy: null` + `anatomySource: "unavailable"` when
 *     no measured output exists on disk)
 *
 * Scope: every PARITY-TRACKED component for the active project — i.e. every
 * key in that project's parity manifest whose entry is not `excluded: true`.
 * An excluded/untracked tag is skipped with a logged line, never silently.
 *
 * Determinism: stable key order, 2-space indent, trailing newline, no
 * timestamps. Same inputs -> byte-identical output, every run.
 *
 * SOURCE OF TRUTH (T10, spec 2026-08-25-contract-backed-figma-parity-and-
 * generation): as of the adoption pass, contracts under .altitude/contracts/
 * are EDITABLE, hand-curated source, not a derived artifact this script keeps
 * overwriting — see .altitude/contracts/README.md "Contracts are editable
 * source". This script is now a one-time SEED (bootstrap a contract for a
 * component that has none yet) plus a DRIFT CHECK (does the on-disk contract
 * still match what the repo's own sources would derive). It never silently
 * regenerates an existing hand-edited file.
 *
 * Usage — pick exactly one mode:
 *   node scripts/contracts/emit-contracts.mjs --seed                  # bootstrap NEW components only; refuses to overwrite an existing contract file
 *   node scripts/contracts/emit-contracts.mjs --seed --component al-button  # bootstrap ONE tag only (must already be parity-tracked)
 *   node scripts/contracts/emit-contracts.mjs --seed --force          # ...unless --force (re-seed on purpose, discards hand edits)
 *   node scripts/contracts/emit-contracts.mjs --check-drift           # re-derive every tracked component in memory, diff vs. on-disk (status/version excluded); exit 1 on any drift
 *   node scripts/contracts/emit-contracts.mjs --check                 # ajv-validate the on-disk contracts against contract.schema.json, read-only — refuses an illegal contract file BY NAME (path + failing rule)
 *   node scripts/contracts/emit-contracts.mjs --check-determinism     # T15 CI gate: re-derive every tracked contract TWICE in memory, byte-compare the two serializations; exit 1 + names any component whose two derivations differ
 *   node scripts/contracts/emit-contracts.mjs                         # no mode flag: prints this usage note, does nothing, exit 1
 *   ... any of the above + --project southleft / DS_PROJECT
 *   pnpm run contracts:seed / contracts:seed:sl / contracts:check / contracts:validate / contracts:check-determinism
 *   pnpm run gate:contracts   # the CI gate — five legs, both projects (see package.json //gate:contracts)
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import { resolveProject, figmaNodeUrlFor } from '../../libs/altitude-mcp/src/lib/ds-project.mjs';
import { readManifest, resolveComponentRoster, unionValues } from '../../libs/altitude-mcp/src/lib/parity.mjs';
import { normKey } from '../../libs/altitude-mcp/src/lib/contract-diff.mjs';
import { CSS_TO_TOKEN } from '../figma-atoms/token-map.mjs';
import { argOf } from '../lib/argv.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const CONTRACTS_DIR = join(REPO_ROOT, '.altitude', 'contracts');
const SCHEMA_PATH = join(CONTRACTS_DIR, 'contract.schema.json');

const SEED = process.argv.includes('--seed');
const CHECK_DRIFT = process.argv.includes('--check-drift');
const CHECK = process.argv.includes('--check');
const CHECK_DETERMINISM = process.argv.includes('--check-determinism');
const REFRESH = process.argv.includes('--refresh');
const FORCE = process.argv.includes('--force');
const STATES = ['hover', 'focus', 'active', 'disabled'];

/** `--seed --component al-button` — bootstrap ONE tag only (T16: what the WC plop generator's
 * documented follow-up command runs once a freshly-scaffolded component has a CEM entry). */
const COMPONENT = argOf('--component');

// Curation metadata, not a derived fact — a hand-adopted contract's status
// and version are never expected to match what re-derivation would produce.
const DRIFT_IGNORED_FIELDS = new Set(['status', 'version']);

/** Fields whose derivation depends entirely on scripts/figma-atoms/measure-components.mjs
 * output (spec-light.json / spec-dark.json under each project's GITIGNORED figma-sync dir —
 * see README.md "Anatomy availability is best-effort"). That file is a local measurement
 * artifact that is never committed, and a fresh clone / CI runner has no path to produce it
 * without a full headless-browser measurement pass first. When it's absent, buildAnatomy()
 * honestly derives `anatomy: null` / `anatomySource: "unavailable"` — comparing that against
 * an on-disk contract that WAS seeded on a machine with measured data is an environment
 * capability gap, not a contract<->code disagreement, so runCheckDrift() excludes these
 * fields from a run where measuredSpec is unavailable (never globally — a local run that DOES
 * have spec-light.json still checks them in full). */
const ANATOMY_DEPENDENT_FIELDS = ['anatomy', 'anatomySource', 'anatomyCase', 'tokens', 'states', 'semantics'];

const USAGE = `[contracts] no mode flag given — emit-contracts.mjs no longer overwrites .altitude/contracts/**/*.contract.json by default (T10: contracts are edited source of truth, see .altitude/contracts/README.md).

Pick one:
  --seed [--component al-button] [--force]   bootstrap contracts for NEW components only (or one tag); refuses an existing file unless --force
  --check-drift       re-derive every tracked component and diff it against the on-disk contract (status/version excluded; anatomy/tokens/states/semantics also excluded when spec-light.json is unavailable in this environment); exit 1 on drift
  --check             ajv-validate the on-disk contracts against contract.schema.json, read-only — refuses an illegal contract file BY NAME
  --check-determinism re-derive every tracked contract TWICE in memory and byte-compare the two serializations; exit 1 + names any component whose two derivations differ
  --refresh           (T25) re-derive every tracked contract and OVERWRITE its derived fields in
                      place with the fresh derivation — status/version, slots[].figmaPlaceholder,
                      slots[].figmaAxis, slots[].figmaOmit (T27), and axis-or-omit-curated
                      props[].bindings.figma are carried forward unchanged (same carry-forward this
                      mode's own --check-drift uses); every other
                      field becomes exactly what re-derivation produces. Anatomy-dependent fields
                      (anatomy/anatomySource/anatomyCase/tokens/states/semantics) are left AS-IS on
                      disk when this environment has no measured spec-light.json, same exclusion
                      --check-drift applies, so a contract seeded on a machine WITH measured data
                      never has that data clobbered by a --refresh run on a machine without it.

  pnpm run contracts:seed / contracts:seed:sl
  pnpm run contracts:check / contracts:validate / contracts:check-determinism
  pnpm run gate:contracts   # T15 CI gate — all three legs, both projects
  node scripts/contracts/emit-contracts.mjs --check --project <id>
`;

// unionValues/normKey — imported from their canonical homes since 2026-08-27
// (spec parity-system-audit-remediation R4); the byte-identical private
// copies that used to live here are gone.

function titleCase(tag) {
  return tag
    .replace(/^al-/, '')
    .split('-')
    .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : s))
    .join(' ');
}

// ── prop / event / slot extraction from a CEM component record ────────────

function normalizeType(typeText) {
  const values = unionValues(typeText);
  if (values.length) return { type: 'enum', values };
  const t = String(typeText ?? '').trim();
  if (t === 'boolean') return { type: 'boolean' };
  if (t === 'number') return { type: 'number' };
  return { type: 'string' };
}

/** Match a CEM attribute name to an OBSERVED Figma component-property, same normalisation parity.mjs uses. */
function figmaPropBindingFor(attrName, figmaContract) {
  if (!figmaContract?.props) return null;
  const key = normKey(attrName);
  for (const [figmaName, def] of Object.entries(figmaContract.props)) {
    if (normKey(figmaName) === key) {
      return {
        kind: def?.type ?? 'NONE',
        property: figmaName,
        ...(def?.options?.length ? { options: def.options.slice().sort() } : {}),
      };
    }
  }
  return null;
}

function buildProps(component, manifestEntry) {
  const figmaContract = manifestEntry?.figmaContract ?? null;
  return (component.attributes ?? [])
    .map((a) => {
      const rawType = (a.type?.text ?? 'string').replace(/\s+/g, ' ').trim();
      const { type, values } = normalizeType(rawType);
      const prop = {
        name: a.name,
        ...(a.description ? { description: a.description } : {}),
        type,
        rawType,
        ...(values ? { values } : {}),
        ...(a.default !== undefined ? { default: a.default } : {}),
        bindings: {
          code: {
            attribute: a.name,
            ...(a.fieldName && a.fieldName !== a.name ? { member: a.fieldName } : {}),
          },
          figma: figmaPropBindingFor(a.name, figmaContract),
        },
      };
      return prop;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildEvents(component) {
  return (component.events ?? [])
    .map((e) => ({ name: e.name, ...(e.description ? { description: e.description } : {}) }))
    .filter((e) => e.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildSlots(component) {
  return (component.slots ?? [])
    .map((s) => ({ name: s.name ?? '', ...(s.description ? { description: s.description } : {}) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildA11y(component) {
  const ariaAttributes = (component.attributes ?? [])
    .map((a) => a.name)
    .filter((n) => /aria/i.test(n))
    .sort();
  const cssParts = (component.cssParts ?? []).map((p) => p.name).filter(Boolean).sort();
  return { ariaAttributes, cssParts };
}

// ── token binding (T3): css suffix (as measure-components emits it, e.g.
//    "theme-color-background-primary-default") -> { code, figma } ─────────

function tokenBindingFor(cssSuffix) {
  const hit = CSS_TO_TOKEN[cssSuffix];
  return { code: `--al-${cssSuffix}`, figma: hit?.figma ?? null };
}

// ── conditionalBindings (T18): variant/state facts recovered from the
//    component's OWN .scss — see contract.schema.json's `conditionalBindings`
//    and README.md for the mapping this documents in code. ─────────────────

/** Lazily require postcss-scss (devDependency; CJS) — same createRequire
 * bridge pattern as ajv's below, no new dependency. */
let _scssParse = null;
function scssParse() {
  if (!_scssParse) _scssParse = createRequire(import.meta.url)('postcss-scss').parse;
  return _scssParse;
}

/** pseudo-class/attribute selector (relative, e.g. "&:hover:not(:active, :disabled)")
 * -> canonical state name, or null. Order matters: disabled/focus checked before the
 * broader hover/active so a combinator like `:hover:not(..., :disabled)` still reads
 * as "hover" (the LEADING pseudo-class is the rule's own state, `:not()` is exclusion). */
const STATE_SELECTOR_PATTERNS = [
  ['disabled', /^&(:disabled|\[disabled\])\b/],
  ['focus', /^&(:focus-visible|:focus)\b/],
  ['active', /^&:active\b/],
  ['hover', /^&:hover\b/],
];

function matchStateSelector(selector) {
  const s = String(selector ?? '').trim();
  for (const [state, re] of STATE_SELECTOR_PATTERNS) if (re.test(s)) return state;
  return null;
}

/** `border: var(--al-theme-border-width) solid var(--al-theme-color-border-default);`
 * -> { 'border-width': 'theme-border-width', 'border-color': 'theme-color-border-default' }.
 * The ONE shorthand this repo's components author with two token references (SKILL.md
 * conventions) — everything else with >1 `--al-*` reference in a value is left uncaptured
 * (see conditionalTokenBinding) rather than guessed. */
function splitBorderShorthand(value) {
  const m = String(value).match(/^var\(--al-([a-z0-9-]+)\)\s+[a-z]+\s+var\(--al-([a-z0-9-]+)\)$/i);
  return m ? { 'border-width': m[1], 'border-color': m[2] } : null;
}

/** `var(--al-A, var(--al-B))` -> `['A', 'B']`, else `null`. This is the repo's documented
 * "role token, falls back to its base token" shape (.altitude/TOKENS.md "Phantom tokens are a
 * gate" — role tokens are declared by the scoped `<al-theme>` host / brand partials, not the
 * `:root` bundle, so a project with no role override for this token sees only the fallback). */
function roleFallbackPair(value) {
  const m = String(value).trim().match(/^var\(--al-([a-z0-9-]+),\s*var\(--al-([a-z0-9-]+)\)\)$/i);
  return m ? [m[1], m[2]] : null;
}

/** A declaration value with EXACTLY ONE `--al-*` reference -> its token binding, else
 * null. Multi-var shorthands (other than the `border` split above) and references to a
 * component-local custom property with no design-token entry (e.g. `--al-button-padding`)
 * are skipped, never guessed — conditionalBindings never invents which token "is" the fact.
 *
 * ONE exception (T25): a two-level `var(--al-A, var(--al-B))` role/fallback chain is not a
 * guess — `--al-A` (the outer, "role" token) and `--al-B` (the inner, base-tier fallback) are
 * never both live at once for a given project; CSS_TO_TOKEN only indexes `--al-A` when this
 * project's token tree actually declares it (see roleFallbackPair above), so preferring
 * whichever of the two IS indexed reports exactly the value this project's own token pipeline
 * would resolve — the outer role token when the project has one, the inner base token
 * (today's ACTUAL rendered value) when it doesn't. */
function conditionalTokenBinding(value) {
  const matches = [...String(value).matchAll(/--al-([a-z0-9-]+)/gi)].map((m) => m[1]);
  if (matches.length === 1) {
    const hit = CSS_TO_TOKEN[matches[0]];
    return hit ? { code: `--al-${matches[0]}`, figma: hit.figma } : null;
  }
  const pair = roleFallbackPair(value);
  if (pair) {
    const [outer, inner] = pair;
    const suffix = CSS_TO_TOKEN[outer] ? outer : CSS_TO_TOKEN[inner] ? inner : null;
    if (suffix) return { code: `--al-${suffix}`, figma: CSS_TO_TOKEN[suffix].figma };
  }
  return null;
}

/** DIRECT-child declarations of a postcss-scss rule (never a nested rule's decls —
 * `rule.each`, not `rule.walkDecls`, keeps a nested `&:hover` block's own decls out of
 * its parent's) -> { cssProp: tokenBinding }, sorted, token-bearing only, or null. */
function directDeclBindings(rule) {
  const out = {};
  rule.each((node) => {
    if (node.type !== 'decl') return;
    if (node.prop === 'border') {
      const split = splitBorderShorthand(node.value);
      if (split) {
        for (const [longhand, suffix] of Object.entries(split)) {
          const hit = CSS_TO_TOKEN[suffix];
          if (hit) out[longhand] = { code: `--al-${suffix}`, figma: hit.figma };
        }
        return;
      }
    }
    const binding = conditionalTokenBinding(node.value);
    if (binding) out[node.prop] = binding;
  });
  return Object.keys(out).length ? sortedMap(out) : null;
}

function sortedMap(obj) {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
}

/** The component's own `.scss` file(s) (never stories/tests — mirrors
 * parity.mjs's hashComponentSource() filter), for the origin ('base' vs a
 * project's brand layer) this roster entry actually ships from. */
function scssFilesFor({ component, origin, project }) {
  const root = origin === 'brand' ? project.resolved.brandLibrary?.root : project.resolved.libraryRoot;
  if (!root) return [];
  const dir = join(root, dirname(component.modulePath));
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.scss') && !/\.stories\.|\.test\.|\.spec\./.test(f))
    .sort()
    .map((f) => join(dir, f));
}

/** `al-button` -> `al-c-button` — the BEM base class this repo's components are
 * authored under (verified against button/chip/toggle-button .scss). Modifiers are
 * `.al-c-button--<suffix>`; the unmodified `.al-c-button` selector is the default. */
function baseClassFor(tag) {
  return `al-c-${tag.replace(/^al-/, '')}`;
}

/** `variantOut[suffix]` merge helper — NEVER a plain overwrite. The variant/modifier pass,
 * the sub-element ("parts") pass, and the synthesized-default-variant pass below can all
 * contribute to the SAME suffix key (e.g. a `.al-c-alert--success` rule + a
 * `.al-c-alert__icon { .al-c-alert--success & {...} }` sub-element rule, or a `parts` write
 * that runs before the base-rule's own declarations are read for the synthesized default) —
 * spreading the new entry over the existing one keeps every previously-written key
 * (`parts`, `state`, css props) intact regardless of which pass ran first. */
function mergeVariantEntry(variantOut, suffix, entry) {
  if (!entry || !Object.keys(entry).length) return;
  variantOut[suffix] = { ...(variantOut[suffix] ?? {}), ...entry };
}

/**
 * Recover `conditionalBindings` for one tag from its own .scss — best-effort AND
 * conservative: a component with no BEM variant modifiers and no nested pseudo-
 * class/attribute state rules under its base selector yields `null` (the whole
 * section is omitted from the contract, never an empty stub).
 *
 * Mapping this implements (documented here, not just in the schema):
 *   - `.al-c-<tag>--<suffix>` where `<suffix>` matches one of the `variant` prop's
 *     enum `values` (case/dash-insensitive)  -> `conditionalBindings.variant.<suffix>`
 *   - the unmodified `.al-c-<tag>` selector, WHEN exactly one of the `variant`
 *     prop's Figma `options` has no corresponding modifier class (e.g. Button's
 *     "Primary")            -> `conditionalBindings.variant.<that-option-lowercased>`
 *   - `&:hover` / `&:focus-visible|:focus` / `&:active` / `&:disabled|[disabled]`
 *     nested directly inside a MATCHED variant's block -> that variant's `.state.<name>`
 *   - the same, nested directly inside the unmodified base selector's block
 *     -> the generic `conditionalBindings.state.<name>` (applies to any variant with
 *     no compound override of its own — i.e. "variant base + generic state delta")
 *   - (T25) a SUB-ELEMENT rule (`.al-c-<tag>__<part>`) whose block nests the variant
 *     modifier the OTHER way round — `.al-c-<tag>--<suffix> &` (this repo's authored
 *     convention for "this part looks different inside that variant", verified in
 *     alert/banner/toast's `__icon` rules) — -> that variant's `.parts.<part>`, additive
 *     to (never replacing) the variant's own top-level bindings.
 *   - (T25) modifiers of an enum prop OTHER than `variant` (e.g. Badge's `position`:
 *     top-left/top-right/bottom-left/bottom-right), INCLUDING a comma-separated selector
 *     list shared across more than one of that prop's values (Badge's shared z-index rule)
 *     -> `conditionalBindings.<propName>.<value>`, same conditionBindingMap shape as one
 *     variant's own bindings.
 */
function extractConditionalBindings({ tag, props, scssFiles }) {
  if (!scssFiles.length) return null;

  const parse = scssParse();
  const baseClass = baseClassFor(tag);
  const baseSelectorRe = new RegExp(`^\\.${baseClass}$`);
  const modifierSelectorRe = new RegExp(`^\\.${baseClass}--([a-z0-9-]+)$`);
  const partSelectorRe = new RegExp(`^\\.${baseClass}__([a-z0-9-]+)$`);
  const reverseModifierRe = new RegExp(`^\\.${baseClass}--([a-z0-9-]+) &$`);

  const variantProp = props.find((p) => p.name === 'variant' && p.type === 'enum');
  const variantValues = new Set(variantProp?.values ?? []);
  const figmaOptions = variantProp?.bindings?.figma?.options ?? [];
  // T25: any OTHER enum prop (position, etc.) whose BEM modifier classes carry their own
  // token-bearing declarations — kept fully separate from `variant`'s own key/semantics.
  const otherEnumProps = props.filter((p) => p.type === 'enum' && p.name !== 'variant' && p.values?.length);

  const variantOut = {};
  const stateOut = {};
  const otherPropOut = {}; // propName -> { value -> conditionBindingMap }
  const matchedModifiers = new Set();
  let baseRule = null;

  for (const file of scssFiles) {
    let root;
    try {
      root = parse(readFileSync(file, 'utf8'));
    } catch {
      continue; // unparsable .scss — never seen in this repo; skip rather than fabricate
    }

    root.walkRules((rule) => {
      const selectors = (rule.selectors ?? [rule.selector]).map((s) => s.trim());

      // T25a: other-enum-prop modifiers — checked against EVERY individual selector in a
      // comma-list too (Badge's `.al-c-badge--top-left, .al-c-badge--top-right, ...` shares
      // one z-index declaration across all four `position` values).
      for (const prop of otherEnumProps) {
        for (const value of prop.values) {
          if (!selectors.includes(`.${baseClass}--${value}`)) continue;
          const bindings = directDeclBindings(rule);
          if (!bindings) continue;
          const propMap = otherPropOut[prop.name] ?? {};
          propMap[value] = { ...(propMap[value] ?? {}), ...bindings };
          otherPropOut[prop.name] = propMap;
        }
      }

      if (selectors.length !== 1) return; // a comma/compound selector list — not a single variant/base surface
      const selector = selectors[0];

      // T25b: a sub-element rule whose own block nests the variant modifier reversed
      // (`.al-c-<tag>--<suffix> &`) — never a base/modifier rule itself, so this always
      // returns rather than falling into the checks below.
      const partMatch = selector.match(partSelectorRe);
      if (partMatch) {
        const partName = partMatch[1];
        rule.each((child) => {
          if (child.type !== 'rule') return;
          const childSelectors = (child.selectors ?? [child.selector]).map((s) => s.trim());
          for (const cs of childSelectors) {
            const revMatch = cs.match(reverseModifierRe);
            if (!revMatch) continue;
            const suffix = revMatch[1];
            if (!variantValues.has(suffix)) continue;
            matchedModifiers.add(suffix);
            const bindings = directDeclBindings(child);
            if (!bindings) continue;
            const parts = { ...(variantOut[suffix]?.parts ?? {}) };
            parts[partName] = { ...(parts[partName] ?? {}), ...bindings };
            mergeVariantEntry(variantOut, suffix, { parts: sortedMap(parts) });
          }
        });
        return;
      }

      if (baseSelectorRe.test(selector)) {
        baseRule = rule;
        return;
      }

      const modMatch = selector.match(modifierSelectorRe);
      if (!modMatch) return;
      const suffix = modMatch[1];
      if (!variantValues.has(suffix)) return; // a structural modifier (icon-only, full-width, ...), not a `variant` value
      matchedModifiers.add(suffix);

      const base = directDeclBindings(rule) ?? {};
      const stateEntry = {};
      rule.each((child) => {
        if (child.type !== 'rule') return;
        const state = matchStateSelector(child.selector);
        if (!state) return;
        const bindings = directDeclBindings(child);
        if (bindings) stateEntry[state] = bindings;
      });

      const entry = { ...base };
      if (Object.keys(stateEntry).length) entry.state = sortedMap(stateEntry);
      mergeVariantEntry(variantOut, suffix, entry);
    });
  }

  if (baseRule) {
    baseRule.each((child) => {
      if (child.type !== 'rule') return;
      const state = matchStateSelector(child.selector);
      if (!state) return;
      const bindings = directDeclBindings(child);
      if (bindings) stateOut[state] = bindings;
    });

    // The unmodified selector IS the variant default exactly when one Figma
    // option has no BEM modifier of its own (Button: "Primary").
    const matchedNorm = new Set([...matchedModifiers].map(normKey));
    const unmatchedOptions = figmaOptions.filter((o) => !matchedNorm.has(normKey(o)));
    if (unmatchedOptions.length === 1) {
      const defaultBase = directDeclBindings(baseRule);
      if (defaultBase) mergeVariantEntry(variantOut, unmatchedOptions[0].trim().toLowerCase().replace(/\s+/g, '-'), defaultBase);
    }
  }

  const hasVariant = Object.keys(variantOut).length > 0;
  const hasState = Object.keys(stateOut).length > 0;
  const otherPropKeys = Object.keys(otherPropOut).sort();
  if (!hasVariant && !hasState && !otherPropKeys.length) return null;

  const out = {};
  if (hasVariant) out.variant = sortedMap(variantOut);
  if (hasState) out.state = sortedMap(stateOut);
  for (const propName of otherPropKeys) out[propName] = sortedMap(otherPropOut[propName]);
  return out;
}

function buildConditionalBindings({ tag, props, component, origin, project }) {
  return extractConditionalBindings({ tag, props, scssFiles: scssFilesFor({ component, origin, project }) });
}

// ── anatomy (T3): read measure-components.mjs output, BEST-EFFORT ─────────

function loadMeasuredSpec(syncDir) {
  const p = join(syncDir, 'spec-light.json');
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

// ── composition (spec 2026-08-26-contract-coverage…): the code-side nesting graph ──

/**
 * The set of component BASE NAMES (tag minus `al-`) that exist as source
 * directories for this project — base library plus its brand layer when one
 * exists. Derived from the committed source tree (readdirSync, sorted-stable),
 * so it is available in every environment (unlike measured anatomy). Cached
 * per project id: the roster cannot change mid-run.
 */
const knownComponentNamesCache = new Map();
function knownComponentNames(project) {
  if (knownComponentNamesCache.has(project.id)) return knownComponentNamesCache.get(project.id);
  const names = new Set();
  for (const root of [project.resolved.libraryRoot, project.resolved.brandLibrary?.root].filter(Boolean)) {
    const dir = join(root, 'components');
    if (!existsSync(dir)) continue;
    for (const d of readdirSync(dir)) names.add(d);
  }
  knownComponentNamesCache.set(project.id, names);
  return names;
}

/**
 * Deterministic source scan of the component's OWN .ts module for the al-*
 * components it renders internally — the caveat that matters most for
 * molecules/organisms ("make sure we're nesting existing components"):
 *   - `template` evidence: a literal `<al-foo` tag in the render. A
 *     dynamically-interpolated family (`<al-icon-${...}`) captures as
 *     `al-icon-*` — a real nesting fact whose concrete member is runtime-
 *     chosen, recorded honestly rather than dropped or guessed.
 *   - `import` evidence: a sibling component module import
 *     (`from '../checkbox/checkbox'`). Under the registry's scoped-tag model
 *     (see .altitude/REGISTRATION.md) composites import the classes of the
 *     components they instantiate — load-bearing, so an import is nesting
 *     evidence even when no literal tag appears.
 * Excludes the component itself; entries sorted by tag; returns null (never
 * a fabricated empty result) when the source file cannot be read.
 */
function buildComposition({ tag, component, origin, project }) {
  const root = origin === 'brand' ? project.resolved.brandLibrary?.root : project.resolved.libraryRoot;
  if (!root) return null;
  const srcPath = join(root, component.modulePath);
  if (!existsSync(srcPath)) return null;
  const src = readFileSync(srcPath, 'utf8');
  const selfBase = tag.replace(/^al-/, '');

  const evidence = new Map(); // base name (or 'name-*') -> Set<'template'|'import'>
  const add = (name, kind) => {
    if (!name || name === selfBase) return;
    if (!evidence.has(name)) evidence.set(name, new Set());
    evidence.get(name).add(kind);
  };

  for (const m of src.matchAll(/<al-([a-z][a-z-]*)/g)) {
    let name = m[1];
    // `<al-icon-${expr}` captures as "icon-" — a dynamic tag FAMILY.
    if (name.endsWith('-')) name = `${name}*`;
    add(name, 'template');
  }
  for (const m of src.matchAll(/from '\.\.\/([a-z][a-z-]*)\//g)) add(m[1], 'import');

  const renders = [...evidence.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, kinds]) => ({ tag: `al-${name}`, evidence: ['template', 'import'].filter((k) => kinds.has(k)) }));
  return { renders };
}

/** Raw measured `root` node -> the contract's anatomyNode shape
 * (tag/cls/component?/layout/tokens/children). `ctx` carries the component's
 * own base name plus the project's known component names; `isRoot` guards the
 * anatomy root (path "0" IS this contract's component — never annotated). */
function buildAnatomyNode(raw, ctx, isRoot = false) {
  const computed = raw.computed ?? {};
  const layoutEntries = Object.entries({
    display: computed.display,
    // `direction` is flex-direction and is ONLY meaningful when `display` is
    // flex/inline-flex — it computes to 'row' on every other element. Kept
    // verbatim (dropping it would invalidate every existing contract), but
    // consumers MUST gate on `display`; see layoutAxisFor in build-set-code.mjs.
    direction: computed.dir,
    align: computed.align,
    justify: computed.justify,
    // Present only when the node genuinely wraps (measure-lib nulls 'nowrap').
    wrap: computed.wrap,
    // Present only when the node genuinely grows (measure-lib nulls 0).
    grow: computed.grow,
  }).filter(([, v]) => v);
  const layout = layoutEntries.length ? Object.fromEntries(layoutEntries) : null;

  const tokenEntries = Object.entries(raw.tokens ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const tokens = Object.fromEntries(tokenEntries.map(([cssProp, suffix]) => [cssProp, tokenBindingFor(suffix)]));

  // Nested-component annotation (spec 2026-08-26-contract-coverage…):
  // measured anatomy flattens shadow boundaries, so a nested al-checkbox
  // renders as `div.al-c-checkbox ...` — its own BEM BLOCK class as a whole
  // class token (modifiers are separate tokens, `al-c-checkbox--x`; element
  // classes `al-c-checkbox__y` never match a bare block). A node whose class
  // list carries ANOTHER known component's block class IS that component's
  // root — recorded so a generator places an INSTANCE of that component's
  // set here instead of rebuilding the subtree as raw frames. The anatomy
  // root itself (this contract's own component) is never annotated.
  let component;
  if (!isRoot && ctx && raw.cls) {
    for (const token of String(raw.cls).split(/\s+/)) {
      const m = /^al-c-([a-z][a-z-]*)$/.exec(token);
      if (m && m[1] !== ctx.selfBase && ctx.knownNames.has(m[1])) { component = `al-${m[1]}`; break; }
    }
  }

  // Spec 2026-08-26-contract-coverage… (Checkbox walkthrough): the raw
  // measurement has ALWAYS carried per-node text and w/h — the contract just
  // never kept them. `text` is the node's real rendered copy (the '/'
  // separator, 'Checkbox label'); `box` is the measured size, rounded to
  // 0.1px for byte-stable serialization — see the schema's own notes on the
  // deliberate revision of the T12-era no-pixel-geometry rule.
  const round1 = (n) => Math.round(Number(n) * 10) / 10;

  return {
    tag: raw.tag,
    cls: raw.cls ?? null,
    ...(component ? { component } : {}),
    ...(raw.text ? { text: String(raw.text).slice(0, 300) } : {}),
    ...(raw.w !== undefined && raw.h !== undefined ? { box: { w: round1(raw.w), h: round1(raw.h) } } : {}),
    layout,
    tokens,
    children: (raw.kids ?? []).map((kid) => buildAnatomyNode(kid, ctx, false)),
  };
}

/** Flatten a raw measured node tree into path -> raw tokens map ("0" = root, "0.1" = 2nd child, ...). */
function flattenRawTokens(raw, path, out) {
  out.set(path, raw.tokens ?? {});
  (raw.kids ?? []).forEach((kid, i) => flattenRawTokens(kid, `${path}.${i}`, out));
}


/** The component's own figma.gen.json `anatomyCase` curation (spec
 * 2026-08-26-contract-coverage…) — which measured case to sample anatomy
 * from. Read straight from the component's source dir (committed,
 * deterministic); absent file/key -> null (alphabetical-first rule). */
function preferredAnatomyCase({ component, origin, project }) {
  const root = origin === 'brand' ? project.resolved.brandLibrary?.root : project.resolved.libraryRoot;
  if (!root) return null;
  const p = join(root, dirname(component.modulePath), 'figma.gen.json');
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8')).anatomyCase ?? null;
  } catch {
    return null;
  }
}

/**
 * Best-effort anatomy for one tag: sample the alphabetically-first `case` in
 * the default-state array (or the case the component's figma.gen.json
 * `anatomyCase` names — see preferredAnatomyCase), then diff the SAME case's
 * root-token maps across the other 4 measured states to build
 * `stateOverrides` (root path only — see README § Deviations).
 */
function buildAnatomy(measuredSpec, tag, ctx) {
  if (!measuredSpec) return { anatomy: null, anatomySource: 'unavailable', anatomyCase: null, states: [] };

  const defaultEntries = (measuredSpec.default ?? []).filter((e) => e.tag === tag && e.root);
  if (!defaultEntries.length) return { anatomy: null, anatomySource: 'unavailable', anatomyCase: null, states: [] };

  // Case selection (spec 2026-08-26-contract-coverage…, found on al-badge):
  // alphabetical-first sampled "Variant=danger,Shape=dot" — the DOT form —
  // so every generated Badge rendered as a dot, not a label. A component may
  // curate its preferred sample in its own figma.gen.json (`anatomyCase`,
  // exact case string — committed source, so derivation stays deterministic
  // and --check-drift-safe); otherwise the old alphabetical-first rule holds.
  const sortedEntries = defaultEntries.slice().sort((a, b) => a.case.localeCompare(b.case));
  const sampled = (ctx?.preferredCase && sortedEntries.find((e) => e.case === ctx.preferredCase)) || sortedEntries[0];
  const root = buildAnatomyNode(sampled.root, ctx, true);

  // Spec 2026-08-26-contract-coverage… (Breadcrumbs Item walkthrough): keep
  // EVERY measured default-state case's full tree, so a generator can fan a
  // case DIMENSION (Current, Separator, Shape…) out as a real variant axis
  // with each combination built from its own true structure — differences
  // between cases are structural (a separator child that only exists when
  // Separator=yes), not just token deltas, so full trees, not diffs.
  const cases = sortedEntries.map((e) => ({ case: e.case, root: buildAnatomyNode(e.root, ctx, true) }));

  const defaultFlat = new Map();
  flattenRawTokens(sampled.root, '0', defaultFlat);

  const stateOverrides = {};
  for (const state of STATES) {
    const stateEntry = (measuredSpec[state] ?? []).find((e) => e.tag === tag && e.case === sampled.case && e.root);
    if (!stateEntry) continue;
    const stateFlat = new Map();
    flattenRawTokens(stateEntry.root, '0', stateFlat);

    const diffForState = {};
    for (const [path, stateTokens] of stateFlat) {
      const defaultTokens = defaultFlat.get(path) ?? {};
      const diff = {};
      for (const [cssProp, suffix] of Object.entries(stateTokens).sort(([a], [b]) => a.localeCompare(b))) {
        if (defaultTokens[cssProp] !== suffix) diff[cssProp] = tokenBindingFor(suffix);
      }
      if (Object.keys(diff).length) diffForState[path] = diff;
    }
    if (Object.keys(diffForState).length) stateOverrides[state] = diffForState;
  }

  return {
    anatomy: { root, ...(cases.length > 1 ? { cases } : {}), ...(Object.keys(stateOverrides).length ? { stateOverrides } : {}) },
    anatomySource: 'measured',
    anatomyCase: sampled.case,
    states: STATES.filter((s) => (measuredSpec[s] ?? []).some((e) => e.tag === tag)),
  };
}

/** Every `--al-*` token referenced anywhere in the anatomy tree + state overrides, deduped + sorted. */
function collectTokens(anatomy) {
  if (!anatomy) return [];
  const out = new Set();
  const walkNode = (node) => {
    for (const binding of Object.values(node.tokens ?? {})) out.add(binding.code);
    for (const child of node.children ?? []) walkNode(child);
  };
  walkNode(anatomy.root);
  for (const perNode of Object.values(anatomy.stateOverrides ?? {})) {
    for (const diff of Object.values(perNode)) {
      for (const binding of Object.values(diff)) out.add(binding.code);
    }
  }
  return [...out].sort();
}

// ── bindings (component-level) ─────────────────────────────────────────────

function buildCodeBindings({ component, origin, project }) {
  const workspace = origin === 'brand' ? project.resolved.brandLibrary?.workspace : project.library.workspace;
  return {
    importPath: `${workspace}/${component.modulePath}`.replace(/\\/g, '/'),
    tagName: component.tag,
    workspace,
  };
}

function buildFigmaBindings(project, manifestEntry) {
  const name = manifestEntry?.figma?.name ?? null;
  const nodeId = manifestEntry?.figma?.nodeId ?? null;
  return {
    fileKey: project.figma.fileKey,
    componentSetName: name,
    nodeId,
    url: name ? figmaNodeUrlFor(project, nodeId) : null,
  };
}

// ── semantics: rendered element (from anatomy, when measured) ─────────────

function buildSemantics(anatomy) {
  return { element: anatomy?.root?.tag ?? null, role: null };
}

// ── contract assembly for one component ────────────────────────────────────

function buildContract({ tag, component, origin, project, manifestEntry, measuredSpec }) {
  const ctx = {
    selfBase: tag.replace(/^al-/, ''),
    knownNames: knownComponentNames(project),
    preferredCase: preferredAnatomyCase({ component, origin, project }),
  };
  const { anatomy, anatomySource, anatomyCase, states } = buildAnatomy(measuredSpec, tag, ctx);
  const props = buildProps(component, manifestEntry);
  const conditionalBindings = buildConditionalBindings({ tag, props, component, origin, project });

  return {
    $schema: '../contract.schema.json',
    id: tag,
    name: manifestEntry?.figma?.name ?? titleCase(tag),
    version: '0.1.0',
    status: 'derived',
    description: component.description ?? '',
    semantics: buildSemantics(anatomy),
    props,
    events: buildEvents(component),
    slots: buildSlots(component),
    composition: buildComposition({ tag, component, origin, project }),
    states,
    anatomySource,
    anatomyCase,
    anatomy,
    tokens: collectTokens(anatomy),
    ...(conditionalBindings ? { conditionalBindings } : {}),
    a11y: buildA11y(component),
    bindings: {
      code: buildCodeBindings({ component, origin, project }),
      figma: buildFigmaBindings(project, manifestEntry),
    },
  };
}

// ── shared: resolve project + manifest + roster, walk tracked tags ────────

/** Everything every mode needs before it can iterate tracked tags. */
function loadContext() {
  const project = resolveProject();
  const manifest = readManifest(project);
  if (!manifest) {
    console.error(`[contracts] no parity manifest at ${project.resolved.parityManifest} — run parity:seed first.`);
    process.exit(2);
  }
  const { roster } = resolveComponentRoster(project);
  const byTag = new Map(roster.map((r) => [r.component.tag, r]));
  const measuredSpec = loadMeasuredSpec(project.resolved.figmaSyncDir);
  const outDir = join(CONTRACTS_DIR, project.id);
  const trackedTags = Object.keys(manifest.components ?? {}).sort();
  return { project, manifest, byTag, measuredSpec, outDir, trackedTags };
}

/** Derive one tag's in-memory contract, or `null` (+ a reason) when it's excluded / has no CEM record. */
function deriveOne({ tag, manifest, byTag, project, measuredSpec }) {
  const entry = manifest.components[tag];
  if (entry?.excluded) return { entry, reason: 'excluded' };
  const rosterEntry = byTag.get(tag);
  if (!rosterEntry) return { entry, reason: 'no-cem' };
  const contract = buildContract({
    tag,
    component: rosterEntry.component,
    origin: rosterEntry.origin,
    project,
    manifestEntry: entry,
    measuredSpec,
  });
  return { entry, reason: null, contract };
}

// ── --seed: bootstrap NEW components only ──────────────────────────────────

function runSeed() {
  const { project, manifest, byTag, measuredSpec, outDir, trackedTags: allTrackedTags } = loadContext();
  mkdirSync(outDir, { recursive: true });

  let trackedTags = allTrackedTags;
  if (COMPONENT) {
    if (!allTrackedTags.includes(COMPONENT)) {
      console.error(
        `[contracts] "${COMPONENT}" is not a parity-tracked component for project "${project.id}" — ` +
          `run \`pnpm run parity:seed${project.isDefault ? '' : ` --project ${project.id}`}\` first so it has a manifest entry.`,
      );
      process.exit(2);
    }
    trackedTags = [COMPONENT];
  }

  const emitted = [];
  const skippedExcluded = [];
  const skippedNoCem = [];
  const skippedExisting = [];

  for (const tag of trackedTags) {
    const { entry, reason, contract } = deriveOne({ tag, manifest, byTag, project, measuredSpec });
    if (reason === 'excluded') {
      skippedExcluded.push(tag);
      console.log(`[contracts] skip ${tag} — excluded (${entry.note ?? 'no note'})`);
      continue;
    }
    if (reason === 'no-cem') {
      skippedNoCem.push(tag);
      console.warn(`[contracts] skip ${tag} — parity-tracked but no CEM record found for project "${project.id}"`);
      continue;
    }

    const outPath = join(outDir, `${tag}.contract.json`);
    if (existsSync(outPath) && !FORCE) {
      skippedExisting.push(tag);
      console.log(`[contracts] skip ${tag} — already has a contract (editable source). Use --force to re-seed and discard hand edits.`);
      continue;
    }

    writeFileSync(outPath, JSON.stringify(contract, null, 2) + '\n', 'utf8');
    emitted.push({ tag, path: outPath, contract });
  }

  console.log(
    `[contracts] --seed ${project.id}: seeded ${emitted.length}, already-sourced ${skippedExisting.length}, excluded ${skippedExcluded.length}, no-CEM ${skippedNoCem.length} (manifest tracked ${allTrackedTags.length}${COMPONENT ? `, scoped to "${COMPONENT}"` : ''})`,
  );

  if (CHECK && !validateWithAjv(emitted)) process.exit(1);
}

// ── --check-drift: on-disk contract vs. what the repo's own sources derive ─

/** Hand-authored slot extension fields (T19, spec 2026-08-25-contract-backed-
 * figma-parity-and-generation: `slots[].figmaPlaceholder`, the real Figma
 * set's icon-instance placeholder convention) carry no derivation source at
 * all — no CEM/token-map/measure-components fact says which icon component a
 * hand-built set uses as its Slot Before/After default. Rather than add
 * `slots` wholesale to DRIFT_IGNORED_FIELDS (which would also blind
 * --check-drift to genuine CEM slot name/description changes), copy just this
 * one hand-authored field from the on-disk contract onto the freshly derived
 * slots (matched by slot name) before the two are diffed — same principle
 * `conditionalBindings` documents at the top level, one level down. Mutates
 * and returns `derived` in place; `derived` is a transient in-memory object
 * for this comparison only, never written back to disk here. */
function carryForwardSlotExtensions(disk, derived) {
  if (!Array.isArray(disk?.slots) || !Array.isArray(derived?.slots)) return derived;
  const diskSlotByName = new Map(disk.slots.map((s) => [s.name, s]));
  for (const slot of derived.slots) {
    const diskSlot = diskSlotByName.get(slot.name);
    if (diskSlot?.figmaPlaceholder) slot.figmaPlaceholder = diskSlot.figmaPlaceholder;
    // T23: slots[].figmaAxis — same "no derivation source exists" reasoning
    // as figmaPlaceholder above; whether a slot fans out as its own variant
    // axis is a hand-curation decision, not something CEM/token-map/
    // measure-components can observe.
    if (diskSlot?.figmaAxis) slot.figmaAxis = diskSlot.figmaAxis;
    // T27: slots[].figmaOmit — same reasoning again: whether a slot should
    // be expressed in Figma AT ALL is an opt-out decision, not a derivable
    // fact.
    if (diskSlot?.figmaOmit) slot.figmaOmit = diskSlot.figmaOmit;
  }
  return derived;
}

/** T23/T27: `props[].bindings.figma` hand-curated into axis mode (`axis: true`)
 * OR opted out (`omit: true`) carries no derivation source either —
 * `figmaPropBindingFor()` above derives a prop's Figma binding from the
 * manifest's cached OBSERVED digest of the REAL set (refresh-figma-digests.mjs),
 * which reports whatever the real set ACTUALLY does today (e.g. al-button's
 * real "Is Full Width" is still a BOOLEAN property, not a VARIANT axis, as of
 * T23 — see README.md § Fan-out convention for why the pilot and the real set
 * are allowed to diverge). Once a prop's on-disk `bindings.figma.axis` OR
 * `.omit` is true, the WHOLE figma binding object for that prop is hand-owned
 * (kind/property/options/omit change together as one curated unit) — carry
 * it forward wholesale, matched by prop name, same transient/comparison-only
 * mutation as carryForwardSlotExtensions above. */
function carryForwardPropAxisCuration(disk, derived, figmaContract) {
  if (!Array.isArray(disk?.props) || !Array.isArray(derived?.props)) return derived;
  const diskPropByName = new Map(disk.props.map((p) => [p.name, p]));
  for (const prop of derived.props) {
    const diskProp = diskPropByName.get(prop.name);
    if (diskProp?.bindings?.figma?.axis || diskProp?.bindings?.figma?.omit) {
      prop.bindings.figma = diskProp.bindings.figma;
      continue;
    }
    // `pairWith` (2026-08-27): the two sides deliberately use DIFFERENT names
    // for the same axis, and no normalisation can bridge them — al-divider's
    // code prop `variant` is the Figma set's `Orientation` axis, because
    // "orientation" is what a designer reads and "variant" is what the CEM
    // calls it. normKey only lowercases and strips non-alphanumerics (plus the
    // is/has prefixes in NAME_ALIAS_PREFIXES), so the pairing is UNDERIVABLE
    // and has to be curated. Only the PAIRING is hand-owned: kind and options
    // are still read from the manifest's observed digest of the real set, so
    // this can never assert a Figma axis that isn't there — if the named
    // property disappears from Figma, the binding drops to null and drift
    // reports it, exactly like an unaliased prop.
    const pairWith = diskProp?.bindings?.figma?.pairWith;
    if (pairWith) {
      const derivedFromAlias = figmaPropBindingFor(pairWith, figmaContract);
      prop.bindings.figma = derivedFromAlias ? { ...derivedFromAlias, pairWith } : null;
    }
  }
  return derived;
}

/** Field names present on either side, minus the given ignore-set, whose JSON differs. */
function driftedFields(disk, derived, ignoredFields) {
  const fields = new Set([...Object.keys(disk ?? {}), ...Object.keys(derived ?? {})]);
  const drifted = [];
  for (const field of fields) {
    if (ignoredFields.has(field)) continue;
    if (JSON.stringify(disk?.[field]) !== JSON.stringify(derived?.[field])) drifted.push(field);
  }
  return drifted;
}

function runCheckDrift() {
  const { project, manifest, byTag, measuredSpec, outDir, trackedTags } = loadContext();

  // See ANATOMY_DEPENDENT_FIELDS above — only excluded from THIS run's comparison when
  // this environment has no measured spec to derive anatomy from at all.
  const ignoredThisRun = measuredSpec
    ? DRIFT_IGNORED_FIELDS
    : new Set([...DRIFT_IGNORED_FIELDS, ...ANATOMY_DEPENDENT_FIELDS]);
  if (!measuredSpec) {
    console.log(
      `[contracts] --check-drift ${project.id}: no measured spec (spec-light.json) in this environment — ` +
        `${ANATOMY_DEPENDENT_FIELDS.join(', ')} excluded from this run's comparison ` +
        `(see .altitude/contracts/README.md "Anatomy availability is best-effort").`,
    );
  }

  let ok = 0;
  let drifted = 0;
  let missing = 0;
  let skipped = 0;

  for (const tag of trackedTags) {
    const { reason, contract: derived } = deriveOne({ tag, manifest, byTag, project, measuredSpec });
    if (reason) {
      skipped++;
      continue;
    }

    const outPath = join(outDir, `${tag}.contract.json`);
    if (!existsSync(outPath)) {
      missing++;
      console.error(`[contracts] MISSING — ${tag} has no contract on disk. Run: pnpm run contracts:seed${project.isDefault ? '' : ` --project ${project.id}`}`);
      continue;
    }

    let disk;
    try {
      disk = JSON.parse(readFileSync(outPath, 'utf8'));
    } catch (err) {
      missing++;
      console.error(`[contracts] UNREADABLE — ${tag}: ${err.message}`);
      continue;
    }

    const curated = carryForwardPropAxisCuration(
      disk,
      carryForwardSlotExtensions(disk, derived),
      manifest?.components?.[tag]?.figmaContract ?? null,
    );
    const fields = driftedFields(disk, curated, ignoredThisRun);
    if (fields.length) {
      drifted++;
      console.error(`[contracts] DRIFT — ${tag}: ${fields.join(', ')}`);
    } else {
      ok++;
    }
  }

  console.log(
    `[contracts] --check-drift ${project.id}: ${ok} match, ${drifted} drifted, ${missing} missing, ${skipped} skipped (excluded/no-CEM) — ${trackedTags.length} tracked.`,
  );
  if (drifted || missing) process.exit(1);
}

// ── --check-determinism: same contract inputs -> byte-identical output ────
//
// T15 (spec 2026-08-25-contract-backed-figma-parity-and-generation) — the
// "same input -> same output" leg of R7's "deterministic regeneration (same
// contract -> byte-identical ops/spec output)". Scoped to CONTRACT DERIVATION
// today: re-derives every tracked component's contract TWICE, in the same
// process, from the exact same in-memory sources (CEM, manifest, token-map,
// measured spec — nothing re-read from disk between the two derivations), and
// byte-compares the two `JSON.stringify(contract, null, 2)` serializations.
// This needs no git diff and no on-disk contract at all — it proves the
// EMITTER itself is deterministic, independent of whether the on-disk file
// has drifted (that's --check-drift's job). T12 (DONE, pilot-scoped): the
// "ops" half of the same R7 claim now runs as its own gate leg,
// `contracts:ops-determinism` (scripts/contracts/generate-figma.mjs
// --check-determinism) — see .altitude/contracts/README.md "Generating
// Figma sets from contracts (pilot)".

function runCheckDeterminism() {
  const { project, manifest, byTag, measuredSpec, trackedTags } = loadContext();

  let checked = 0;
  let mismatched = 0;
  const failedTags = [];

  for (const tag of trackedTags) {
    const first = deriveOne({ tag, manifest, byTag, project, measuredSpec });
    if (first.reason) continue; // excluded / no-cem — nothing to derive twice
    const second = deriveOne({ tag, manifest, byTag, project, measuredSpec });

    const a = JSON.stringify(first.contract, null, 2);
    const b = JSON.stringify(second.contract, null, 2);
    checked++;
    if (a !== b) {
      mismatched++;
      failedTags.push(tag);
      console.error(`[contracts] NONDETERMINISTIC — ${tag}: two in-memory derivations of the same contract produced different serialized output.`);
    }
  }

  console.log(
    `[contracts] --check-determinism ${project.id}: ${checked} checked, ${mismatched} nondeterministic` +
      `${failedTags.length ? ` (${failedTags.join(', ')})` : ''} — ${trackedTags.length} tracked.`,
  );
  if (mismatched) process.exit(1);
}

// ── --check: ajv-validate the on-disk contracts, read-only ────────────────

function runCheckOnly() {
  const project = resolveProject();
  const dir = join(CONTRACTS_DIR, project.id);
  if (!existsSync(dir)) {
    console.error(`[contracts] no contracts directory for "${project.id}" at ${relative(REPO_ROOT, dir)} — run contracts:seed first.`);
    process.exit(2);
  }
  const files = readdirSync(dir).filter((f) => f.endsWith('.contract.json')).sort();
  const loaded = files.map((f) => ({ path: join(dir, f), contract: JSON.parse(readFileSync(join(dir, f), 'utf8')) }));
  if (!validateWithAjv(loaded)) process.exit(1);
}

// ── the one-off --adopt (T10) and --add-conditional-bindings (T18) migration
//    modes lived here until 2026-08-27 — both had already run to completion on
//    every tracked contract, so they were deleted (spec
//    parity-system-audit-remediation, R7). Their story is in
//    .altitude/contracts/DECISIONS.md; --refresh below is the general-purpose
//    successor for re-derivation with curation preserved. ──

// ── --refresh (T25): re-derive every tracked contract, curation preserved ─
//
// The general-purpose successor to the (since-deleted) one-off --adopt /
// --add-conditional-bindings migrations — see .altitude/contracts/DECISIONS.md: every DERIVED field (everything the table in README.md's "Contract
// field | Source" names) becomes exactly what a fresh derivation produces; every
// CURATED field (status, version, slots[].figmaPlaceholder, slots[].figmaAxis,
// slots[].figmaOmit (T27), axis-or-omit-mode props[].bindings.figma) is carried
// forward from disk first, using the
// SAME carryForward*() helpers --check-drift diffs against — so running --refresh
// right after a --check-drift pass with zero drift is a guaranteed no-op. Anatomy-
// dependent fields are left untouched when this environment has no measured
// spec-light.json (mirrors --check-drift's own ANATOMY_DEPENDENT_FIELDS exclusion),
// so a --refresh run on a machine without measurement data can never regress a
// contract's anatomy back to `null`/"unavailable".

function runRefresh() {
  const { project, manifest, byTag, measuredSpec, outDir, trackedTags } = loadContext();

  let refreshed = 0;
  let unchanged = 0;
  let missing = 0;
  let skipped = 0;

  for (const tag of trackedTags) {
    const { reason, contract: derived } = deriveOne({ tag, manifest, byTag, project, measuredSpec });
    if (reason) {
      skipped++;
      continue;
    }

    const outPath = join(outDir, `${tag}.contract.json`);
    if (!existsSync(outPath)) {
      missing++;
      console.error(`[contracts] MISSING — ${tag} has no contract on disk, skipping. Run --seed first.`);
      continue;
    }

    const disk = JSON.parse(readFileSync(outPath, 'utf8'));
    const merged = carryForwardPropAxisCuration(
      disk,
      carryForwardSlotExtensions(disk, derived),
      manifest?.components?.[tag]?.figmaContract ?? null,
    );
    merged.status = disk.status;
    merged.version = disk.version;
    if (!measuredSpec) {
      for (const field of ANATOMY_DEPENDENT_FIELDS) merged[field] = disk[field];
    }

    const nextText = JSON.stringify(merged, null, 2) + '\n';
    const diskText = JSON.stringify(disk, null, 2) + '\n';
    if (nextText === diskText) {
      unchanged++;
      continue;
    }

    writeFileSync(outPath, nextText, 'utf8');
    refreshed++;
  }

  console.log(
    `[contracts] --refresh ${project.id}${measuredSpec ? '' : ' (no measured spec — anatomy-dependent fields left as-is)'}: ` +
      `refreshed ${refreshed}, unchanged ${unchanged}, missing ${missing}, skipped ${skipped} (of ${trackedTags.length} tracked).`,
  );
}

// ── main ─────────────────────────────────────────────────────────────────

function main() {
  if (REFRESH) return runRefresh();
  if (CHECK_DRIFT) return runCheckDrift();
  if (CHECK_DETERMINISM) return runCheckDeterminism();
  if (SEED) return runSeed();
  if (CHECK) return runCheckOnly();
  console.log(USAGE);
  process.exit(1);
}

/** ajv is CommonJS; createRequire is the standard bridge from an ESM script — no new dependency, ajv is already a root devDependency (see scripts/validate-contracts.js). */
function validateWithAjv(emitted) {
  const require = createRequire(import.meta.url);
  let Ajv;
  try {
    Ajv = require('ajv');
  } catch (err) {
    console.error(`[contracts] --check requested but ajv is not resolvable: ${err.message}`);
    return false;
  }
  const ajv = new Ajv({ strict: false, allErrors: true });
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
  const validate = ajv.compile(schema);

  let failures = 0;
  for (const { path, contract } of emitted) {
    const valid = validate(contract);
    if (!valid) {
      failures++;
      console.error(`[contracts] INVALID — ${relative(REPO_ROOT, path)}`);
      for (const e of validate.errors ?? []) console.error(`    ${e.instancePath || '/'}: ${e.message}`);
    }
  }
  if (failures) {
    console.error(`[contracts] --check FAILED — ${failures}/${emitted.length} contracts do not satisfy the schema.`);
    return false;
  }
  console.log(`[contracts] --check PASSED — ${emitted.length}/${emitted.length} contracts satisfy the schema.`);
  return true;
}

main();
