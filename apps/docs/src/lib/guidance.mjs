/**
 * Component guidance, rendered for the MACHINE-facing surface.
 *
 * `GuidancePanel.astro` renders this same data as HTML for a human. Until now
 * that was the ONLY place it rendered: `markdown.mjs` emitted Install /
 * Properties / Slots / Events / CSS / methods — the API and nothing else — so
 * an agent fetching `/docs/components/button.md`, or reading `llms-full.txt`,
 * got every attribute of a component and no word about when reaching for it is
 * wrong. The half of the docs that cannot be generated was also the half no
 * agent could see.
 *
 * This module is the shared half. It exists as a separate file, rather than
 * living inside `markdown.mjs`, for one reason: the LOOKUP RULE below is
 * subtle, it is duplicated nowhere, and it has to stay identical to the panel's
 * or the two surfaces start describing different components under one slug.
 *
 * WHY THE CALLER PASSES THE ENTRIES IN. Guidance is an Astro content
 * collection, and `getCollection()` only exists inside Astro pages/endpoints.
 * `markdown.mjs` and `artifacts.mjs` are plain ESM read at build time by both
 * Astro routes and Node scripts, so they cannot reach for it themselves. Each
 * route hands its already-loaded collection down instead. That keeps a single
 * load per build and avoids adding a YAML parser to read files Astro has
 * already parsed and schema-validated.
 */

/**
 * The guidance entry for one component, or `undefined`.
 *
 * BRAND-LAYER LOOKUP — the rule this shares with `GuidancePanel.astro`:
 * a slug stopped being unique once a brand layer could override a base
 * component. `header` is both Altitude's bare landmark and Southleft's
 * navigation bar, so a layer's guidance is namespaced by the project that owns
 * it (`guidance/southleft/header.yaml`) and the base library keeps the flat
 * path.
 *
 * There is deliberately NO FALLBACK from a layer component to the base file.
 * Inheriting Altitude's advice about a component the brand replaced is
 * precisely the wrong answer; "not yet authored" is the honest one until
 * someone writes it. The panel makes the same choice, and the two must agree —
 * otherwise the `.md` twin of a page would carry guidance the page itself
 * refuses to show.
 */
export function guidanceFor(entries, component, project) {
  if (!entries?.length || !component) return undefined;
  const fromBrandLayer =
    project?.brandLayer && component.libraryWorkspace === project.brandLayer.workspace;
  const entryId = fromBrandLayer ? `${project.id}/${component.slug}` : component.slug;
  return entries.find((item) => item.id === entryId)?.data;
}

/**
 * One component's guidance as Markdown lines, or `[]` when none is authored.
 *
 * ABSENCE IS RENDERED, NOT HIDDEN — the same rule the panel follows. A
 * component with no guidance gets an explicit note rather than a silently
 * shorter document, because to a reader (and to an agent summarising the
 * library) a missing section and a component nobody needed to warn you about
 * are indistinguishable otherwise.
 *
 * `whenNotToUse` leads. It is the section the original audit found missing
 * across the entire library, it is the one the schema refuses to let a file
 * ship without, and for an agent choosing between components it is the only
 * section that can prevent the wrong choice rather than confirm a made one.
 */
export function guidanceMarkdown(guidance) {
  if (!guidance) {
    return [
      '## Guidance',
      '',
      '_No usage guidance has been written for this component yet. The API below is generated ' +
        'from the manifest and is complete; what is missing is when to reach for it and when not to._',
      '',
    ];
  }

  const bullets = (items) => items.map((item) => `- ${item}`);

  const lines = ['## Guidance', '', guidance.purpose, '', '### When not to use', ''];

  // `instead:` is a slug, not a URL. It is emitted as a plain component name
  // rather than a link because this Markdown is served at several URLs (the
  // `.md` twin, `llms-full.txt`, `llms-components.txt`) whose relative depth
  // differs — a link correct at one is broken at the others. The slug is
  // resolvable by any reader that has the component list, which is the whole
  // point of shipping the list alongside it.
  lines.push(
    ...guidance.whenNotToUse.map(
      (row) => `- ${row.text}${row.instead ? ` **Use \`${row.instead}\` instead.**` : ''}`
    )
  );

  lines.push(
    '',
    '### When to use',
    '',
    ...bullets(guidance.whenToUse),
    '',
    '### Do',
    '',
    ...bullets(guidance.dos),
    '',
    "### Don't",
    '',
    ...bullets(guidance.donts),
    '',
    '### Accessibility in practice',
    '',
    ...bullets(guidance.accessibility),
    '',
    '### Content guidelines',
    '',
    ...bullets(guidance.content),
    ''
  );

  // The citations are what separate this from generic advice: every claim above
  // names a repo path and a literal anchor string that `check-guidance.mjs`
  // re-reads from the BUILT output. Carrying them into the machine surface lets
  // an agent verify a claim the same way the gate does, instead of trusting it.
  if (guidance.sources?.length) {
    lines.push(
      '### Sources',
      '',
      ...guidance.sources.map((source) => `- \`${source.path}\` — ${source.note}`),
      ''
    );
  }

  return lines;
}
