/**
 * THE STORY FIXTURE — what the accessibility sweep renders against.
 *
 * `scripts/build-a11y-report.mjs` axes 494 component states and, until now,
 * could only reach them by BUILDING STORYBOOK: it read `storybook-static/
 * index.json` and hit `iframe.html?id=…` per story. That made
 * `.altitude/a11y/report.json` — and therefore the docs accessibility panels,
 * `OverviewPage` and `llms-a11y.txt` — transitively dependent on the tool the
 * decommission spec intends to delete.
 *
 * This app renders the same stories with real Lit and nothing else. It is
 * deliberately a DROP-IN for the three things the report actually consumes:
 *
 *   1. `<outDir>/index.json`, shaped `{ entries: { <id>: { type: 'story',
 *      id, name, title, importPath, tags } } }`
 *   2. a URL `<base>/iframe.html?id=<id>&viewMode=story`
 *   3. a `#storybook-root` element holding the rendered story
 *
 * Honouring that contract exactly is the point: `build-a11y-report.mjs` needs
 * NO changes, and the switch is one `--storybook <dir>` path. The element id
 * keeps Storybook's name on purpose — renaming it would be a cosmetic change
 * that breaks a working consumer for nothing.
 *
 * WHY NOT EXTRACT THE MARKUP IN NODE INSTEAD. `apps/docs/src/lib/examples.mjs`
 * already evaluates stories with a serializing `html` stub, so rendering the
 * corpus that way looks like it would avoid a browser entirely. Measured: 261
 * of 480 stories render, and 218 of the 219 failures are `.prop=${…}` property
 * bindings — JS state that static markup cannot carry. That path tops out near
 * 54% of the corpus and was abandoned. A browser running Lit has no such
 * ceiling, which is why this is a Vite app and not a script.
 *
 * WHY IT LIVES IN THE LIBRARY rather than under `apps/`. The stories import
 * component SOURCE (`./button`, not the built package) and that source imports
 * `.scss`. Sitting beside `components/` keeps the glob a plain relative path
 * and lets this reuse the library's own SCSS plugin instead of restating the
 * build.
 */
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readdirSync, existsSync, readFileSync } from 'node:fs';

import { rewriteScssImports } from '../vite-plugins/rewrite-scss-imports.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIBRARY = resolve(HERE, '..');
const COMPONENTS = resolve(LIBRARY, 'components');

/**
 * Enumerate `components/<slug>/<slug>.stories.ts`.
 *
 * The doubled slug is not incidental — `build-a11y-report.mjs` derives a
 * component slug from `importPath` with exactly that pattern
 * (`STORY_OF_COMPONENT`), so a story file named anything else would produce a
 * record the report cannot attribute to a component. Matching its rule here
 * means the two agree by construction.
 */
function storyFiles() {
  if (!existsSync(COMPONENTS)) return [];
  return readdirSync(COMPONENTS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) => existsSync(resolve(COMPONENTS, slug, `${slug}.stories.ts`)))
    .sort();
}

/**
 * The story names a file exports, read from its SOURCE.
 *
 * Storybook treats every non-default export as a story, and every one of them
 * is a plain `export const <Name>` — a static identifier, never computed. So
 * the names can be read without evaluating TypeScript, which keeps this config
 * free of a second module evaluator and works even for the stories whose
 * rendering depends on JS state.
 */
function storyNames(slug) {
  const source = readFileSync(resolve(COMPONENTS, slug, `${slug}.stories.ts`), 'utf8');
  const names = [...source.matchAll(/^export const ([A-Z][A-Za-z0-9_]*)/gm)].map((m) => m[1]);
  return [...new Set(names)];
}

/**
 * Emit `index.json` beside the built page — ONE ENTRY PER STORY.
 *
 * The first version of this emitted one entry per story FILE and let the
 * runtime stack that file's whole variant set into a single root. It was
 * faster (67 page visits instead of 494) and it was WRONG: stacking puts a
 * floating `al-dropdown-panel` over an unrelated variant, and axe then computes
 * contrast against whatever it happens to overlap. That run reported 30
 * contrast-failing components against the Storybook run's 18, with
 * `dropdown-panel` alone contributing 26 failing nodes — artefacts of the
 * layout, not defects in the component.
 *
 * One story per page is what Storybook does, and matching it is the whole
 * point of this fixture: the numbers have to be comparable to the ones already
 * committed, or the switch silently rewrites the project's accessibility
 * history. 494 visits still finish in about a minute.
 */
function emitStoryIndex() {
  return {
    name: 'altitude-story-index',
    apply: 'build',
    generateBundle() {
      const entries = {};
      for (const slug of storyFiles()) {
        for (const name of storyNames(slug)) {
          const id = `${slug}--${name}`;
          entries[id] = {
            type: 'story',
            id,
            name,
            title: slug,
            importPath: `./components/${slug}/${slug}.stories.ts`,
            tags: [],
          };
        }
      }
      this.emitFile({
        type: 'asset',
        fileName: 'index.json',
        source: `${JSON.stringify({ v: 5, entries }, null, 2)}\n`,
      });
    },
  };
}

export default defineConfig({
  root: HERE,
  // The stories import component source and its `.scss` siblings, both of
  // which sit above this directory.
  server: { fs: { allow: [LIBRARY] }, port: 6018 },
  css: {
    preprocessorOptions: {
      scss: { api: 'modern-compiler', quietDeps: true, silenceDeprecations: ['import'] },
    },
  },
  plugins: [rewriteScssImports(), emitStoryIndex()],
  build: {
    outDir: resolve(HERE, 'dist'),
    emptyOutDir: true,
    rollupOptions: { input: resolve(HERE, 'iframe.html') },
  },
});
