#!/usr/bin/env node
/**
 * build-a11y-docs-report.mjs — measure accessibility for components the
 * Storybook run cannot reach, using the built documentation site as the surface.
 *
 * WHY THIS EXISTS
 * ---------------
 * `build-a11y-report.mjs` runs axe against a static Storybook build, story by
 * story. That covers `@southleft/al-web-components`, which has a Storybook.
 * It cannot cover a BRAND LAYER — a second component package belonging to one
 * design system (`brandLibrary` in `.altitude/ds-projects.json`) — because the
 * Southleft Storybook that would have measured those nine components was
 * retired on 2026-08-23.
 *
 * The result was a docs page that said, of a component with perfectly good
 * stories, "no stories in the measured Storybook build". Not a measurement:
 * an absence of one, phrased as if the component were at fault.
 *
 * WHAT IT MEASURES INSTEAD
 * ------------------------
 * The docs site itself. Every component detail page now mounts that
 * component's real story markup (`apps/docs/src/lib/examples.mjs`), with the
 * elements registered, the brand theme applied, and the stylesheet loaded —
 * which is to say the page already contains exactly the thing a Storybook
 * story would have rendered. axe is scoped to `[data-pg-mount]`, the preview
 * container, so the docs chrome around it is never attributed to the component.
 *
 * WHAT IT DELIBERATELY DOES NOT CLAIM
 * -----------------------------------
 * A Storybook run measures EVERY story of a component; a docs page shows ONE —
 * the default. So these records carry `advancedStates.storyCount: 0` and a
 * `surface: 'docs'` marker, and `apps/docs/src/lib/a11y.mjs` prefers a
 * Storybook record wherever one exists. The panel says which surface measured
 * what. A partial measurement reported as a full one would be a worse lie than
 * the "no stories" sentence this replaces.
 *
 * Usage:
 *   node scripts/build-a11y-docs-report.mjs [--dist dist] [--out <json>]
 *                                           [--port 6181] [--concurrency 4]
 *
 * Build the site first:  pnpm --filter al-app-docs build
 *
 * Output (default `.altitude/a11y/report-docs.json`) is read at BUILD time by
 * apps/docs/src/lib/a11y.mjs, alongside `report.json`.
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { extname, join, dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

const argOf = (flag, fallback = null) => {
  const eq = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = process.argv.indexOf(flag);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
};

const REPO_ROOT = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const DIST = resolve(argOf('--dist') ?? join(REPO_ROOT, 'dist'));
const OUT = resolve(argOf('--out') ?? join(REPO_ROOT, '.altitude', 'a11y', 'report-docs.json'));
const PORT = Number(argOf('--port', '6181'));
const CONCURRENCY = Number(argOf('--concurrency', '4'));
const STORYBOOK_REPORT = join(REPO_ROOT, '.altitude', 'a11y', 'report.json');

/**
 * Same package-resolution dance as its sibling: playwright and axe-core are
 * transitive deps of the component library, not root dependencies, so a script
 * in `scripts/` cannot import them by bare specifier under pnpm.
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

/* -------------------------------------------- the same rule taxonomy */

/** Identical to the Storybook run and to `.storybook/test-runner.ts`. */
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const CONTRAST_RULE = 'color-contrast';

/* --------------------------------------------------------- static server */

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.gif': 'image/gif', '.map': 'application/json',
  '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.webp': 'image/webp',
};

/**
 * Serves the whole `dist/`, not `dist/docs`. The docs site is built with
 * `base: '/docs'`, so its own asset URLs are absolute `/docs/_astro/…` — served
 * from one directory down, every stylesheet and every element bundle 404s and
 * axe measures an unstyled, unregistered page.
 *
 * Unlike the Storybook server this one does NOT fall back to index.html: a
 * missing page must 404 so a mistyped route is a visible failure rather than a
 * silent measurement of the home page.
 */
function serve(root, port) {
  const server = createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = join(root, url.replace(/^\/+/, ''));
    try {
      if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    } catch {
      /* fall through to the 404 below */
    }
    if (!existsSync(file)) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    res.setHeader('content-type', MIME[extname(file)] ?? 'application/octet-stream');
    createReadStream(file)
      .on('error', () => {
        res.statusCode = 500;
        res.end('read error');
      })
      .pipe(res);
  });
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok(server)));
}

/* ------------------------------------------------------- what to measure */

/**
 * The work list comes from the docs engine itself — the same module that
 * decided which pages exist — so this script names no component and no design
 * system, and a registry change moves it automatically.
 *
 * Only components MISSING from the Storybook report are measured. Where a
 * Storybook record exists it is strictly better (every story, not just the
 * default), and measuring the same component twice would invite two answers to
 * one question.
 */
const { CONTEXTS } = await import(pathToFileURL(join(REPO_ROOT, 'apps', 'docs', 'src', 'lib', 'context.mjs')).href);
const { exampleFor } = await import(pathToFileURL(join(REPO_ROOT, 'apps', 'docs', 'src', 'lib', 'examples.mjs')).href);

const storybookReport = (() => {
  try {
    return JSON.parse(readFileSync(STORYBOOK_REPORT, 'utf8'));
  } catch {
    return null;
  }
})();
const storybookCovered = new Set(Object.keys(storybookReport?.components ?? {}));

/**
 * WHICH LIBRARY THE STORYBOOK RUN COVERED — derived from the report's own
 * `source.gateConfig` (`libs/al-web-components/.storybook/test-runner.ts`).
 *
 * Coverage CANNOT be decided on the slug alone, and getting this wrong silently
 * skipped the two components that most needed measuring. The report is keyed by
 * slug; a brand layer's `header` and the base library's `header` are different
 * components that share one. Asking "is slug `header` in the report?" answered
 * yes for the brand header on the strength of a measurement of a different
 * component. The question has to be "was THIS component's library measured?".
 */
const MEASURED_LIBRARY = (() => {
  const gateConfig = storybookReport?.source?.gateConfig ?? '';
  const [root] = gateConfig.split('/.storybook/');
  return root && root !== gateConfig ? root : null;
})();

const fromMeasuredLibrary = (component) =>
  Boolean(MEASURED_LIBRARY) &&
  String(component.libraryRoot ?? '').replace(/\\/g, '/').endsWith(MEASURED_LIBRARY);

/** slug → { slug, tag, project, url, storyName } for every page worth measuring. */
const targets = new Map();
for (const context of CONTEXTS) {
  for (const component of context.registry.components) {
    if (storybookCovered.has(component.slug) && fromMeasuredLibrary(component)) continue;
    if (targets.has(component.slug)) continue;
    // No example means the page mounts a bare tag with no content. Measuring
    // that would produce a clean bill of health for markup nobody ships.
    const example = await exampleFor(component);
    if (!example?.ok) continue;
    targets.set(component.slug, {
      slug: component.slug,
      tag: component.tag,
      project: context.project.id,
      story: example.story,
      libraryWorkspace: component.libraryWorkspace,
      url: `/docs${context.project.routePrefix}/components/${component.slug}/`,
    });
  }
}

const work = [...targets.values()];
if (!existsSync(join(DIST, 'docs', 'index.html'))) {
  console.error(
    `No built docs site at ${join(DIST, 'docs')}.\n` +
      '  Build one first:  pnpm --filter al-app-docs build',
  );
  process.exit(1);
}

if (!work.length) {
  console.log('[a11y-docs] every documented component is already covered by the Storybook run — nothing to measure.');
  process.exit(0);
}

/* ------------------------------------------------------------------ main */

const server = await serve(DIST, PORT);
const base = `http://127.0.0.1:${PORT}`;
console.log(`[a11y-docs] serving ${DIST} on ${base} (${work.length} component pages, concurrency ${CONCURRENCY})`);

const { chromium } = await import(pathToFileURL(resolvePkg('playwright', 'index.mjs')).href);
const AXE_SOURCE = readFileSync(resolvePkg('axe-core', 'axe.min.js'), 'utf8');
const AXE_VERSION = JSON.parse(readFileSync(resolvePkg('axe-core', 'package.json'), 'utf8')).version;

const browser = await chromium.launch();
const results = [];

const trim = (r) => ({
  id: r.id,
  impact: r.impact ?? null,
  help: r.help,
  tags: (r.tags ?? []).filter((t) => t.startsWith('wcag') || t === 'best-practice'),
  nodes: r.nodes?.length ?? 0,
});

async function measure(page, target) {
  const record = { ...target, error: null, violations: [], passes: [], incomplete: [] };
  try {
    const response = await page.goto(`${base}${target.url}`, { waitUntil: 'load', timeout: 30_000 });
    if (!response || response.status() >= 400) {
      throw new Error(`page returned ${response ? response.status() : 'no response'}`);
    }
    // `attached`, not `visible` — the same reason the Storybook run gives: a
    // component can legitimately mount with no bounding box.
    await page.waitForSelector('[data-pg-mount]', { state: 'attached', timeout: 20_000 });
    // The elements are registered by a module script; wait for the real class
    // rather than a fixed delay, or axe measures an un-upgraded tag and reports
    // a component with no shadow DOM as flawless.
    await page.waitForFunction(
      (tag) => Boolean(customElements.get(tag)),
      target.tag,
      { timeout: 20_000 },
    );
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

    const raw = await page.evaluate(
      async ([tags]) => {
        const options = { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations', 'incomplete'] };
        return window.axe.run('[data-pg-mount]', options);
      },
      [AXE_TAGS],
    );
    record.violations = (raw.violations ?? []).map(trim);
    record.incomplete = (raw.incomplete ?? []).map(trim);
    record.passes = (raw.passes ?? []).map((r) => r.id);
  } catch (err) {
    // An error is DATA. The panel renders it as "not measured", never as clean.
    record.error = String(err?.message ?? err).split('\n')[0].slice(0, 200);
  }
  return record;
}

const queue = [...work];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const page = await context.newPage();
    await page.addInitScript(AXE_SOURCE);
    for (;;) {
      const target = queue.shift();
      if (!target) break;
      let record = await measure(page, target);
      if (record.error) {
        const retry = await context.newPage();
        await retry.addInitScript(AXE_SOURCE);
        record = await measure(retry, target);
        await retry.close();
      }
      results.push(record);
      const structuralCount = record.violations.filter((v) => v.id !== CONTRAST_RULE).length;
      const contrastCount = record.violations.length - structuralCount;
      console.log(
        `[a11y-docs] ${record.slug.padEnd(20)} ${
          record.error
            ? `ERROR ${record.error}`
            : `${structuralCount} structural, ${contrastCount} contrast`
        }`,
      );
    }
    await context.close();
  }),
);
await browser.close();
server.close();

/* -------------------------------------------------------------- roll-up */

/**
 * Shaped to match the Storybook report's per-component record exactly, so
 * `a11y.mjs` can render either through one code path. The differences are
 * stated in the data rather than implied: `advancedStates.storyCount` is 0
 * because a docs page shows one story, and `surface` names where it came from.
 */
const components = {};
for (const r of results) {
  const structural = r.violations.filter((v) => v.id !== CONTRAST_RULE).map((v) => ({ ...v, stories: [r.story] }));
  const contrast = r.violations.filter((v) => v.id === CONTRAST_RULE).map((v) => ({ ...v, stories: [r.story] }));
  components[r.slug] = {
    surface: 'docs',
    project: r.project,
    libraryWorkspace: r.libraryWorkspace ?? null,
    storyCount: r.error ? 0 : 1,
    /*
     * An ARRAY of `{ id, error }`, matching the Storybook report exactly — not
     * a count. `apps/docs/src/lib/artifacts.mjs` maps over this field to list
     * unmeasured stories in status.json, so a number here does not merely look
     * different, it breaks the build with `checks.errored.map is not a function`.
     * Two producers of one record shape have to agree on all of it.
     */
    errored: r.error ? [{ id: r.story, error: r.error }] : [],
    defaultState: {
      storyId: r.story,
      name: r.story,
      structural,
      contrast,
      error: r.error,
    },
    /** A docs page renders the default story only — there are no others here. */
    advancedStates: { storyCount: 0, structural: [], contrast: [] },
    /** No play functions on a docs page; keyboard evidence stays a manual row. */
    interaction: { playFnStories: [] },
    violations: structural,
    contrastViolations: contrast,
    clean: !r.error && structural.length === 0,
  };
}

const report = {
  generated: new Date().toISOString(),
  source: {
    surface: 'docs',
    distDir: DIST.replace(/\\/g, '/').startsWith(REPO_ROOT.replace(/\\/g, '/'))
      ? DIST.replace(/\\/g, '/').slice(REPO_ROOT.replace(/\\/g, '/').length + 1)
      : '<external>',
    axeVersion: AXE_VERSION,
    axeTags: AXE_TAGS,
    contrastRule: CONTRAST_RULE,
    contrastEnabled: true,
    gateExcludes: [CONTRAST_RULE],
    scope: '[data-pg-mount]',
    /** Said plainly, because the panel quotes it. */
    limitation:
      'The docs page renders each component\'s default story only, so advanced states are not measured here.',
  },
  totals: {
    components: Object.keys(components).length,
    errored: results.filter((r) => r.error).length,
    withViolations: Object.values(components).filter((c) => c.violations.length).length,
  },
  components,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  `\n[a11y-docs] ${report.totals.components} component(s) measured, ` +
    `${report.totals.withViolations} with structural violations, ${report.totals.errored} errored`,
);
console.log(`[a11y-docs] wrote ${OUT.replace(REPO_ROOT, '.')}`);
