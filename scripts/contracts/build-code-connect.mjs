#!/usr/bin/env node
/**
 * build-code-connect.mjs — generate Figma **Code Connect** files FROM the
 * component contracts, so Figma Dev Mode shows real Altitude markup instead of
 * guessing at it.
 *
 * WHY IT IS GENERATED. Hand-authored `*.figma.tsx` files are the norm for Code
 * Connect, and they rot exactly the way this repo's other hand-written surfaces
 * rotted (see scripts/check-mcp-docs.mjs's header: three docs claimed six MCP
 * tools long after the server registered eight). Everything Code Connect needs
 * is ALREADY a recorded fact in `.altitude/contracts/<project>/<tag>.contract.json`,
 * and that same contract drives Figma generation and parity — so deriving the
 * Code Connect file from it means the Dev Mode snippet cannot disagree with the
 * set it is attached to without a gate saying so.
 *
 * WHAT IT READS, per contract:
 *   bindings.figma.{nodeId,url,componentSetName}  which Figma set to attach to
 *   bindings.code.{tagName,importPath}            the web-component surface
 *   props[].bindings.code.attribute               the attribute a prop writes
 *   props[].bindings.figma                        {omit:true} | {kind:'VARIANT',
 *                                                  property, options}
 *   props[].values / props[].rawType              the code values an option maps to
 *   slots[]                                       the example's slotted content
 *   libs/al-react/src/components/**.tsx           the React wrapper, when one ships
 *
 * WHAT IT EMITS, per covered component, under `.altitude/code-connect/<project>/`:
 *   <tag>.html.figma.ts     web-component mapping  (@figma/code-connect/html)
 *   <tag>.react.figma.tsx   React wrapper mapping  (@figma/code-connect)
 * ...plus `skipped.json` (below) and the two `figma.config.*.json` publish
 * configs. Altitude ships BOTH surfaces, so Dev Mode should show both.
 *
 * SILENCE IS THE ONLY FORBIDDEN FAILURE. Nothing is dropped quietly. Every
 * component with no pinned `nodeId`, every prop the contract marks `omit`,
 * every prop whose Figma axis carries no derivable code mapping, every variant
 * option with no matching code value, every code value with no Figma option and
 * every slot rendered as a placeholder is NAMED in the generated
 * `skipped.json` — which is byte-gated like every other output here, so a
 * degradation cannot appear or disappear without showing up in a diff.
 *
 * DETERMINISM. Stable key order (props and options sorted by name), stable file
 * order, LF, one trailing newline, and no timestamp anywhere inside a generated
 * file — a timestamp would make `--check` fail on every run, which is how a
 * drift gate gets switched off.
 *
 * ALTITUDE ONLY, ON PURPOSE. `--project southleft` REFUSES. The southleft
 * project was repointed on 2026-09-02 to a freshly re-duplicated Figma file
 * (see the decoy entries in .altitude/ds-projects.json), so every `nodeId`
 * pinned in a southleft contract now addresses a retired file. Emitting Code
 * Connect files from those ids would publish Dev Mode snippets against a dead
 * document — a wrong answer dressed as a working one. Re-seed southleft's
 * pinned nodes first; then this refusal can be lifted.
 *
 * `@figma/code-connect` IS NOT INSTALLED IN THIS REPO. The generated files
 * import it; publishing them is a separate, owner-driven step. See
 * `.altitude/CODE-CONNECT.md`.
 *
 * Usage:
 *   node scripts/contracts/build-code-connect.mjs             # write (altitude)
 *   node scripts/contracts/build-code-connect.mjs --check     # drift gate (CI)
 *   node scripts/contracts/build-code-connect.mjs --component al-button
 *   node scripts/contracts/build-code-connect.mjs --root <dir>   # self-test hook
 *
 * Exit: 0 clean, 1 on drift under --check, 2 on a refusal or a bad invocation.
 *
 * Zero dependencies, offline, no network, no build.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { argOf, hasFlag } from '../lib/argv.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(HERE, '..', '..');

// ── argv ────────────────────────────────────────────────────────────────

const ROOT = resolve(argOf('--root') ?? DEFAULT_ROOT);
const PROJECT = argOf('--project') ?? null;
const COMPONENT = argOf('--component');
const CHECK = hasFlag('--check');

/**
 * The one project this generator will emit for.
 *
 * Not a config value: it is a statement about which Figma file's pinned node
 * ids are still real. Widening it is a decision, so it reads as one here.
 */
const GENERATED_PROJECT = 'altitude';

const REFUSALS = {
  southleft:
    'the southleft project was repointed on 2026-09-02 to a freshly re-duplicated Figma ' +
    'file, so every nodeId pinned in a southleft contract addresses a RETIRED file ' +
    '(see .altitude/ds-projects.json -> projects.southleft.figma.decoys). Code Connect ' +
    'files built from those ids would attach Dev Mode snippets to a dead document. ' +
    'Re-seed southleft’s pinned nodes first.',
};

// ── paths ───────────────────────────────────────────────────────────────

const contractsDirFor = (project) => join(ROOT, '.altitude', 'contracts', project);
const outDirFor = (project) => join(ROOT, '.altitude', 'code-connect', project);
const REACT_COMPONENTS_DIR = join(ROOT, 'libs', 'al-react', 'src', 'components');
const REACT_PACKAGE = '@southleft/al-react';

// ── react wrappers ──────────────────────────────────────────────────────
//
// Derived from the wrappers themselves, never from a hand-kept tag->wrapper
// table — the same choice, and for the same reason, as
// libs/altitude-mcp/src/lib/react-wrappers.mjs, whose parsing approach this
// mirrors. (Deliberately NOT imported from that package: this generator is a
// standalone script and must not take a dependency on the MCP workspace.)
//
// Keyed on the specifier the wrapper imports — `components/<key>` — because
// that is the only identifier both sides carry. A file that does not match the
// plop-generated shape is SKIPPED and named, never half-parsed.

/** Every non-test `.tsx` under `dir`, at any depth. */
function tsxFilesUnder(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...tsxFilesUnder(full));
    else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) out.push(full);
  }
  return out;
}

/** `components/<key>` -> { component } for every wrapper that ships. */
function loadReactWrappers() {
  const byKey = new Map();
  const unparsed = [];
  for (const file of tsxFilesUnder(REACT_COMPONENTS_DIR)) {
    const source = readFileSync(file, 'utf8');
    // Filter on the CALL, not the filename: a barrel `index.tsx` re-exports and
    // declares nothing, and a renamed wrapper file is still a wrapper.
    if (!source.includes('createComponent(')) continue;
    // Two real shapes. Almost every wrapper exports the `createComponent()`
    // result directly; ALTheme keeps it private and exports a forwardRef over
    // it. Matching only the first reported al-theme as having no wrapper.
    const exported =
      /export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*createComponent\s*\(/.exec(source) ??
      /export\s+const\s+(AL[\w$]*)\s*=/.exec(source);
    const element =
      /from\s+['"]@southleft\/(?:al|sl)-web-components\/components\/((?:[\w-]+\/)*[\w-]+)['"]/.exec(source);
    if (!exported || !element) {
      unparsed.push(file.replace(/\\/g, '/').slice(ROOT.replace(/\\/g, '/').length + 1));
      continue;
    }
    byKey.set(element[1], { component: exported[1] });
  }
  return { byKey, unparsed: unparsed.sort() };
}

/**
 * A contract's `bindings.code.importPath` -> the keys the wrapper index may
 * hold it under, most specific first.
 *
 * `components/button/button.ts` resolves as `button/button` OR `button`; the
 * icon wrappers import `icon/icons/close`. Returning both candidates is what
 * joins the two sides without either one re-deriving a tag name.
 */
function wrapperKeysFor(importPath) {
  const segments = String(importPath ?? '').replace(/\\/g, '/').split('/').filter(Boolean);
  const start = segments.indexOf('components');
  const under = segments.slice(start >= 0 ? start + 1 : 0);
  if (!under.length) return [];
  const withoutExtension = [...under.slice(0, -1), under.at(-1).replace(/\.[cm]?[jt]sx?$/, '')];
  const dirs = under.slice(0, -1);
  return [...new Set([withoutExtension.join('/'), dirs.join('/')].filter(Boolean))];
}

// ── the mapping model ───────────────────────────────────────────────────

/** Comparable form of a Figma variant option or a code value. */
const norm = (value) => String(value).trim().toLowerCase().replace(/[\s_]+/g, '-');

/**
 * The code values a prop can legally take, or `[]` when the contract records
 * none that are enumerable.
 *
 * `values` when the contract derived an enum; otherwise the string literals in
 * `rawType`, because a large family of Altitude props is typed as a SINGLE
 * literal (`type: 'string'`, `rawType: "'vertical'"`) meaning "set it to this,
 * or leave it off". A bare `string` or a named type alias yields `[]` — the
 * honest answer, and the prop is then reported as unmapped rather than guessed.
 */
function codeValuesOf(prop) {
  if (Array.isArray(prop.values) && prop.values.length) return [...prop.values];
  return [...String(prop.rawType ?? '').matchAll(/'([^']*)'/g)].map((m) => m[1]).filter(Boolean);
}

/**
 * Which Figma variant option means `true` for a BOOLEAN prop.
 *
 * Ordered rules, most specific first. The order is load-bearing: `isChecked`
 * against `Checked[Indeterminate|Off|On]` must reach the On/Off rule while
 * `isIndeterminate` against the SAME axis must match its own name first.
 *
 *   1. name stem   isDisabled -> "Disabled",  isFocused -> "Focus" (trailing -ed
 *                  dropped), isPill -> "Pill", isCircle -> "Circle"
 *   2. Yes/No      isCurrent, hasSeparator, isSelected -> "Yes"
 *   3. On/Off      isChecked -> "On"
 *   4. Hidden/Shown  hideLabel -> "Hidden", showLabel -> "Shown"
 *
 * Returns null when no rule fires — `isBold` against a `Weight[Default]` axis
 * that has no Bold option, or `isExpandableHeader` against `Role[...]`. Those
 * are real drift, and they are reported rather than approximated.
 */
function booleanTrueOption(propName, options) {
  const byNorm = new Map(options.map((option) => [norm(option), option]));
  const bare = String(propName).replace(/^(?:is|has|should|can|will)(?=[A-Z])/, '');
  const stem = norm(bare);
  const stems = [stem, stem.replace(/ed$/, '')].filter(Boolean);
  for (const candidate of stems) {
    if (byNorm.has(candidate)) return byNorm.get(candidate);
  }
  if (byNorm.has('yes') && byNorm.has('no')) return byNorm.get('yes');
  if (byNorm.has('on') && byNorm.has('off')) return byNorm.get('on');
  if (byNorm.has('hidden') && byNorm.has('shown')) {
    if (/^hide/i.test(propName)) return byNorm.get('hidden');
    if (/^show/i.test(propName)) return byNorm.get('shown');
  }
  return null;
}

/**
 * One prop -> its Code Connect `figma.enum(...)` mapping, plus every fact the
 * derivation had to give up on.
 *
 * @returns {{mapping: {axis: string, entries: [string, string|boolean][]}|null,
 *            notes: {kind: string, detail: string, option?: string}[]}}
 */
function mapProp(prop) {
  const figma = prop.bindings?.figma;
  const axis = figma.property;
  const options = [...(figma.options ?? [])].sort();
  const notes = [];

  if (!options.length) {
    return { mapping: null, notes: [{ kind: 'propUnmapped', detail: `axis "${axis}" declares no options` }] };
  }

  if (prop.type === 'boolean') {
    const trueOption = booleanTrueOption(prop.name, options);
    if (!trueOption) {
      return {
        mapping: null,
        notes: [
          {
            kind: 'propUnmapped',
            detail:
              `boolean prop against axis "${axis}" [${options.join(', ')}]: no option matches the ` +
              'prop name and the axis is not a Yes/No, On/Off or Hidden/Shown pair',
          },
        ],
      };
    }
    // Only the TRUE option is listed. Code Connect yields `undefined` for an
    // unlisted option, and `undefined` on a boolean attribute is absence, which
    // is exactly what "not that variant" means. Listing the false option too
    // would say the same thing twice and invent a claim about every third
    // option on a multi-value axis such as State.
    return { mapping: { axis, entries: [[trueOption, true]] }, notes: [] };
  }

  const values = codeValuesOf(prop);
  if (!values.length) {
    return {
      mapping: null,
      notes: [
        {
          kind: 'propUnmapped',
          detail:
            `prop is typed \`${prop.rawType ?? prop.type}\`, which enumerates no code values, but ` +
            `the contract binds it to variant axis "${axis}" [${options.join(', ')}]`,
        },
      ],
    };
  }

  const byNorm = new Map(values.map((value) => [norm(value), value]));
  const entries = [];
  const unmatchedOptions = [];
  for (const option of options) {
    const value = byNorm.get(norm(option));
    if (value !== undefined) entries.push([option, value]);
    else unmatchedOptions.push(option);
  }

  for (const option of unmatchedOptions) {
    // "Default" means the attribute is absent. So does the ONE remaining option
    // on a two-option axis where the other option matched — `Orientation
    // [Horizontal|Vertical]` over `rawType: "'vertical'"` is the whole
    // single-literal family in this library. Both are omissions by design and
    // are recorded as such, not as losses.
    if (norm(option) === 'default') {
      notes.push({ kind: 'optionIsDefault', option, detail: `"${option}" on axis "${axis}" -> attribute omitted` });
    } else if (options.length === 2 && entries.length === 1) {
      notes.push({
        kind: 'optionIsDefault',
        option,
        detail: `"${option}" is the unset half of the two-option axis "${axis}" -> attribute omitted`,
      });
    } else {
      notes.push({
        kind: 'optionUnmapped',
        option,
        detail: `"${option}" on axis "${axis}" matches no code value of \`${prop.rawType ?? prop.type}\``,
      });
    }
  }

  const matched = new Set(entries.map(([, value]) => norm(value)));
  for (const value of values) {
    if (!matched.has(norm(value))) {
      notes.push({
        kind: 'codeValueHasNoOption',
        option: value,
        detail: `code value "${value}" has no option on Figma axis "${axis}"`,
      });
    }
  }

  if (!entries.length) return { mapping: null, notes };
  return { mapping: { axis, entries }, notes };
}

// ── emitters ────────────────────────────────────────────────────────────

/** `field-note` -> `Field note`. The placeholder text for a named slot. */
function humanizeSlot(name) {
  const words = String(name).replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const jsString = (value) => `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/** An object key: bare when it is a valid identifier, quoted otherwise ("Display Lg"). */
const jsKey = (value) => (/^[A-Za-z_$][\w$]*$/.test(String(value)) ? String(value) : jsString(value));

/**
 * Where a slot's placeholder sits relative to the default content.
 *
 * `before` and `after` are not arbitrary names in this library — they say where
 * the content goes, and the contracts' own descriptions confirm it ("Content to
 * display before the button text"). Everything else follows the default
 * content, alphabetically, which is where `error` and `field-note` belong.
 */
function slotOrder(name) {
  if (name === 'before') return [0, name];
  if (!name) return [1, ''];
  if (name === 'after') return [2, name];
  return [3, name];
}

/** The `props: { ... }` block, shared by both surfaces. */
function renderPropsBlock(mappings, indent) {
  if (!mappings.length) return `${indent}props: {},`;
  const lines = [`${indent}props: {`];
  for (const { propName, mapping } of mappings) {
    lines.push(`${indent}  ${propName}: figma.enum(${jsString(mapping.axis)}, {`);
    for (const [option, value] of mapping.entries) {
      const literal = typeof value === 'boolean' ? String(value) : jsString(value);
      lines.push(`${indent}    ${jsKey(option)}: ${literal},`);
    }
    lines.push(`${indent}  }),`);
  }
  lines.push(`${indent}},`);
  return lines.join('\n');
}

/**
 * The example element, as lines.
 *
 * Four shapes, because an element with no attributes and no children must not
 * come out as a stray closing tag: `<x>…</x>`, `<x attrs>…</x>`, `<x attrs/>`
 * (or `<x attrs></x>` in HTML) and `<x/>`.
 */
function renderElement({ open, close, selfClose, attributes, children, indent }) {
  if (!attributes.length) {
    return children.length
      ? [`${indent}<${open}>`, ...children, `${indent}</${close}>`]
      : [`${indent}<${selfClose ? `${open} />` : `${open}></${close}>`}`];
  }
  const head = [`${indent}<${open}`, ...attributes];
  return children.length
    ? [...head, `${indent}>`, ...children, `${indent}</${close}>`]
    : [...head, selfClose ? `${indent}/>` : `${indent}></${close}>`];
}

/** The shared provenance header. Identical text on both surfaces bar the title. */
function renderHeader({ surface, tag, contract, project, mappings, notes, slots }) {
  const omitted = (contract.props ?? [])
    .filter((prop) => prop.bindings?.figma?.omit)
    .map((prop) => prop.name)
    .sort();
  const unmapped = notes.filter((note) => note.kind === 'propUnmapped').map((note) => note.propName).sort();
  const lines = [
    '/**',
    ` * GENERATED by scripts/contracts/build-code-connect.mjs from`,
    ` * .altitude/contracts/${project}/${tag}.contract.json — DO NOT HAND-EDIT.`,
    ' * Re-run the generator; `--check` is the drift gate.',
    ' *',
    ` * Figma Code Connect — ${surface} surface for the "${contract.bindings.figma.componentSetName}"`,
    ` * component set (node ${contract.bindings.figma.nodeId}).`,
    ' *',
    ` * Mapped variant axes: ${mappings.length ? mappings.map((m) => m.mapping.axis).join(', ') : 'none'}.`,
  ];
  if (unmapped.length) {
    lines.push(` * Props the contract binds to an axis this generator could not map: ${unmapped.join(', ')}`);
    lines.push(' * (reasons in skipped.json — they are drift, not omissions).');
  }
  if (omitted.length) {
    lines.push(` * Props the contract marks \`omit\` (no Figma axis): ${omitted.join(', ')}.`);
  }
  const named = slots.filter((slot) => slot.name);
  if (named.length) {
    lines.push(
      ` * Named slots below are PLACEHOLDERS: slot content is consumer-supplied, so`,
      ` * the contract records no default for ${named.map((slot) => slot.name).join(', ')}.`
    );
  }
  lines.push(' */');
  return lines.join('\n');
}

/** The slotted children of the example, in reading order. */
function renderChildren(slots, defaultText) {
  return slots.map((slot) =>
    slot.name ? `      <span slot="${slot.name}">${humanizeSlot(slot.name)}</span>` : `      ${defaultText}`
  );
}

/** The web-component (HTML) Code Connect file. */
function renderHtmlFile({ tag, contract, project, mappings, notes, slots }) {
  const attributes = mappings.map(({ propName, attribute }) => `      ${attribute}="\${props.${propName}}"`);
  const example = renderElement({
    open: tag,
    close: tag,
    selfClose: false, // custom elements have no void form
    attributes,
    children: renderChildren(slots, contract.name),
    indent: '    ',
  });

  return [
    renderHeader({ surface: 'web component', tag, contract, project, mappings, notes, slots }),
    "import figma, { html } from '@figma/code-connect/html';",
    '',
    `figma.connect(${jsString(contract.bindings.figma.url)}, {`,
    renderPropsBlock(mappings, '  '),
    '  example: (props) => html`',
    ...example,
    '  `,',
    '});',
    '',
  ].join('\n');
}

/** The React wrapper Code Connect file. */
function renderReactFile({ tag, contract, project, mappings, notes, slots, wrapper }) {
  const attributes = mappings.map(({ propName }) => `      ${propName}={props.${propName}}`);
  const example = renderElement({
    open: wrapper,
    close: wrapper,
    selfClose: true,
    attributes,
    children: renderChildren(slots, contract.name),
    indent: '    ',
  });

  return [
    renderHeader({ surface: 'React wrapper', tag, contract, project, mappings, notes, slots }),
    "import figma from '@figma/code-connect';",
    `import { ${wrapper} } from '${REACT_PACKAGE}';`,
    '',
    `figma.connect(${wrapper}, ${jsString(contract.bindings.figma.url)}, {`,
    renderPropsBlock(mappings, '  '),
    '  example: (props) => (',
    ...example,
    '  ),',
    '});',
    '',
  ].join('\n');
}

/**
 * The two publish configs.
 *
 * Code Connect's config declares ONE `parser`, so the web-component surface and
 * the React surface publish as two runs against two configs. Neither is
 * exercised here — `@figma/code-connect` is not installed in this repo — so
 * they are the generator's reading of the documented config shape, not a
 * verified invocation. `.altitude/CODE-CONNECT.md` says so too.
 */
function renderConfig({ parser, glob, project, fileKey }) {
  return `${JSON.stringify(
    {
      $comment:
        'GENERATED by scripts/contracts/build-code-connect.mjs — do not hand-edit. ' +
        'Code Connect allows one parser per config, so the html and react surfaces publish separately. ' +
        '@figma/code-connect is not installed in this repo; see .altitude/CODE-CONNECT.md.',
      codeConnect: {
        parser,
        include: [`.altitude/code-connect/${project}/${glob}`],
        interactiveSetupFigmaFileUrl: `https://www.figma.com/design/${fileKey}/`,
      },
    },
    null,
    2
  )}\n`;
}

/** The skip report. Every named loss, sorted, no timestamp. */
function renderSkipped(report) {
  const sortBy = (rows, ...keys) =>
    [...rows].sort((a, b) => {
      for (const key of keys) {
        const left = String(a[key] ?? '');
        const right = String(b[key] ?? '');
        if (left !== right) return left < right ? -1 : 1;
      }
      return 0;
    });
  return `${JSON.stringify(
    {
      $comment:
        'GENERATED by scripts/contracts/build-code-connect.mjs — do not hand-edit. ' +
        'Every component, prop, variant option, code value and slot this generator could not ' +
        'carry into a Code Connect file, named. Silence is the only forbidden failure: an ' +
        'entry appearing or disappearing here is a reviewable diff, and `--check` gates it.',
      project: report.project,
      counts: report.counts,
      componentsWithoutFigmaNodeId: [...report.componentsWithoutFigmaNodeId].sort(),
      componentsWithoutReactWrapper: [...report.componentsWithoutReactWrapper].sort(),
      unparsedReactWrappers: report.unparsedReactWrappers,
      propsOmittedByContract: sortBy(report.propsOmittedByContract, 'tag', 'prop'),
      propsUnmapped: sortBy(report.propsUnmapped, 'tag', 'prop'),
      optionsUnmapped: sortBy(report.optionsUnmapped, 'tag', 'prop', 'option'),
      optionsMeaningAttributeOmitted: sortBy(report.optionsMeaningAttributeOmitted, 'tag', 'prop', 'option'),
      codeValuesWithNoFigmaOption: sortBy(report.codeValuesWithNoFigmaOption, 'tag', 'prop', 'option'),
      slotsRenderedAsPlaceholders: sortBy(report.slotsRenderedAsPlaceholders, 'tag', 'slot'),
    },
    null,
    2
  )}\n`;
}

// ── build ───────────────────────────────────────────────────────────────

/**
 * Derive every file this project should have, in memory.
 * @returns {{files: Map<string,string>, report: object, log: string[]}}
 */
export function build({ project = GENERATED_PROJECT, component = null } = {}) {
  const contractsDir = contractsDirFor(project);
  if (!existsSync(contractsDir)) {
    throw new Error(`no contracts directory at ${contractsDir}`);
  }

  const { byKey, unparsed } = loadReactWrappers();
  const files = new Map();
  const log = [];
  const report = {
    project,
    counts: {},
    componentsWithoutFigmaNodeId: [],
    componentsWithoutReactWrapper: [],
    unparsedReactWrappers: unparsed,
    propsOmittedByContract: [],
    propsUnmapped: [],
    optionsUnmapped: [],
    optionsMeaningAttributeOmitted: [],
    codeValuesWithNoFigmaOption: [],
    slotsRenderedAsPlaceholders: [],
  };

  const contractFiles = readdirSync(contractsDir)
    .filter((name) => name.endsWith('.contract.json'))
    .sort();

  let covered = 0;
  let fileKey = null;

  for (const name of contractFiles) {
    const contract = JSON.parse(readFileSync(join(contractsDir, name), 'utf8'));
    const tag = contract.id;
    if (component && tag !== component) continue;

    const nodeId = contract.bindings?.figma?.nodeId;
    if (!nodeId) {
      report.componentsWithoutFigmaNodeId.push(tag);
      continue;
    }
    fileKey ??= contract.bindings.figma.fileKey;
    covered += 1;

    const mappings = [];
    const notes = [];
    for (const prop of [...(contract.props ?? [])].sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const figma = prop.bindings?.figma;
      if (!figma) continue; // `bindings.figma: null` — the contract records no opinion.
      if (figma.omit) {
        report.propsOmittedByContract.push({ tag, prop: prop.name, reason: 'contract marks bindings.figma.omit' });
        continue;
      }
      if (figma.kind !== 'VARIANT') continue;

      const { mapping, notes: propNotes } = mapProp(prop);
      for (const note of propNotes) notes.push({ ...note, propName: prop.name });
      for (const note of propNotes) {
        const row = { tag, prop: prop.name, axis: figma.property, detail: note.detail };
        if (note.kind === 'propUnmapped') report.propsUnmapped.push(row);
        else if (note.kind === 'optionUnmapped') report.optionsUnmapped.push({ ...row, option: note.option });
        else if (note.kind === 'optionIsDefault')
          report.optionsMeaningAttributeOmitted.push({ ...row, option: note.option });
        else if (note.kind === 'codeValueHasNoOption')
          report.codeValuesWithNoFigmaOption.push({ ...row, option: note.option });
      }
      if (mapping) {
        mappings.push({ propName: prop.name, attribute: prop.bindings.code.attribute, mapping });
      }
    }

    const slots = [...(contract.slots ?? [])].sort((a, b) => {
      const [leftRank, leftName] = slotOrder(a.name ?? '');
      const [rightRank, rightName] = slotOrder(b.name ?? '');
      if (leftRank !== rightRank) return leftRank - rightRank;
      return leftName < rightName ? -1 : leftName > rightName ? 1 : 0;
    });
    for (const slot of slots) {
      if (!slot.name) continue;
      report.slotsRenderedAsPlaceholders.push({
        tag,
        slot: slot.name,
        figmaPlaceholder: slot.figmaPlaceholder ?? null,
        reason:
          'slot content is consumer-supplied; the contract records no default. `figmaPlaceholder`, ' +
          'where present, names a FIGMA-side placeholder and is not a code tag.',
      });
    }

    files.set(`${tag}.html.figma.ts`, renderHtmlFile({ tag, contract, project, mappings, notes, slots }));

    const wrapperKey = wrapperKeysFor(contract.bindings?.code?.importPath).find((key) => byKey.has(key));
    if (wrapperKey) {
      files.set(
        `${tag}.react.figma.tsx`,
        renderReactFile({ tag, contract, project, mappings, notes, slots, wrapper: byKey.get(wrapperKey).component })
      );
    } else {
      report.componentsWithoutReactWrapper.push(tag);
    }
  }

  report.counts = {
    contracts: contractFiles.length,
    componentsCovered: covered,
    componentsSkipped: report.componentsWithoutFigmaNodeId.length,
    htmlFiles: [...files.keys()].filter((name) => name.endsWith('.html.figma.ts')).length,
    reactFiles: [...files.keys()].filter((name) => name.endsWith('.react.figma.tsx')).length,
  };

  // Configs and the skip report only describe a FULL run. A --component run
  // rewriting them from one contract would delete 33 components' worth of
  // recorded degradations, which is the silent loss this whole script exists
  // to prevent.
  if (!component) {
    files.set(
      'figma.config.html.json',
      renderConfig({ parser: 'html', glob: '*.html.figma.ts', project, fileKey })
    );
    files.set(
      'figma.config.react.json',
      renderConfig({ parser: 'react', glob: '*.react.figma.tsx', project, fileKey })
    );
    files.set('skipped.json', renderSkipped(report));
  }

  log.push(
    `[code-connect] ${covered}/${contractFiles.length} components covered ` +
      `(${report.counts.htmlFiles} html + ${report.counts.reactFiles} react files).`
  );
  if (report.componentsWithoutFigmaNodeId.length) {
    log.push(
      `[code-connect] skip (no pinned Figma nodeId, ${report.componentsWithoutFigmaNodeId.length}): ` +
        `${[...report.componentsWithoutFigmaNodeId].sort().join(', ')}`
    );
  }
  if (report.componentsWithoutReactWrapper.length) {
    log.push(
      `[code-connect] skip react (no @southleft/al-react wrapper, ${report.componentsWithoutReactWrapper.length}): ` +
        `${[...report.componentsWithoutReactWrapper].sort().join(', ')}`
    );
  }
  if (report.propsUnmapped.length) {
    log.push(
      `[code-connect] ${report.propsUnmapped.length} prop(s) bound to a Figma axis with no derivable ` +
        `mapping: ${report.propsUnmapped.map((row) => `${row.tag}.${row.prop}`).join(', ')}`
    );
  }
  if (report.optionsUnmapped.length) {
    log.push(
      `[code-connect] ${report.optionsUnmapped.length} variant option(s) match no code value: ` +
        `${report.optionsUnmapped.map((row) => `${row.tag}.${row.prop}[${row.option}]`).join(', ')}`
    );
  }
  log.push(
    `[code-connect] ${report.propsOmittedByContract.length} prop(s) marked \`omit\` by their contract; ` +
      `${report.slotsRenderedAsPlaceholders.length} named slot(s) rendered as placeholders — all named in skipped.json.`
  );

  return { files, report, log };
}

// ── main ────────────────────────────────────────────────────────────────

function main() {
  const project = PROJECT ?? GENERATED_PROJECT;
  if (project !== GENERATED_PROJECT) {
    const why =
      REFUSALS[project] ??
      `only "${GENERATED_PROJECT}" has Figma node ids this generator trusts; no rule is recorded for "${project}".`;
    console.error(`[code-connect] REFUSING to generate for project "${project}": ${why}`);
    process.exit(2);
  }

  let built;
  try {
    built = build({ project, component: COMPONENT });
  } catch (error) {
    console.error(`[code-connect] ${error.message}`);
    process.exit(2);
  }
  const { files, log } = built;

  if (COMPONENT && files.size === 0) {
    console.error(
      `[code-connect] "${COMPONENT}" produced no files — either it has no contract in ` +
        `.altitude/contracts/${project}/ or it has no pinned Figma nodeId.`
    );
    process.exit(2);
  }

  const outDir = outDirFor(project);
  const onDisk = existsSync(outDir)
    ? readdirSync(outDir).filter((name) => name.endsWith('.figma.ts') || name.endsWith('.figma.tsx') || name.endsWith('.json'))
    : [];

  if (CHECK) {
    const problems = [];
    for (const [name, content] of [...files].sort()) {
      const abs = join(outDir, name);
      if (!existsSync(abs)) {
        problems.push(`MISSING  ${project}/${name}`);
        continue;
      }
      if (readFileSync(abs, 'utf8') !== content) problems.push(`DRIFTED  ${project}/${name}`);
    }
    // Orphans only when the run covered everything — a --component run checks
    // one file, not the directory's completeness.
    if (!COMPONENT) {
      for (const name of onDisk.sort()) {
        if (!files.has(name)) problems.push(`ORPHAN   ${project}/${name}`);
      }
    }
    if (problems.length) {
      for (const line of problems) console.error(line);
      console.error(
        `\n[code-connect] ${problems.length} file(s) disagree with the contracts. ` +
          'These files are GENERATED: re-run `node scripts/contracts/build-code-connect.mjs` and commit the result ' +
          'rather than hand-editing them. (Same principle as check:llms and check:contract-docs — a generated ' +
          'artifact is gated by re-running its generator.)'
      );
      process.exit(1);
    }
    for (const line of log) console.log(line);
    console.log(`[code-connect] OK — ${files.size} generated file(s) match the ${project} contracts.`);
    return;
  }

  mkdirSync(outDir, { recursive: true });
  for (const [name, content] of [...files].sort()) {
    writeFileSync(join(outDir, name), content, 'utf8');
  }
  if (!COMPONENT) {
    for (const name of onDisk.sort()) {
      if (!files.has(name)) {
        unlinkSync(join(outDir, name));
        console.log(`[code-connect] removed orphan ${project}/${name}`);
      }
    }
  }
  for (const line of log) console.log(line);
  console.log(`[code-connect] wrote ${files.size} file(s) to .altitude/code-connect/${project}/`);
}

if (resolve(process.argv[1] ?? '') === resolve(fileURLToPath(import.meta.url))) main();
