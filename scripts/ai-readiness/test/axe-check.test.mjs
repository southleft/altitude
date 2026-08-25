#!/usr/bin/env node
// Integration smoke test for lib/axe-check.mjs (R6 — axe half).
//
// Unlike grader.test.mjs / metrics.test.mjs this is NOT a pure-function
// test: it launches a real (headless) Chromium via Playwright and renders
// the real, committed al-web-components dist bundle. Local compute only —
// no LLM call, no network, no API spend. It self-skips (exit 0, loud
// console note) rather than failing the whole suite when
// libs/al-web-components/dist isn't built (e.g. a checkout that hasn't run
// `pnpm run build` yet) or when Playwright's browser binaries aren't
// installed — both are legitimate "not measured here" states, not defects
// in this module.
//
// Run: node scripts/ai-readiness/test/axe-check.test.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAxeRenderer, computeAxeForAttempt } from '../lib/axe-check.mjs';

const SCRIPT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

let PASS = 0;
let FAIL = 0;
function assert(desc, cond) {
  if (cond) { console.log(`  ✓ ${desc}`); PASS++; }
  else { console.log(`  ✗ ${desc}`); FAIL++; }
}

async function main() {
  const renderer = await createAxeRenderer();
  if (!renderer.available) {
    console.log(`SKIP: axe renderer unavailable — ${renderer.reason}`);
    console.log('(not a failure: this is the honest "not measured in this environment" path.)');
    return;
  }

  try {
    console.log('==> Task A axe render — REAL recorded attempt template, REAL component library');
    const attempt = JSON.parse(readFileSync(resolve(SCRIPT_DIR, 'fixtures/attempts/A-composition-claude-1.real.json'), 'utf8'));
    const result = await computeAxeForAttempt(
      { taskShortKey: 'A', axeRenderable: true, parsed: attempt.parsed },
      renderer,
    );
    assert('violationCount is a number (real render succeeded)', typeof result.violationCount === 'number');
    assert('reason is null on a successful render', result.reason === null);
    assert('renderedTags includes al-card (from the real template)', result.renderedTags?.includes('al-card'));
    console.log(`     violations=${result.violationCount} passes=${result.passCount} tags=${result.renderedTags?.length}`);

    console.log('\n==> Sensitivity check — SYNTHETIC deliberate violations must be CAUGHT, not silently passed');
    const badHtml = '<img src="x.png"><a href="#"></a>' + attempt.parsed.template;
    const badResult = await computeAxeForAttempt(
      { taskShortKey: 'A', axeRenderable: true, parsed: { template: badHtml } },
      renderer,
    );
    assert('caught >=2 violations (image-alt + link-name) — pipeline is not a no-op', badResult.violationCount >= 2);
    assert('image-alt rule present', badResult.violations.some((v) => v.id === 'image-alt'));
    assert('link-name rule present', badResult.violations.some((v) => v.id === 'link-name'));

    console.log('\n==> Non-renderable tasks (B/C/G) record null + a reason, never a fake 0');
    const taskB = await computeAxeForAttempt({ taskShortKey: 'B', axeRenderable: false, parsed: { files: [] } }, renderer);
    assert('Task B -> violationCount null', taskB.violationCount === null && typeof taskB.reason === 'string');
    const taskC = await computeAxeForAttempt({ taskShortKey: 'C', axeRenderable: false, parsed: { violations: [] } }, renderer);
    assert('Task C -> violationCount null', taskC.violationCount === null && typeof taskC.reason === 'string');
  } finally {
    await renderer.close();
  }
}

await main();
console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
