#!/usr/bin/env node
// Build the AI-readiness CEM digest from libs/al-web-components/custom-elements.json.
//
// The digest is a thin JSON map of every real <al-*> tag with its real
// attributes, slots, events, cssParts, and cssProperties — including the
// JSDoc literal-union type strings the AI agents need to use enum values
// correctly. The fleet agents are pointed at the tmp-dir mirror (see TMPDIR
// below) during the probe; this script regenerates that file from the canonical CEM.
//
// Description truncation: full multiline JSDoc is preserved up to
// DESC_MAX (currently 1200) chars per field — a low cap here silently cuts
// off the disambiguating clauses the prose docs keep adding. (This comment
// previously said 600, drifted from the code — keep it in sync with
// DESC_MAX below, not the other way around.)
//
// Machine-readable carve-outs: `doNotFlag` is a per-tag list of sanctioned
// patterns that reviewer agents must NOT treat as violations (e.g.
// controlled `close()` on dismissible atoms). Prose carve-outs in AGENTS.md
// are model-dependent; the digest field is unambiguous. See DO_NOT_FLAG
// table below.
//
// Usage:  node scripts/ai-readiness/build-cem-digest.mjs
// Writes: <os.tmpdir()>/ai-readiness-cem-digest.json (see lib.mjs TMPDIR —
//           NOT a literal /tmp; that resolves to a different directory than
//           os.tmpdir() on Windows)
//         .altitude/ai-readiness/cem-digest.json (durable copy)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TMPDIR } from './lib.mjs';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const CEM_PATH = resolve(ROOT, 'libs/al-web-components/custom-elements.json');
const TMP_OUT = resolve(TMPDIR, 'ai-readiness-cem-digest.json');
const REPO_OUT = resolve(ROOT, '.altitude/ai-readiness/cem-digest.json');

const DESC_MAX = 1200;
const clip = (s) => (s || '').slice(0, DESC_MAX);

// Per-tag machine-readable carve-outs. Each entry is a sanctioned pattern
// that reviewers / scaffolders must NOT treat as a convention violation.
// Surfaces in the digest as `tags[<tag>].doNotFlag`.
const DO_NOT_FLAG = {
  'al-chip': [
    {
      pattern: 'controlled-close-without-isDismissed',
      rule: 'A host that exposes a public close() method without owning an `isDismissed` boolean is a SANCTIONED dismissal model. Do NOT flag "missing isDismissed property", "missing al-is-dismissed hide class", or "incomplete dismissal model" when controlled close() is the chosen shape. The consumer\'s container manages dismissal state (chip groups, form-managed tag lists). The owned-state recipe is one of TWO acceptable shapes, not the only one.',
      severity: 'do-not-flag',
      citation: 'AGENTS.md "Dismissal model" row + Reviewer must-read block',
    },
    {
      pattern: 'close-keyboard-handler-optional',
      rule: 'Escape-key handling via handleOnKeydown is an ENHANCEMENT, not a blocker. Do NOT flag its absence on a small atom.',
      severity: 'do-not-flag',
      citation: 'AGENTS.md dismissible-atom recipe severity column',
    },
  ],
  'al-tag': [
    {
      pattern: 'controlled-close-without-isDismissed',
      rule: 'Same as al-chip. Controlled close() without owned isDismissed is sanctioned for al-tag too.',
      severity: 'do-not-flag',
      citation: 'scripts/ai-readiness/fixtures/canonical-contracts.md > Canonical al-tag contract',
    },
    {
      pattern: 'dispatch-only-handler-IS-controlled-close',
      rule: 'AFFIRMATIVE: A handler method (named `handleClose`, `onClose`, `dismiss`, or anything else) that ONLY dispatches a close event (no `isDismissed` state mutation, no method literally named `close()`) IS the sanctioned controlled-close shape. It COUNTS as controlled-close. Do NOT flag it as "incomplete", "partial", "neither shape", or "missing close() method". The method name does not matter — what matters is that the dismissal decision is delegated to the consumer via the dispatched event. Reviewers reasoning "this is neither owned-state nor a literal close() method, therefore neither shape" are misreading the rule.',
      severity: 'do-not-flag',
      citation: 'scripts/ai-readiness/fixtures/canonical-contracts.md > Canonical al-tag contract, Dismissal model row',
    },
  ],
  'al-button': [
    {
      pattern: 'no-variant-attribute-for-primary',
      rule: 'A primary `<al-button>` is rendered by OMITTING the variant attribute. "Primary" is not in the variant enum (`secondary | tertiary | bare | danger`). Do NOT flag the absence of variant="primary" as a missing variant or a typing bug — the unset value IS the primary state.',
      severity: 'do-not-flag',
      citation: 'AGENTS.md Naming and API conventions, "Primary action" row',
    },
  ],
  'al-icon': [
    {
      pattern: 'phosphor-name-is-canonical',
      rule: 'AFFIRMATIVE: `<al-icon name="...">` with any of the 1,512 Phosphor regular names is the CURRENT canonical form. Do NOT flag it as an unregistered tag, a missing `<al-icon-*>` element, or an invalid attribute. The 37 `<al-icon-<legacy>>` elements (al-icon-close, al-icon-add, al-icon-chevron-down, ...) still work but are DEPRECATED aliases — do NOT recommend migrating from `name=` back to them. Phosphor names differ from the old Altitude names: x (not close), plus (not add), caret-down (not chevron-down), magnifying-glass (not search), gear (not settings), dots-three-vertical (not dots-vertical).',
      severity: 'do-not-flag',
      citation: 'AGENTS.md > Icon system',
    },
    {
      pattern: 'list-name-collision-is-intentional',
      rule: '`<al-icon name="list">` (Phosphor hamburger) and `<al-icon-list>` (legacy bulleted list, = Phosphor `list-dashes`) intentionally render DIFFERENT artwork. Name resolution checks the Phosphor catalog BEFORE the legacy alias map, so a legacy name can never shadow a real Phosphor icon. Do NOT flag this divergence as an inconsistency or a mapping bug.',
      severity: 'do-not-flag',
      citation: 'icons/legacy-aliases.json shadowed[] + AGENTS.md > Icon system',
    },
    {
      pattern: 'icon-title-not-aria-label',
      rule: 'On `<al-icon>`, `iconTitle` IS the accessible-name API — it renders `role="img"` plus `aria-label`. An `<al-icon>` with NO iconTitle is intentionally `aria-hidden="true"` / `role="presentation"`, which is correct for a decorative icon next to visible text. Do NOT flag a missing aria-label on `<al-icon>`, and do NOT recommend adding aria-label alongside iconTitle.',
      severity: 'do-not-flag',
      citation: 'AGENTS.md > Icon system',
    },
    {
      pattern: 'no-icon-webfont',
      rule: 'The icon webfont was REMOVED. `.icon-<name>` utility classes and the `iconfont` @font-face no longer exist, and components/icon/fonts/iconfont.css is an intentionally empty deprecation stub. Do NOT flag the empty stub as a broken or truncated file, and do NOT suggest font-based icons.',
      severity: 'do-not-flag',
      citation: 'AGENTS.md > Icon system',
    },
  ],
  'al-stat-card': [
    {
      pattern: 'molecule-mis-taxonomy',
      rule: 'A display atom that composes internal `<al-icon>` atoms for decoration remains an Atom. Do NOT flag `title: "Atoms/Stat Card"` as a taxonomy violation that "should be Molecules" — the Molecules tier is reserved for compositions that combine 2+ semantically meaningful atoms, not for atoms that wrap decorative icons.',
      severity: 'do-not-flag',
      citation: 'scripts/ai-readiness/fixtures/canonical-contracts.md > Canonical stat-card contract, Taxonomy row',
    },
    {
      pattern: 'consumed-theme-token-not-cssproperty',
      rule: 'A consumed `--al-theme-*` token (e.g. --al-theme-color-content-default) is NOT a @cssproperty of the component that reads it. Do NOT flag the absence of @cssproperty entries for global theme tokens; only the component\'s own --al-<component>-* override hooks are @cssproperty.',
      severity: 'do-not-flag',
      citation: 'AGENTS.md @cssproperty semantics + scripts/ai-readiness/fixtures/canonical-contracts.md > Canonical stat-card contract, Owned override hooks row',
    },
  ],
};

// EVAL-FIXTURE stubs. Neither tag is a real component and neither is planned:
// al-stat-card is the subject of tasks/B-scaffold.md, al-tag of
// tasks/C-violation.md. They are emitted so the DO_NOT_FLAG entries above and
// the judge's cross-references do not dangle (v11 hit that on al-tag), NOT as
// a roadmap signal. `al-stat` and `al-chip` already ship these use cases, and
// the pinned contracts live in fixtures/canonical-contracts.md — deliberately
// out of AGENTS.md since 2026-08-23, so an agent doing product work is never
// told to build them.
const FORWARD_STUBS = {
  'al-tag': {
    tag: 'al-tag',
    status: 'eval-fixture',
    note: 'NOT A REAL COMPONENT - an AI-readiness eval fixture (tasks/C-violation.md). al-chip ships the same use case. Contract: scripts/ai-readiness/fixtures/canonical-contracts.md.',
    attributes: [],
    events: [],
    slots: [],
    cssParts: [],
    cssProperties: [],
  },
  'al-stat-card': {
    tag: 'al-stat-card',
    status: 'eval-fixture',
    note: 'NOT A REAL COMPONENT - an AI-readiness eval fixture (tasks/B-scaffold.md). al-stat ships the same use case. Contract: scripts/ai-readiness/fixtures/canonical-contracts.md.',
    attributes: [],
    events: [],
    slots: [],
    cssParts: [],
    cssProperties: [],
  },
};

// Slot-description enrichment: prose rules that should travel with the
// manifest (so digest-only consumers see them too). Each key is "tag.slot",
// the value is appended to whatever description the JSDoc carries.
const SLOT_ENRICHMENT = {
  'al-card.header': `\n\n**Blessed light-DOM cluster pattern.** Projecting multiple atoms (avatar + name + status badge) into this slot requires inline-flex with theme tokens — al-u-* utilities do NOT adopt into light-DOM slot content. Sanctioned shape: <div slot="header" style="display:flex; gap:var(--al-theme-space-sm); align-items:center;">…</div>. Do NOT hand-roll rem values (token drift).`,
  'al-card.action-right': `\n\n**Kebab / overflow menu composite (canonical).** This slot accepts a self-contained <al-popover variant="menu" position="bottom-right"> whose trigger slot holds an icon-only <al-button hideText label="…"> + chevron icon, and whose default slot holds an <al-menu> with @onMenuItemSelect bound. The popover trigger slot auto-wires open/close — no manual isActive needed. See AGENTS.md "Kebab menu (3-dot action menu)" recipe.`,
  'al-card.actions-end': `\n\n**Canonical bottom-right primary action.** Drop variant for the primary look (omit the attribute); use variant="tertiary" for a secondary action.`,
};

const cem = JSON.parse(readFileSync(CEM_PATH, 'utf8'));
const tags = {};
for (const m of cem.modules || []) {
  for (const d of m.declarations || []) {
    if (!d.tagName) continue;
    tags[d.tagName] = {
      tag: d.tagName,
      attributes: (d.attributes || []).map(a => ({
        name: a.name,
        type: a.type?.text || 'any',
        description: clip(a.description),
      })),
      events: (d.events || []).map(e => ({
        name: e.name,
        type: e.type?.text || 'CustomEvent',
        description: clip(e.description),
      })),
      slots: (d.slots || []).map(s => {
        const name = s.name || '(default)';
        const extra = SLOT_ENRICHMENT[`${d.tagName}.${name}`] || '';
        return {
          name,
          description: clip((s.description || '') + extra),
        };
      }),
      cssParts: (d.cssParts || []).map(p => p.name),
      cssProperties: (d.cssProperties || []).map(p => p.name),
      doNotFlag: DO_NOT_FLAG[d.tagName] || [],
    };
  }
}
// Merge forward-looking stubs after CEM iteration so they always appear
// even when no source has been written yet.
for (const [tag, stub] of Object.entries(FORWARD_STUBS)) {
  if (!tags[tag]) {
    tags[tag] = { ...stub, doNotFlag: DO_NOT_FLAG[tag] || [] };
  }
}

const payload = JSON.stringify(tags, null, 2);
writeFileSync(TMP_OUT, payload);
mkdirSync(dirname(REPO_OUT), { recursive: true });
writeFileSync(REPO_OUT, payload);

const doNotFlagCount = Object.values(tags).reduce((n, t) => n + t.doNotFlag.length, 0);
console.log(`Wrote ${Object.keys(tags).length} tags (${doNotFlagCount} doNotFlag rules across ${Object.keys(DO_NOT_FLAG).length} components)`);
console.log(`  ${TMP_OUT}`);
console.log(`  ${REPO_OUT}`);
