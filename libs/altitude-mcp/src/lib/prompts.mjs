// MCP PROMPTS — reusable message templates over workflows this repo actually
// has. Kept SMALL and REAL: each one exists because a genuine engine/skill/
// gate backs it (see the comment on each), not because it rounds out a
// number. Four:
//
//   audit_component_parity    -> the Figma <-> code parity engine (parity.mjs)
//   generate_brand_theme      -> the deterministic OKLCH engine (theme.mjs)
//   check_snippet_convention  -> the usage validator (validate.mjs / cli/validate.mjs)
//   scaffold_component        -> the altitude-component-authoring skill + plop
//
// VALIDATION DISCIPLINE. `registerPrompt`'s zod `argsSchema` catches missing/
// mistyped arguments before a callback ever runs (the SDK validates against
// it). Deeper, domain-level validation — an unknown tag, an unknown project,
// a prompt string over the theme engine's own cap, a component name that
// collides with the layout-primitive gate — happens INSIDE each callback,
// exactly where `altitude_validate` / `altitude_check_parity` do it, and
// returns the SAME shape a tool error would (a single message whose text is
// `JSON.stringify({error, code, ...})`) rather than throwing a bare protocol
// error the caller has to parse out of an exception. A prompt "succeeds" at
// the protocol level either way; the agent reads the JSON to see whether it
// got real guidance or a structured refusal.

import { z } from 'zod';

import { computeParity } from './parity.mjs';
import { UnknownProjectError } from './ds-project.mjs';

/** One user-role text message — the shape every prompt below returns on both success and failure. */
function textResult(description, text) {
  return { description, messages: [{ role: 'user', content: { type: 'text', text } }] };
}

function errorResult(description, payload) {
  return textResult(description, JSON.stringify(payload, null, 2));
}

// ── audit_component_parity ─────────────────────────────────────────────
// Grounds "audit a component against Figma parity" in the REAL parity
// engine (../lib/parity.mjs, the same one altitude_check_parity and the
// Storybook sidebar badges use) plus the altitude-figma-sync skill, which
// carries the traps (decoy file, node-id re-minting, Desktop Bridge setup)
// that make a naive reconciliation attempt fail silently.
const auditComponentParity = {
  name: 'audit_component_parity',
  config: {
    title: 'Audit a component against Figma parity',
    description:
      'Check one Altitude component\'s Figma <-> code parity status and produce a reconciliation plan — ' +
      'grounded in the live parity engine (same data as altitude_check_parity) and the ' +
      'altitude-figma-sync skill.',
    argsSchema: {
      tag: z.string().min(1).describe('The custom element tag, e.g. "al-button".'),
      project: z
        .string()
        .optional()
        .describe('Design-system project id (see altitude_list_ds_projects). Omit for the registry default.'),
    },
  },
  callback({ tag, project }) {
    let report;
    try {
      report = computeParity(project);
    } catch (err) {
      if (err instanceof UnknownProjectError) {
        return errorResult('Unknown design-system project', {
          error: err.message,
          code: err.code,
          knownProjects: err.known,
        });
      }
      throw err;
    }
    const component =
      report.components.find((c) => c.tag === tag) ?? report.figmaOnly.find((c) => c.tag === tag);
    if (!component) {
      return errorResult('Unknown component', {
        error: `No component "${tag}" in the ${report.project} parity report.`,
        code: 'ERR_UNKNOWN_COMPONENT',
      });
    }
    const lines = [
      `Audit ${tag} against Figma parity in the "${report.project}" design system (${report.figmaFileUrl}).`,
      '',
      `Current status: ${component.status}.`,
      component.driftBasis ? `Drift basis: ${component.driftBasis}.` : null,
      report.observation?.everObserved
        ? `Figma last refreshed: ${report.observation.figmaLastRefreshed}.`
        : 'Figma has never been observed for this project — figma-drift/conflict cannot occur yet; run scripts/figma-parity/refresh-figma-digests.mjs first.',
      '',
      component.aiPrompt
        ? `Ready-to-run reconciliation prompt (from the parity engine):\n${component.aiPrompt}`
        : component.status === 'in-sync'
          ? 'No drift — nothing to reconcile.'
          : component.status === 'excluded'
            ? `Deliberately excluded from Figma parity: ${component.note ?? 'see .altitude/ds-projects.json excluded map.'}`
            : 'No aiPrompt on this entry — inspect it directly via altitude_check_parity({ tag, project }).',
      '',
      'Before writing anything in Figma, read .claude/skills/altitude-figma-sync/SKILL.md in full ' +
        '(the canonical-vs-decoy file trap, Desktop Bridge setup, node-id re-minting on rebuild). ' +
        'After reconciling, re-run altitude_check_parity({ tag: "' + tag + '", project: "' + report.project + '" }) ' +
        'and confirm status is "in-sync" before considering this done.',
    ].filter(Boolean);
    return textResult(`Parity audit for ${tag} (${report.project})`, lines.join('\n'));
  },
};

// ── generate_brand_theme ─────────────────────────────────────────────────
// Grounds "generate a brand theme" in the REAL deterministic OKLCH solver
// (../lib/theme.mjs / theme-engine/), the same engine altitude_generate_theme
// wraps and Storybook's AI console uses. Mirrors that tool's own caps
// (prompt <= 80 chars) so a caller cannot construct an argument the tool
// would reject.
const generateBrandTheme = {
  name: 'generate_brand_theme',
  config: {
    title: 'Generate a brand theme (deterministic OKLCH solver)',
    description:
      'Draft an art-direction prompt for altitude_generate_theme — the same deterministic, ' +
      'WCAG-AA-enforcing OKLCH solver Storybook\'s token console uses. Never calls an LLM for color.',
    argsSchema: {
      prompt: z.string().min(1).max(80).describe('Short text prompt, e.g. "ocean sunset" (max 80 chars, matches the tool\'s own cap).'),
      mode: z.enum(['light', 'dark']).optional(),
      personality: z.enum(['editorial', 'brutalist', 'geometric', 'luxe', 'playful']).optional(),
    },
  },
  callback({ prompt, mode, personality }) {
    const direction = { ...(mode ? { mode } : {}), ...(personality ? { personality } : {}) };
    const lines = [
      `Call altitude_generate_theme with:`,
      JSON.stringify({ prompt, ...(Object.keys(direction).length ? { direction } : {}) }, null, 2),
      '',
      'The response carries a `palette` (--al-* custom-property overrides), `receipts` (contrast ratios ' +
        'checked against WCAG AA), and `source` ("prompt-seed" or "direction"). Apply the palette as an ' +
        'override layer — do not hand-edit styles/tokens-dtcg/tier-3 brand files with invented values; every ' +
        'value in the response was derived by the solver, not guessed.',
      '',
      'This generates an override set, not a new registered brand. Adding a genuinely NEW brand (a new ' +
        'id in .altitude/ds-projects.json, not just a themed override) is a separate ~8-site checklist — ' +
        'see .altitude/BRANDS.md §9. altitude_generate_theme is not that scaffold.',
    ];
    return textResult('Draft a brand theme via the OKLCH solver', lines.join('\n'));
  },
};

// ── check_snippet_convention ──────────────────────────────────────────────
// Grounds "check a proposed snippet for convention violations" in the REAL
// validator (altitude_validate / cli/validate.mjs), including its stable
// error codes and the self-heal loop AGENTS.md documents.
const checkSnippetConvention = {
  name: 'check_snippet_convention',
  config: {
    title: 'Check a snippet for Altitude convention violations',
    description:
      'Validate a proposed <al-*> / @southleft/al-react snippet against the shipped component contracts ' +
      'before it ships, using the same validator altitude_validate wraps.',
    argsSchema: {
      markup: z.string().min(1).describe('Inline HTML/JSX/markup to check.'),
    },
  },
  callback({ markup }) {
    const lines = [
      'Call altitude_validate with:',
      JSON.stringify({ markup }, null, 2),
      '',
      'Self-heal loop: for each violation in `data.violations`, apply its `fix` — full recipes keyed by ' +
        '`code` (ERR_UNKNOWN_COMPONENT, ERR_UNKNOWN_ATTRIBUTE, ERR_INVALID_ENUM, ERR_TYPE_MISMATCH) live in ' +
        'libs/al-web-components/cli/REPAIR.md — then re-run until the tool reports zero violations. If a ' +
        'fix would require inventing an element, attribute, or value that does not exist in the CEM, STOP ' +
        'and report the gap rather than fabricating one past the design system.',
    ];
    return textResult('Check a snippet against Altitude conventions', lines.join('\n'));
  },
};

// ── scaffold_component ────────────────────────────────────────────────────
// Grounds "scaffold a new component" in the altitude-component-authoring
// skill and the real plop gate (LAYOUT_SUSPECT — copied from
// libs/al-web-components/plop/plop-config.js:9, not reinvented) so a caller
// gets the same "is this actually layout?" pushback plop itself gives,
// before spending a scaffold on something that will be rejected in review.
const LAYOUT_SUSPECT =
  /(?:^|-)((?:button|chip|toast|tag|card|avatar|badge|icon|link|item|action)-group|group|container|wrapper|section|grid|stack|row|column|cluster|split|bento)$/;
const DASH_CASE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const scaffoldComponent = {
  name: 'scaffold_component',
  config: {
    title: 'Scaffold a new Altitude component',
    description:
      'Walk through adding a new al-* component — plop scaffold, the authoring checklist, and the ' +
      'layout-primitive gate — grounded in the altitude-component-authoring skill.',
    argsSchema: {
      name: z.string().min(1).describe('Proposed dash-case component name, WITHOUT the al- prefix, e.g. "stat-tile".'),
      tier: z.enum(['atom', 'molecule', 'organism']).optional().describe('Storybook tier: atom = standalone primitive, molecule = composes 2+ atoms, organism = page-level region.'),
    },
  },
  callback({ name, tier }) {
    const dash = name.trim().toLowerCase();
    if (!DASH_CASE.test(dash)) {
      return errorResult('Invalid component name', {
        error: `"${name}" is not dash-case (expected e.g. "stat-tile", matching ${DASH_CASE}).`,
        code: 'ERR_INVALID_COMPONENT_NAME',
      });
    }
    if (LAYOUT_SUSPECT.test(dash)) {
      return errorResult('This looks like a layout wrapper, not a component', {
        error:
          `"${dash}" matches the plop LAYOUT_SUSPECT gate (libs/al-web-components/plop/plop-config.js:9). ` +
          'Altitude is layout-first: <al-layout> is the single arrangement primitive. If this component ' +
          'owns no behavior, ARIA relationship, or state — only spacing/direction/alignment of slotted ' +
          'content — it should be <al-layout> with props, not a new component. al-button-group, ' +
          'al-layout-container, al-layout-section, al-bento-grid, al-split-content, al-chip-group and ' +
          'al-toast-group were all removed for exactly this reason.',
        code: 'ERR_LAYOUT_SUSPECT',
        hint: 'If this genuinely owns semantics (fieldset/legend, roving keyboard selection, single-select ' +
          'state — like checkbox-group/radio-group/toggle-button-group), proceed and be ready to justify ' +
          'the override plop itself will ask for.',
      });
    }
    const lines = [
      `Read .claude/skills/altitude-component-authoring/SKILL.md in full before running plop — it is the ` +
        'single ordered flow (scaffold through release-ready PR) plus traps not written down anywhere else.',
      '',
      '1. Scaffold: `pnpm --filter @southleft/al-web-components plop` — answer dash-case name ' +
        `"${dash}"${tier ? `, tier "${tier}"` : ''}, and confirm the target package (base library, or a ` +
        'brand layer if .altitude/ds-projects.json declares more than one).',
      '2. Implement the .ts / .scss / .stories.ts plop emits, following the component patterns in ' +
        'AGENTS.md (accessor props, this.dispatch(), slot-based content, styleModifier, shared theme sheet).',
      `3. Verify at every stage with \`node scripts/component-check.mjs al-${dash}\` — the mechanical half ` +
        'of the authoring skill.',
      '4. Work through the rest of the skill\'s checklist (schema, guidance YAML, llms:build, a11y:report, ' +
        'changeset) before opening a PR.',
    ];
    return textResult(`Scaffold al-${dash}`, lines.join('\n'));
  },
};

export const PROMPTS = [auditComponentParity, generateBrandTheme, checkSnippetConvention, scaffoldComponent];
