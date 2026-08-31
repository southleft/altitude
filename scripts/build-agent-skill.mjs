#!/usr/bin/env node
/**
 * Generate .claude/skills/altitude-facts/GENERATED-FACTS.md — the mechanical
 * half of the altitude-facts agent skill.
 *
 * WHY THIS EXISTS (R10). Atlassian pairs an MCP server with a skill; the skill
 * is what an agent reads before it has decided to make a tool call at all, and
 * a hand-maintained skill drifts from the library exactly the way the old
 * hand-written llms.txt did (T1/R1). So the roster, per-tag caveats, token
 * conventions and MCP surface below are GENERATED from the same committed
 * artifacts the docs site and llms.txt already read — never re-typed by hand.
 * `--check` fails when the tracked file has drifted, wired at `pnpm run
 * check:skills`, same discipline as `check:llms` (build-root-llms.mjs) and
 * the MCP capability matrix (libs/altitude-mcp/scripts/build-capability-matrix.mjs).
 *
 * WHAT IS DELIBERATELY NOT HERE. Full per-attribute prose (types, long
 * descriptions, usage examples) already exists, generated and gated, at
 * apps/docs's llms-components.txt / llms-tokens.txt and via the live
 * `altitude_get_component` / `altitude_get_tokens` MCP tools. Duplicating
 * that ~5000-line reference a third time would itself be a drift risk with no
 * benefit over calling the tool once. What IS embedded is exactly what an
 * agent needs before deciding whether a tool call is even necessary: NAMES
 * (so "does this exist" / "am I about to invent one" is answerable from the
 * skill alone, offline) and the CAVEATS a live query would never surface
 * (doNotFlag entries, the tokens do-not-invent list) — see SKILL.md section 0
 * for the full reasoning.
 *
 * The judgement in SKILL.md itself — when to reach for this file vs a live
 * MCP call, how this skill relates to altitude-component-authoring and
 * altitude-figma-sync, and the hard-won traps section — is hand-written and
 * stays that way; a generator cannot produce judgement, only facts.
 *
 * Usage:
 *   node scripts/build-agent-skill.mjs            # write GENERATED-FACTS.md
 *   node scripts/build-agent-skill.mjs --check     # fail if the tracked file has drifted
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const SKILL_DIR = path.join(REPO_ROOT, '.claude', 'skills', 'altitude-facts');
const OUT = path.join(SKILL_DIR, 'GENERATED-FACTS.md');
const CHECK = process.argv.includes('--check');

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'));
const readText = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

/* --------------------------------------------------------------- the links */

/** Every repo-relative path this file names as a source, verified below. */
const linked = new Set();
function cite(rel) {
  linked.add(rel.replace(/^\//, '').replace(/\/$/, ''));
  return rel;
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
      dead.push(`${rel} — exists locally but is NOT tracked in git`);
    }
  }
  return dead;
}

/* -------------------------------------------------------------- the facts */

const cemDigestPath = cite('.altitude/ai-readiness/cem-digest.json');
const tokensDigestPath = cite('.altitude/ai-readiness/tokens-digest.json');
const capabilityMatrixPath = cite('libs/altitude-mcp/CAPABILITY-MATRIX.md');
const dsProjectsPath = cite('.altitude/ds-projects.json');

const cemDigest = readJson(cemDigestPath);
const tokensDigest = readJson(tokensDigestPath);
const dsProjects = readJson(dsProjectsPath);
const capabilityMatrix = readText(capabilityMatrixPath);

let a11y = null;
let a11yPath = null;
try {
  a11yPath = cite('.altitude/a11y/report.json');
  a11y = readJson(a11yPath);
} catch {
  a11y = null;
}

const tags = Object.keys(cemDigest).sort();
const projectIds = Object.keys(dsProjects.projects);

/** One roster line per tag: name lists only — the mechanical, do-not-invent surface. */
function rosterLine(tag) {
  const c = cemDigest[tag];
  const attrs = c.attributes.map((a) => a.name).join(', ') || 'none';
  const slots = c.slots.map((s) => s.name).join(', ') || 'none';
  const events = c.events.map((e) => e.name).join(', ') || 'none';
  const parts = (c.cssParts ?? []).join(', ') || 'none';
  return `- \`${tag}\`\n  - attrs: ${attrs}\n  - slots: ${slots}\n  - events: ${events}\n  - parts: ${parts}`;
}

/** Every tag with at least one doNotFlag entry — the caveats a live tool call would not surface as a caveat. */
const caveatTags = tags.filter((tag) => (cemDigest[tag].doNotFlag ?? []).length > 0);
function caveatBlock(tag) {
  const entries = cemDigest[tag].doNotFlag
    .map((d) => `  - **${d.pattern}**: ${d.rule}${d.citation ? ` (${d.citation})` : ''}`)
    .join('\n');
  return `- \`${tag}\`\n${entries}`;
}

/** Pull the three roster tables straight out of the already-generated, already-gated capability matrix. */
function extractSection(heading) {
  const re = new RegExp(`## ${heading} \\(([^)]*)\\)\\n\\n([\\s\\S]*?)(\\n## |$)`);
  const m = capabilityMatrix.match(re);
  if (!m) throw new Error(`build-agent-skill: could not find "## ${heading}" in ${capabilityMatrixPath}`);
  return { count: m[1], table: m[2].trim() };
}

function namesAndIntents(table) {
  // Rows look like: | Intent text | `name` | filters | fields | failure |
  return table
    .split('\n')
    .slice(2) // drop the header row + separator row
    .map((line) => {
      const cells = line.split('|').map((c) => c.trim()).filter((c, i, arr) => !(i === 0 && c === '') && !(i === arr.length - 1 && c === ''));
      const [intent, name] = cells;
      return { name: name?.replace(/^`|`$/g, ''), intent };
    })
    .filter((row) => row.name);
}

const toolsSection = extractSection('Tools');
const resourcesSection = extractSection('Resources');
const promptsSection = extractSection('Prompts');
const tools = namesAndIntents(toolsSection.table);
const resources = namesAndIntents(resourcesSection.table);
const prompts = namesAndIntents(promptsSection.table);

const doNotInvent = tokensDigest.conventions?.notExistDoNotInvent ?? [];
const families = Object.keys(tokensDigest.groups).sort();

/* ------------------------------------------------------------- the output */

const body = `# Altitude facts — generated

GENERATED by \`scripts/build-agent-skill.mjs\`. Do not edit by hand — every name and
count below is read from a committed artifact, and \`node scripts/build-agent-skill.mjs
--check\` (\`pnpm run check:skills\`) fails when this file has drifted from them. See
\`SKILL.md\` for what to do with this and why only this much is generated.

## Component roster (${tags.length})

One entry per custom element, from ${cite(cemDigestPath)} (itself generated from
\`libs/al-web-components/custom-elements.json\`). Names only — an attribute, slot,
event or part missing here does not exist; a name here may still be typed/enum
constrained, so confirm the shape with \`altitude_get_component\` before shipping
code that depends on it.

${tags.map(rosterLine).join('\n')}

## Per-component caveats — do not flag as bugs (${caveatTags.length} tags, ${caveatTags.reduce((n, t) => n + cemDigest[t].doNotFlag.length, 0)} entries)

Sanctioned patterns that look wrong and are not. Every entry is a real \`doNotFlag\`
record in the CEM digest, cited back to its source.

${caveatTags.length ? caveatTags.map(caveatBlock).join('\n') : '(none currently recorded)'}

## Token conventions

From ${cite(tokensDigestPath)}: ${tokensDigest.total} tokens across ${families.length} families.

- CSS variable prefix: \`${tokensDigest.conventions.cssVariablePrefix}\`
- Semantic layer: ${tokensDigest.conventions.themeTokensPrefix}
- Primitive layer: ${tokensDigest.conventions.primitiveTokensPrefix}
- Font sizes: ${tokensDigest.conventions.fontSizeNamingScheme}
- Font weights: ${tokensDigest.conventions.fontWeights}

### Families (${families.length})

${families.map((f) => `\`${f}\``).join(', ')}

### Names that do NOT exist — do not write these (${doNotInvent.length})

Each has been observed being invented because it looks like it should exist.

${doNotInvent.map((name) => `- \`${name}\``).join('\n')}

Resolved values are not embedded here (they are a build artifact, not a tracked
source) — call \`altitude_get_tokens\` or read the docs site's \`llms-tokens.txt\`
for values.

## MCP surface

From ${cite(capabilityMatrixPath)} (itself generated from a live handshake against
\`libs/altitude-mcp/src/server.mjs\` — see that file for required filters, full
expected-fields shape and failure modes; this is a name + one-line intent index).

### Tools (${toolsSection.count})

${tools.map((t) => `- \`${t.name}\` — ${t.intent}`).join('\n')}

### Resources (${resourcesSection.count})

${resources.map((r) => `- \`${r.name}\` — ${r.intent}`).join('\n')}

### Prompts (${promptsSection.count})

${prompts.map((p) => `- \`${p.name}\` — ${p.intent}`).join('\n')}

## Accessibility snapshot

${
  a11y
    ? `axe-core ${a11y.source.axeVersion}, story by story: ${a11y.totals.stories} stories,
${a11y.totals.componentsMeasured} components measured, ${a11y.totals.structuralViolations} structural
violations, ${a11y.totals.contrastViolations} contrast violations (reported, not gated — see
${cite(a11yPath)}). A missing row for a component means NOT RECORDED, never a pass.`
    : 'No accessibility report is committed in this checkout.'
}

## Design systems this library drives (${projectIds.length})

${projectIds.map((id) => `\`${id}\``).join(', ')} — see ${cite(dsProjectsPath)} or
\`altitude_list_ds_projects\` for each project's Figma file, brand and docs scope.
`;

/* --------------------------------------------------------------- the write */

const dead = verifyLinks();
if (dead.length) {
  console.error('FAIL — GENERATED-FACTS.md would cite a source that does not resolve in a fresh clone:\n');
  for (const problem of dead) console.error(`  ${problem}`);
  process.exit(1);
}

const existing = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;

if (CHECK) {
  if (existing === body) {
    console.log(
      `OK — GENERATED-FACTS.md matches its sources (${tags.length} components, ${tokensDigest.total} tokens, ` +
        `${toolsSection.count} tools, ${resourcesSection.count} resources, ${promptsSection.count} prompts).`,
    );
    process.exit(0);
  }
  console.error('FAIL — .claude/skills/altitude-facts/GENERATED-FACTS.md has drifted from the artifacts it is generated from.');
  console.error('Regenerate it:  node scripts/build-agent-skill.mjs');
  process.exit(1);
}

fs.mkdirSync(SKILL_DIR, { recursive: true });
fs.writeFileSync(OUT, body, 'utf8');
console.log(
  `Wrote .claude/skills/altitude-facts/GENERATED-FACTS.md — ${tags.length} components, ${tokensDigest.total} tokens, ` +
    `${toolsSection.count} tools, ${resourcesSection.count} resources, ${promptsSection.count} prompts.`,
);
