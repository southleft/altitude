#!/usr/bin/env node
/**
 * Self-test for libs/al-web-components/cli/validate.mjs — the shipped consumer validator.
 *
 * Every rule gets BOTH fixtures: a snippet that must fire it, and a near-miss that must NOT.
 * That asymmetry is the point. The MCP self-heal loop (libs/altitude-mcp/src/lib/prompts.mjs)
 * tells an agent to iterate until the validator reports zero violations, so a false positive
 * is not a cosmetic annoyance — it is an agent that can never finish. Misses are recoverable;
 * unsatisfiable rules are not.
 *
 * Offline, dependency-free, no build: it writes each fixture to a temp file and shells out to
 * the CLI exactly as a consumer would. Run: node scripts/__tests__/validate-usage.test.mjs
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CLI = resolve(REPO, 'libs/al-web-components/cli/validate.mjs');
const WORK = mkdtempSync(join(tmpdir(), 'altitude-validate-test-'));

let PASS = 0;
let FAIL = 0;
const failures = [];

function assert(desc, cond, extra) {
  if (cond) { console.log(`  ✓ ${desc}`); PASS++; }
  else { console.log(`  ✗ ${desc}${extra ? `\n      ${extra}` : ''}`); FAIL++; failures.push(desc); }
}

let seq = 0;
/** Write `source` to a temp file of the given extension and run the CLI over just that file. */
function run(source, { ext = 'html', args = [] } = {}) {
  const file = join(WORK, `fixture-${seq++}.${ext}`);
  writeFileSync(file, source, 'utf8');
  const r = spawnSync(process.execPath, [CLI, '--json', ...args, file], { encoding: 'utf8' });
  let data;
  try { data = JSON.parse(r.stdout.trim()); } catch { data = null; }
  return { status: r.status, envelope: data, data: data?.data, stderr: r.stderr, file };
}

const codes = (res) => (res.data?.violations ?? []).map((v) => v.code);
const has = (res, code) => codes(res).includes(code);
const detailFor = (res, code) => (res.data?.violations ?? []).find((v) => v.code === code)?.detail ?? '';
const seen = (res) => JSON.stringify(codes(res));

/** A positive fixture (must fire `code`) and a negative near-miss (must not). */
function pair(code, positive, negative, opts = {}) {
  const p = run(positive, opts);
  assert(`${code} fires on the violating snippet`, has(p, code), `got ${seen(p)}`);
  const n = run(negative, opts);
  assert(`${code} stays silent on the near-miss`, !has(n, code), `got ${seen(n)}`);
  return { p, n };
}

// ── 0. envelope shape — the MCP wraps this verbatim ─────────────────────────────────────────
console.log('\n==> public JSON envelope');
{
  const r = run('<al-button variant="nope">Go</al-button>');
  assert('envelope carries apiVersion 1', r.envelope?.apiVersion === 1);
  assert('envelope type is validation.result', r.envelope?.type === 'validation.result');
  const v = r.data?.violations?.[0];
  assert('violation carries component/rule/code/fix', Boolean(v?.component && v?.rule && v?.code && v?.fix), JSON.stringify(v));
  assert('violation carries a severity', v?.severity === 'error');
  assert('data still carries passRate/totalUsages/byComponent', typeof r.data?.passRate === 'number'
    && typeof r.data?.totalUsages === 'number' && Boolean(r.data?.byComponent));
  assert('token contract resolved', typeof r.data?.tokenSource === 'string');
}

// ── 1. the case-fold bug — HTML attribute names are case-insensitive ─────────────────────────
console.log('\n==> attribute lookup is case-insensitive (bug fix)');
{
  const lower = run('<al-button isdisabled>Go</al-button>');
  assert('`isdisabled` is NOT reported unknown', !has(lower, 'ERR_UNKNOWN_ATTRIBUTE'), seen(lower));

  const upper = run('<al-button ISDISABLED>Go</al-button>');
  assert('`ISDISABLED` is NOT reported unknown', !has(upper, 'ERR_UNKNOWN_ATTRIBUTE'), seen(upper));

  const canonical = run('<al-button isdisabled="maybe">Go</al-button>');
  assert('a value error on the folded spelling still fires', has(canonical, 'ERR_TYPE_MISMATCH'), seen(canonical));
  assert('the message names the CANONICAL spelling', /isDisabled/.test(detailFor(canonical, 'ERR_TYPE_MISMATCH')),
    detailFor(canonical, 'ERR_TYPE_MISMATCH'));

  const typo = run('<al-button isdisabledd>Go</al-button>');
  assert('a genuine typo is still caught', has(typo, 'ERR_UNKNOWN_ATTRIBUTE'), seen(typo));
}

// ── 2. ERR_UNKNOWN_SLOT (llms.txt rule 3) ────────────────────────────────────────────────────
console.log('\n==> ERR_UNKNOWN_SLOT (rule 3)');
pair('ERR_UNKNOWN_SLOT',
  '<al-button><al-icon-check slot="bogus"></al-icon-check>Go</al-button>',
  '<al-button><al-icon-check slot="before"></al-icon-check>Go</al-button>');
{
  // The CEM documents ONLY al-drawer's default slot, but the component renders header/footer/
  // trigger. Reading slots from the CEM alone reported all three as wrong.
  const drawer = run('<al-drawer><al-button slot="trigger">Open</al-button><al-heading slot="header">Hi</al-heading></al-drawer>');
  assert('a slot the component renders but does not document is accepted', !has(drawer, 'ERR_UNKNOWN_SLOT'), seen(drawer));

  const notAltitude = run('<div><span slot="anything">x</span></div><al-button>Go</al-button>');
  assert('a slot on a non-Altitude parent is not checked', !has(notAltitude, 'ERR_UNKNOWN_SLOT'), seen(notAltitude));

  const named = run('<al-button><al-icon-check slot="bogus"></al-icon-check>Go</al-button>');
  assert('the message names the declared slots', /before/.test(detailFor(named, 'ERR_UNKNOWN_SLOT')),
    detailFor(named, 'ERR_UNKNOWN_SLOT'));
}

// ── 3. ERR_PHANTOM_TOKEN (llms.txt rule 2) ───────────────────────────────────────────────────
console.log('\n==> ERR_PHANTOM_TOKEN (rule 2)');
pair('ERR_PHANTOM_TOKEN',
  '<al-button style="color: var(--al-theme-color-content-primary-invented)">Go</al-button>',
  '<al-button style="color: var(--al-theme-color-content-primary-default)">Go</al-button>');
{
  const local = run('<style>al-button { --al-local-accent: red; color: var(--al-local-accent); }</style><al-button>Go</al-button>');
  assert('a custom property DECLARED in the same file is readable', !has(local, 'ERR_PHANTOM_TOKEN'), seen(local));

  const brand = run('<style>al-button { color: var(--al-color-southleft-primary-500); }</style><al-button>Go</al-button>');
  assert('a brand-only token (DTCG, absent from the base build) is accepted', !has(brand, 'ERR_PHANTOM_TOKEN'), seen(brand));

  const composite = run('<style>al-button { font: var(--al-theme-typography-body-md); letter-spacing: var(--al-theme-typography-body-md-letter-spacing); }</style><al-button>Go</al-button>');
  assert('composite typography shorthand + sub-property are accepted', !has(composite, 'ERR_PHANTOM_TOKEN'), seen(composite));

  const quoted = run('Use `var(--al-theme-focus-ring-color)` — it does not exist.\n\n<al-button>Go</al-button>\n', { ext: 'md' });
  assert('a token named inside prose backticks is not a read', !has(quoted, 'ERR_PHANTOM_TOKEN'), seen(quoted));
}

// ── 4. WARN_RAW_VALUE (llms.txt rule 1) ──────────────────────────────────────────────────────
console.log('\n==> WARN_RAW_VALUE (rule 1)');
pair('WARN_RAW_VALUE',
  '<al-button style="background-color: #ff0000">Go</al-button>',
  '<al-button style="background-color: var(--al-theme-color-background-primary-default)">Go</al-button>');
{
  const styleRule = run('<style>al-layout { padding: 24px; }</style><al-layout><al-button>Go</al-button></al-layout>');
  assert('a px length in an Altitude-scoped rule fires', has(styleRule, 'WARN_RAW_VALUE'), seen(styleRule));

  const chrome = run('<style>.page-chrome { padding: 24px; margin-bottom: 44px; color: #333; }</style><al-button>Go</al-button>');
  assert("a consuming page's own chrome rule does not fire", !has(chrome, 'WARN_RAW_VALUE'), seen(chrome));

  const hairline = run('<al-button style="border: 1px solid var(--al-theme-color-border-neutral-default)">Go</al-button>');
  assert('a 1px hairline does not fire', !has(hairline, 'WARN_RAW_VALUE'), seen(hairline));

  const geometry = run('<al-icon style="width: 24px; height: 24px"></al-icon>');
  assert('one-off width/height geometry does not fire', !has(geometry, 'WARN_RAW_VALUE'), seen(geometry));

  const foreignInline = run('<span style="font-size: 14px">label</span><al-button>Go</al-button>');
  assert('an inline style on a non-Altitude element does not fire', !has(foreignInline, 'WARN_RAW_VALUE'), seen(foreignInline));

  const warnOnly = run('<al-button style="background-color: #ff0000">Go</al-button>');
  assert('a raw value is a WARNING, not an error', warnOnly.data.violations.every((v) => v.code !== 'WARN_RAW_VALUE' || v.severity === 'warning'));
}

// ── 5. WARN_HANDROLLED_LAYOUT (llms.txt rule 5) ──────────────────────────────────────────────
console.log('\n==> WARN_HANDROLLED_LAYOUT (rule 5)');
pair('WARN_HANDROLLED_LAYOUT',
  '<div style="display:flex; gap:8px"><al-button>A</al-button><al-button>B</al-button></div>',
  '<al-layout direction="row" gap="md"><al-button>A</al-button><al-button>B</al-button></al-layout>');
{
  const one = run('<div style="display:flex"><al-button>A</al-button></div>');
  assert('a single child is not an arrangement', !has(one, 'WARN_HANDROLLED_LAYOUT'), seen(one));

  const notFlex = run('<div style="display:block"><al-button>A</al-button><al-button>B</al-button></div>');
  assert('a non-flex/grid wrapper does not fire', !has(notFlex, 'WARN_HANDROLLED_LAYOUT'), seen(notFlex));

  const viaClass = run('<style>.row { display: grid; }</style><div class="row"><al-button>A</al-button><al-button>B</al-button></div>');
  assert('a class that sets display:grid fires', has(viaClass, 'WARN_HANDROLLED_LAYOUT'), seen(viaClass));

  const fix = (viaClass.data.violations.find((v) => v.code === 'WARN_HANDROLLED_LAYOUT') ?? {}).fix ?? '';
  assert('the fix points at <al-layout> and its props', /al-layout/.test(fix) && /direction|gap/.test(fix), fix);
}

// ── 6. ERR_MISSING_THEME_HOST (llms.txt rule 4) ──────────────────────────────────────────────
console.log('\n==> ERR_MISSING_THEME_HOST (rule 4)');
const DOC_UNTHEMED = '<!doctype html>\n<html lang="en">\n<body>\n  <al-button>Go</al-button>\n</body>\n</html>\n';
const DOC_THEMED = '<!doctype html>\n<html lang="en">\n<body>\n  <al-theme brand="altitude"><al-button>Go</al-button></al-theme>\n</body>\n</html>\n';
pair('ERR_MISSING_THEME_HOST', DOC_UNTHEMED, DOC_THEMED);
{
  const fragment = run('<al-layout direction="row"><al-button>A</al-button><al-heading>B</al-heading></al-layout>');
  assert('an inner fragment (the usual MCP snippet) does not fire', !has(fragment, 'ERR_MISSING_THEME_HOST'), seen(fragment));

  const prose = run('// the trigger dropped focus to <body> (WCAG 2.4.3)\nexport const t = html`<al-button>Go</al-button>`;\n', { ext: 'ts' });
  assert('prose mentioning <body> is not a document', !has(prose, 'ERR_MISSING_THEME_HOST'), seen(prose));

  const reads = run('if (globalThis.alAutoRegistry === true) { register(); }\nexport const t = html`<al-button>Go</al-button>`;\n', { ext: 'ts' });
  assert('READING the registry flag is not owning registration', !has(reads, 'ERR_MISSING_THEME_HOST'), seen(reads));
}

// ── 7. WARN_MIXED_REGISTRATION (llms.txt rule 6) ─────────────────────────────────────────────
console.log('\n==> WARN_MIXED_REGISTRATION (rule 6)');
pair('WARN_MIXED_REGISTRATION',
  '<script>window.alAutoRegistry = true;</script>\n<script type="module">\nimport { ALButton } from "@southleft/al-react";\n</script>\n<al-theme brand="altitude"><al-button>Go</al-button></al-theme>\n',
  '<script>window.alAutoRegistry = true;</script>\n<script type="module">\nimport "@southleft/al-web-components/components/button";\n</script>\n<al-theme brand="altitude"><al-button>Go</al-button></al-theme>\n');
{
  const versioned = run('<script>window.alAutoRegistry = true;</script>\n<script type="module">\nregisterAltitude({ mode: "versioned" }, [["al-button", ALButton]]);\n</script>\n<al-theme brand="altitude"><al-button>Go</al-button></al-theme>\n');
  assert('flag + registerAltitude({mode:"versioned"}) fires', has(versioned, 'WARN_MIXED_REGISTRATION'), seen(versioned));

  const versionedOnly = run('<script type="module">\nregisterAltitude({ mode: "versioned" }, [["al-button", ALButton]]);\n</script>\n<al-theme brand="altitude"><al-button>Go</al-button></al-theme>\n');
  assert('the versioned path ALONE does not fire', !has(versionedOnly, 'WARN_MIXED_REGISTRATION'), seen(versionedOnly));

  const readme = 'Before: the fixture relied on `window.alAutoRegistry = true`.\n'
    + 'After: it calls `registerAltitude({mode: "versioned"})` per subtree.\n\n'
    + '<al-theme brand="altitude"><al-button>Go</al-button></al-theme>\n';
  const doc = run(readme, { ext: 'md' });
  assert('a README describing both paths does not fire', !has(doc, 'WARN_MIXED_REGISTRATION'), seen(doc));
}

// ── 8. WARN_A11Y_NAME (component guidance) ───────────────────────────────────────────────────
console.log('\n==> WARN_A11Y_NAME (al-button guidance)');
pair('WARN_A11Y_NAME',
  '<al-button hideText><al-icon-check slot="before"></al-icon-check></al-button>',
  '<al-button hideText label="Mark complete"><al-icon-check slot="before"></al-icon-check></al-button>');
{
  const ariaLabel = run('<al-button hideText aria-label="Mark complete"><al-icon-check slot="before"></al-icon-check></al-button>');
  assert('aria-label satisfies the obligation', !has(ariaLabel, 'WARN_A11Y_NAME'), seen(ariaLabel));

  const plain = run('<al-button>Mark complete</al-button>');
  assert('a button with visible text does not fire', !has(plain, 'WARN_A11Y_NAME'), seen(plain));

  const off = run('<al-button hideText="false">Mark complete</al-button>');
  assert('hideText="false" does not fire', !has(off, 'WARN_A11Y_NAME'), seen(off));

  const jsx = 'import { ALButton } from "@southleft/al-react";\nexport const X = () => <ALButton hideText label={t("close")} />;\n';
  const dyn = run(jsx, { ext: 'jsx' });
  assert('a dynamically bound label satisfies the obligation', !has(dyn, 'WARN_A11Y_NAME'), seen(dyn));
}

// ── 9. exit codes — a warning must not fail a build unless --strict ─────────────────────────
console.log('\n==> exit codes');
{
  const clean = run('<al-theme brand="altitude"><al-button variant="secondary">Go</al-button></al-theme>');
  assert('clean input exits 0', clean.status === 0, `status ${clean.status}, ${seen(clean)}`);

  const warnOnly = run('<al-button style="background-color: #ff0000">Go</al-button>');
  assert('warnings alone exit 0', warnOnly.status === 0, `status ${warnOnly.status}, ${seen(warnOnly)}`);
  assert('warnings alone are counted as warnings', warnOnly.data.errorCount === 0 && warnOnly.data.warningCount > 0,
    JSON.stringify({ e: warnOnly.data.errorCount, w: warnOnly.data.warningCount }));

  const strict = run('<al-button style="background-color: #ff0000">Go</al-button>', { args: ['--strict'] });
  assert('--strict turns warnings into a failure', strict.status === 1, `status ${strict.status}`);

  const err = run('<al-button variant="nope">Go</al-button>');
  assert('an error exits 1', err.status === 1, `status ${err.status}`);

  const warnRate = run('<al-button style="background-color: #ff0000">Go</al-button>');
  assert('a warning does not reduce passRate', warnRate.data.passRate === 1, String(warnRate.data.passRate));
}

// ── 10. every emitted code has a repair-map entry ────────────────────────────────────────────
console.log('\n==> repair map covers every code');
{
  const { readFileSync } = await import('node:fs');
  const map = JSON.parse(readFileSync(resolve(REPO, 'libs/al-web-components/cli/repair-map.json'), 'utf8'));
  const src = readFileSync(CLI, 'utf8');
  const emitted = [...src.matchAll(/'((?:ERR|WARN)_[A-Z_]+)'/g)].map((m) => m[1]);
  const uniq = [...new Set(emitted)].filter((c) => c !== 'ERR_VALIDATOR_FAILURE');
  assert(`all ${uniq.length} codes have a repair-map entry`, uniq.every((c) => map[c]?.fix),
    uniq.filter((c) => !map[c]?.fix).join(', '));
  const prose = readFileSync(resolve(REPO, 'libs/al-web-components/cli/REPAIR.md'), 'utf8');
  assert('all codes are documented in REPAIR.md', uniq.every((c) => prose.includes(c)),
    uniq.filter((c) => !prose.includes(c)).join(', '));
}

rmSync(WORK, { recursive: true, force: true });
console.log(`\n${PASS} passed, ${FAIL} failed`);
if (FAIL) { console.log('failing:\n  ' + failures.join('\n  ')); process.exit(1); }
