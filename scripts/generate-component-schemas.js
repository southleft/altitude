#!/usr/bin/env node
/**
 * T3.2 — Generate per-component JSON Schemas from the CEM.
 *
 * For each class declaration that has a tagName, emit a JSON Schema at
 * `libs/al-web-components/schemas/<tagName>.schema.json` describing:
 *   - props / attributes (typed from CEM)
 *   - slots (from CEM)
 *   - events (from CEM)
 *   - cssParts (from CEM)
 *   - cssProperties (from CEM)
 *   - migration state (from migration.json)
 *
 * The contract validator (T3.4) reads these schemas to check examples
 * (Storybook stories) for correctness.
 *
 * Plan acceptance: "one schema per component; schemas validate the existing
 * Storybook examples."
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const CEM_PATH = path.join(REPO, 'libs/al-web-components/custom-elements.json');
const MIGRATION_PATH = path.join(REPO, '.altitude/migration.json');
const OUT_DIR = path.join(REPO, 'libs/al-web-components/schemas');

function attrTypeToJsonSchema(typeText) {
  if (!typeText) return { type: 'string' };
  const trimmed = typeText.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'boolean') return { type: 'boolean' };
  if (lower === 'number') return { type: 'number' };
  if (lower === 'string') return { type: 'string' };

  if (trimmed.includes('|')) {
    // Walk the union: partition into primitive types (`boolean`, `number`,
    // `string`) and string-literal members ('foo', "bar"). Mix yields anyOf.
    const parts = trimmed.split('|').map((s) => s.trim()).filter(Boolean);
    const primitives = new Set();
    const literals = [];
    let dropped = false;
    for (const p of parts) {
      const plower = p.toLowerCase();
      if (plower === 'boolean') primitives.add('boolean');
      else if (plower === 'number') primitives.add('number');
      else if (plower === 'string') primitives.add('string');
      else if (/^(['"]).*\1$/.test(p)) literals.push(p.replace(/^['"]|['"]$/g, ''));
      else dropped = true;
    }
    if (!dropped) {
      const anyOf = [];
      for (const t of primitives) anyOf.push({ type: t });
      if (literals.length) anyOf.push({ type: 'string', enum: literals });
      if (anyOf.length === 1) return anyOf[0];
      if (anyOf.length > 1) return { anyOf };
    }
  }

  return { type: 'string', description: `typescript: ${typeText}` };
}

function classToSchema(c, migration) {
  const props = (c.members || []).filter((m) => m.kind === 'field' && !m.static && m.attribute);
  const propertySchema = Object.fromEntries(
    props.map((p) => [
      p.attribute,
      {
        ...(p.description ? { description: p.description } : {}),
        ...attrTypeToJsonSchema(p.type?.text),
      },
    ])
  );
  const componentName = (c.path || '').match(/components\/([^/]+)\//)?.[1];
  const migrationEntry = componentName && migration.components?.[componentName];

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: `https://southleft.com/altitude/${c.tagName}.schema.json`,
    title: `${c.name} (${c.tagName})`,
    description: c.description || `Schema for ${c.tagName}`,
    type: 'object',
    altitude: {
      tagName: c.tagName,
      className: c.name,
      module: c.path || c.module,
      ...(migrationEntry ? { migration: migrationEntry } : {}),
      slots: c.slots || [],
      events: (c.events || []).map((e) => ({ name: e.name, description: e.description || '' })),
      cssParts: c.cssParts || [],
      cssProperties: c.cssProperties || [],
    },
    properties: {
      tagName: { const: c.tagName },
      attributes: {
        type: 'object',
        additionalProperties: false,
        properties: propertySchema,
      },
      children: { type: 'array', items: { type: 'object' } },
    },
    required: ['tagName'],
  };
}

function main() {
  if (!fs.existsSync(CEM_PATH)) {
    console.error('[schemas] missing CEM — run yarn workspace al-web-components build:custom-elements.json first');
    process.exit(1);
  }
  const cem = JSON.parse(fs.readFileSync(CEM_PATH, 'utf8'));
  const migration = fs.existsSync(MIGRATION_PATH)
    ? JSON.parse(fs.readFileSync(MIGRATION_PATH, 'utf8'))
    : { components: {} };
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const knownComponents = new Set(Object.keys(migration.components || {}));
  const classes = (cem.modules || []).flatMap((m) =>
    (m.declarations || [])
      .filter((d) => d.kind === 'class' && d.tagName)
      .map((d) => ({ ...d, path: m.path }))
      // Bound the schema set to declared (migration-tracked) components.
      // Filters out spike artifacts like `al-button-vite-spike`.
      .filter((d) => {
        const componentName = (d.path || '').match(/components\/([^/]+)\//)?.[1];
        return knownComponents.has(componentName);
      })
  );

  let written = 0;
  for (const c of classes) {
    const schema = classToSchema(c, migration);
    // Normalize CRLF inside string values (JSDoc descriptions carry the source
    // file's line endings verbatim). Without this, regenerating on Windows
    // rewrites every schema with `\r\n` escapes and produces ~60 files of pure
    // line-ending churn that buries the real diff.
    const json = JSON.stringify(schema, (_k, v) => (typeof v === 'string' ? v.split('\r\n').join('\n') : v), 2);
    fs.writeFileSync(path.join(OUT_DIR, `${c.tagName}.schema.json`), json + '\n');
    written++;
  }
  console.log(`[schemas] wrote ${written} component schema(s) → libs/al-web-components/schemas/`);
}

main();
