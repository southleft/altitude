#!/usr/bin/env node
/**
 * build-a11y-report.mjs — measure accessibility per COMPONENT and emit the
 * machine artifact the docs site renders.
 *
 * Why this exists rather than parsing a `test-storybook` log
 * ---------------------------------------------------------
 * `scripts/build-axe-baseline.mjs` (its sibling) greps a jest log for `●` lines
 * and rule-id substrings. That is fine for a one-off baseline table, and wrong
 * for a docs panel: it cannot say WHICH story failed WHICH rule, it cannot
 * report a rule that PASSED, and its rule list is a hand-typed array — the
 * exact "hand-maintained component-shaped list" the docs site's governing rule
 * forbids (apps/docs/src/lib/registry.mjs:1-34).
 *
 * So this runs axe-core itself, story by story, and writes structured results:
 * every rule outcome (violation / pass / incomplete), keyed by component, with
 * the story ids that produced it. Nothing downstream has to infer anything.
 *
 * MEASUREMENT HAZARD — read before running (learned expensively, and recorded
 * in .mm/specs/2026-08-22-accessibility-remediation/axe-baseline.md):
 * always measure a STATIC Storybook build on a DEDICATED port. A dev server
 * left running on 6006 silently absorbs the run and reports ~323 failures that
 * are mostly 15s mount timeouts, not defects. This script therefore serves the
 * static directory itself, on a port it picks, and refuses to take a URL.
 *
 * COLOR CONTRAST. `.storybook/test-runner.ts` disables `color-contrast`
 * globally, so no one has ever seen its result. Here it is ENABLED and reported
 * as its own axis (`contrast`), separate from the structural rules the CI gate
 * asserts. That separation is deliberate: the gate's job is to stay green and
 * block regressions; this report's job is to tell the truth, including about
 * the rule the gate excludes.
 *
 * Usage:
 *   node scripts/build-a11y-report.mjs --storybook <static-dir> [--out <json>]
 *                                      [--port 6180] [--concurrency 4] [--limit N]
 *
 * Output (default `.altitude/a11y/report.json`) is consumed at BUILD time by
 * apps/docs/src/lib/a11y.mjs. The docs site never fetches it at runtime.
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

/**
 * pnpm does not hoist `playwright` or `axe-core` to the repo root — they are
 * transitive deps of `@southleft/al-web-components`'s `axe-playwright`, so a script that
 * lives in `scripts/` cannot `import` them by bare specifier. Rather than add a
 * dependency (and an install) for a script that runs on demand, resolve through
 * the store the workspace already populated. Throws with the fix if absent.
 */
function resolvePkg(pkg, subpath) {
  try {
    return require.resolve(subpath ? `${pkg}/${subpath}` : pkg);
  } catch {
    /* not hoisted — look in the pnpm store below */
  }
  const store = join(REPO_ROOT, 'node_modules', '.pnpm');
  if (existsSync(store)) {
    const prefix = `${pkg.replace(/\//g, '+')}@`;
    for (const dir of readdirSync(store)) {
      if (!dir.startsWith(prefix)) continue;
      const root = join(store, dir, 'node_modules', pkg);
      if (!existsSync(root)) continue;
      if (!subpath) return root;
      const file = join(root, subpath);
      if (existsSync(file)) return file;
    }
  }
  throw new Error(
    `Cannot resolve "${pkg}${subpath ? `/${subpath}` : ''}". It is a transitive dependency of ` +
      '@southleft/al-web-components (axe-playwright); run `pnpm install` at the repo root first.',
  );
}

/* ------------------------------------------------------------------- args */

const argOf = (flag, fallback = null) => {
  const eq = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = process.argv.indexOf(flag);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
};

const REPO_ROOT = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const STORYBOOK_DIR = argOf('--storybook');
const OUT = resolve(argOf('--out') ?? join(REPO_ROOT, '.altitude', 'a11y', 'report.json'));
const PORT = Number(argOf('--port', '6180'));
const CONCURRENCY = Number(argOf('--concurrency', '4'));
const LIMIT = Number(argOf('--limit', '0'));

if (!STORYBOOK_DIR || !existsSync(join(STORYBOOK_DIR, 'index.json'))) {
  console.error(
    'usage: node scripts/build-a11y-report.mjs --storybook <static-build-dir> [--out <json>]\n' +
      '  Build one first:  pnpm --filter @southleft/al-web-components exec storybook build --output-dir <dir>\n' +
      '  Never point this at a running dev server — see the measurement note in this file.',
  );
  process.exit(1);
}

/* ------------------------------------------------- the axe rule taxonomy */

/**
 * WCAG levels the run asserts. Identical to `.storybook/test-runner.ts:47`, so
 * this report and the CI gate are measuring the same standard — the ONLY
 * difference is that `color-contrast` is left enabled here.
 */
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** The one rule the CI gate excludes; reported separately so it is visible. */
const CONTRAST_RULE = 'color-contrast';

/* --------------------------------------------------------- static server */

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.gif': 'image/gif', '.map': 'application/json',
  '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.webp': 'image/webp',
};

function serve(root, port) {
  const server = createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = join(root, url === '/' ? 'index.html' : url.replace(/^\/+/, ''));
    if (!existsSync(file) || file.endsWith('/')) file = join(root, 'index.html');
    res.setHeader('content-type', MIME[extname(file)] ?? 'application/octet-stream');
    // Fonts and workers in the preview are same-origin here; no CORS needed.
    createReadStream(file).on('error', () => {
      res.statusCode = 404;
      res.end('not found');
    }).pipe(res);
  });
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok(server)));
}

/* ------------------------------------------------------ story → component */

/**
 * The SAME structural rule the docs registry uses: a story file at
 * `components/<dir>/<dir>.stories.ts` belongs to the component declared by
 * `components/<dir>/<dir>.ts`. Story files anywhere else (`.storybook/…`
 * catalogs, token galleries) belong to no component and are recorded under
 * `null` so their results are never silently attributed to one.
 */
const STORY_OF_COMPONENT = /^\.\/components\/([a-z0-9-]+)\/\1\.stories\.ts$/;

function componentSlugOf(importPath) {
  return STORY_OF_COMPONENT.exec(importPath)?.[1] ?? null;
}

/* ------------------------------------------------------------------ main */

const index = JSON.parse(readFileSync(join(STORYBOOK_DIR, 'index.json'), 'utf8'));
let stories = Object.values(index.entries).filter((e) => e.type === 'story');
if (LIMIT > 0) stories = stories.slice(0, LIMIT);

const server = await serve(STORYBOOK_DIR, PORT);
const base = `http://127.0.0.1:${PORT}`;
console.log(`[a11y] serving ${STORYBOOK_DIR} on ${base} (${stories.length} stories, concurrency ${CONCURRENCY})`);

const { chromium } = await import(pathToFileURL(resolvePkg('playwright', 'index.mjs')).href);
const AXE_SOURCE = readFileSync(resolvePkg('axe-core', 'axe.min.js'), 'utf8');
const AXE_VERSION = JSON.parse(readFileSync(resolvePkg('axe-core', 'package.json'), 'utf8')).version;

const browser = await chromium.launch();
const results = [];
let done = 0;

async function runStory(page, story) {
  const url = `${base}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`;
  const record = {
    id: story.id,
    name: story.name,
    title: story.title,
    importPath: story.importPath,
    slug: componentSlugOf(story.importPath),
    hasPlayFn: (story.tags ?? []).includes('play-fn'),
    error: null,
    violations: [],
    passes: [],
    incomplete: [],
  };
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
    // `state: 'attached'`, NOT the default `'visible'`. Several components
    // render nothing with a bounding box until they are interacted with
    // (al-focus-trap, al-popover, al-spinner at its smallest), so a visibility
    // wait times out on a story that mounted perfectly well — and reports the
    // component as unmeasured. axe runs on a zero-size root without complaint.
    await page.waitForSelector('#storybook-root', { state: 'attached', timeout: 20_000 });
    // Lit renders async; one rAF pair after load is enough for shadow roots to
    // be attached, and is what axe needs to see the composed tree.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    // `@storybook/addon-a11y` runs its OWN axe pass on every story render, and
    // axe-core refuses concurrent runs ("Axe is already running"). Injecting a
    // second copy would not help — axe keeps its lock on the one `window.axe`.
    // So: reuse whatever axe is already there, and retry around the addon's
    // in-flight run rather than recording 96 stories as unmeasured, which is
    // what a naive single attempt produced on this exact build.
    const hasAxe = await page.evaluate(() => Boolean(window.axe?.run));
    if (!hasAxe) await page.addScriptTag({ content: AXE_SOURCE });
    const raw = await page.evaluate(
      async ([tags]) => {
        const options = { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations', 'incomplete'] };
        let lastError;
        for (let attempt = 0; attempt < 8; attempt += 1) {
          try {
            return await window.axe.run('#storybook-root', options);
          } catch (err) {
            lastError = err;
            if (!/already running/i.test(String(err?.message ?? err))) throw err;
            await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
          }
        }
        throw lastError;
      },
      [AXE_TAGS],
    );
    const trim = (r) => ({
      id: r.id,
      impact: r.impact ?? null,
      help: r.help,
      tags: (r.tags ?? []).filter((t) => t.startsWith('wcag') || t === 'best-practice'),
      nodes: r.nodes?.length ?? 0,
    });
    record.violations = (raw.violations ?? []).map(trim);
    record.incomplete = (raw.incomplete ?? []).map(trim);
    record.passes = (raw.passes ?? []).map((r) => r.id);
  } catch (err) {
    // An error is DATA, not a silent skip: the panel renders it as "not
    // measured" rather than as "clean". See spec task "make failure visible".
    record.error = String(err?.message ?? err).split('\n')[0].slice(0, 200);
  }
  done += 1;
  if (done % 50 === 0) console.log(`[a11y] ${done}/${stories.length}`);
  return record;
}

const queue = [...stories];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const page = await context.newPage();
    for (;;) {
      const story = queue.shift();
      if (!story) break;
      let record = await runStory(page, story);
      // One retry on a fresh page. Under concurrency a handful of stories lose
      // the race for the mount timeout; a retry clears most of them, and the
      // ones it does not clear are recorded as errors rather than as passes.
      if (record.error) {
        const retryPage = await context.newPage();
        record = await runStory(retryPage, story);
        await retryPage.close();
      }
      results.push(record);
    }
    await context.close();
  }),
);
await browser.close();
server.close();

/* -------------------------------------------------------------- roll-up */

/**
 * Per component: the union of every rule outcome across its stories, split into
 * the STRUCTURAL rules (what the CI gate asserts) and CONTRAST (the rule the
 * gate excludes). "default" is the story Storybook lists first for the
 * component — the one a reader sees on the docs page — and gets its own axis,
 * which is Carbon's "default state" row.
 */
const byComponent = new Map();
for (const r of results) {
  if (!r.slug) continue;
  if (!byComponent.has(r.slug)) byComponent.set(r.slug, []);
  byComponent.get(r.slug).push(r);
}

const summarize = (stories_) => {
  const structural = new Map();
  const contrast = new Map();
  for (const s of stories_) {
    for (const v of s.violations) {
      const bucket = v.id === CONTRAST_RULE ? contrast : structural;
      const prev = bucket.get(v.id) ?? { id: v.id, impact: v.impact, help: v.help, tags: v.tags, nodes: 0, stories: [] };
      prev.nodes += v.nodes;
      prev.stories.push(s.id);
      bucket.set(v.id, prev);
    }
  }
  const list = (m) => [...m.values()].sort((a, b) => b.nodes - a.nodes || a.id.localeCompare(b.id));
  return { structural: list(structural), contrast: list(contrast) };
};

const components = {};
for (const [slug, list] of byComponent) {
  const ordered = list.slice().sort((a, b) => a.id.localeCompare(b.id));
  const first = list.find((s) => /--default$/.test(s.id)) ?? ordered[0];
  const rest = ordered.filter((s) => s !== first);
  const all = summarize(ordered);
  components[slug] = {
    slug,
    tag: `al-${slug}`,
    storyCount: ordered.length,
    errored: ordered.filter((s) => s.error).map((s) => ({ id: s.id, error: s.error })),
    /** Carbon's "default state" row — the story the docs page shows. */
    defaultState: first
      ? { storyId: first.id, name: first.name, ...summarize([first]), error: first.error }
      : null,
    /** Carbon's "advanced states" row — every other story of this component. */
    advancedStates: {
      storyCount: rest.length,
      ...summarize(rest),
    },
    /** Machine evidence for Carbon's "keyboard navigation" row. */
    interaction: {
      playFnStories: ordered.filter((s) => s.hasPlayFn).map((s) => s.id),
    },
    violations: all.structural,
    contrastViolations: all.contrast,
    clean: all.structural.length === 0 && ordered.every((s) => !s.error),
  };
}

const unattributed = results.filter((r) => !r.slug);
const report = {
  generated: new Date().toISOString(),
  source: {
    // Repo-relative when the build lives inside the repo, otherwise just its
    // directory name: this file is checked in, and one developer's temp path is
    // not provenance anyone else can use.
    storybookDir: (() => {
      const abs = resolve(STORYBOOK_DIR).replace(/\\/g, '/');
      const root = REPO_ROOT.replace(/\\/g, '/');
      return abs.startsWith(`${root}/`) ? abs.slice(root.length + 1) : `<external>/${abs.split('/').pop()}`;
    })(),
    storybookVersion: index.v ?? null,
    axeVersion: AXE_VERSION,
    axeTags: AXE_TAGS,
    contrastRule: CONTRAST_RULE,
    contrastEnabled: true,
    /** Kept explicit so the docs panel can SAY what the gate excludes. */
    gateExcludes: [CONTRAST_RULE],
    /**
     * WHICH LIBRARY THIS RUN COVERED, stated rather than encoded in a path.
     *
     * Consumers used to derive it by splitting `gateConfig` on `/.storybook/`
     * — which silently tied the docs accessibility panels to a directory that
     * is being deleted, and to the assumption that a fixture always lives
     * inside a Storybook. Emitting the fact directly removes both.
     *
     * Derived from the served directory: a fixture at
     * `libs/al-web-components/story-fixture/dist` covers
     * `libs/al-web-components`. `null` when the directory sits outside the
     * repo, which is the honest answer — an external build cannot be
     * attributed to a workspace.
     */
    measuredLibrary: (() => {
      const abs = resolve(STORYBOOK_DIR).replace(/\\/g, '/');
      const root = REPO_ROOT.replace(/\\/g, '/');
      if (!abs.startsWith(`${root}/`)) return null;
      const rel = abs.slice(root.length + 1);
      const marker = rel.match(/^(.*?)\/(?:story-fixture|\.storybook|storybook-static)/);
      return marker ? marker[1] : null;
    })(),
    gateConfig: 'libs/al-web-components/story-fixture/src/main.ts',
  },
  totals: {
    stories: results.length,
    storiesErrored: results.filter((r) => r.error).length,
    componentsMeasured: Object.keys(components).length,
    componentsClean: Object.values(components).filter((c) => c.clean).length,
    structuralViolations: Object.values(components).reduce((n, c) => n + c.violations.length, 0),
    contrastViolations: Object.values(components).reduce((n, c) => n + c.contrastViolations.length, 0),
    /** Stories outside `components/<c>/<c>.stories.ts` — catalogs, token galleries. */
    unattributedStories: unattributed.length,
  },
  components,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n', 'utf8');

console.log(`[a11y] wrote ${OUT}`);
console.log(
  `[a11y] ${report.totals.componentsMeasured} components, ${report.totals.componentsClean} clean, ` +
    `${report.totals.structuralViolations} structural rule(s) failing, ` +
    `${report.totals.contrastViolations} contrast rule(s) failing, ` +
    `${report.totals.storiesErrored} story error(s).`,
);
