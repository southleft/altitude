#!/usr/bin/env node
/**
 * build-component-docs.mjs — generate a per-component, per-project Markdown
 * REFERENCE DOC at `.altitude/contracts/docs/<project>/<tag>.md` (T20, spec
 * 2026-08-25-contract-backed-figma-parity-and-generation).
 *
 * WHY. `.altitude/contracts/<project>/<tag>.contract.json` already has every
 * fact a design tool (or an agent driving the Figma MCP) needs — props,
 * variant axes, slots + placeholder convention, states, token bindings,
 * a11y, the Figma set name/node-id — but it is JSON, optimized for a
 * program to diff, not for a reader (human or LLM) to skim before touching a
 * component's Figma set. This script re-shapes the SAME facts (plus, for the
 * Figma-set identity, the LIVE parity-manifest entry — never the contract's
 * own possibly-stale embedded copy) into one readable Markdown file per
 * component, so `altitude_get_component` and the altitude-figma-sync /
 * altitude-component-authoring skills have one place to point at.
 *
 * GENERATED, drift-gated like llms.txt (scripts/build-root-llms.mjs) and
 * GENERATED-FACTS.md (scripts/build-agent-skill.mjs): `--check` re-derives
 * every doc in memory and byte-compares it against what's on disk (including
 * orphan detection — a doc file with no corresponding contract/tracked tag
 * any more is ALSO reported as drift), exit 1 naming exactly which files
 * disagree. Determinism: stable key order (the contract's own — already
 * deterministic, see emit-contracts.mjs), no timestamps, LF line endings.
 *
 * Scope: every PARITY-TRACKED, non-excluded tag in the active project's
 * manifest THAT HAS A CONTRACT on disk. A tracked tag with no contract yet
 * (not seeded — run `emit-contracts.mjs --seed` first) is skipped with a
 * logged line, same as emit-contracts.mjs treats a missing CEM record —
 * never silently dropped, never fabricated.
 *
 * Usage:
 *   node scripts/contracts/build-component-docs.mjs                    # write, altitude
 *   node scripts/contracts/build-component-docs.mjs --project southleft
 *   node scripts/contracts/build-component-docs.mjs --check            # drift gate (CI)
 *   node scripts/contracts/build-component-docs.mjs --component al-button
 *   pnpm run contracts:docs / contracts:docs:sl / check:contract-docs
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveProject, figmaNodeUrlFor } from '../../libs/altitude-mcp/src/lib/ds-project.mjs';
import { readManifest } from '../../libs/altitude-mcp/src/lib/parity.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const CONTRACTS_DIR = join(REPO_ROOT, '.altitude', 'contracts');
const DOCS_DIR = join(CONTRACTS_DIR, 'docs');

// ── argv ────────────────────────────────────────────────────────────────

function argOf(flag) {
  const eq = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1) || null;
  const i = process.argv.indexOf(flag);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('-') ? process.argv[i + 1] : null;
}

const COMPONENT = argOf('--component');
const CHECK = process.argv.includes('--check');

// ── small markdown helpers ─────────────────────────────────────────────

/** Safe for a table cell: no raw pipes, no embedded newlines. */
function cell(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim() || '—';
}

function code(value) {
  return value === null || value === undefined || value === '' ? '—' : `\`${value}\``;
}

function codeList(values) {
  return values && values.length ? values.map((v) => `\`${v}\``).join(', ') : '—';
}

function table(headers, rows) {
  if (!rows.length) return '_None._';
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((r) => `| ${r.map(cell).join(' | ')} |`).join('\n');
  return [head, sep, body].join('\n');
}

/** One CSS-property -> {code, figma} token-binding map, rendered as a table. */
function tokenBindingsTable(bindings) {
  const entries = Object.entries(bindings ?? {});
  if (!entries.length) return '_None._';
  return table(
    ['CSS property', 'Code token', 'Figma variable'],
    entries.map(([prop, b]) => [prop, code(b?.code), code(b?.figma)]),
  );
}

// ── section builders ───────────────────────────────────────────────────

function buildFigmaSection(tag, entry, project) {
  if (!entry || !entry.figma) {
    return (
      `No Figma component set is mapped for \`${tag}\` in the **${project.name}** parity manifest ` +
      `(parity status: \`missing-in-figma\`). Map one in Figma, then run ` +
      `\`pnpm run parity:seed${project.isDefault ? '' : ` --project ${project.id}`}\`.`
    );
  }
  const { name, nodeId } = entry.figma;
  const lines = [`- Component set: **${name}**`];
  if (nodeId) {
    lines.push(`- Node id: \`${nodeId}\` (pinned)`);
    lines.push(`- [Open in Figma](${figmaNodeUrlFor(project, nodeId)})`);
  } else {
    lines.push(
      '- Node id: not pinned (`nodeId: null`) — resolve this set by **NAME** via the parity manifest ' +
        `(\`${project.paths.parityManifest}\`) or the \`altitude_check_parity\` MCP tool at need. Node ids ` +
        'for by-name-mapped components are re-minted when their Figma page is rebuilt, so a value hard-coded ' +
        'here would go stale — see `.altitude/PARITY.md`.',
    );
    lines.push(`- File: ${project.resolved.figmaUrlBase}`);
  }
  return lines.join('\n');
}

function buildPropsSection(props) {
  if (!props.length) return '_No props declared._';
  const rows = props.map((p) => {
    const valuesCell = p.values?.length ? codeList(p.values) : p.type === 'enum' ? '—' : code(p.rawType !== p.type ? p.rawType : null);
    const figmaCell = p.bindings?.figma?.omit
      ? '_not expressed in Figma (by design)_'
      : p.bindings?.figma
        ? `**${p.bindings.figma.property}** (${p.bindings.figma.kind})` +
          (p.bindings.figma.options?.length ? `: ${codeList(p.bindings.figma.options)}` : '')
        : '—';
    return [code(p.name), p.type, valuesCell, p.default !== undefined ? code(p.default) : '—', figmaCell];
  });
  const main = table(['Name', 'Type', 'Values', 'Default', 'Figma'], rows);
  const described = props.filter((p) => p.description);
  const prose = described.length ? described.map((p) => `#### \`${p.name}\`\n\n${p.description}`).join('\n\n') : null;
  const omittedNames = props.filter((p) => p.bindings?.figma?.omit).map((p) => p.name);
  const omitNote = omittedNames.length
    ? '**Figma-expression opt-out (T27):** ' +
      `${codeList(omittedNames)} ${omittedNames.length > 1 ? 'are' : 'is'} curated \`bindings.figma.omit: true\` — ` +
      'a deliberate decision to keep this prop out of the generated Figma set entirely (no axis, no component ' +
      'property, no instance), independent of whether the real set happens to expose one today. See ' +
      '`.altitude/contracts/README.md` § Figma-expression opt-out.'
    : null;
  return [main, prose, omitNote].filter(Boolean).join('\n\n');
}

function buildVariantAxesSection(props) {
  const variantProps = props.filter((p) => p.bindings?.figma?.kind === 'VARIANT');
  if (!variantProps.length) {
    return 'This component has no Figma `VARIANT`-bound prop — no variant axis to document.';
  }
  return variantProps
    .map((p) => {
      const lines = [`### \`${p.name}\` (Figma property "${p.bindings.figma.property}")`, ''];
      lines.push(`- Code values: ${codeList(p.values ?? [])}`);
      lines.push(
        `- Figma options (unmapped 1:1 by design — labels differ on purpose, see ` +
          `\`.altitude/contracts/README.md\` § Deviations): ${codeList(p.bindings.figma.options ?? [])}`,
      );
      return lines.join('\n');
    })
    .join('\n\n');
}

function buildSlotsSection(slots) {
  if (!slots.length) return '_No slots declared._';
  const rows = slots.map((s) => [
    code(s.name || '(default)'),
    s.description ?? '—',
    s.figmaPlaceholder ? code(s.figmaPlaceholder) : '—',
    s.figmaOmit ? 'not expressed (by design)' : s.figmaAxis ? 'VARIANT axis' : '—',
  ]);
  const main = table(['Slot', 'Description', 'Figma placeholder', 'Figma fan-out'], rows);
  const hasPlaceholder = slots.some((s) => s.figmaPlaceholder);
  const hasAxis = slots.some((s) => s.figmaAxis);
  const omittedNames = slots.filter((s) => s.figmaOmit).map((s) => s.name || '(default)');
  const notes = [main];
  if (hasPlaceholder) {
    notes.push(
      '**Figma placeholder convention (T19):** a `before`/`after` slot with a `figmaPlaceholder` value names ' +
      'the real Figma set\'s own icon-instance placeholder this slot resolves to when generating or reconciling ' +
      'a set — matched by **name**, never a node id (icon libraries re-mint ids on republish). See ' +
      '`.altitude/contracts/README.md` § Slot placeholder instances (T19) and the Icon Recoloring reference in ' +
      '`altitude-figma-sync`\'s `SKILL.md`.',
    );
  }
  if (hasAxis) {
    notes.push(
      '**Fan-out convention (T23):** a slot marked "VARIANT axis" fans out as its own True/False Figma VARIANT ' +
      'axis in a generated set — a separately-built component per combination — rather than a single shared ' +
      'BOOLEAN component property toggling visibility across every variant. See `.altitude/contracts/README.md` ' +
      '§ Fan-out convention.',
    );
  }
  if (omittedNames.length) {
    notes.push(
      '**Figma-expression opt-out (T27):** ' +
      `${codeList(omittedNames)} ${omittedNames.length > 1 ? 'are' : 'is'} curated \`figmaOmit: true\` — a ` +
      'deliberate decision to keep this slot out of the generated Figma set entirely (no axis, no BOOLEAN ' +
      'property, no icon instance, no Icon Before/After INSTANCE_SWAP property). See ' +
      '`.altitude/contracts/README.md` § Figma-expression opt-out.',
    );
  }
  return notes.join('\n\n');
}

function buildEventsSection(events) {
  if (!events.length) return '_No events declared._';
  return table(
    ['Name', 'Description'],
    events.map((e) => [code(e.name), e.description ?? '—']),
  );
}

function buildA11ySection(a11y) {
  const lines = [
    `- ARIA-bearing attributes: ${codeList(a11y?.ariaAttributes ?? [])}`,
    `- CSS parts: ${codeList(a11y?.cssParts ?? [])}`,
  ];
  return lines.join('\n');
}

function buildAnatomySection(contract) {
  if (!contract.anatomy) {
    return (
      `Anatomy was not measured when this contract was authored (\`anatomySource: "${contract.anatomySource ?? 'unavailable'}"\`) ` +
      '— see `.altitude/contracts/README.md` § Anatomy availability is best-effort. No root-level token table to show.'
    );
  }
  const root = contract.anatomy.root;
  const parts = [
    `**Anatomy case measured:** \`${contract.anatomyCase ?? '—'}\` (source: \`${contract.anatomySource}\`)`,
    '',
    `### Root — \`<${root.tag}${root.cls ? ` class="${root.cls}"` : ''}>\``,
    '',
    tokenBindingsTable(root.tokens),
  ];
  const overrides = contract.anatomy.stateOverrides;
  if (overrides && Object.keys(overrides).length) {
    parts.push('', '### State overrides (measured, root node)');
    for (const [state, byIndex] of Object.entries(overrides)) {
      for (const [idx, deltas] of Object.entries(byIndex)) {
        parts.push('', `**\`${state}\`**${Object.keys(byIndex).length > 1 ? ` (node #${idx})` : ''}`, '', tokenBindingsTable(deltas));
      }
    }
  }
  return parts.join('\n');
}

/** Render one `variant`-shaped map (`{ <value>: { ...cssProp: tokenBinding, state?, parts? } }`)
 * — shared by `conditionalBindings.variant` and any T25 other-enum-prop section, since both use
 * the schema's `variantBinding` shape. `heading` is the `###` section title; `label` is what each
 * value's own `####` sub-heading calls out (e.g. "variant" -> `secondary`, "position" -> `top-left`). */
function renderVariantLikeSection(heading, map) {
  const out = [heading, ''];
  for (const [value, binding] of Object.entries(map)) {
    const { state, parts: subParts, ...ownProps } = binding;
    out.push(`#### \`${value}\``, '', tokenBindingsTable(ownProps));
    if (subParts) {
      for (const [partName, deltas] of Object.entries(subParts)) {
        out.push('', `**Sub-element \`${partName}\`** (this variant's own override of that part — T25, a reversed-nesting BEM rule):`, '', tokenBindingsTable(deltas));
      }
    }
    if (state) {
      for (const [stateName, deltas] of Object.entries(state)) {
        out.push('', `**On \`${stateName}\`** (compound — wins over the generic state rule below):`, '', tokenBindingsTable(deltas));
      }
    }
    out.push('');
  }
  return out;
}

function buildConditionalBindingsSection(conditionalBindings) {
  if (!conditionalBindings) {
    return (
      'This component\'s `.scss` has no BEM modifier classes and no nested pseudo-class/attribute state rules ' +
      'that resolve to a single `--al-*` token — no conditional bindings to derive (T18; see ' +
      '`.altitude/contracts/README.md`).'
    );
  }
  let parts = [];
  if (conditionalBindings.variant) {
    parts = parts.concat(renderVariantLikeSection('### Per-variant (`variant`)', conditionalBindings.variant));
  }
  if (conditionalBindings.state) {
    parts.push('### Per-state, variant-agnostic (`state`)', '');
    for (const [stateName, deltas] of Object.entries(conditionalBindings.state)) {
      parts.push(`#### \`${stateName}\``, '', tokenBindingsTable(deltas), '');
    }
  }
  // T25: any OTHER enum prop (position, etc.) whose own BEM modifiers carry token bindings —
  // same variantBinding shape as `variant`, kept in its own section under the prop's own name.
  for (const [propName, map] of Object.entries(conditionalBindings)) {
    if (propName === 'variant' || propName === 'state') continue;
    parts = parts.concat(renderVariantLikeSection(`### Per-\`${propName}\``, map));
  }
  return parts.join('\n').trim();
}

function buildCodeSection(code_) {
  return [
    `- Import: \`${code_.importPath}\``,
    `- Tag: \`${code_.tagName}\``,
    `- Workspace: \`${code_.workspace}\``,
  ].join('\n');
}

/** Assemble the whole Markdown document for one (tag, project). */
function buildDoc({ tag, contract, entry, project }) {
  const sections = [
    `<!-- GENERATED by scripts/contracts/build-component-docs.mjs from ${tag}.contract.json + the ${project.id} parity manifest — do not hand-edit; run \`pnpm contracts:docs${project.isDefault ? '' : ':sl'}\` -->`,
    `# ${tag} — ${contract.name}`,
    `**Status:** \`${contract.status}\` · **Version:** \`${contract.version}\` · **Element:** \`<${contract.semantics?.element ?? '—'}>\`${contract.semantics?.role ? ` · **Role:** \`${contract.semantics.role}\`` : ''}`,
    contract.description || '_No description recorded._',
    '## Figma',
    buildFigmaSection(tag, entry, project),
    `## Props (${contract.props.length})`,
    buildPropsSection(contract.props),
    '## Variant axes',
    buildVariantAxesSection(contract.props),
    '## States',
    contract.states?.length ? codeList(contract.states) : '_No interaction states recorded._',
    `## Slots (${contract.slots.length})`,
    buildSlotsSection(contract.slots),
    `## Events (${contract.events.length})`,
    buildEventsSection(contract.events),
    '## Accessibility',
    buildA11ySection(contract.a11y),
    '## Anatomy & token bindings',
    buildAnatomySection(contract),
    '## Conditional token bindings (T18 — derived from this component\'s own `.scss`)',
    buildConditionalBindingsSection(contract.conditionalBindings),
    '## Code',
    buildCodeSection(contract.bindings.code),
    `## Tokens referenced (${contract.tokens.length})`,
    contract.tokens.length ? codeList(contract.tokens) : '_None._',
    `---\n\nSource contract: \`.altitude/contracts/${project.id}/${tag}.contract.json\`.`,
  ];
  return sections.join('\n\n') + '\n';
}

// ── main ────────────────────────────────────────────────────────────────

function main() {
  const project = resolveProject();
  const manifest = readManifest(project);
  if (!manifest) {
    console.error(`[contract-docs] no parity manifest at ${project.resolved.parityManifest} — run parity:seed first.`);
    process.exit(2);
  }

  let trackedTags = Object.keys(manifest.components ?? {}).sort();
  if (COMPONENT) {
    if (!trackedTags.includes(COMPONENT)) {
      console.error(`[contract-docs] "${COMPONENT}" is not a parity-tracked component for project "${project.id}".`);
      process.exit(2);
    }
    trackedTags = [COMPONENT];
  }

  const outDir = join(DOCS_DIR, project.id);
  const contractsDir = join(CONTRACTS_DIR, project.id);

  const expected = new Map(); // filename -> content
  const skippedExcluded = [];
  const skippedNoContract = [];

  for (const tag of trackedTags) {
    const entry = manifest.components[tag];
    if (entry?.excluded) {
      skippedExcluded.push(tag);
      continue;
    }
    const contractFile = join(contractsDir, `${tag}.contract.json`);
    if (!existsSync(contractFile)) {
      skippedNoContract.push(tag);
      continue;
    }
    const contract = JSON.parse(readFileSync(contractFile, 'utf8'));
    expected.set(`${tag}.md`, buildDoc({ tag, contract, entry, project }));
  }

  if (skippedExcluded.length) console.log(`[contract-docs] skip (excluded): ${skippedExcluded.join(', ')}`);
  if (skippedNoContract.length) {
    console.log(`[contract-docs] skip (no contract yet — run contracts:seed): ${skippedNoContract.join(', ')}`);
  }

  const onDisk = existsSync(outDir) ? readdirSync(outDir).filter((f) => f.endsWith('.md')) : [];
  const onDiskSet = new Set(onDisk);

  if (CHECK) {
    const problems = [];
    for (const [file, content] of expected) {
      if (!onDiskSet.has(file)) {
        problems.push(`MISSING  ${project.id}/${file}`);
        continue;
      }
      const actual = readFileSync(join(outDir, file), 'utf8');
      if (actual !== content) problems.push(`DRIFTED  ${project.id}/${file}`);
    }
    // Only compare orphans within the scope of this run — a --component run
    // checks one file, not the whole directory's completeness.
    if (!COMPONENT) {
      for (const file of onDisk) {
        if (!expected.has(file)) problems.push(`ORPHANED ${project.id}/${file} (no tracked, contracted component for it)`);
      }
    }
    if (problems.length) {
      console.error(`FAIL — component reference docs have drifted from their contracts (${project.id}):\n`);
      for (const p of problems) console.error(`  ${p}`);
      console.error('\nRegenerate:  node scripts/contracts/build-component-docs.mjs' + (project.isDefault ? '' : ` --project ${project.id}`));
      process.exit(1);
    }
    console.log(`OK — ${expected.size} component reference doc(s) match their contracts (${project.id}).`);
    process.exit(0);
  }

  mkdirSync(outDir, { recursive: true });
  let written = 0;
  for (const [file, content] of expected) {
    const target = join(outDir, file);
    if (!existsSync(target) || readFileSync(target, 'utf8') !== content) {
      writeFileSync(target, content, 'utf8');
      written++;
    }
  }
  let removed = 0;
  if (!COMPONENT) {
    for (const file of onDisk) {
      if (!expected.has(file)) {
        unlinkSync(join(outDir, file));
        removed++;
      }
    }
  }
  console.log(
    `[contract-docs] ${project.id}: ${expected.size} doc(s) up to date (${written} written, ${removed} orphan(s) removed).`,
  );
}

main();
