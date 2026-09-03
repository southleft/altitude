#!/usr/bin/env node
/**
 * Documented slots and parts must actually exist in the render.
 *
 * The existing manifest gate checks that every member is DOCUMENTED. Nothing
 * checked the other direction: that a documented member EXISTS. So
 * `components/card/card.ts` has advertised `@slot action-right` for as long as
 * it has existed while its render emits only `actions-start`, `actions-end`,
 * `image`, `header` and `footer` — anything a consumer assigns to
 * `slot="action-right"` on an `<al-card>` silently vanishes. The manifest is
 * the source for the generated docs, the MCP server and `llms.txt`, so one
 * wrong line teaches the same non-existent API in three places at once. The
 * brand layer's `sl-card` renders that slot for real, which is how the gap was
 * found — and exactly why it was invisible from inside either file alone.
 *
 * This gate parses each element's template for `<slot name="…">` (and the
 * unnamed `<slot>`) and for `part="…"`, following the superclass chain so an
 * element that inherits its render — every `al-icon-*` alias inherits
 * `ALIconBase` — is judged on the code that actually runs. It reports both
 * directions:
 *
 *   documented but absent  -> ERROR. The docs promise something that is not there.
 *   present but undocumented -> warning. Real API nobody is told about.
 *
 * Where a name cannot be determined statically — `<slot name=${…}>`, a
 * `part` built from an expression — the element is SKIPPED BY NAME and printed.
 * Guessing would be worse than not looking, and silently omitting it would be
 * worse than either: an unanalysable component must appear in the output.
 *
 * Errors are pinned in `.altitude/baselines/cem-render.json` per package and
 * must match exactly. Above the pin, something regressed. BELOW the pin,
 * someone fixed a defect and left the ceiling high — that fails too, and says
 * to run `--update`. A ratchet that only notices increases never moves.
 *
 * Usage:
 *   node scripts/check-cem-render.mjs                 # check
 *   node scripts/check-cem-render.mjs --update        # re-pin after a fix
 *   node scripts/check-cem-render.mjs --json          # machine-readable
 *   node scripts/check-cem-render.mjs --package libs/al-web-components
 *
 * Exit codes: 0 pass · 1 defect or ratchet mismatch · 2 could not measure.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const DEFAULT_PACKAGES = ['libs/al-web-components', 'libs/sl-web-components'];

const HELP = `Usage: node scripts/check-cem-render.mjs [options]

  --package <dir>   package to check, repo-relative (default: every package in
                    ${DEFAULT_PACKAGES.join(', ')} that has a custom-elements.json)
  --json            emit the machine-readable report on stdout
  --update          re-pin the ratchet to the measured error count; required
                    after fixing a documented-but-absent slot or part
  --root <dir>      repo root (default: the repo this script lives in)
  --baseline <file> ratchet baseline path
  --help            this text

Exit codes: 0 pass · 1 defect or ratchet mismatch · 2 could not measure.
`;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const [k, inline] = a.replace(/^--/, '').split('=');
    if (inline !== undefined) out[k] = inline;
    else out[k] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return out;
}

function die(message) {
  console.error(`cem-render: ${message}`);
  process.exit(2);
}

/**
 * Remove comments before scanning. A doc block that merely TALKS about a slot
 * — `sl-card` has a `@slot` description containing the literal text
 * "renders no matching <slot> element" — is not a render, and counting it
 * would make the gate report the defect as fixed by the sentence describing it.
 * Only block comments and whole-line `//` comments are stripped; a mid-line
 * `//` is left alone so `https://` inside a template survives.
 */
export function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => (/^\s*\/\//.test(line) ? '' : line))
    .join('\n');
}

/**
 * Attribute list of every `<slot …>` in the source.
 *
 * A naive `<slot\b([^>]*)>` stops at the first `>`, which an arrow function in
 * an event binding (`@slotchange=${() => this.read()}`) supplies before the tag
 * actually closes — that truncation silently turned three real components into
 * "unanalysable". So the closing `>` is found by walking the tag while
 * tracking quote and `${…}` nesting.
 */
export function slotAttributeLists(source) {
  const out = [];
  const open = /<slot\b/g;
  let m;
  while ((m = open.exec(source)) !== null) {
    let i = m.index + m[0].length;
    let depth = 0;
    let quote = null;
    let closed = false;
    for (; i < source.length; i++) {
      const c = source[i];
      if (quote) {
        if (c === quote) quote = null;
        continue;
      }
      if (depth === 0 && (c === '"' || c === "'")) {
        quote = c;
        continue;
      }
      if (c === '$' && source[i + 1] === '{') {
        depth += 1;
        i += 1;
        continue;
      }
      if (depth > 0) {
        if (c === '{') depth += 1;
        else if (c === '}') depth -= 1;
        continue;
      }
      if (c === '>') {
        closed = true;
        break;
      }
    }
    if (!closed) continue; // truncated source; nothing safe to say
    out.push(source.slice(m.index + m[0].length, i));
    open.lastIndex = i;
  }
  return out;
}

/**
 * Static `<slot>` names in a template, plus every slot whose name is an
 * expression. `''` is the unnamed default slot.
 */
export function extractSlots(source) {
  const names = new Set();
  const dynamic = [];
  for (const attrs of slotAttributeLists(source)) {
    const nameAttr = attrs.match(/(?:^|\s)\.?name\s*=\s*("([^"]*)"|'([^']*)'|(\$\{[^}]*\}))/);
    if (!nameAttr) {
      // No `name` at all. An event binding (`@slotchange=${…}`) is not a
      // dynamic NAME — the expression sits in VALUE position. Only an
      // interpolation in attribute-NAME position (a spread directive) can
      // hide a name; everything else here is the unnamed default slot.
      if (/(?:^|\s)\$\{/.test(attrs)) dynamic.push(m[0].trim());
      else names.add('');
      continue;
    }
    const literal = nameAttr[2] ?? nameAttr[3];
    if (literal === undefined || /\$\{/.test(literal)) {
      dynamic.push(`<slot${attrs}>`.replace(/\s+/g, ' ').trim());
      continue;
    }
    names.add(literal);
  }
  return { names, dynamic };
}

/** Static `part="…"` names, plus every part built from an expression. */
export function extractParts(source) {
  const names = new Set();
  const dynamic = [];
  const re = /(?:^|\s)part\s*=\s*("([^"]*)"|'([^']*)'|(\$\{[^}]*\}))/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const literal = m[2] ?? m[3];
    if (literal === undefined || /\$\{/.test(literal)) {
      dynamic.push(`<slot${attrs}>`.replace(/\s+/g, ' ').trim());
      continue;
    }
    for (const part of literal.split(/\s+/).filter(Boolean)) names.add(part);
  }
  // `exportparts` re-publishes a child's parts under this element's name.
  const ex = /(?:^|\s)exportparts\s*=\s*"([^"]*)"/g;
  while ((m = ex.exec(source)) !== null) {
    for (const entry of m[1].split(',')) {
      const [, alias] = entry.split(':').map((s) => s.trim());
      const [inner] = entry.split(':').map((s) => s.trim());
      names.add(alias || inner);
    }
  }
  return { names, dynamic };
}

/** Every class declaration in a manifest, keyed for superclass resolution. */
function indexClasses(cem) {
  const index = [];
  for (const mod of cem.modules || []) {
    for (const decl of mod.declarations || []) {
      if (decl.kind === 'class') index.push({ mod, decl });
    }
  }
  return index;
}

function resolveChain(entry, index) {
  const chain = [entry];
  let node = entry;
  let depth = 0;
  while (node && depth < 12) {
    const sup = node.decl.superclass;
    if (!sup) break;
    const hint = (sup.module || '').replace(/^\//, '').replace(/\.[tj]s$/, '');
    const next = index.find(
      (e) => e.decl.name === sup.name && (!hint || e.mod.path.replace(/\.[tj]s$/, '') === hint)
    );
    if (!next || chain.includes(next)) break;
    chain.push(next);
    node = next;
    depth += 1;
  }
  return chain;
}

/**
 * Analyse one package. Returns errors (documented but absent), warnings
 * (present but undocumented) and named skips (unanalysable templates, and
 * manifest entries whose source file is missing).
 */
export function analysePackage(root, pkgDir) {
  const cemPath = join(root, pkgDir, 'custom-elements.json');
  if (!existsSync(cemPath)) return null;
  let cem;
  try {
    cem = JSON.parse(readFileSync(cemPath, 'utf8'));
  } catch (error) {
    die(`${cemPath} is not valid JSON — ${error.message}`);
  }
  const index = indexClasses(cem);
  const errors = [];
  const warnings = [];
  const skips = [];
  let elements = 0;

  for (const mod of cem.modules || []) {
    for (const decl of mod.declarations || []) {
      if (decl.kind !== 'class' || !decl.customElement) continue;
      const tag = decl.tagName;
      if (!tag) {
        skips.push({ tag: `${mod.path}::${decl.name}`, reason: 'custom element with no tagName in the manifest' });
        continue;
      }
      elements += 1;

      const chain = resolveChain({ mod, decl }, index);
      let source = '';
      const missingSources = [];
      for (const link of chain) {
        const file = join(root, pkgDir, link.mod.path);
        if (!existsSync(file)) {
          missingSources.push(link.mod.path);
          continue;
        }
        source += `\n${stripComments(readFileSync(file, 'utf8'))}`;
      }
      if (missingSources.length && !source.trim()) {
        skips.push({
          tag,
          reason: `no readable source for the render (${missingSources.join(', ')} absent from the working tree)`,
        });
        continue;
      }
      if (missingSources.length) {
        skips.push({
          tag,
          reason: `part of the superclass chain is unreadable (${missingSources.join(', ')}); judged on what was readable`,
        });
      }

      const slots = extractSlots(source);
      const parts = extractParts(source);

      if (slots.dynamic.length) {
        skips.push({
          tag,
          reason: `${slots.dynamic.length} slot name(s) built from an expression — not statically knowable: ${slots.dynamic
            .slice(0, 3)
            .join(' ')}`,
          suppresses: 'slots',
        });
      }
      if (parts.dynamic.length) {
        skips.push({
          tag,
          reason: `${parts.dynamic.length} part name(s) built from an expression — not statically knowable: ${parts.dynamic
            .slice(0, 3)
            .join(' ')}`,
          suppresses: 'parts',
        });
      }

      const documentedSlots = (decl.slots || []).map((s) => s.name ?? '');
      const documentedParts = (decl.cssParts || []).map((p) => p.name);

      if (!slots.dynamic.length) {
        for (const name of documentedSlots) {
          if (!slots.names.has(name)) {
            errors.push({ tag, kind: 'slot', name, module: mod.path });
          }
        }
        for (const name of slots.names) {
          if (!documentedSlots.includes(name)) {
            warnings.push({ tag, kind: 'slot', name, module: mod.path });
          }
        }
      }
      if (!parts.dynamic.length) {
        for (const name of documentedParts) {
          if (!parts.names.has(name)) {
            errors.push({ tag, kind: 'csspart', name, module: mod.path });
          }
        }
        for (const name of parts.names) {
          if (!documentedParts.includes(name)) {
            warnings.push({ tag, kind: 'csspart', name, module: mod.path });
          }
        }
      }
    }
  }
  return { pkg: pkgDir, elements, errors, warnings, skips };
}

// ---------------------------------------------------------------------------

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  console.log(HELP);
  process.exit(0);
}

const ROOT = resolve(options.root === true || !options.root ? resolve(HERE, '..') : options.root);
const BASELINE = resolve(
  options.baseline && options.baseline !== true ? options.baseline : join(ROOT, '.altitude/baselines/cem-render.json')
);
const packages =
  options.package && options.package !== true ? [String(options.package).replace(/\\/g, '/')] : DEFAULT_PACKAGES;

const results = [];
for (const pkg of packages) {
  const result = analysePackage(ROOT, pkg);
  if (result) results.push(result);
}
if (!results.length) die(`no custom-elements.json found under ${packages.join(', ')} — cannot measure.`);
if (!results.some((r) => r.elements > 0)) die('manifests contain no custom elements — cannot measure.');

const measured = {};
for (const r of results) measured[r.pkg] = r.errors.length;
const totalErrors = results.reduce((n, r) => n + r.errors.length, 0);
const totalWarnings = results.reduce((n, r) => n + r.warnings.length, 0);

const report = {
  root: ROOT,
  packages: results.map((r) => ({
    package: r.pkg,
    elements: r.elements,
    errors: r.errors,
    warnings: r.warnings,
    skips: r.skips,
  })),
  measured,
  totalErrors,
  totalWarnings,
};

if (options.json) console.log(JSON.stringify(report, null, 2));

if (!options.json) {
  console.log('Altitude — documented slots/parts vs. render');
  for (const r of results) {
    console.log(`  ${r.pkg}: ${r.elements} elements · ${r.errors.length} absent · ${r.warnings.length} undocumented`);
  }

  for (const r of results) {
    if (r.skips.length) {
      console.log(`\n  SKIPPED in ${r.pkg} — ${r.skips.length} element(s) not statically analysable:`);
      for (const s of r.skips) console.log(`      ${s.tag} — ${s.reason}`);
    }
  }

  if (totalWarnings) {
    console.log(`\n  WARN — ${totalWarnings} slot/part rendered but not documented (the manifest under-reports API):`);
    for (const r of results) {
      for (const w of r.warnings) {
        console.log(`      ${w.tag}  ${w.kind} "${w.name}"  ${r.pkg}/${w.module}`);
      }
    }
  }
}

let failed = false;

if (totalErrors && !options.json) {
  console.log(`\n  ABSENT — ${totalErrors} documented slot/part with no matching element in the render:`);
  for (const r of results) {
    for (const e of r.errors) {
      console.log(`      ${e.tag}  ${e.kind} "${e.name}"  ${r.pkg}/${e.module}`);
    }
  }
}

if (!existsSync(BASELINE)) {
  mkdirSync(dirname(BASELINE), { recursive: true });
  writeFileSync(
    BASELINE,
    `${JSON.stringify(
      { ceiling: measured, total: totalErrors, updated: new Date().toISOString(), note: 'seeded' },
      null,
      2
    )}\n`
  );
  if (!options.json) console.log(`\ncem-render: seeded baseline at ${totalErrors} absent slot/part(s).`);
  process.exit(0);
}

let baseline;
try {
  baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
} catch (error) {
  die(`baseline at ${BASELINE} is not valid JSON — ${error.message}`);
}
const pinned = baseline.total ?? 0;
const pinnedCeiling = baseline.ceiling || {};

if (options.update) {
  writeFileSync(
    BASELINE,
    `${JSON.stringify(
      {
        ceiling: measured,
        total: totalErrors,
        updated: new Date().toISOString(),
        note: totalErrors < pinned ? `tightened from ${pinned}` : `re-pinned from ${pinned}`,
      },
      null,
      2
    )}\n`
  );
  if (!options.json) console.log(`\nRe-pinned: ${pinned} -> ${totalErrors}.`);
  process.exit(0);
}

const rose = Object.entries(measured).filter(([pkg, n]) => n > (pinnedCeiling[pkg] ?? 0));
if (rose.length) {
  console.error(
    `\nFAIL — documented-but-absent slots/parts increased: ${rose
      .map(([pkg, n]) => `${pkg} ${pinnedCeiling[pkg] ?? 0} -> ${n}`)
      .join(', ')}.\n` +
      'Either render the slot/part, or delete the `@slot` / `@csspart` line that promises it —\n' +
      'then regenerate custom-elements.json.'
  );
  failed = true;
} else if (totalErrors < pinned) {
  console.error(
    `\nFAIL — absent slots/parts DROPPED: ${pinned} -> ${totalErrors}, but the ceiling is still ${pinned}.\n` +
      'Something was fixed and the ratchet was not turned; that slack would silently permit a future regression.\n' +
      'Run:  node scripts/check-cem-render.mjs --update'
  );
  failed = true;
}

if (failed) process.exit(1);

if (!options.json) {
  console.log(`\nOK — ${totalErrors} absent slot/part(s), exactly at the pin.`);
}
