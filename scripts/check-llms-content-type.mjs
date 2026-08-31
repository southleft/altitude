#!/usr/bin/env node
/**
 * THE SPA-SHELL GATE — prove the machine artifacts arrive as TEXT.
 *
 * An llms.txt endpoint that returns `200 text/html` is worse than one that
 * 404s: the agent gets a page of markup, treats it as the documentation, and
 * generates against it. This is not hypothetical — it is the state of three of
 * the design systems this repo was benchmarked against, whose llms endpoints
 * fall through to a single-page-app shell and answer 200 with an HTML document.
 *
 * So this checks the two things a fetch can actually establish:
 *
 *   1. status 200 and a `text/plain` content-type;
 *   2. the BODY is the artifact and not a shell — it starts with the Markdown
 *      heading the generator emits, contains no `<!doctype`/`<html`, and is
 *      longer than a floor no shell would clear.
 *
 * (2) is the load-bearing half. A server can be configured to send text/plain
 * for a body that is still an HTML shell, and a header check alone would pass.
 *
 * WHAT IT CANNOT DO: run itself. It needs a deployment to point at, so it takes
 * the base URL as an argument and is not wired into any local gate — a gate that
 * silently passes because nothing was deployed would be the same lie it exists
 * to catch. Run it against a preview or production URL after a deploy:
 *
 *   node scripts/check-llms-content-type.mjs https://altitude.pages.dev
 *
 * It also accepts a local static preview, which proves the ARTIFACTS are right
 * while proving nothing about the CDN:
 *
 *   npx serve dist -l 6345 & node scripts/check-llms-content-type.mjs http://localhost:6345
 *
 * The deployed content-type itself is declared in `pages-root/_headers`,
 * which Vite copies to the published root.
 */

const base = (process.argv[2] ?? '').replace(/\/$/, '');
if (!base) {
  console.error('Usage: node scripts/check-llms-content-type.mjs <base-url>');
  console.error('  e.g. node scripts/check-llms-content-type.mjs https://altitude.pages.dev');
  process.exit(2);
}

/**
 * The paths, and the heading each body must open with.
 *
 * The project-scoped routes are discovered from the registry rather than
 * listed, so a third design system is checked the day it is added — the same
 * rule the docs app itself follows.
 */
const { listProjectIds, resolveProject } = await import('../libs/altitude-mcp/src/lib/ds-project.mjs');

const ARTIFACTS = ['llms.txt', 'llms-full.txt', 'llms-tokens.txt', 'llms-components.txt', 'llms-a11y.txt'];

const targets = [];
for (const id of listProjectIds()) {
  const project = resolveProject(id);
  const prefix = project.isDefault ? '' : `/${id}`;
  for (const artifact of ARTIFACTS) targets.push(`${base}/docs${prefix}/${artifact}`);
}
// One Markdown twin, as the representative of the `.md`-at-every-URL surface.
// `.md` is allowed to arrive as text/markdown as well as text/plain — both are
// text, and text/markdown is what several static servers send for the
// extension. `text/html` is the failure this whole script is about.
targets.push({ url: `${base}/docs/components.md`, alsoAllow: /^text\/markdown/ });

/** Floor below which a body cannot be one of these artifacts (the smallest, llms.txt, is tens of KB). */
const MIN_BYTES = 2000;

const failures = [];
let checked = 0;

for (const target of targets) {
  const url = typeof target === 'string' ? target : target.url;
  const alsoAllow = typeof target === 'string' ? null : target.alsoAllow;
  let response;
  try {
    response = await fetch(url, { redirect: 'follow' });
  } catch (error) {
    failures.push(`${url}\n    unreachable: ${error.message}`);
    continue;
  }
  checked++;

  const type = response.headers.get('content-type') ?? '(none)';
  const body = await response.text();
  const problems = [];

  if (response.status !== 200) problems.push(`status ${response.status}`);
  // A REPEATED Content-Type field, which `fetch` surfaces comma-joined
  // ("text/plain; charset=utf-8, text/plain; charset=utf-8"). RFC 9110 s8.3
  // permits exactly one, and the joined value is not a valid media type, so a
  // strict client may reject it or fall back to content sniffing. This runs
  // BEFORE the media-type test below, because that test is anchored with `^`
  // and so passes a duplicated header happily -- which is exactly how this
  // shipped unnoticed on every `/docs/southleft/*` artifact until it was
  // observed on a live deployment. The cause was two overlapping rules in
  // pages-root/_headers, where `*` matches across `/`; see that file.
  if (type.includes(',')) {
    problems.push(`content-type "${type}" repeats the field (RFC 9110 permits one); two _headers rules probably match this path`);
  }
  if (!/^text\/plain\b/.test(type) && !(alsoAllow && alsoAllow.test(type))) {
    problems.push(`content-type "${type}", expected text/plain${alsoAllow ? ' or text/markdown' : ''}`);
  }
  if (/<!doctype|<html[\s>]/i.test(body.slice(0, 4000))) problems.push('body is an HTML document (SPA shell)');
  if (body.length < MIN_BYTES) problems.push(`body is ${body.length} bytes, below the ${MIN_BYTES}-byte floor`);
  if (!body.startsWith('# ')) problems.push(`body does not open with a Markdown heading (starts "${body.slice(0, 40).replace(/\n/g, '\\n')}")`);

  if (problems.length) {
    failures.push(`${url}\n    ${problems.join('\n    ')}`);
  } else {
    console.log(`  ok — ${url} (${type}, ${body.length} bytes)`);
  }
}

console.log('');
if (failures.length) {
  console.error(`FAIL — ${failures.length} of ${targets.length} artifact(s) are not served as text:\n`);
  for (const failure of failures) console.error(`  ${failure}\n`);
  process.exit(1);
}
console.log(`OK — ${checked} machine artifact(s) served as text/plain from ${base}.`);
