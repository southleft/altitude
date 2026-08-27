#!/usr/bin/env node
/**
 * Generate the repository's root `llms.txt` — the CONSUMER index.
 *
 * WHAT CHANGED AND WHY. The hand-written version of this file was a
 * CONTRIBUTOR map: its first section was "Read first — the refactor plan
 * (T0.x–T6.x), the guardrails G1–G8, the migration manifest". None of that is
 * usable by someone whose job is to build a page with these components, which
 * is what every comparable system's llms.txt is for — Carbon's and Adobe's open
 * on components, tokens and usage. Contributor material has not been deleted;
 * it has been moved below the consumer material, where it belongs.
 *
 * WHY IT IS GENERATED. The old file also carried counts and claims in prose
 * ("Eight tools", the pilot component list, the token artifacts) with nothing
 * checking them, and three of the four links in its "Source of truth for
 * consumers" section pointed at paths the same file labelled "Generated, not
 * tracked in git" — dead in a fresh clone and dead on GitHub. Both problems are
 * the same problem: a hand-maintained index of generated things. So every
 * number and every tag below is read from a committed artifact, and:
 *
 *   EVERY REPO-RELATIVE LINK THIS SCRIPT EMITS IS ASSERTED TO EXIST AND TO BE
 *   TRACKED IN GIT BEFORE THE FILE IS WRITTEN.
 *
 * A path that is a build artifact cannot be linked as a repo path at all; it is
 * named as the PACKAGE EXPORT a consumer imports, which is where it genuinely
 * exists.
 *
 * Usage:
 *   node scripts/build-root-llms.mjs            # write llms.txt
 *   node scripts/build-root-llms.mjs --check    # fail if the tracked file has drifted
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = path.join(REPO_ROOT, 'llms.txt');
const CHECK = process.argv.includes('--check');

const read = (rel) => JSON.parse(fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'));

/* --------------------------------------------------------------- the links */

/** Every repo-relative path this file links to, collected so it can be verified. */
const linked = new Set();

/**
 * A repo-relative markdown link. The path is recorded and checked below — a
 * link is only allowed here if a fresh clone would resolve it.
 */
function link(label, rel, note) {
  linked.add(rel.replace(/^\//, '').replace(/\/$/, ''));
  return `- [${label}](/${rel.replace(/^\//, '')})${note ? `: ${note}` : ''}`;
}

function verifyLinks() {
  const tracked = new Set(
    execFileSync('git', ['ls-files'], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
      .split('\n')
      .filter(Boolean),
  );
  const trackedDirs = new Set();
  for (const file of tracked) {
    const parts = file.split('/');
    for (let i = 1; i < parts.length; i++) trackedDirs.add(parts.slice(0, i).join('/'));
  }

  const dead = [];
  for (const rel of linked) {
    if (!fs.existsSync(path.join(REPO_ROOT, rel))) {
      dead.push(`${rel} — does not exist`);
    } else if (!tracked.has(rel) && !trackedDirs.has(rel)) {
      dead.push(`${rel} — exists locally but is NOT tracked in git (dead in a fresh clone and on GitHub)`);
    }
  }
  return dead;
}

/* -------------------------------------------------------------- the facts */

const cemDigest = read('.altitude/ai-readiness/cem-digest.json');
const tokensDigest = read('.altitude/ai-readiness/tokens-digest.json');
const dsProjects = read('.altitude/ds-projects.json');
const wcPackage = read('libs/al-web-components/package.json');
const reactPackage = read('libs/al-react/package.json');

/** The CEM itself, for the component list — the digest is a projection of it. */
const cem = read('libs/al-web-components/custom-elements.json');
const declarations = cem.modules.flatMap((module) =>
  (module.declarations ?? []).filter((declaration) => declaration.customElement && declaration.tagName),
);
const tags = [...new Set(declarations.map((d) => d.tagName))].sort();
/** Icon glyph elements are payloads of `<al-icon>`, not components with an API. */
const iconTags = tags.filter((tag) => tag.startsWith('al-icon-'));
const componentTags = tags.filter((tag) => !tag.startsWith('al-icon-'));

let a11y = null;
try {
  a11y = read('.altitude/a11y/report.json');
} catch {
  a11y = null;
}

/** Every `server.registerTool(` in the MCP server — counted, not asserted in prose. */
// Reads the TOOLS array in lib/tools.mjs. Tool registrations MOVED there from
// inline server.registerTool('name', ...) calls in server.mjs (index.mjs now
// registers them generically), and this script kept the old regex against
// server.mjs long after it stopped matching anything. The failure mode was
// quiet and misleading: zero matches was not an error, so the generator
// emitted "MCP server - 0 tools" and the only symptom was check:llms saying
// llms.txt "has drifted from the artifacts it is generated from" - when in
// fact llms.txt was right and the GENERATOR had drifted. check-mcp-docs.mjs
// took the same refactor but HAD a zero-match guard, so it failed loudly and
// was repaired first (2026-08-27). Same source of record and same guard here
// now; keep the two in step.
const TOOLS_SOURCE = path.join(REPO_ROOT, 'libs/altitude-mcp/src/lib/tools.mjs');
const mcpSource = fs.readFileSync(TOOLS_SOURCE, 'utf8');
const mcpTools = [...mcpSource.matchAll(/name:\s*'(altitude_[a-z0-9_]+)'/g)].map((m) => m[1]);

if (mcpTools.length === 0) {
  console.error(`build-root-llms: found no tool names in ${TOOLS_SOURCE} - regex or file moved?`);
  process.exit(1);
}

const projectIds = Object.keys(dsProjects.projects);
const defaultProject = dsProjects.projects[dsProjects.default];
const DOCS = 'https://altitude.pages.dev/docs';

const doNotInvent = tokensDigest.conventions?.notExistDoNotInvent ?? [];

/* ------------------------------------------------------------- the output */

const body = `# ${defaultProject.name}

> ${componentTags.length} Lit 3 web components with React 19 wrappers, ${tokensDigest.total} design
> tokens across three tiers, and ${projectIds.length} brands driven off one library. Published as
> \`${wcPackage.name}\` and \`${reactPackage.name}\`.

GENERATED by \`scripts/build-root-llms.mjs\` from the committed artifacts named
below. Do not edit this file by hand — every count and every tag in it is read,
and \`node scripts/build-root-llms.mjs --check\` fails when it drifts.

## Read these before generating code

The full machine documentation lives on the docs site, one subject per file, and
is regenerated from the library on every build.

- [${DOCS}/llms.txt](${DOCS}/llms.txt): the map — rules, counts, component index.
- [${DOCS}/llms-tokens.txt](${DOCS}/llms-tokens.txt): all ${tokensDigest.total} tokens with resolved values. **The set is closed.**
- [${DOCS}/llms-components.txt](${DOCS}/llms-components.txt): every element's complete API — attributes, slots, events, CSS parts, methods.
- [${DOCS}/llms-a11y.txt](${DOCS}/llms-a11y.txt): what was machine-measured, and what was never recorded.
- [${DOCS}/llms-full.txt](${DOCS}/llms-full.txt): all of the above concatenated.

Every documentation page is also served as Markdown at the same URL plus \`.md\`.

## Rules

You MUST follow these. Each names a failure mode observed in generated code.

1. You must ONLY use the tokens listed in ${DOCS}/llms-tokens.txt. Do not make up
   values. A raw hex, px length or font stack in a rule a token covers is wrong
   even when it renders identically — it will not follow a brand, mode, density
   or contrast setting.
2. You must ONLY use CSS custom property names from that file. An unknown
   \`--al-*\` name is not an error; CSS falls back silently, so an invented token
   ships a page that renders and is wrong. There are ${tokensDigest.total} real ones in
   ${Object.keys(tokensDigest.groups).length} families.
3. You must not invent an element, attribute, slot or event. The manifest is the
   whole set.
4. You must render components inside \`<al-theme brand="…">\`. Tokens are set on
   that host, not on \`:root\`.
5. You must arrange sibling components with \`<al-layout>\` and its props — not
   hand-rolled flex or grid, and not a new \`*-group\` wrapper. The groups that
   exist do so for their SEMANTICS (fieldset/legend, roving keyboard selection,
   single-select state), not their spacing.
6. You must pick ONE registration path per document. See the registration model
   below.

### Token names that do not exist — do not write these

From \`.altitude/ai-readiness/tokens-digest.json\`; each has been observed being
invented because it looks like it should exist.

${doNotInvent.map((name) => `- \`${name}\``).join('\n')}

## Install

${
  wcPackage.private
    ? `NOT YET PUBLISHED. \`libs/al-web-components\` and \`libs/al-react\` are both
\`"private": true\` in this checkout, and whether they publish under a scope is an
open decision — so this file states the WORKSPACE names below and no install
command. Consume the libraries from this repo (\`pnpm --filter ${wcPackage.name} build\`)
until the published names exist, and take the import specifiers here as relative
to whatever the packages are finally called.`
    : `\`\`\`sh
npm install ${wcPackage.name}
npm install ${reactPackage.name}
\`\`\``
}

- Web components: \`${wcPackage.name}\` (workspace \`libs/al-web-components\`), v${wcPackage.version}
- React 19 wrappers: \`${reactPackage.name}\` (workspace \`libs/al-react\`), v${reactPackage.version}

\`\`\`html
<script>window.alAutoRegistry = true;</script>
<script type="module">
  import '${wcPackage.name}/components/button';
</script>

<al-theme brand="${defaultProject.brand}">
  <al-button>Continue</al-button>
</al-theme>
\`\`\`

## Registration — three paths, never mixed in one document

${link('The complete model', '.altitude/REGISTRATION.md', 'which path to take and why the flag is load-bearing')}

- **Template frameworks and plain HTML** — set \`window.alAutoRegistry = true\`
  inline in \`<head>\`, before any module script. ESM imports hoist, so setting it
  from application JS is too late.
- **React** — import the wrappers from \`${reactPackage.name}\`; set no flag. Each wrapper
  registers its element with a version suffix.
- **Micro-frontends** — set no flag and call
  \`registerAltitude({ mode: 'versioned', suffix })\` for coexisting versions.

## Components (${componentTags.length})

Each has a page at \`${DOCS}/components/<name>\` and a Markdown twin at the same
URL plus \`.md\`.

${componentTags.map((tag) => `\`${tag}\``).join(', ')}

Plus ${iconTags.length} icon glyph elements, which are payloads of \`<al-icon>\` rather than
components with an API of their own.

## Tokens (${tokensDigest.total})

- Prefix: \`${tokensDigest.conventions.cssVariablePrefix}\`.
- Semantic layer: ${tokensDigest.conventions.themeTokensPrefix}.
- Primitive layer: ${tokensDigest.conventions.primitiveTokensPrefix}.
- Font sizes: ${tokensDigest.conventions.fontSizeNamingScheme}.
- Font weights: ${tokensDigest.conventions.fontWeights}.
- The colour families are NOT free-form: each role has a fixed suffix set, listed
  in the digest and rendered in full at ${DOCS}/llms-tokens.txt.

## Accessibility

${
  a11y
    ? `axe-core ${a11y.source.axeVersion} against a static Storybook build, story by story:
${a11y.totals.stories} stories, ${a11y.totals.componentsMeasured} components measured, ${a11y.totals.structuralViolations} structural violations,
${a11y.totals.contrastViolations} contrast violations (\`${a11y.source.gateExcludes.join(', ')}\` is reported but not gated).
Screen-reader and keyboard rows need a human and read NOT RECORDED until one runs
them — a missing result is never a pass.`
    : 'No accessibility report is committed in this checkout.'
}

${link('The report', '.altitude/a11y/report.json', 'per-story axe results')}
${link('Manual test records', '.altitude/a11y/manual-tests.json', 'the screen-reader and keyboard passes a human actually ran')}

## Source of truth — all of it tracked in git

Readable in a bare clone with no build. Every link in this section is asserted to
exist and to be tracked before this file is written.

${link('Custom Elements Manifest', 'libs/al-web-components/custom-elements.json', `every element, generated by @custom-elements-manifest/analyzer; coverage gated by \`scripts/check-cem-coverage.js\``)}
${link('CEM digest', '.altitude/ai-readiness/cem-digest.json', 'the same graph flattened per tag — attributes, slots, events, enum values, plus a `doNotFlag` array of sanctioned patterns a reviewer must not report as violations')}
${link('Tokens digest', '.altitude/ai-readiness/tokens-digest.json', `all ${tokensDigest.total} names grouped into ${Object.keys(tokensDigest.groups).length} families, with the role/suffix matrix and the do-not-invent list`)}
${link('Token source', 'libs/al-web-components/styles/tokens-dtcg', 'the hand-authored DTCG tree everything else is built from; each token carries a standard `$type` plus an `org.altitude.token.cssType` extension naming the CSS surface it is authored for')}
${link('Design-system registry', '.altitude/ds-projects.json', `the ${projectIds.length} systems this one library drives (${projectIds.join(', ')}), each with its own Figma file, brand and documented scope`)}

### Built artifacts — import them, do not link them

These are emitted by \`pnpm --filter ${wcPackage.name} build\` and are NOT tracked in
git, so they have no repository path a fresh clone could follow. They ship in the
published package, and that is how to reach them:

\`\`\`js
import tokens from '${wcPackage.name}/tokens.json';     // every resolved --al-* value
import aliases from '${wcPackage.name}/aliases.json';   // the frozen alias map
\`\`\`
\`\`\`ts
import type {} from '${wcPackage.name}/tokens.d.ts';    // the token-name union
\`\`\`

\`${wcPackage.name}/tokens-dtcg/*\` exports the token source itself: \`styles/tokens-dtcg/\`
is tracked, hand-authored DTCG and ships in the package. Each token carries the
standard \`$type\` plus an \`org.altitude.token.cssType\` extension naming the CSS
surface it was authored for — \`$type\` alone is coarser than the token's intent.

The committed digests above carry the same NAMES, which is what an agent needs;
the values live in the package.

## MCP server — ${mcpTools.length} tools

${link('libs/altitude-mcp', 'libs/altitude-mcp/README.md', 'a read-only stdio + streamable-HTTP MCP server over exactly the artifacts above; registered in `.mcp.json` as `altitude`')}

${mcpTools.map((tool) => `- \`${tool}\``).join('\n')}

HTTP mode binds loopback only, reflects CORS to loopback origins only, and
rejects a non-loopback \`Host\` — it reads the working tree and has no auth.
Every tool is covered by \`libs/altitude-mcp/test/smoke.mjs\`, which asserts the
count so a new tool cannot ship untested.

## Contributing to Altitude

Everything below is for people changing the library, not for people using it.

${link('Agent contract', 'AGENTS.md', 'authoring rules, guardrails G1–G8, where things live, how to verify a change')}
${link('Contributor guide', 'CONTRIBUTING.md', 'setup, workspaces, the gate list')}
${link('Refactor plan', 'NEXT-GEN-UPGRADE-PLAN.md', 'the v2 phases P0–P6 and their tasks')}
${link('v1 → v2 migration', 'MIGRATION.md', 'what moved, and the scoped-theming migration')}
${link('Migration manifest', '.altitude/migration.json', 'per-component state; `legacy` components are read-only outside migration PRs (G2, CI-enforced)')}
${link('Pinned targets', '.altitude/targets.json', 'committed end-state versions')}
${link('Subsystem docs', '.altitude/README.md', 'tokens, build, semver, brands, SSR, parity, registration')}
${link('Baselines', '.altitude/baselines/README.md', 'VRT screenshots, token snapshot, bundle size — the truth-set every change must move with (G8)')}
`;

/* --------------------------------------------------------------- the write */

const dead = verifyLinks();
if (dead.length) {
  console.error('FAIL — llms.txt would ship dead links:\n');
  for (const problem of dead) console.error(`  ${problem}`);
  console.error('\nA link in llms.txt must resolve in a fresh clone. Name a build artifact as a');
  console.error('package export instead of linking it as a repository path.');
  process.exit(1);
}

const existing = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;

if (CHECK) {
  if (existing === body) {
    console.log(`OK — llms.txt matches its sources (${componentTags.length} components, ${tokensDigest.total} tokens, ${mcpTools.length} MCP tools, ${linked.size} links all tracked).`);
    process.exit(0);
  }
  console.error('FAIL — llms.txt has drifted from the artifacts it is generated from.');
  console.error('Regenerate it:  node scripts/build-root-llms.mjs');
  process.exit(1);
}

fs.writeFileSync(OUT, body, 'utf8');
console.log(
  `Wrote llms.txt — ${componentTags.length} components, ${iconTags.length} icon glyphs, ${tokensDigest.total} tokens, ` +
    `${mcpTools.length} MCP tools, ${linked.size} repo links (all tracked).`,
);
