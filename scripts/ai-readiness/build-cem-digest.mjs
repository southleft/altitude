#!/usr/bin/env node
// Build the AI-readiness CEM digest from libs/al-web-components/custom-elements.json.
//
// The digest is a thin JSON map of every real <al-*> tag with its real
// attributes, slots, events, cssParts, and cssProperties — including the
// JSDoc literal-union type strings the AI agents need to use enum values
// correctly. The fleet agents are pointed at /tmp/ai-readiness-cem-digest.json
// during the probe; this script regenerates that file from the canonical CEM.
//
// Description truncation: full multiline JSDoc is preserved up to 600 chars
// per field (v11 raised from the previous 100 — the cap was silently cutting
// off the disambiguating clauses the prose docs kept adding).
//
// Machine-readable carve-outs: `doNotFlag` is a per-tag list of sanctioned
// patterns that reviewer agents must NOT treat as violations (e.g.
// controlled `close()` on dismissible atoms). Prose carve-outs in AGENTS.md
// are model-dependent; the digest field is unambiguous. See DO_NOT_FLAG
// table below.
//
// Usage:  node scripts/ai-readiness/build-cem-digest.mjs
// Writes: /tmp/ai-readiness-cem-digest.json
//         .altitude/ai-readiness/cem-digest.json (durable copy)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const CEM_PATH = resolve(ROOT, 'libs/al-web-components/custom-elements.json');
const TMP_OUT = '/tmp/ai-readiness-cem-digest.json';
const REPO_OUT = resolve(ROOT, '.altitude/ai-readiness/cem-digest.json');

const DESC_MAX = 600;
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
      citation: 'AGENTS.md Canonical al-tag contract',
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
  'al-stat-card': [
    {
      pattern: 'molecule-mis-taxonomy',
      rule: 'A display atom that composes internal al-icon-* atoms for decoration remains an Atom. Do NOT flag `title: "Atoms/Stat Card"` as a taxonomy violation that "should be Molecules" — the Molecules tier is reserved for compositions that combine 2+ semantically meaningful atoms, not for atoms that wrap decorative icons.',
      severity: 'do-not-flag',
      citation: 'AGENTS.md Canonical stat-card contract, Taxonomy row',
    },
    {
      pattern: 'consumed-theme-token-not-cssproperty',
      rule: 'A consumed `--al-theme-*` token (e.g. --al-theme-color-content-default) is NOT a @cssproperty of the component that reads it. Do NOT flag the absence of @cssproperty entries for global theme tokens; only the component\'s own --al-<component>-* override hooks are @cssproperty.',
      severity: 'do-not-flag',
      citation: 'AGENTS.md @cssproperty semantics + Canonical stat-card contract, Owned override hooks row',
    },
  ],
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
      slots: (d.slots || []).map(s => ({
        name: s.name || '(default)',
        description: clip(s.description),
      })),
      cssParts: (d.cssParts || []).map(p => p.name),
      cssProperties: (d.cssProperties || []).map(p => p.name),
      doNotFlag: DO_NOT_FLAG[d.tagName] || [],
    };
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
