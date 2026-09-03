/**
 * The body of `/examples.json` — the rendered markup for every component, as data.
 *
 * WHAT WAS MISSING. The custom-elements manifest carries zero `@example` tags,
 * so every generated surface in this repo could describe a component's API and
 * none of them could SHOW one. An agent asking `altitude_get_component` for
 * `al-input` got a props table — which is precisely the shape of input models
 * hallucinate around, because a props table invites invention and a working
 * snippet does not.
 *
 * WHERE THE MARKUP COMES FROM. `src/lib/examples.mjs`, unchanged and unforked:
 * the component's own `.stories.ts`, EXECUTED with a serializing `html` so the
 * output is 1:1 with what the playground renders rather than a transcription of
 * it. Read that module's header for why it executes rather than parses. This
 * module is a serializer over its result and nothing more — there is no second
 * extractor, and there must not be one, or the docs page and the MCP would
 * start showing different code for the same component.
 *
 * WHY AN ARTIFACT RATHER THAN THE MCP DOING THIS ITSELF. `libs/altitude-mcp`
 * READS generated artifacts and is never a second source of truth
 * (libs/altitude-mcp/README.md, "What this is (and isn't)"). Executing stories
 * needs a `module.registerHooks()` resolve hook, a temp directory and Node's
 * type stripping — a process-wide side effect and a dependency on this app's
 * source tree, neither of which belongs in a server a consumer can `npx`. So
 * the docs build emits the facts and the MCP reads them, the same relationship
 * it already has with `custom-elements.json` and `dist/css/tokens.json`.
 *
 * FAILURE IS A NAMED MISS, NEVER AN ABSENT KEY. A component whose story cannot
 * be serialized (property bindings, an empty render, no story file) gets
 * `examples: []` plus the `examplesNote` explaining which of those it was.
 * Silence is the one forbidden failure here: an agent that sees no `examples`
 * key cannot tell "this component has no example" from "this build did not
 * look".
 *
 * WHY IT LIVES UNDER `pages/` WITH A LEADING UNDERSCORE. Two routes render it —
 * `/examples.json` and `/<project>/examples.json` — and Astro skips
 * underscore-prefixed files when building the route table, so this is a plain
 * module they can both import rather than one route importing the other.
 */
import { exampleFor } from '../lib/examples.mjs';
import { repoRoot } from '../lib/repo-root.mjs';

/** An absolute path from this repo, as the repo-relative POSIX path a reader can cite. */
function relativize(absolute) {
  const root = repoRoot().replace(/\\/g, '/');
  const normalized = String(absolute).replace(/\\/g, '/');
  return normalized.startsWith(`${root}/`) ? normalized.slice(root.length + 1) : normalized;
}

/** One design system's examples artifact. */
export async function examplesJson(context) {
  const { site, project, registry } = context;

  const components = await Promise.all(
    registry.components.map(async (component) => {
      const result = await exampleFor(component);
      const row = {
        tag: component.tag,
        slug: component.slug,
        docs: `${site.url}/components/${component.slug}`,
        /** The wrapper name an @southleft/al-react consumer imports, or null. */
        react: component.react ?? null,
        examples: [],
        examplesNote: null,
      };

      if (!result?.ok) {
        row.examplesNote =
          result?.reason ??
          "no example could be produced from this component's story (reason not reported)";
        return row;
      }

      row.examples = [
        {
          /** Named for the story it came from — these are real stories, not invented cases. */
          title: `${component.name} — ${result.story}`,
          story: result.story,
          source: relativize(result.source),
          /** Web-component markup, exactly what the playground stage renders. */
          code: result.html,
          /**
           * Fixture CSS the story shipped alongside its markup, already scoped
           * to the preview container. Present only when the story had a
           * `<style>` block; it styles the SLOTTED content, never the component.
           */
          styles: result.styles || null,
        },
      ];
      return row;
    }),
  );

  return {
    $comment:
      'Generated at build time by apps/docs/src/pages/_examples-artifact.mjs from each component\'s own ' +
      '.stories.ts, executed by apps/docs/src/lib/examples.mjs. Read by the design-system MCP ' +
      '(libs/altitude-mcp/src/lib/docs-artifacts.mjs) so altitude_get_component can hand an agent working ' +
      'markup instead of a props table. Never hand-edit: edit the story.',
    site: site.url,
    project: { id: project.id, name: project.name, brand: project.brand, scoped: registry.scope.scoped },
    generated: new Date().toISOString(),
    source: 'libs/*/components/<slug>/<slug>.stories.ts',
    coverage: {
      components: components.length,
      withExample: components.filter((row) => row.examples.length > 0).length,
    },
    components,
  };
}
