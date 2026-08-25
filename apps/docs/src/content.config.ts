/**
 * Component guidance — the half of the docs that cannot be generated.
 *
 * Everything component-SHAPED on this site is generated from the CEM
 * (`src/lib/registry.mjs`). That covers the API: 528 of 532 attributes carry a
 * description, so the props tables are in good shape. What the manifest cannot
 * carry is the judgement — what a component is FOR, when reaching for it is
 * wrong, and which mistakes this library has already paid for. Only 11 of the
 * 68 components have a CEM description beyond the generated `Component: al-x`
 * stub, so most detail pages open with a stat line and nothing else.
 *
 * This collection is where that judgement lives. Three rules shape it, and all
 * three exist because prose drifts and generated data does not:
 *
 *   1. STRUCTURED, NOT FREE PROSE. Guidance is YAML data, not a markdown body,
 *      so the schema below can REQUIRE the sections that matter. A file with no
 *      `whenNotToUse` does not render a thinner page — it fails the build. A
 *      "when not to use" section that silently disappears for 40 components is
 *      worse than none, so it is made impossible rather than discouraged.
 *
 *   2. EVERY FILE CITES CODE. `sources[]` is mandatory and each entry names a
 *      repo-relative path plus a literal string that must still appear in it.
 *      `scripts/check-guidance.mjs` re-reads every citation from the BUILT
 *      pages and fails when the file moved or the anchor text is gone — so
 *      guidance that has quietly stopped being true breaks a gate instead of
 *      misleading a reader.
 *
 *   3. NO GUIDANCE FOR THINGS THAT ARE NOT COMPONENTS. The filename must be a
 *      slug the registry knows, and every `instead:` pointer must resolve to a
 *      live component. That is what stops a page recommending `al-button-group`
 *      (removed — AGENTS.md:244-249) or documenting `al-stat-card` / `al-tag`,
 *      which are AI-eval fixtures in
 *      `scripts/ai-readiness/fixtures/canonical-contracts.md`, not elements the
 *      library ships.
 */
import { pathToFileURL } from 'node:url';
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
// @ts-expect-error — plain ESM module, no type declarations. It is the same
// generator the routes and the gates read, so guidance is validated against
// exactly the component set the site renders.
import { COMPONENTS, libraryRecords } from './lib/registry.mjs';
// @ts-expect-error — plain ESM module, as above.
import { PROJECTS } from './lib/projects.mjs';
// @ts-expect-error — plain ESM module, as above. The guide's path is exported
// by the module that reads it, so the file is named once in this app.
import { MIGRATION_PATH } from './lib/migration.mjs';
// @ts-expect-error — plain ESM module, as above.
import { repoRoot } from './lib/repo-root.mjs';

/** Live component slugs in the SHARED library, from the CEM. */
const SLUGS: Set<string> = new Set(
  (COMPONENTS as { slug: string }[]).map((component) => component.slug),
);

/**
 * BRAND-LAYER GUIDANCE LIVES IN A SUBDIRECTORY, AND HAS TO.
 *
 * A guidance file is keyed by component slug, and a slug stopped being unique
 * the moment a brand layer could override a base component: `header` is both
 * Altitude's bare landmark and Southleft's navigation bar. One `header.yaml`
 * would render on both pages, telling a reader of the Altitude header about
 * pill nav items and a mobile panel it does not have.
 *
 * So a layer's guidance is namespaced by the project that owns it —
 * `guidance/southleft/header.yaml` — and the base library keeps the flat path.
 * The directory is not decoration: it is what makes the two addressable
 * separately. Built from the registry, so a new layer needs no edit here.
 */
const LAYER_SLUGS: Map<string, Set<string>> = new Map(
  (PROJECTS as { id: string; brandLayer: { root: string; workspace: string } | null }[])
    .filter((project) => project.brandLayer)
    .map((project) => [
      project.id,
      new Set(
        (libraryRecords(project.brandLayer) as { records: { slug: string }[] }).records.map(
          (record) => record.slug,
        ),
      ),
    ]),
);

/**
 * Which component an entry id addresses, or `null` if it addresses none.
 * `header` → the base library's; `southleft/header` → that project's layer.
 */
function resolveEntryId(id: string): { slug: string; scope: Set<string> } | null {
  const parts = id.split('/');
  if (parts.length === 1) {
    return SLUGS.has(id) ? { slug: id, scope: SLUGS } : null;
  }
  if (parts.length === 2) {
    const [projectId, slug] = parts;
    const layer = LAYER_SLUGS.get(projectId);
    if (!layer?.has(slug)) return null;
    // An `instead:` pointer from layer guidance may name a base component —
    // "use al-layout instead" is the commonest correct advice a layer gives.
    return { slug, scope: new Set([...SLUGS, ...layer]) };
  }
  return null;
}

/**
 * A citation anchor is embedded in a `data-` attribute and re-read from the
 * built HTML by the gate, so it must survive HTML escaping unambiguously.
 * Rejecting the five escapable characters at authoring time is cheaper than
 * teaching the gate to unescape them.
 */
const anchor = z
  .string()
  .min(3)
  .refine((value) => !/[<>&"']/.test(value), {
    message:
      'A source anchor must not contain < > & " or \' — it is round-tripped through an HTML attribute.',
  });

/** Prose lines are full sentences; the floor stops a one-word placeholder. */
const line = z.string().min(20);

const guidance = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/guidance' }),
  schema: z.object({
    /** One paragraph answering "what is this for". Becomes the page's lede. */
    purpose: z.string().min(60),
    /** Situations this component is the right answer to. */
    whenToUse: z.array(line).min(2),
    /**
     * Situations it is the WRONG answer to. Required, and required to be
     * non-empty: this is the section the audit found missing everywhere, and a
     * schema is the only thing that keeps it from quietly rotting away again.
     */
    whenNotToUse: z
      .array(
        z.object({
          text: line,
          /** Optional pointer to the component that IS the right answer. */
          instead: z.string().optional(),
        }),
      )
      .min(2),
    dos: z.array(line).min(2),
    donts: z.array(line).min(2),
    /** Real constraints of THIS implementation, not generic WCAG restatement. */
    accessibility: z.array(line).min(1),
    /** UX writing rules for the strings a consumer puts into this component. */
    content: z.array(line).min(1),
    /** Where each claim above came from, and what proves it is still true. */
    sources: z
      .array(
        z.object({
          /** Repo-relative, forward slashes. Checked to exist by the gate. */
          path: z.string().min(5),
          /** Literal text that must still be present in `path`. */
          contains: anchor,
          note: z.string().min(10),
        }),
      )
      .min(1),
  }),
});

/**
 * Cross-file validation the per-entry schema cannot express: the entry id must
 * be a real component, and so must every `instead:` pointer. Astro surfaces a
 * thrown error here as a build failure, which is the point — a dangling
 * pointer to a removed component is exactly the drift this spec exists to stop.
 */
function assertPointsAtRealComponents(
  entries: { id: string; data: { whenNotToUse: { instead?: string }[] } }[],
): void {
  const problems: string[] = [];
  for (const entry of entries) {
    const resolved = resolveEntryId(entry.id);
    if (!resolved) {
      problems.push(
        `guidance/${entry.id}.yaml describes "${entry.id}", which is not a component in the CEM. ` +
          'Base-library guidance is `<slug>.yaml`; guidance for a brand layer is `<project-id>/<slug>.yaml`.',
      );
      continue;
    }
    for (const row of entry.data.whenNotToUse) {
      if (row.instead && !resolved.scope.has(row.instead)) {
        problems.push(
          `guidance/${entry.id}.yaml points at "${row.instead}" via instead:, which is not a component in the CEM.`,
        );
      }
    }
  }
  if (problems.length) throw new Error(`Component guidance:\n  - ${problems.join('\n  - ')}`);
}

/**
 * THE MIGRATION GUIDE — the repo's own `MIGRATION.md`, compiled and not copied.
 *
 * A collection of exactly one entry, whose `base` is the MONOREPO ROOT rather
 * than anywhere under `src/`. That is the whole point: the v1 → v2 guide is a
 * repo document that `AGENTS.md`, `CLAUDE.md` and the theme-switcher guidance
 * all cite, and the site used to cite it too without ever rendering it. Pulling
 * it in through the loader means the page compiles the file that other readers
 * already follow — pasting the prose into an `.astro` component would have been
 * wrong the first time someone edited the root.
 *
 * It carries no schema because it has no frontmatter and needs none; what the
 * page wants from it is `render()`, Astro's own markdown pipeline. Routing it
 * through the content layer is also why this app added no markdown dependency
 * for a 500-line guide full of fenced diffs and tables.
 */
const migration = defineCollection({
  // A file URL, not the bare absolute path `repoRoot()` returns: the loader
  // hands `base` straight to `fileURLToPath()`, which reads a Windows path as a
  // URL with an unknown scheme and fails the build with "The URL must be of
  // scheme file". A relative string would work too, but it would have to be
  // counted from this app up to the monorepo root — one more thing to get wrong
  // the day either moves.
  loader: glob({ pattern: MIGRATION_PATH, base: pathToFileURL(`${repoRoot()}/`) }),
});

export const collections = { guidance, migration };
export { assertPointsAtRealComponents, SLUGS };
