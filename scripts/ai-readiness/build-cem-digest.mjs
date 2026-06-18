#!/usr/bin/env node
// Build the AI-readiness CEM digest from libs/al-web-components/custom-elements.json.
//
// The digest is a thin JSON map of every real <al-*> tag with its real
// attributes, slots, events, cssParts, and cssProperties — including the
// JSDoc literal-union type strings the AI agents need to use enum values
// correctly. The fleet agents are pointed at /tmp/ai-readiness-cem-digest.json
// during the probe; this script regenerates that file from the canonical CEM.
//
// Usage:  node scripts/ai-readiness/build-cem-digest.js
// Writes: /tmp/ai-readiness-cem-digest.json
//         .altitude/ai-readiness/cem-digest.json (durable copy)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const CEM_PATH = resolve(ROOT, 'libs/al-web-components/custom-elements.json');
const TMP_OUT = '/tmp/ai-readiness-cem-digest.json';
const REPO_OUT = resolve(ROOT, '.altitude/ai-readiness/cem-digest.json');

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
        description: (a.description || '').split('\n')[0].slice(0, 100),
      })),
      events: (d.events || []).map(e => ({
        name: e.name,
        type: e.type?.text || 'CustomEvent',
        description: (e.description || '').split('\n')[0].slice(0, 100),
      })),
      slots: (d.slots || []).map(s => ({
        name: s.name || '(default)',
        description: (s.description || '').slice(0, 100),
      })),
      cssParts: (d.cssParts || []).map(p => p.name),
      cssProperties: (d.cssProperties || []).map(p => p.name),
    };
  }
}

const payload = JSON.stringify(tags, null, 2);
writeFileSync(TMP_OUT, payload);
mkdirSync(dirname(REPO_OUT), { recursive: true });
writeFileSync(REPO_OUT, payload);

console.log(`Wrote ${Object.keys(tags).length} tags`);
console.log(`  ${TMP_OUT}`);
console.log(`  ${REPO_OUT}`);
