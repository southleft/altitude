// Emits the Figma <-> code parity report the manager sidebar badges and the
// FigmaParity docs block fetch (a staticDir already serves it, so the file is
// available at /parity.json in dev AND baked into static Storybook builds).
//
// Runs in Node at Storybook config time (imported from main.ts).
//
// WHEN it runs matters. It used to be called ONLY from `viteFinal`, which races
// the static-file copy: `storybook build` kicks off the preview build and
// `copyAllStaticFilesRelativeToMain` as concurrent effects, and the copy — a
// few hundred milliseconds of `fs.cp` — finishes long before a ~20s Vite build
// reaches `viteFinal`. The report therefore missed the copy, and a static build
// only ever shipped a `parity.json` left in `dist/` by an EARLIER run. Verified
// on 2026-08-22: with `dist/parity.json` deleted, `pnpm build:storybook` exits 0
// and the output directory contains no parity report at all, so every badge and
// every docs banner 404s in a fresh CI build.
//
// The fix is ordering, not retries: `main.ts` now awaits this at MODULE scope,
// which Storybook evaluates before it starts any build effect. The `viteFinal`
// call is still there to arm the dev watcher; the write itself is memoised, so
// calling twice costs one report.
// In dev it also watches the component sources and the parity manifest, so a
// component edit flips its sidebar badge to code-drift within a second and a
// `mark-synced.mjs` run flips it back to green — no Storybook restart.
//
// The engine itself lives in libs/altitude-mcp/src/lib/parity.mjs (shared with
// the `altitude_check_parity` MCP tool); this module is only the emit/watch
// glue. Failures NEVER take Storybook down — parity is chrome, not content.
//
// MULTI-PROJECT (Altitude + Southleft). One component library, two
// Figma-backed design systems, two Storybooks — see `.altitude/ds-projects.json`.
// Two consequences are handled here:
//
//   1. WHICH report to compute. `computeParity()` resolves the active project
//      from `--project` argv -> `DS_PROJECT` env -> the registry default, so
//      `.storybook-sl/main.ts` setting `process.env.DS_PROJECT = 'southleft'`
//      is enough. An explicit `project` option overrides that.
//   2. WHERE to write it. The output path used to be one hardcoded
//      `../dist/parity.json`. Both Storybooks serve `../dist`, so the second
//      server to boot would have overwritten the first one's report and the
//      Altitude sidebar would start showing Southleft statuses. The path is now
//      project-derived: `dist/parity.json` for the DEFAULT project (byte
//      identical to before) and `dist/parity.<projectId>.json` for any other.
//
//      A DISTINCT BASENAME, rather than the same name in a different directory,
//      is what makes this safe in both modes: Storybook serves staticDirs as
//      express middleware in dev (FIRST match wins) but copies them in order at
//      build time (LAST copy wins), so two directories both offering
//      `/parity.json` could not be ordered correctly for both. Two names can.
//      Each Storybook's manager and docs block fetch the name for their own
//      project — see `./manager.shared.js` and `./blocks/figma-parity.tsx`.

import { watch, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = resolve(__dirname, '../dist');
const COMPONENTS_DIR = resolve(__dirname, '../components');

/** The first write, shared by every caller. `null` until the first call. */
let ready = null;
/** Dev watchers are armed at most once per process. */
let watching = false;

async function writeReport(parity, project, outFile) {
  const report = parity.computeParity(project);
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(report), 'utf8');
  return report;
}

/**
 * Compute and write the report once per process, memoised.
 * Resolves to the context the watcher needs, or `null` if anything failed —
 * parity is chrome, so a failure warns and never takes Storybook down.
 */
function ensureReport(projectId) {
  ready ??= (async () => {
    try {
      const parity = await import('../../altitude-mcp/src/lib/parity.mjs');
      const { resolveProject } = await import('../../altitude-mcp/src/lib/ds-project.mjs');
      const project = resolveProject(projectId);
      const target = resolve(DIST_DIR, project.isDefault ? 'parity.json' : `parity.${project.id}.json`);

      const report = await writeReport(parity, project, target);
      const s = report.summary;
      console.log(
        `[al-storybook] ${project.id} parity -> ${target}: ${s['in-sync']} in-sync, ${s['code-drift']} code-drift, ` +
          `${s['figma-drift']} figma-drift, ${s['conflict']} conflict, ${s['missing-in-figma']} missing-in-figma.`,
      );
      return { parity, project, target, figmaSyncDir: project.resolved.figmaSyncDir };
    } catch (err) {
      // FAILURE IS DATA. Warning to a console nobody reads and writing nothing
      // is why "the parity engine threw" and "every component is in sync" have
      // been indistinguishable in the UI: both render as no badges. Write a
      // report-shaped ERROR artifact instead, so a consumer that gets a 200 can
      // tell the difference between a clean report and a broken one.
      console.warn(`[al-storybook] parity report FAILED (${err?.message ?? err}) — emitting an error report.`);
      try {
        const target = resolve(DIST_DIR, 'parity.json');
        mkdirSync(DIST_DIR, { recursive: true });
        writeFileSync(
          target,
          // UNAMBIGUOUS SHAPE. `error` is always an object here (never a bare
          // string) so a consumer can tell "error report" from "clean report"
          // with one truthy check (`report.error`) and still get a message +
          // timestamp to show. `components: []` alone cannot be that signal —
          // an empty catalog and a broken engine both produce it, which is the
          // exact ambiguity this exists to remove (see the comment above).
          JSON.stringify({
            generated: new Date().toISOString(),
            error: { message: String(err?.message ?? err), at: new Date().toISOString() },
            observation: null,
            figmaLastRefreshed: null,
            components: [],
            figmaOnly: [],
            summary: {},
          }),
          'utf8',
        );
      } catch (writeErr) {
        console.warn(`[al-storybook] could not write the error report either: ${writeErr?.message ?? writeErr}`);
      }
      return null;
    }
  })();
  return ready;
}

/**
 * @param {object}   [opts]
 * @param {boolean}  [opts.watch]    dev only — re-emit on source/manifest change.
 * @param {string}   [opts.project]  design-system project id; defaults to
 *                                   `DS_PROJECT` / the registry default.
 */
export async function emitParity({ watch: watchMode = false, project: projectId = null } = {}) {
  const ctx = await ensureReport(projectId);
  if (!ctx || !watchMode || watching) return;
  watching = true;

  const { parity, project, target, figmaSyncDir } = ctx;


  let timer = null;
  const recompute = (label) => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        await writeReport(parity, project, target);
        console.log(`[al-storybook] ${project.id} parity refreshed (${label}).`);
      } catch (err) {
        console.warn(`[al-storybook] parity refresh failed: ${err?.message ?? err}`);
      }
    }, 400);
  };

  try {
    // Component sources -> live code-drift. `recursive` is supported on
    // Windows and macOS (this repo develops on both).
    watch(COMPONENTS_DIR, { recursive: true }, (_evt, file) => {
      if (!file || !/\.(ts|scss)$/.test(file) || /\.stories\.|\.test\./.test(file)) return;
      recompute(file.replace(/\\/g, '/'));
    });
    // Manifest edits (seed / mark-synced / refresh-figma-digests) -> live badge
    // flips. Project-scoped: Southleft's manifest lives in its own
    // `.altitude/figma-sync/southleft/` directory.
    watch(figmaSyncDir, (_evt, file) => {
      if (file === 'parity-manifest.json') recompute('parity-manifest.json');
    });
  } catch (err) {
    console.warn(`[al-storybook] parity watch not started: ${err?.message ?? err}`);
  }
}
