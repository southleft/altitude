/**
 * Markdown renderings of the generated pages.
 *
 * Every renderer takes a design-system CONTEXT (`context.mjs` — one project,
 * its scoped registry, its site copy and its href builder) and defaults to the
 * site at the root, so Southleft's Markdown describes Southleft's 21 components
 * under Southleft's name without a second set of renderers existing.
 *
 * Every docs page is also served as Markdown at the same URL plus `.md`
 * (`/docs/components/button` → `/docs/components/button.md`), and the same
 * renderers feed the machine artifacts in `artifacts.mjs` (`llms-full.txt` and
 * `llms-components.txt`). Both read the registry, so the Markdown an
 * agent fetches and the HTML a human reads are the same facts rendered twice —
 * there is no second copy of the content to drift.
 */
import {
  TOKEN_COUNT,
  borderWidthScale,
  breakpointScale,
  brandOverrides,
  colorRamps,
  layoutScale,
  opacityScale,
  radiusScale,
  spacingScale,
  typeScale,
  zIndexScale,
} from './tokens.mjs';
import {
  CHOREOGRAPHY_COUNT,
  MOTION_TOKEN_COUNT,
  PRESET_COUNT,
  choreographyTokens,
  durationScale,
  easingCurves,
  motionAxis,
  presetShapes,
  travelDistances,
} from './motion.mjs';
import {
  ICONS,
  ICON_CATEGORIES,
  ICON_COUNT,
  LEGACY_COUNT,
  LEGACY_ELEMENTS,
  categoryCounts,
} from './icons.mjs';
import {
  breakpoints,
  gapClasses,
  gapModifiers,
  gridAlignmentClasses,
  gridPatterns,
  typographyClasses,
  utilityCount,
  visibilityClasses,
} from './utilities.mjs';
import {
  MANIFEST_PATH,
  MIGRATION_CAPABILITIES,
  MIGRATION_MANIFEST,
  MIGRATION_STATES,
  SCHEMA_PATH,
  maturityRows,
  maturitySummary,
} from './maturity.mjs';
import { MIGRATION, migrationSource } from './migration.mjs';
import { DEFAULT_CONTEXT } from './context.mjs';
import { guidanceFor, guidanceMarkdown } from './guidance.mjs';

const table = (headers, rows) =>
  rows.length
    ? [
        `| ${headers.join(' | ')} |`,
        `| ${headers.map(() => '---').join(' | ')} |`,
        ...rows.map((cells) => `| ${cells.map((c) => String(c).replace(/\|/g, '\\|')).join(' | ')} |`),
      ].join('\n')
    : '_None declared in the manifest._';

/**
 * One component, as Markdown.
 *
 * `guidanceEntries` is the loaded `guidance` content collection, threaded in by
 * the caller because `getCollection()` is only reachable from an Astro route
 * (see `guidance.mjs`). It defaults to empty so a caller that has no collection
 * to hand — a Node script, a test — still renders the API sections; the
 * guidance block then states that none is authored rather than vanishing.
 */
export function componentMarkdown(component, context = DEFAULT_CONTEXT, guidanceEntries = []) {
  const lines = [
    `# ${component.name}`,
    '',
    `In ${context.site.fullName}, rendered under \`<al-theme brand="${context.project.brand}">\`.`,
    '',
    `\`<${component.tag}>\`${component.react ? ` · React: \`<${component.react}>\`` : ''}${
      component.status ? ` · status: ${component.status}` : ''
    } · tier: ${component.tier}`,
    '',
    component.summary ||
      `Generated from the custom elements manifest: ${component.props.length} properties, ${component.slots.length} slots, ${component.events.length} events.`,
    '',
    // Guidance sits ahead of the API, mirroring the HTML page order
    // (Playground → Guidance → Parity → Checks → Install → Props). The
    // judgement about whether to use a component belongs before its attribute
    // table, for an agent as much as for a reader.
    ...guidanceMarkdown(guidanceFor(guidanceEntries, component, context.project)),
    '## Install',
    '',
    '```js',
    `import '${component.importPath}';`,
    ...(component.react ? [`import { ${component.react} } from '@southleft/al-react';`] : []),
    '```',
    '',
    '## Properties',
    '',
    table(
      ['Prop', 'Type', 'Default', 'Description'],
      component.props.map((p) => [
        `\`${p.name}\``,
        `\`${p.type}\``,
        `\`${p.default}\``,
        p.description.replace(/\n+/g, ' ') || '—',
      ])
    ),
    '',
    '## Slots',
    '',
    table(
      ['Slot', 'Description'],
      component.slots.map((s) => [`\`${s.name}\``, s.description || '—'])
    ),
    '',
    '## Events',
    '',
    table(
      ['Event', 'Type', 'Description'],
      component.events.map((e) => [`\`${e.name}\``, `\`${e.type}\``, e.description || '—'])
    ),
  ];

  if (component.cssParts.length) {
    lines.push(
      '',
      '## CSS parts',
      '',
      table(
        ['Part', 'Description'],
        component.cssParts.map((p) => [`\`${p.name}\``, p.description || '—'])
      )
    );
  }
  if (component.cssProperties.length) {
    lines.push(
      '',
      '## CSS custom properties',
      '',
      table(
        ['Property', 'Default', 'Description'],
        component.cssProperties.map((p) => [`\`${p.name}\``, `\`${p.default}\``, p.description || '—'])
      )
    );
  }
  if (component.methods.length) {
    lines.push(
      '',
      '## Public methods',
      '',
      table(
        ['Method', 'Description'],
        component.methods.map((m) => [`\`${m.name}()\``, m.description || '—'])
      )
    );
  }

  lines.push('', `Source: \`libs/al-web-components/${component.modulePath}\``, '');
  return lines.join('\n');
}

/** The Overview page, as Markdown. */
export function overviewMarkdown(context = DEFAULT_CONTEXT) {
  const { site, registry, project } = context;
  return [
    `# ${site.title}`,
    '',
    site.description,
    '',
    '## By the numbers',
    '',
    `- Components documented: ${registry.count}${
      registry.scope.scoped
        ? " (this design system's declared scope; the shared library declares more)"
        : ''
    }`,
    `- Icon glyphs: ${registry.stats.icons}`,
    `- Custom elements in the manifest: ${registry.stats.cemTags}`,
    `- Documented properties: ${registry.stats.documentedProps} of ${registry.stats.totalProps}`,
    `- Components with a React wrapper: ${registry.stats.withReact}`,
    `- Design tokens: ${TOKEN_COUNT}`,
    `- Brand: \`<al-theme brand="${project.brand}">\``,
    '',
    '## Taxonomy',
    '',
    ...registry.tiers.map((tier) => `- ${tier.label}: ${tier.count}`),
    '',
  ].join('\n');
}

/** The Components index, as Markdown. */
export function componentsIndexMarkdown(context = DEFAULT_CONTEXT) {
  const { site, registry } = context;
  return [
    `# Components (${registry.count})`,
    '',
    'Generated from `libs/al-web-components/custom-elements.json`' +
      (registry.scope.scoped
        ? ", scoped to this design system's `library.components` allowlist in `.altitude/ds-projects.json`."
        : '.'),
    '',
    ...registry.tiers.flatMap((tier) => [
      `## ${tier.label} (${tier.count})`,
      '',
      table(
        ['Component', 'Tag', 'React', 'Props', 'Slots', 'Events'],
        tier.components.map((c) => [
          `[${c.name}](${site.url}/components/${c.slug})`,
          `\`<${c.tag}>\``,
          c.react ? `\`<${c.react}>\`` : '—',
          c.props.length,
          c.slots.length,
          c.events.length,
        ])
      ),
      '',
    ]),
  ].join('\n');
}

/** The Foundations page, as Markdown. */
export function foundationsMarkdown(context = DEFAULT_CONTEXT) {
  const ramps = colorRamps();
  const overrides = brandOverrides(context.project.brand);
  return [
    '# Foundations',
    '',
    `Read at build time from the published token layer — ${TOKEN_COUNT} tokens.`,
    '',
    `## Brand — \`${context.project.brand}\``,
    '',
    overrides.available
      ? overrides.properties.length
        ? `This brand redeclares ${overrides.properties.length} of those properties inside ` +
          `\`<al-theme brand="${context.project.brand}">\`; everything else resolves to the base bundle.`
        : overrides.reason
      : overrides.reason,
    '',
    ...(overrides.properties.length
      ? [
          table(
            ['Property', 'Brand value', 'Base value'],
            overrides.properties.map((p) => [`\`${p.name}\``, p.value, p.base ?? '—'])
          ),
          '',
        ]
      : []),
    `## Color (${ramps.length} ramps)`,
    '',
    ...ramps.flatMap((ramp) => [
      `### ${ramp.label} — \`${ramp.prefix}\``,
      '',
      table(
        ['Step', 'Value', 'Token'],
        ramp.steps.map((s) => [s.name, s.value, `\`--${s.key}\``])
      ),
      '',
    ]),
    '## Typography',
    '',
    table(
      ['Preset', 'Value'],
      typeScale().map((t) => [`\`--${t.key}\``, t.value])
    ),
    '',
    '## Spacing',
    '',
    table(
      ['Step', 'Value', 'Token'],
      spacingScale().map((s) => [s.name, s.value, `\`--${s.key}\``])
    ),
    '',
    '## Radius',
    '',
    table(
      ['Step', 'Value', 'Token'],
      radiusScale().map((r) => [r.name, r.value, `\`--${r.key}\``])
    ),
    '',
    // The five below had their only visual home in `.storybook/components/
    // tokens/`, deleted 2026-08-25. The data was always here — every one of
    // them was already in llms-tokens.txt — so only the rendering was missing.
    ...[
      ['Border width', borderWidthScale()],
      ['Breakpoints', breakpointScale()],
      ['Layout widths', layoutScale()],
      ['Opacity', opacityScale()],
      ['Z-index', zIndexScale()],
    ].flatMap(([heading, rows]) => [
      `## ${heading}`,
      '',
      table(
        ['Step', 'Value', 'Token'],
        rows.map((r) => [r.name, r.value, `\`--${r.key}\``])
      ),
      '',
    ]),
  ].join('\n');
}

/**
 * The Motion page, as Markdown.
 *
 * Same three sources as the HTML page (`lib/motion.mjs`): the built token layer
 * for tier 1, `components/theme/theme.scss` for the axis matrix, and the
 * published motion runtime for the choreography tokens and keyframe presets.
 * The two renderings cannot drift because neither holds any motion data of its
 * own.
 */
export function motionMarkdown(context = DEFAULT_CONTEXT) {
  const axis = motionAxis();
  const tokens = choreographyTokens();
  const presets = presetShapes();
  const columns = axis.values.map((value) => value.label);

  return [
    '# Motion',
    '',
    `How ${context.site.fullName} moves, under \`<al-theme brand="${context.project.brand}">\`. ` +
      `${MOTION_TOKEN_COUNT} motion tokens, ${CHOREOGRAPHY_COUNT} choreography tokens, ` +
      `${PRESET_COUNT} keyframe presets — read from the token layer, the theme stylesheet and the ` +
      'published runtime, never transcribed.',
    '',
    '## The three tiers',
    '',
    '- **Tier 1** — raw values: `--al-animation-{duration,timing,distance}-*`. Pure CSS.',
    '- **Tier 2** — theme roles: `--al-theme-animation-{duration,timing}-role-*`, repointed by the',
    '  `<al-theme motion>` axis. This is the layer a component reads. Pure CSS.',
    '- **Tier 3** — choreography: multi-element, multi-phase sequences run from JS',
    '  (`@southleft/al-web-components/motion`). Use it only when more than one element has to move',
    '  in a coordinated way.',
    '',
    '## Tier 1 — duration',
    '',
    table(
      ['Step', 'Value', 'Token'],
      durationScale().map((step) => [step.name, step.value, `\`--${step.key}\``])
    ),
    '',
    '## Tier 1 — easing',
    '',
    table(
      ['Curve', 'Value', 'Token'],
      easingCurves().map((curve) => [
        curve.name + (curve.overshoots ? ' (overshoots)' : ''),
        curve.value,
        `\`--${curve.key}\``,
      ])
    ),
    '',
    '## Tier 1 — travel distance',
    '',
    table(
      ['Step', 'Value', 'Token'],
      travelDistances().map((step) => [step.name, step.value, `\`--${step.key}\``])
    ),
    '',
    '## Tier 2 — the `motion` axis',
    '',
    'Set `motion` on `<al-theme>`: `full`, `reduced` or `expressive`. Unset means "no opinion" —',
    'the only state that lets `prefers-reduced-motion` decide, which is why it is the default.',
    '',
    '`default` below is the unset axis. The role tokens have NO `:root` default by design, so they',
    'are genuinely absent there and a component’s `var(--role, var(--legacy))` takes its fallback.',
    '`initial` means the same thing: it computes to the guaranteed-invalid value, so the fallback wins.',
    '',
    axis.available
      ? table(
          ['Property', 'default', ...columns],
          axis.properties.map((property) => [
            `\`${property.name}\``,
            property.base ?? '_absent — fallback wins_',
            ...property.cells.map((cell) => (cell ? cell.value : '—')),
          ])
        )
      : `_${axis.reason}_`,
    '',
    "`OS reduce` is the media-query rule `@media (prefers-reduced-motion: reduce) { :host(:not([motion='full'])) }`,",
    'not a value you can set. It is declared last so it beats `expressive` at equal specificity: a',
    'decorative choice never overrides the OS preference, and only an explicit `motion="full"` opts back in.',
    '',
    '## Tier 2 — in CSS',
    '',
    'Simple state transitions never need the runtime.',
    '',
    '```scss',
    // In-repo path, deliberately. The SCSS sources are not packed (`files`
    // ships `dist`, and the build copies only `styles/dist` -> `dist/css`), so
    // the package specifier this used to print resolves to nothing for a
    // consumer — `check:exports` fails on it, correctly. The CSS block below is
    // the consumer-facing form.
    '// Inside the library — the mixins are not published.',
    "@use '../../styles/core/mixins/motion' as motion;",
    '',
    '.al-c-thing { @include motion.al-motion-transition(background-color border-color, fast); }',
    '.al-c-panel { @include motion.al-motion-transition(height, slow, emphasized); }',
    '```',
    '',
    'It is a mixin and not a `--al-theme-animation-use-*` token on purpose: a custom property’s',
    '`var()` chain resolves ONCE, at the element that declares it. A use-case token declared on',
    '`:root` would bake in `:root`’s durations and go blind to every `<al-theme motion>` below it.',
    'A mixin expands at the call site, where the governing theme’s values are in scope.',
    '',
    `## Tier 3 — choreography (${CHOREOGRAPHY_COUNT} tokens)`,
    '',
    'Entrances end `-enter`, exits `-exit`; discrete list sequences use `-reveal` / `-dismiss`.',
    '',
    table(
      ['Token', 'Pattern', 'Keyframes', 'Offset', 'Direction', 'Max'],
      tokens.map((token) => [
        `\`${token.name}\``,
        token.pattern,
        token.keyframes
          ? `\`${token.keyframes}\``
          : token.tracks
            ? token.tracks.map((track) => `\`${track.keyframes}\``).join(' + ')
            : '—',
        token.offset ?? '—',
        token.direction ?? '—',
        token.max ?? '—',
      ])
    ),
    '',
    '```js',
    "import { run, animatePreset } from '@southleft/al-web-components/motion';",
    '',
    "await run('modal-exit', dialogEl);   // never rejects; no-ops on the server",
    "await animatePreset(cardEl, 'blur-up', { delay: '80ms' });",
    '```',
    '',
    'From a Lit component prefer the reactive controller — it scopes to your host, owns its',
    '`IntersectionObserver` and disconnects it in `hostDisconnected()`:',
    '',
    '```ts',
    "import { MotionController } from '@southleft/al-web-components/controllers/motion';",
    '',
    'protected motion = new MotionController(this);',
    "this.motion.reveal(this.renderRoot.querySelector('.grid'), 'grid-reveal');",
    '```',
    '',
    `## Tier 3 — keyframe presets (${PRESET_COUNT})`,
    '',
    'Named shapes, independent of timing — the vocabulary the choreography tokens compose.',
    '',
    table(
      ['Preset', 'Animates', 'Frames'],
      presets.map((preset) => [
        `\`${preset.name}\``,
        preset.properties.map((property) => `\`${property}\``).join(', '),
        preset.multiFrame ? `${preset.frames} (overshoot)` : '2',
      ])
    ),
    '',
    '## Reduced motion',
    '',
    'There are two authorities and they do not always agree: the `<al-theme motion>` axis, and the',
    'OS `prefers-reduced-motion` query. The axis only zeroes tokens on `:host`, so content that is',
    'not wrapped in an `<al-theme>` gets no treatment from the token layer at all; deciding from the',
    'OS query alone would ignore an explicit `motion="full"` opt-in.',
    '',
    '`isReducedMotion(el, cache)` therefore reads the TOKENS at the element first — which encodes',
    'the whole `theme.scss` cascade without duplicating a selector in JS — and falls back to the raw',
    'OS query only for content no theme governs. A zeroed token is authoritative; a non-zero token is',
    'not read as "motion is fine", because an unthemed element resolves to the un-zeroed `:root`',
    'default whatever the reader asked their OS for.',
    '',
    '```js',
    "import { createCache, isReducedMotion } from '@southleft/al-web-components/motion';",
    '',
    'if (isReducedMotion(el, createCache())) {',
    '  el.replaceChildren(nextView);   // jump straight to the end state',
    '} else {',
    "  await run('list-reveal', el);",
    '}',
    '```',
    '',
  ].join('\n');
}

/**
 * The Maturity matrix, as Markdown.
 *
 * The join `lib/maturity.mjs` describes — the registry's lifecycle phase, the
 * v2 migration manifest, and the axe position — flattened into one table. The
 * capability columns are generated from the manifest SCHEMA's boolean
 * properties, so this table widens by itself when a fourth flag is tracked.
 *
 * The three-value cells are `yes` / `no` / `—`, and the third is not a typo for
 * the second: a component the manifest does not track has no answer, and
 * printing `no` for it would invent a measurement.
 */
export function maturityMarkdown(context = DEFAULT_CONTEXT) {
  const rows = maturityRows(context);
  const summary = maturitySummary(context);
  const cell = (value) => (value === null ? '—' : value ? 'yes' : 'no');

  return [
    '# Maturity',
    '',
    `Where every component ${context.site.fullName} documents actually stands, on the four axes ` +
      'this repo already measures: its lifecycle phase, its v2 migration state, the capabilities ' +
      'that migration tracks, and whether accessibility has been measured at all. Nothing here is ' +
      `restated — the phases come from the registry, the migration columns from \`${MANIFEST_PATH}\` ` +
      `with their vocabulary from \`${SCHEMA_PATH}\`, and the accessibility column from the same ` +
      'axe report the component pages read.',
    '',
    '## Totals',
    '',
    `- Components documented: ${summary.total}`,
    `- Tracked by the migration manifest: ${summary.tracked}`,
    ...(summary.layered
      ? [`- In a brand layer, so outside the v1→v2 migration: ${summary.layered}`]
      : []),
    ...(summary.untracked ? [`- Documented but absent from the manifest: ${summary.untracked}`] : []),
    ...summary.states.map((state) => `- Migration state \`${state.id}\`: ${state.count}`),
    ...summary.capabilities.map(
      (capability) => `- \`${capability.id}\`: ${capability.count} of ${capability.of} tracked`,
    ),
    `- Accessibility measured: ${summary.a11y.measured} of ${summary.total}; clean: ${summary.a11y.clean}; open violations: ${summary.a11y.open}`,
    ...(summary.deprecateAliasesBy
      ? [`- Legacy aliases may be removed in: ${summary.deprecateAliasesBy}`]
      : []),
    '',
    '## The vocabulary',
    '',
    MIGRATION_MANIFEST.available
      ? table(
          ['State', 'Means'],
          MIGRATION_STATES.map((state) => [`\`${state.id}\``, state.note ?? '—']),
        )
      : `_${MIGRATION_MANIFEST.reason}_`,
    '',
    ...(MIGRATION_CAPABILITIES.length
      ? [
          table(
            ['Capability', 'True when'],
            MIGRATION_CAPABILITIES.map((capability) => [`\`${capability.id}\``, capability.note ?? '—']),
          ),
          '',
        ]
      : []),
    '## Every component',
    '',
    'A `—` means the row has no answer, not a negative one. Lifecycle `undeclared` means the',
    "component's story declares no `status` parameter — which is the honest label for it, and the",
    'one that makes the gap countable.',
    '',
    table(
      [
        'Component',
        'Tier',
        'Lifecycle',
        'Migration',
        ...MIGRATION_CAPABILITIES.map((capability) => capability.id),
        'Accessibility',
      ],
      rows.map((row) => [
        `[${row.name}](${context.site.url}/components/${row.slug})`,
        row.tier,
        row.status ?? 'undeclared',
        row.state ?? '—',
        ...MIGRATION_CAPABILITIES.map((capability) => cell(row.capabilities[capability.id])),
        row.a11y.measured
          ? row.a11y.open
            ? `${row.a11y.open} open`
            : `clean${row.a11y.unrecorded ? `, ${row.a11y.unrecorded} unrecorded` : ''}`
          : 'not measured',
      ]),
    ),
    '',
    ...(summary.untracked || summary.layered
      ? [
          '## Rows with no migration answer',
          '',
          table(
            ['Component', 'Why'],
            rows
              .filter((row) => !row.tracked)
              .map((row) => [`\`<${row.tag}>\``, row.untrackedReason]),
          ),
          '',
        ]
      : []),
    ...(summary.manifestOnly.length
      ? [
          `The manifest also tracks ${summary.manifestOnly.length} component(s) this design system ` +
            'does not document. For a system that ships a declared subset of the shared library that ' +
            'is the normal case, not a gap.',
          '',
        ]
      : []),
  ].join('\n');
}

/**
 * The migration guide, as Markdown — the repo's own file, verbatim.
 *
 * Every other renderer in this module BUILDS its Markdown from generated data.
 * This one does not, and must not: `/migration.md` is what an agent fetches
 * when it is about to rewrite a consumer's imports, and a paraphrase of a
 * migration instruction is a broken build. One provenance line is added on top
 * so a reader who arrived here from `llms-full.txt` knows which file this is
 * and which brand the examples resolve under; the guide keeps its own `<h1>`.
 */
export function migrationMarkdown(context = DEFAULT_CONTEXT) {
  const { site, project } = context;
  return [
    `_The v1 → v2 migration guide for the component library behind ${site.fullName}, served` +
      ` verbatim from \`${MIGRATION.path}\` in the repository. Rendered examples resolve under` +
      ` \`<al-theme brand="${project.brand}">\`._`,
    '',
    migrationSource(),
  ].join('\n');
}

/**
 * The Icons page, as Markdown.
 *
 * The HTML page's whole point is the ARTWORK, which Markdown cannot carry — so
 * this is not a transcription of that page. It is the same data answering the
 * question a reader of Markdown is actually asking: which names exist. That
 * matters most for the machine artifacts, where an invented icon name is a
 * silent failure — `<al-icon>` renders an empty box for an unknown name rather
 * than throwing — so the CLOSED SET is listed in full, grouped by category.
 *
 * Tags are deliberately omitted: they are 75 KB of synonyms whose only job is
 * fuzzy lookup, which the MCP's `altitude_search_icons` already does better
 * than a flat list in a text file can.
 */
export function iconsMarkdown(context = DEFAULT_CONTEXT) {
  const byCategory = categoryCounts();
  const uncategorised = ICONS.filter((icon) => icon.categories.length === 0);

  return [
    '# Icons',
    '',
    `The ${ICON_COUNT} Phosphor glyphs ${context.site.fullName} ships, at regular weight, MIT ` +
      'licensed. They are the PAYLOAD of `<al-icon>` — not components, and not in the custom ' +
      'elements manifest.',
    '',
    'You must only use a name from the list below. An unknown name is not an error: `<al-icon>`',
    'renders an empty box for it, so an invented name produces a page that looks broken rather than',
    'one that fails. The set is closed, and is read at build time from',
    '`libs/al-web-components/components/icon/catalog.ts`.',
    '',
    '## Registering a glyph',
    '',
    'Registration is explicit and per-glyph — which is why a set this large costs nothing: the',
    'glyphs you never name are never bundled.',
    '',
    '```js',
    "import { caretDown, magnifyingGlass } from '@southleft/al-web-components/components/icon/glyphs';",
    "import { registerIcons } from '@southleft/al-web-components/components/icon/registry';",
    '',
    "registerIcons({ 'caret-down': caretDown, 'magnifying-glass': magnifyingGlass });",
    '```',
    '',
    '```html',
    '<al-icon name="caret-down" size="sm"></al-icon>',
    '<al-icon name="magnifying-glass" iconTitle="Search"></al-icon>',
    '```',
    '',
    '`iconTitle` becomes the accessible name. Set it when the icon carries meaning ALONE; leave it',
    'off beside visible text and the glyph is correctly hidden from assistive technology instead of',
    'being read twice.',
    '',
    'If icon names come from data you do not control, opt into the loader once — it costs ~13 KB',
    'gzipped plus one request per glyph, and it cannot render server-side:',
    '',
    '```js',
    "import '@southleft/al-web-components/components/icon/lazy';",
    '```',
    '',
    `## Deprecated elements (${LEGACY_COUNT})`,
    '',
    'The original `<al-icon-*>` elements still work and render Phosphor artwork, but they are',
    'deprecated. The alias table is consulted only after a lookup against the catalog MISSES, so a',
    'legacy name can never shadow a real Phosphor icon.',
    '',
    table(
      ['Deprecated element', 'Replacement', 'Note'],
      LEGACY_ELEMENTS.map((row) => [
        `\`<${row.element}>\``,
        `\`<al-icon name="${row.replacement}">\``,
        row.shadowed ? `\`name="${row.legacy}"\` is a DIFFERENT Phosphor icon` : '—',
      ])
    ),
    '',
    `## Every name (${ICON_COUNT})`,
    '',
    'Grouped by category; an icon in two categories is listed twice. Search by tag with the',
    "design system's MCP server (`altitude_search_icons`) — the tags are not reproduced here.",
    '',
    ...byCategory.flatMap(({ category, count }) => [
      `### ${category} (${count})`,
      '',
      ICONS.filter((icon) => icon.categories.includes(category))
        .map((icon) => `\`${icon.name}\``)
        .join(', '),
      '',
    ]),
    ...(uncategorised.length
      ? [
          `### uncategorised (${uncategorised.length})`,
          '',
          uncategorised.map((icon) => `\`${icon.name}\``).join(', '),
          '',
        ]
      : []),
    `The category vocabulary is ${ICON_CATEGORIES.length} values: ` +
      `${ICON_CATEGORIES.map((c) => `\`${c}\``).join(', ')}.`,
    '',
  ].join('\n');
}

/**
 * The Utilities page, as Markdown.
 *
 * Same source as the HTML page (`lib/utilities.mjs`): the four stylesheets in
 * `styles/core/utilities/` plus the breakpoint variables, parsed rather than
 * restated. The generated grid classes are described by their RULE and not
 * enumerated — 12 spans × 7 breakpoints × 4 families is 336 rows of the same
 * fact, and a reader who knows the rule can build any of them.
 */
export function utilitiesMarkdown(context = DEFAULT_CONTEXT) {
  const bps = breakpoints();
  const gaps = gapClasses();
  const mods = gapModifiers();
  const grid = gridPatterns();
  const alignment = gridAlignmentClasses();
  const typography = typographyClasses();
  const visibility = visibilityClasses();
  const flat = (row) => row.declarations.map((d) => `${d.property}: ${d.value}`).join('; ');

  return [
    '# Utilities',
    '',
    `The ${utilityCount()} CSS utility classes ${context.site.fullName} publishes, shipped in ` +
      '`css/main.css`. They style and arrange LIGHT-DOM markup; they are not components, and they ' +
      'have no entry in the custom elements manifest.',
    '',
    'Use them on page markup and on children you are spanning inside a grid. Arranging sibling',
    "COMPONENTS is `<al-layout>`'s job — do not hand-roll flex or grid on a wrapper of your own, and",
    'do not invent a `*-group` wrapper for it.',
    '',
    `## Breakpoints (${bps.length})`,
    '',
    'Every `@suffix` on a grid class means one of these and nothing else.',
    '',
    table(
      ['Suffix', 'Applies from'],
      bps.map((bp) => [`\`@${bp.id}\``, `\`min-width: ${bp.value}\``])
    ),
    '',
    `## Grid — ${grid.columns} tracks`,
    '',
    'Put `al-u-grid` on the container. The alignment classes go with it:',
    '',
    table(
      ['Class', 'Declares'],
      alignment.map((row) => [`\`.${row.className}\``, `\`${flat(row)}\``])
    ),
    '',
    '### Generated classes',
    '',
    `Four families, each emitted once bare and once inside every breakpoint, for N = 1…${grid.columns}` +
      ` and suffixes ${grid.suffixes.map((s) => `\`@${s}\``).join(', ')}. So \`col:8\` and \`col:8@md\`` +
      ' are both real classes; breakpoints stack, and the widest matching one wins.',
    '',
    table(
      ['Pattern', 'Goes on', 'Emits', 'What it does'],
      grid.families.map((family) => [
        `\`${family.pattern}\``,
        `\`${family.on}\``,
        `\`${family.emits}\``,
        family.summary,
      ])
    ),
    '',
    '```html',
    '<div class="al-u-grid cols:6@md cols:3@lg al-u-gap-lg">',
    '  <div>1</div><div>2</div><div>3</div><div>4</div>',
    '</div>',
    '',
    '<div class="al-u-grid">',
    '  <div class="al-u-grid__item col:8@md">1</div>',
    '  <div class="al-u-grid__item col:4@md row:2@md">2</div>',
    '  <div class="al-u-grid__item col:7@md offset:2@md">3</div>',
    '</div>',
    '```',
    '',
    '`al-u-grid__item` is deliberately NOT scoped under `.al-u-grid` in the source: the container may',
    'be an `<al-layout variant="grid">` shadow root, where no `.al-u-grid` ancestor exists in the',
    'light DOM for the span classes to match against.',
    '',
    `## Spacing (${gaps.length} gap classes)`,
    '',
    'A gap class goes on the PARENT. It makes that element a flex column and spaces the children, so',
    'a bare wrapper needs nothing else. Values are resolved through the same token layer Foundations',
    'reads, so they are what this brand renders rather than what the SCSS literally says.',
    '',
    table(
      ['Class', 'Token', 'Value', 'Note'],
      gaps.map((row) => [
        `\`.${row.className}\``,
        row.token ? `\`--${row.token}\`` : `\`${row.declared}\``,
        row.value,
        row.mismatch
          ? `the name implies \`--${row.mismatch}\`, which exists; this class reads \`--${row.token}\``
          : '—',
      ])
    ),
    '',
    ...(mods.length
      ? [
          table(
            ['Modifier', 'Declares'],
            mods.map((row) => [`\`.${row.className}\``, `\`${flat(row)}\``])
          ),
          '',
        ]
      : []),
    `## Typography (${typography.length} classes)`,
    '',
    'Two tiers. A tier-2 class names a ROLE, which a brand, a density or a contrast setting is',
    'allowed to repoint; a tier-1 class pins a literal step of the ramp and follows nothing. Prefer',
    'tier 2 unless you have a reason not to.',
    '',
    table(
      ['Class', 'Tier', 'Token', 'Resolves to'],
      typography.map((row) => [
        `\`.${row.className}\``,
        row.tier,
        row.token ? `\`${row.token}\`` : '—',
        row.value ?? '—',
      ])
    ),
    '',
    `## Visibility (${visibility.length})`,
    '',
    table(
      ['Class', 'Declares', 'Via'],
      visibility.map((row) => [
        `\`.${row.className}\``,
        `\`${flat(row)}\``,
        row.via ? `\`${row.via}\`` : '—',
      ])
    ),
    '',
    '`.al-u-is-vishidden` keeps content in the accessibility tree while removing it visually — for a',
    'label a screen reader needs and a sighted reader does not. It is not a way to hide content; use',
    '`hidden` for that.',
    '',
  ].join('\n');
}
